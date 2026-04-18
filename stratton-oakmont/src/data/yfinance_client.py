"""Yahoo Finance API wrapper for price and fundamental data."""
from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Optional

import yfinance as ticker_module
import pandas as pd
from yfinance import Ticker

from src.data.cache import get_cache
from src.data.models import CompanyDetails, CompanyNews, FinancialMetrics, Price

logger = logging.getLogger(__name__)


def get_prices(
    ticker: str,
    start_date: str,
    end_date: str,
) -> list[Price]:
    """Fetch OHLCV bars from Yahoo Finance."""
    cache = get_cache()
    cached = cache.get("yf_prices", ticker, start_date, end_date)
    if cached is not None:
        return cached

    logger.debug(f"Fetching YF prices for {ticker} from {start_date} to {end_date}")
    df = ticker_module.download(ticker, start=start_date, end=end_date, progress=False)
    
    if df.empty:
        return []

    # Handle MultiIndex columns if present
    if isinstance(df.columns, pd.MultiIndex):
        try:
            df = df.xs(ticker, axis=1, level="Ticker")
        except:
            # Fallback if names are different
            try:
                df.columns = df.columns.get_level_values(0)
            except:
                pass

    prices = []
    for timestamp, row in df.iterrows():
        try:
            prices.append(
                Price(
                    open=float(row["Open"]),
                    high=float(row["High"]),
                    low=float(row["Low"]),
                    close=float(row["Close"]),
                    volume=float(row["Volume"]),
                    timestamp=timestamp.to_pydatetime(),
                )
            )
        except Exception as e:
            logger.debug(f"Error parsing price for {ticker} at {timestamp}: {e}")

    cache.set("yf_prices", ticker, start_date, end_date, prices)
    return prices


def get_financial_metrics(
    ticker: str,
    end_date: Optional[str] = None,
    limit: int = 4,
) -> list[FinancialMetrics]:
    """Fetch financials from Yahoo Finance."""
    cache = get_cache()
    cache_key_date = end_date or "latest"
    cached = cache.get("yf_financials", ticker, cache_key_date)
    if cached is not None:
        return cached[:limit]

    logger.debug(f"Fetching YF financials for {ticker}")
    t = Ticker(ticker)
    
    # Financial data
    income = t.income_stmt
    balance = t.balance_sheet
    cashflow = t.cashflow
    
    metrics = []
    # yfinance returns DataFrames where columns are dates
    if income is not None and not income.empty:
        for col in income.columns:
            try:
                dt = col.to_pydatetime()
                if end_date and dt.strftime("%Y-%m-%d") > end_date:
                    continue
                
                # Helper to get value reliably by label
                def gv(df, labels):
                    if df is None or df.empty: return None
                    for label in labels if isinstance(labels, list) else [labels]:
                        try:
                            val = df.loc[label, col]
                            if pd.isna(val): continue
                            return float(val)
                        except:
                            continue
                    return None

                m = FinancialMetrics(
                    ticker=ticker,
                    period="annual",
                    fiscal_period="FY",
                    filing_date=dt.date(),
                    revenue=gv(income, ["Total Revenue", "Operating Revenue"]),
                    net_income=gv(income, ["Net Income Common Stockholders", "Net Income"]),
                    earnings_per_share=gv(income, ["Basic EPS"]),
                    total_assets=gv(balance, ["Total Assets"]),
                    total_liabilities=gv(balance, ["Total Liabilities Net Minority Interest", "Total Liabilities"]),
                    shareholders_equity=gv(balance, ["Stockholders Equity"]),
                    operating_cash_flow=gv(cashflow, ["Operating Cash Flow"]),
                    free_cash_flow=gv(cashflow, ["Free Cash Flow"]),
                )
                metrics.append(m)
            except Exception as e:
                logger.debug(f"Error parsing period {col} for {ticker}: {e}")

    cache.set("yf_financials", ticker, cache_key_date, metrics)
    return metrics[:limit]


def get_company_details(ticker: str) -> Optional[CompanyDetails]:
    """Fetch company info from Yahoo Finance."""
    cache = get_cache()
    cached = cache.get("yf_details", ticker)
    if cached is not None:
        return cached

    logger.debug(f"Fetching YF details for {ticker}")
    t = Ticker(ticker)
    info = t.info
    
    if not info:
        return None

    result = CompanyDetails(
        ticker=ticker,
        name=info.get("longName") or info.get("shortName") or ticker,
        market_cap=info.get("marketCap"),
        description=info.get("longBusinessSummary"),
        sic_code=str(info.get("sectorKey")), # Sector as rough proxy
        homepage_url=info.get("website"),
        total_employees=info.get("fullTimeEmployees"),
    )

    cache.set("yf_details", ticker, result)
    return result


def get_company_news(ticker: str, limit: int = 10) -> list[CompanyNews]:
    """Fetch recent news from Yahoo Finance."""
    cache = get_cache()
    cached = cache.get("yf_news", ticker, str(limit))
    if cached is not None:
        return cached

    logger.debug(f"Fetching YF news for {ticker}")
    t = Ticker(ticker)
    news = t.news
    
    if not news:
        return []

    articles = []
    for n in news[:limit]:
        try:
            # yfinance news items have 'title', 'publisher', 'providerPublishTime', 'link', etc.
            articles.append(
                CompanyNews(
                    title=n.get("title", ""),
                    author=n.get("publisher"),
                    published_utc=datetime.fromtimestamp(n.get("providerPublishTime", 0)),
                    article_url=n.get("link", ""),
                    description=None,  # YF doesn't provide snippets in the main list
                    tickers=[ticker],
                )
            )
        except Exception as e:
            logger.debug(f"Error parsing news item for {ticker}: {e}")

    cache.set("yf_news", ticker, str(limit), articles)
    return articles
