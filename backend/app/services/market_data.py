import yfinance as ticker
import pandas as pd
from datetime import datetime, timedelta

class MarketDataService:
    @staticmethod
    async def get_stock_info(symbol: str):
        try:
            stock = ticker.Ticker(symbol)
            info = stock.info
            return {
                "symbol": symbol,
                "name": info.get("longName"),
                "price": info.get("currentPrice"),
                "market_cap": info.get("marketCap"),
                "pe_ratio": info.get("trailingPE"),
                "dividend_yield": info.get("dividendYield"),
                "sector": info.get("sector"),
                "industry": info.get("industry")
            }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    async def get_historical_data(symbol: str, period: str = "1mo"):
        try:
            stock = ticker.Ticker(symbol)
            hist = stock.history(period=period)
            return hist.reset_index().to_dict(orient="records")
        except Exception as e:
            return {"error": str(e)}

market_service = MarketDataService()
