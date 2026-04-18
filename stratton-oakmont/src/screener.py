import argparse
import json
import logging
from datetime import date, timedelta
from typing import Any

import pandas as pd
import numpy as np
import yfinance as yf
from rich.console import Console

# Use existing cache to avoid excessive API calls if possible
try:
    from src.data.cache import get_cache
    HAS_CACHE = True
except ImportError:
    HAS_CACHE = False

console = Console()
logger = logging.getLogger(__name__)

def calculate_rsi(prices: pd.Series, periods: int = 14) -> float:
    """Calculate the Relative Strength Index (RSI)."""
    if len(prices) < periods:
        return 50.0  # Default neutral RSI if not enough data
    
    deltas = np.diff(prices)
    seed = deltas[:periods+1]
    up = seed[seed >= 0].sum() / periods
    down = -seed[seed < 0].sum() / periods
    rs = up / down if down > 0 else 0
    rsi = np.zeros_like(prices)
    rsi[:periods] = 100. - 100. / (1. + rs)

    for i in range(periods, len(prices)):
        delta = deltas[i - 1]  # The diff is 1 shorter
        if delta > 0:
            upval = delta
            downval = 0.
        else:
            upval = 0.
            downval = -delta

        up = (up * (periods - 1) + upval) / periods
        down = (down * (periods - 1) + downval) / periods
        rs = up / down if down > 0 else 0
        rsi[i] = 100. - 100. / (1. + rs)

    return float(rsi[-1])

def calculate_sma(prices: pd.Series, periods: int) -> float:
    """Calculate Simple Moving Average."""
    if len(prices) < periods:
        return float(prices.mean()) if not prices.empty else 0.0
    return float(prices.tail(periods).mean())

def screen_stocks(
    tickers: list[str],
    min_price: float = 0.0,
    max_price: float = float('inf'),
    min_volume: int = 0,
    max_pe: float = float('inf'),
    min_rsi: float = 0.0,
    max_rsi: float = 100.0,
    sma_cross: bool = False, # If True, requires price > 50 SMA
) -> list[dict[str, Any]]:
    """Screen a list of tickers based on provided criteria."""
    passed_stocks = []
    
    # We need historical data for RSI and SMA
    end_date = date.today()
    start_date = end_date - timedelta(days=100) # Need enough data for 50 SMA and 14 RSI
    
    for ticker in tickers:
        try:
            t = yf.Ticker(ticker)
            info = t.info
            
            if not info:
                continue
                
            price = info.get("currentPrice", info.get("regularMarketPrice", 0.0))
            volume = info.get("volume", info.get("regularMarketVolume", 0))
            pe_ratio = info.get("trailingPE", float('inf'))
            if pe_ratio is None:
                pe_ratio = float('inf')
                
            # Quick fundamental filters to save historical data fetching
            if price < min_price or price > max_price:
                continue
            if volume < min_volume:
                continue
            if pe_ratio > max_pe:
                continue
                
            # Fetch all the "Premium" metrics from the info dictionary
            market_cap = info.get("marketCap")
            div_yield = info.get("dividendYield")
            peg_ratio = info.get("trailingPegRatio")
            roe = info.get("returnOnEquity")
            eps_growth = info.get("earningsGrowth")
            rev_growth = info.get("revenueGrowth")
            sector = info.get("sector")
            industry = info.get("industry")
            rating = info.get("recommendationKey", "N/A").replace("_", " ").title()
            target_price = info.get("targetMeanPrice")
            
            # Fetch historical data for technicals
            hist = t.history(start=start_date.strftime("%Y-%m-%d"), end=end_date.strftime("%Y-%m-%d"))
            
            if hist.empty:
                continue
                
            close_prices = hist['Close']
            
            rsi_value = calculate_rsi(close_prices.values)
            if rsi_value < min_rsi or rsi_value > max_rsi:
                continue
                
            sma_50 = calculate_sma(close_prices, 50)
            if sma_cross and price <= sma_50:
                continue
                
            # Passed all filters!
            passed_stocks.append({
                "ticker": ticker,
                "name": info.get("longName", ticker),
                "sector": sector,
                "industry": industry,
                "price": round(price, 2),
                "change_pct": round(info.get("regularMarketChangePercent", 0), 2),
                "volume": volume,
                "market_cap": market_cap,
                "pe_ratio": round(pe_ratio, 2) if pe_ratio != float('inf') else None,
                "peg_ratio": round(peg_ratio, 2) if peg_ratio else None,
                "roe": round(roe * 100, 2) if roe else None,
                "div_yield": round(div_yield * 100, 2) if div_yield else None,
                "eps_growth": round(eps_growth * 100, 2) if eps_growth else None,
                "revenue_growth": round(rev_growth * 100, 2) if rev_growth else None,
                "analyst_rating": rating,
                "target_price": round(target_price, 2) if target_price else None,
                "rsi_14": round(rsi_value, 2),
                "sma_50": round(sma_50, 2)
            })
            
        except Exception as e:
            logger.debug(f"Error screening {ticker}: {e}")
            
    return passed_stocks

def main():
    parser = argparse.ArgumentParser(description="Advanced Stock Screener - Professional Metrics")
    parser.add_argument("--tickers", "-t", type=str, required=True, help="Comma-separated tickers to screen")
    parser.add_argument("--min-price", type=float, default=0.0)
    parser.add_argument("--max-price", type=float, default=float('inf'))
    parser.add_argument("--min-volume", type=int, default=0)
    parser.add_argument("--max-pe", type=float, default=float('inf'))
    parser.add_argument("--min-rsi", type=float, default=0.0)
    parser.add_argument("--max-rsi", type=float, default=100.0)
    parser.add_argument("--sma-cross", action="store_true")
    parser.add_argument("--debug", action="store_true")
    
    args = parser.parse_args()
    
    if args.debug:
        logging.basicConfig(level=logging.DEBUG)
        
    tickers = [t.strip().upper() for t in args.tickers.split(",")]
    
    results = screen_stocks(
        tickers=tickers,
        min_price=args.min_price,
        max_price=args.max_price,
        min_volume=args.min_volume,
        max_pe=args.max_pe,
        min_rsi=args.min_rsi,
        max_rsi=args.max_rsi,
        sma_cross=args.sma_cross
    )
    
    print(json.dumps({"count": len(results), "results": results}, indent=2))

if __name__ == "__main__":
    main()
