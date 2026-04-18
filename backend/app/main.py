from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os, json, httpx, traceback, re
from dotenv import load_dotenv
from pathlib import Path
from groq import Groq
import yfinance as yf

_ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

from app.services.broker_service import generate_upstox_login_url, exchange_upstox_code, fetch_upstox_holdings

app = FastAPI(title="PortAI – Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global API Clients ──────────────────────────────────────────
GROQ_API_KEY      = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY    = os.getenv("GEMINI_API_KEY", "")
NEWS_API_KEY      = os.getenv("NEWS_API_KEY", "")
ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY", "")
FINNHUB_KEY       = os.getenv("FINNHUB_KEY", "")
FRED_KEY          = os.getenv("FRED_KEY", "")

groq_client: Optional[Groq] = None
def init_groq():
    global groq_client
    if GROQ_API_KEY:
        try:
            groq_client = Groq(api_key=GROQ_API_KEY)
        except Exception as e:
            print(f"Failed to init Groq: {e}")
            groq_client = None

def init_gemini():
    if GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
        except Exception as e:
            print(f"Failed to init Gemini: {e}")

init_groq()
init_gemini()

def config_status() -> Dict[str, Any]:
    return {
        "groq": bool(GROQ_API_KEY),
        "newsapi": bool(NEWS_API_KEY),
        "alpha_vantage": bool(ALPHA_VANTAGE_KEY),
        "finnhub": bool(FINNHUB_KEY),
        "fred": bool(FRED_KEY),
        "yahoo_finance": True,
    }



class AnalyzeRequest(BaseModel):
    query: str
    context: Optional[str] = None

class ConfigUpdateRequest(BaseModel):
    gemini_api_key: Optional[str] = None
    twilio_sid: Optional[str] = None
    twilio_token: Optional[str] = None
    twilio_phone: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    user_phone: Optional[str] = None

SAMPLE_MARKET = {
    "NIFTY 50": {"price": 22500.0, "change": 120.5, "change_pct": 0.54},
    "SENSEX": {"price": 74000.0, "change": 310.3, "change_pct": 0.42},
}

SAMPLE_NEWS = [
    {
        "title": "Nifty, Sensex edge higher on banking and IT gains",
        "source": "PortAI News Feed",
        "url": "#",
        "publishedAt": "2026-03-13T10:00:00Z",
        "description": "Benchmark indices trade in the green amid positive global cues and stable crude prices.",
    },
    {
        "title": "RBI maintains policy rate, signals data‑dependent stance",
        "source": "PortAI News Feed",
        "url": "#",
        "publishedAt": "2026-03-13T09:30:00Z",
        "description": "Central bank commentary focuses on liquidity normalization and inflation expectations.",
    },
    {
        "title": "FII flows turn positive after three sessions of selling",
        "source": "PortAI News Feed",
        "url": "#",
        "publishedAt": "2026-03-13T09:00:00Z",
        "description": "Foreign investors add exposure to large‑cap financials and autos.",
    },
]

FALLBACK_STOCKS = {
    "RELIANCE": {
        "name": "Reliance Industries Ltd",
        "price": 3050.0,
        "currency": "INR",
        "sector": "Energy",
        "industry": "Oil & Gas",
        "market_cap": 20_000_000_000_000,
        "beta": 1.1,
        "recommendation": "buy",
    },
    "HDFCBANK": {
        "name": "HDFC Bank Ltd",
        "price": 1650.0,
        "currency": "INR",
        "sector": "Financial Services",
        "industry": "Banking",
        "market_cap": 12_000_000_000_000,
        "beta": 0.9,
        "recommendation": "buy",
    },
    "TCS": {
        "name": "Tata Consultancy Services Ltd",
        "price": 3950.0,
        "currency": "INR",
        "sector": "Information Technology",
        "industry": "IT Services",
        "market_cap": 15_000_000_000_000,
        "beta": 0.8,
        "recommendation": "hold",
    },
    "INFY": {
        "name": "Infosys Ltd",
        "price": 1750.0,
        "currency": "INR",
        "sector": "Information Technology",
        "industry": "IT Services",
        "market_cap": 7_000_000_000_000,
        "beta": 0.85,
        "recommendation": "hold",
    },
}

# ── Indian Market Indices ──────────────────────────────────────
INDIAN_INDICES = {
    "NIFTY 50": "^NSEI", "SENSEX": "^BSESN", "NIFTY BANK": "^NSEBANK",
    "NIFTY IT": "^CNXIT", "NIFTY PHARMA": "^CNXPHARMA",
}

# ── Trending Stocks ────────────────────────────────────────────
TRENDING_TICKERS = [
    ("RELIANCE", "RELIANCE.NS"), ("TCS", "TCS.NS"), ("HDFCBANK", "HDFCBANK.NS"),
    ("INFY", "INFY.NS"), ("ITC", "ITC.NS"), ("ICICIBANK", "ICICIBANK.NS"),
    ("SBIN", "SBIN.NS"), ("BHARTIARTL", "BHARTIARTL.NS"), ("KOTAKBANK", "KOTAKBANK.NS"),
    ("LT", "LT.NS"),
]

import asyncio

async def fetch_ticker_data(label, sym):
    try:
        # Run synchronous yfinance calls in a thread pool to avoid blocking the event loop
        t = yf.Ticker(sym)
        # We use a lambda to ensure the call is executed in the thread
        info = await asyncio.to_thread(lambda: t.fast_info)
        price = info.get("lastPrice", 0)
        prev = info.get("previousClose", 1)
        change = round(price - prev, 2)
        change_pct = round(((price - prev) / prev) * 100, 2) if prev else 0
        return {
            "symbol": label, "price": round(price, 2),
            "change": change, "change_pct": change_pct,
        }
    except Exception:
        return None

async def fetch_trending_stocks():
    tasks = [fetch_ticker_data(label, sym) for label, sym in TRENDING_TICKERS]
    results = await asyncio.gather(*tasks)
    results = [r for r in results if r is not None]
    
    if not results:
        # Fallback data
        for sym, data in FALLBACK_STOCKS.items():
            results.append({
                "symbol": sym, "price": data["price"],
                "change": 0, "change_pct": 0,
            })
    return results

async def fetch_index_data(name, sym):
    try:
        t = yf.Ticker(sym)
        info = await asyncio.to_thread(lambda: t.fast_info)
        price = info.get("lastPrice", 0)
        prev = info.get("previousClose", 1)
        return name, {
            "price": round(price, 2), "change": round(price - prev, 2),
            "change_pct": round(((price - prev) / prev) * 100, 2) if prev else 0,
        }
    except Exception:
        return None

async def fetch_indian_market():
    tasks = [fetch_index_data(name, sym) for name, sym in INDIAN_INDICES.items()]
    results = await asyncio.gather(*tasks)
    
    indices = {}
    for r in results:
        if r:
            name, data = r
            indices[name] = data
            
    return indices or SAMPLE_MARKET

# ── NewsAPI ────────────────────────────────────────────────────
async def fetch_indian_news():
    if not NEWS_API_KEY:
        return SAMPLE_NEWS
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            resp = await c.get("https://newsapi.org/v2/top-headlines", params={
                "country": "in", "category": "business", "pageSize": 30, "apiKey": NEWS_API_KEY
            })
            if resp.status_code != 200:
                return SAMPLE_NEWS
            data = resp.json()
            articles = [
                {"title": a.get("title",""), "source": a.get("source",{}).get("name",""),
                 "url": a.get("url","#"), "publishedAt": a.get("publishedAt",""),
                 "description": a.get("description","")}
                for a in data.get("articles", [])
                if a.get("title")
            ]
            return articles if articles else SAMPLE_NEWS
    except Exception as e:
        print(f"NewsAPI error: {e}")
        return SAMPLE_NEWS

async def fetch_policy_news():
    """Fetches high-impact Indian government policy news."""
    if not NEWS_API_KEY:
        return []
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            # specifically search for policies, GST, Budget, PLI in Indian context
            resp = await c.get("https://newsapi.org/v2/everything", params={
                "q": "Indian Government Policy OR GST India OR PLI Scheme OR RBI Repo Rate OR Union Budget India",
                "sortBy": "relevancy",
                "pageSize": 10,
                "apiKey": NEWS_API_KEY
            })
            if resp.status_code == 200:
                data = resp.json()
                return [
                    {"title": a.get("title", ""), "source": a.get("source", {}).get("name", ""),
                     "url": a.get("url", "#"), "publishedAt": a.get("publishedAt", ""),
                     "description": a.get("description", "")}
                    for a in data.get("articles", [])
                    if a.get("title")
                ]
    except Exception as e:
        print(f"Policy news error: {e}")
    return []

# ── Alpha Vantage ──────────────────────────────────────────────
async def fetch_alpha_vantage(symbol: str):
    if not ALPHA_VANTAGE_KEY: return None
    base = "https://www.alphavantage.co/query"
    results = {}
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            # RSI Fetch
            resp = await c.get(base, params={
                "function": "RSI", "symbol": f"{symbol}.BSE", "interval": "daily",
                "time_period": 14, "series_type": "close", "apikey": ALPHA_VANTAGE_KEY
            })
            if resp.status_code == 200:
                data = resp.json()
                rsi_vals = data.get("Technical Analysis: RSI", {})
                if isinstance(rsi_vals, dict) and rsi_vals:
                    results["RSI_14"] = float(list(rsi_vals.values())[0].get("RSI", 0))
            
            # SMA Fetch
            resp = await c.get(base, params={
                "function": "SMA", "symbol": f"{symbol}.BSE", "interval": "daily",
                "time_period": 50, "series_type": "close", "apikey": ALPHA_VANTAGE_KEY
            })
            if resp.status_code == 200:
                data = resp.json()
                sma_vals = data.get("Technical Analysis: SMA", {})
                if isinstance(sma_vals, dict) and sma_vals:
                    results["SMA_50"] = float(list(sma_vals.values())[0].get("SMA", 0))
    except Exception as e:
        print(f"Alpha Vantage fetch error: {e}")
    return results if results else None

# ── Finnhub ────────────────────────────────────────────────────
async def fetch_finnhub_news(symbol: str):
    if not FINNHUB_KEY: return None
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            from datetime import datetime, timedelta
            today = datetime.now().strftime("%Y-%m-%d")
            week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
            resp = await c.get("https://finnhub.io/api/v1/company-news", params={
                "symbol": symbol, "from": week_ago, "to": today, "token": FINNHUB_KEY
            })
            articles = resp.json()
            if isinstance(articles, list):
                return [{"headline": a.get("headline",""), "source": a.get("source","")} for a in articles[:5]]
    except Exception: pass
    return None

async def fetch_finnhub_sentiment(symbol: str):
    if not FINNHUB_KEY: return None
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            resp = await c.get("https://finnhub.io/api/v1/stock/insider-sentiment", params={
                "symbol": symbol, "token": FINNHUB_KEY
            })
            sentiments = resp.json().get("data", [])
            if sentiments:
                latest = sentiments[-1]
                return {"month": latest.get("month"), "year": latest.get("year"),
                        "change": latest.get("change"), "mspr": latest.get("mspr")}
    except Exception: pass
    return None

# ── FRED ───────────────────────────────────────────────────────
async def fetch_fred_data():
    if not FRED_KEY: return None
    indicators = {"US_FED_RATE": "FEDFUNDS", "US_CPI_INFLATION": "CPIAUCSL", "US_10Y_TREASURY": "GS10"}
    results = {}
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            for name, sid in indicators.items():
                resp = await c.get("https://api.stlouisfed.org/fred/series/observations", params={
                    "series_id": sid, "api_key": FRED_KEY, "file_type": "json", "sort_order": "desc", "limit": 1
                })
                if resp.status_code == 200:
                    data = resp.json()
                    obs = data.get("observations", [])
                    if obs: results[name] = {"value": obs[0].get("value"), "date": obs[0].get("date")}
    except Exception as e:
        print(f"FRED error: {e}")
    return results if results else None

# ── Yahoo Finance Enhanced ─────────────────────────────────────
async def fetch_yahoo_stock_detail(symbol: str):
    nse_sym = symbol.upper() + ".NS" if not symbol.endswith((".NS", ".BO")) else symbol
    try:
        t = yf.Ticker(nse_sym)
        info = t.info
        return {
            "symbol": nse_sym, "name": info.get("longName", symbol),
            "price": info.get("currentPrice", 0), "currency": "INR",
            "market_cap": info.get("marketCap", 0), "pe_ratio": info.get("trailingPE"),
            "pb_ratio": info.get("priceToBook"), "dividend_yield": info.get("dividendYield"),
            "sector": info.get("sector", "N/A"), "industry": info.get("industry", "N/A"),
            "52w_high": info.get("fiftyTwoWeekHigh", 0), "52w_low": info.get("fiftyTwoWeekLow", 0),
            "50d_avg": info.get("fiftyDayAverage"), "200d_avg": info.get("twoHundredDayAverage"),
            "beta": info.get("beta"), "recommendation": info.get("recommendationKey"),
        }
    except Exception:
        return None

async def fetch_yahoo_news(symbol: str):
    """Fetches real-time stories directly from Yahoo Finance."""
    try:
        nse_sym = symbol.upper() + ".NS" if not symbol.endswith((".NS", ".BO")) else symbol
        t = yf.Ticker(nse_sym)
        news = await asyncio.to_thread(lambda: t.news)
        if news:
            return [{"title": n.get("title"), "publisher": n.get("publisher"), "link": n.get("link")} for n in news[:5]]
    except Exception as e:
        print(f"Yahoo News fetch error: {e}")
    return None

# ── Groq Analysis ─────────────────────────────────────────────
async def analyze_with_groq(query: str, news_ctx: str, market_ctx: str, extra_ctx: str):
    if not GROQ_API_KEY or not groq_client:
        return {"summary": "⚠️ Groq API key not configured.", "sentiment": "N/A",
                "risk_alerts": [], "market_insights": [], "behavioral_insights": [],
                "recommendations": [], "portfolio_score": 0, "data_sources": []}

    model_name = "llama-3.3-70b-versatile"

    system_prompt = """You are PortAI, an elite institutional-grade financial intelligence engine. You provide hedge-fund-quality analysis that synthesizes raw data into non-obvious, actionable alpha.

Your task is to provide UNIQUE, institutional-level insights. Avoid "basic" summaries. Move beyond what's on the surface to find hidden correlations, institutional rotation patterns, and "unknown" or counter-intuitive signals.

QUANTITATIVE REQUIREMENT: You MUST include deep mathematical and quantitative metrics in your analysis for stock market veterans. Analyze and synthesize:
- Fundamental Ratios: PEG, P/B, Debt-to-Equity, FCF Yield, ROE, RoCE.
- Risk/Return Metrics: Beta (systematic risk), Alpha (excess return), Sharpe Ratio, Treynor Ratio.
- Technical Quantitative Signals: RSI (overbought/oversold), MACD (momentum), VWAP, and Fibonacci levels.
- Historical Context: Compare current actions against 10-year volatility cycles and previous bull/bear market long-term moving averages (50-DMA, 200-DMA).

CRITICAL POLICY SYNTHESIS: Synthesize all market moves with current and upcoming Indian Government Policies (e.g., Union Budget allocations, PLI Schemes, GST revisions, RBI monetary policy shifts, SEBI regulatory changes, and infrastructure initiatives like Gati Shakti). Explain specifically HOW policy shifts are driving the price action or risk profile of the stocks in question.

You MUST respond ONLY with valid JSON (no markdown fences, no extra text). Use this exact structure:
{
  "summary": "3-4 sentence intensive executive briefing. Write like a chief strategist at a top-tier hedge fund. Use high-conviction, professional language.",
  "sentiment": "Bullish" or "Bearish" or "Neutral",
  "portfolio_score": 0-100,
  "key_insights": [
    "Identify a non-obvious market correlation or a specific institutional flow pattern found in the data.",
    "Uncover a specific technical or fundamental signal that retail traders usually miss.",
    "Provide a deep-dive observation about sector rotation or macroeconomic impact derived from the latest news."
  ],
  "risks": ["Identify structural or tail-end risks that aren't immediately apparent to the public."],
  "recommendations": ["Actionable, strategic plays (e.g., 'Utilize a covered bridge strategy', 'Wait for retest of the 200-DMA', etc.)."],
  "sector_exposure": {"Sector": percentage},
  "data_sources": ["list data sources used"]
}

Guidelines:
- SYNTHESIZE: Don't just list news. Connect the dots between a news event and its ripple effect on specific tickers.
- BE UNIQUE: Provide insights that aren't found on the front page of news sites. Look for the "why behind the why".
- BE SPECIFIC: Reference NSE/BSE specific mechanics, FII/DII flow trends, and SEBI/RBI policy nuances.
- BE PROFESSIONAL: Use institutional terminology (e.g., "alpha generation," "beta exposure," "theta decay," "liquidity sweep," "order block")."""

    user_prompt = f"""INTELLIGENCE REQUEST:
{query}

LIVE INDIAN MARKET DATA:
{market_ctx}

FINANCIAL NEWS FEED:
{news_ctx}

{extra_ctx}

Generate your institutional intelligence report as JSON:"""

    try:
        completion = groq_client.chat.completions.create(
            model=model_name,
            temperature=0.7,
            max_tokens=2500,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        text = (completion.choices[0].message.content or "").strip()
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        res = json.loads(text.strip())
        # Ensure all expected keys exist for frontend compatibility
        res.setdefault("key_insights", [res.get("market_insights", ["Market volatility observed"])[0]])
        res.setdefault("risks", ["Global macroeconomic fluctuations"])
        res.setdefault("recommendations", ["Maintain diversified holdings"])
        return res
    except json.JSONDecodeError:
        return {
            "summary": "Partial analysis generated due to response formatting issue.",
            "sentiment": "Neutral", "portfolio_score": 50,
            "key_insights": ["Data aggregation successful", "LLM parsing error occurred"],
            "risks": ["Technical parsing failure"], "recommendations": ["Retry analysis later"],
            "sector_exposure": {}, "data_sources": ["System Cache"]
        }
    except Exception as e:
        print(f"Groq logic error: {e}")
        return {
            "summary": f"Intelligence report could not be fully generated: {str(e)}",
            "sentiment": "N/A", "portfolio_score": 0,
            "key_insights": ["System offline"], "risks": ["Connectivity issue"],
            "recommendations": ["Check API configuration"],
            "sector_exposure": {}, "data_sources": []
        }

# ── Context Builder ───────────────────────────────────────────
async def build_extra_context(query: str):
    parts, sources = [], []
    symbol = extract_symbol(query)
    if symbol:
        yahoo = await fetch_yahoo_stock_detail(symbol)
        if yahoo:
            parts.append(f"YAHOO FINANCE – {symbol}:\n" + "\n".join([f"  {k}: {v}" for k, v in yahoo.items() if v]))
            sources.append("Yahoo Finance")
        av = await fetch_alpha_vantage(symbol)
        if av:
            parts.append(f"TECHNICAL INDICATORS – {symbol}:\n" + "\n".join([f"  {k}: {v}" for k, v in av.items()]))
            sources.append("Alpha Vantage")
        fh_news = await fetch_finnhub_news(symbol)
        if fh_news:
            parts.append(f"FINNHUB NEWS – {symbol}:\n" + "\n".join([f"  - {a['headline']} ({a['source']})" for a in fh_news]))
            sources.append("Finnhub")
        y_news = await fetch_yahoo_news(symbol)
        if y_news:
            parts.append(f"YAHOO FINANCE NEWS – {symbol}:\n" + "\n".join([f"  - {a['title']} ({a['publisher']})" for a in y_news]))
            sources.append("Yahoo Finance News")
        fh_sent = await fetch_finnhub_sentiment(symbol)
        if fh_sent:
            parts.append(f"INSIDER SENTIMENT – {symbol}: MSPR={fh_sent.get('mspr')}, Change={fh_sent.get('change')}")
            sources.append("Finnhub Insider")
    fred = await fetch_fred_data()
    if fred:
        parts.append("MACRO ECONOMIC DATA (FRED):\n" + "\n".join([f"  {k}: {v['value']} ({v['date']})" for k, v in fred.items()]))
        sources.append("FRED")
    
    # New: Add explicit Policy Context
    policy_news = await fetch_policy_news()
    if policy_news:
        parts.append("INDIAN GOVT POLICY CONTEXT:\n" + "\n".join([f"  - {a['title']} (Source: {a['source']})" for a in policy_news[:6]]))
        sources.append("Policy Intelligence")
        
    return "\n\n".join(parts) if parts else "", sources

def extract_symbol(query: str) -> Optional[str]:
    known = {
        "reliance": "RELIANCE", "tcs": "TCS", "infosys": "INFY", "infy": "INFY",
        "hdfc": "HDFCBANK", "hdfcbank": "HDFCBANK", "hdfc bank": "HDFCBANK",
        "icici": "ICICIBANK", "icicibank": "ICICIBANK", "sbi": "SBIN",
        "itc": "ITC", "wipro": "WIPRO", "bajaj": "BAJFINANCE",
        "kotak": "KOTAKBANK", "adani": "ADANIENT", "maruti": "MARUTI",
        "asian paints": "ASIANPAINT", "hul": "HINDUNILVR", "hindustan unilever": "HINDUNILVR",
        "sun pharma": "SUNPHARMA", "airtel": "BHARTIARTL", "titan": "TITAN",
        "tata motors": "TATAMOTORS", "tata steel": "TATASTEEL",
        "lt": "LT", "larsen": "LT", "axis bank": "AXISBANK",
        "tech mahindra": "TECHM", "hcl": "HCLTECH", "ongc": "ONGC",
        "zomato": "ZOMATO", "paytm": "PAYTM", "nvidia": "NVDA",
    }
    q_lower = query.lower()
    for kw, sym in known.items():
        if kw in q_lower: return sym
    matches = re.findall(r'\b([A-Z]{2,15})\b', query)
    return matches[0] if matches else None

# ── Background Surveillance ───────────────────────────────────
WATCHED_STOCKS = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK"]

async def background_market_surveillance():
    """Periodically checks market health for watched stocks and sends alerts."""
    from app.services.notification_service import notify_all_channels
    while True:
        try:
            print("Running market surveillance check...")
            market_data = await fetch_indian_market()
            for stock, data in market_data.items():
                # Critical Alert: Stock down more than 3% in a session
                if stock in WATCHED_STOCKS and data.get("change_pct", 0) < -3.0:
                    alert_msg = f"⚠️ CRITICAL RISK: {stock} is down {data['change_pct']:.2f}%! Price: ₹{data['price']}. Take action."
                    await notify_all_channels(alert_msg)
            
            # General Health Check loop
            await asyncio.sleep(300) # Check every 5 minutes
        except Exception as e:
            print(f"Surveillance Error: {e}")
            await asyncio.sleep(60)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(background_market_surveillance())
    print("Market Surveillance Engine started.")

# ── Endpoints ─────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"service": "PortAI", "status": "operational"}


@app.get("/api/config")
async def get_config():
    return config_status()

@app.post("/api/config")
async def update_config(req: ConfigUpdateRequest):
    global GROQ_API_KEY, NEWS_API_KEY, ALPHA_VANTAGE_KEY, FINNHUB_KEY, FRED_KEY, GEMINI_API_KEY
    updated = []
    if req.groq_api_key is not None:
        GROQ_API_KEY = req.groq_api_key
        init_groq()
        updated.append("Groq")
    if req.news_api_key is not None:
        NEWS_API_KEY = req.news_api_key
        updated.append("NewsAPI")
    if req.alpha_vantage_key is not None:
        ALPHA_VANTAGE_KEY = req.alpha_vantage_key
        updated.append("Alpha Vantage")
    if req.finnhub_key is not None:
        FINNHUB_KEY = req.finnhub_key
        updated.append("Finnhub")
    if req.fred_key is not None:
        FRED_KEY = req.fred_key
        updated.append("FRED")
    if req.gemini_api_key is not None:
        GEMINI_API_KEY = req.gemini_api_key
        init_gemini()
        updated.append("Gemini")
    
    # Update notification envs
    if req.twilio_sid: os.environ["TWILIO_ACCOUNT_SID"] = req.twilio_sid
    if req.twilio_token: os.environ["TWILIO_AUTH_TOKEN"] = req.twilio_token
    if req.twilio_phone: os.environ["TWILIO_PHONE_NUMBER"] = req.twilio_phone
    if req.telegram_bot_token: os.environ["TELEGRAM_BOT_TOKEN"] = req.telegram_bot_token
    if req.telegram_chat_id: os.environ["TELEGRAM_CHAT_ID"] = req.telegram_chat_id
    if req.user_phone: os.environ["USER_PHONE_NUMBER"] = req.user_phone
    
    if any([req.twilio_sid, req.telegram_bot_token]):
        updated.append("Notifications")
    
    return {"status": config_status(), "updated": updated}



@app.get("/api/status")
async def api_status():
    return config_status()

@app.get("/api/market")
async def get_market_data():
    return {"indices": await fetch_indian_market()}

@app.get("/api/news")
async def get_news():
    return {"articles": await fetch_indian_news()}

@app.get("/api/trending-stocks")
async def get_trending_stocks():
    return {"stocks": await fetch_trending_stocks()}

@app.get("/api/trending")
async def get_trending():
    stocks = await fetch_trending_stocks()
    return stocks

# ── Sector Data ────────────────────────────────────────────────
SECTOR_TICKERS = {
    "IT": ["TCS.NS", "INFY.NS", "WIPRO.NS", "HCLTECH.NS", "TECHM.NS"],
    "Banking": ["HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "KOTAKBANK.NS", "AXISBANK.NS"],
    "Energy": ["RELIANCE.NS", "ONGC.NS", "BPCL.NS", "IOC.NS"],
    "FMCG": ["HINDUNILVR.NS", "ITC.NS", "NESTLEIND.NS", "BRITANNIA.NS"],
    "Auto": ["MARUTI.NS", "TATAMOTORS.NS", "M&M.NS", "BAJAJ-AUTO.NS"],
    "Pharma": ["SUNPHARMA.NS", "DRREDDY.NS", "CIPLA.NS", "DIVISLAB.NS"],
    "Infra": ["LT.NS", "NTPC.NS", "POWERGRID.NS", "ADANIPORTS.NS"],
    "Telecom": ["BHARTIARTL.NS"],
}

SECTOR_INDICES = {
    "IT": "^CNXIT", "Banking": "^NSEBANK", "Pharma": "^CNXPHARMA",
    "FMCG": "^CNXFMCG", "Auto": "^CNXAUTO", "Energy": "^CNXENERGY",
    "Infra": "^CNXINFRA", "Telecom": "^CNXTELECOM",
}

async def fetch_single_sector(name, index_ticker):
    try:
        t = yf.Ticker(index_ticker)
        info = await asyncio.to_thread(lambda: t.fast_info)
        price = info.get("lastPrice", 0)
        prev = info.get("previousClose", 1)
        change_pct = round(((price - prev) / prev) * 100, 2) if prev else 0
        sector_entry = {"name": name, "price": round(price, 2), "change_pct": change_pct, "stocks": []}
    except Exception:
        sector_entry = {"name": name, "price": 0, "change_pct": 0, "stocks": []}

    # Fetch top 3 stocks for the sector in parallel
    stock_tickers = SECTOR_TICKERS.get(name, [])[:3]
    stock_tasks = []
    for sym in stock_tickers:
        async def fetch_stock(s_sym):
            try:
                s = yf.Ticker(s_sym)
                si = await asyncio.to_thread(lambda: s.fast_info)
                sp = si.get("lastPrice", 0)
                sprev = si.get("previousClose", 1)
                return {
                    "symbol": s_sym.replace(".NS", "").replace(".BO", ""),
                    "price": round(sp, 2),
                    "change_pct": round(((sp - sprev) / sprev) * 100, 2) if sprev else 0
                }
            except Exception:
                return None
        stock_tasks.append(fetch_stock(sym))
    
    stock_results = await asyncio.gather(*stock_tasks)
    sector_entry["stocks"] = [s for s in stock_results if s is not None]
    return sector_entry

async def fetch_sector_data():
    tasks = [fetch_single_sector(name, index_ticker) for name, index_ticker in SECTOR_INDICES.items()]
    return await asyncio.gather(*tasks)

@app.get("/api/sectors")
async def get_sectors():
    try:
        return {"sectors": await fetch_sector_data()}
    except Exception as e:
        print(f"Sector data error: {e}")
        return {"sectors": [], "error": str(e)}

@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    try:
        market = await fetch_indian_market()
        news = await fetch_indian_news()
        market_str = "\n".join([f"{k}: ₹{v['price']} ({v['change_pct']:+.2f}%)" for k, v in market.items()])
        news_str = "\n".join([f"- {a['title']} ({a['source']})" for a in news[:8]])
        full_query = req.query + (f"\n\nAdditional context:\n{req.context}" if req.context else "")
        extra_ctx, extra_sources = await build_extra_context(req.query)
        analysis = await analyze_with_groq(full_query, news_str, market_str, extra_ctx)
        
        if "data_sources" not in analysis: analysis["data_sources"] = []
        analysis["data_sources"] = list(set(analysis.get("data_sources", []) + extra_sources + ["Yahoo Finance (Indices)", "NewsAPI", "Groq LLM"]))
        
        from app.services.db_service import save_ai_report
        report_to_save = analysis.copy()
        report_to_save["query"] = req.query
        save_ai_report(report_to_save)
        
        # Trigger Notification for high-risk bearish sentiment
        if analysis.get("sentiment") == "Bearish":
            from app.services.notification_service import notify_all_channels
            risk_summary = analysis.get("summary", "Critical portfolio risks detected.")
            asyncio.create_task(notify_all_channels(f"RISK ALERT: {risk_summary}"))

        return {"analysis": analysis, "market": market, "news_used": [a.get("title") for a in news[:4] if isinstance(a, dict)],
                "apis_used": extra_sources + ["Yahoo Finance", "NewsAPI", "Groq AI"]}
    except Exception as e:
        print(f"Top-level analyze error: {e}")
        return {
            "analysis": {"summary": "Our AI service experienced a temporary disruption while gathering financial data.", "sentiment": "Neutral", "key_insights": ["Service Disruption"], "risks": [str(e)], "recommendations": ["Try again in a few moments."]},
            "market": {}, "news_used": [], "apis_used": []
        }

@app.post("/api/analyze-file")
async def analyze_file(file: UploadFile = File(...), query: str = Form(default="Analyze this portfolio")):
    try:
        content = await file.read()
        filename = file.filename.lower()
        text_content = ""

        if filename.endswith(".pdf"):
            try:
                import io, PyPDF2
                reader = PyPDF2.PdfReader(io.BytesIO(content))
                for page in reader.pages:
                    text_content += (page.extract_text() or "") + "\n"
            except ImportError:
                text_content = "[SYSTEM ALERT: PyPDF2 is not installed. Run 'pip install PyPDF2' to support PDF parsing.]"
            except Exception as e:
                text_content = f"Error reading PDF: {e}"
        elif filename.endswith((".jpg", ".jpeg", ".png")):
            try:
                import io, pytesseract
                from PIL import Image
                image = Image.open(io.BytesIO(content))
                text_content = pytesseract.image_to_string(image)
                if not text_content.strip():
                    text_content = "Image seems empty or unreadable."
            except ImportError:
                text_content = "[SYSTEM ALERT: pytesseract or Pillow is not installed. Run 'pip install pytesseract Pillow' to support image OCR.]"
            except pytesseract.pytesseract.TesseractNotFoundError:
                text_content = "[SYSTEM ALERT: Tesseract OCR engine is not installed on this server to read images. Please install Tesseract or upload text/csv files.]"
            except Exception as e:
                text_content = f"Error reading Image: {e}"
        else:
            text_content = content.decode("utf-8", errors="ignore")[:5000]

        # Upload file to Supabase Storage for persistence
        from app.services.db_service import save_ai_report, upload_file_to_supabase
        file_url = upload_file_to_supabase(content, file.filename)

        text_content = text_content[:15000]
        market = await fetch_indian_market()
        news = await fetch_indian_news()
        market_str = "\n".join([f"{k}: ₹{v['price']} ({v['change_pct']:+.2f}%)" for k, v in market.items()])
        news_str = "\n".join([f"- {a['title']} ({a['source']})" for a in news[:8]])
        full_query = f"{query}\n\nUploaded data:\n{text_content}"
        extra_ctx, extra_sources = await build_extra_context(query)
        analysis = await analyze_with_groq(full_query, news_str, market_str, extra_ctx)
        
        if "data_sources" not in analysis: analysis["data_sources"] = []
        analysis["data_sources"] = list(set(analysis.get("data_sources", []) + extra_sources + ["Groq LLM"]))
        if file_url: analysis["data_sources"].append(f"Persistence: {file_url}")
        
        report_to_save = analysis.copy()
        report_to_save["query"] = query
        report_to_save["file_url"] = file_url
        save_ai_report(report_to_save)
        
        return {"analysis": analysis, "market": market, "news_used": [a.get("title") for a in news[:4] if isinstance(a, dict)],
                "file_name": file.filename, "file_url": file_url, "apis_used": extra_sources + ["Yahoo Finance", "NewsAPI", "Groq AI"]}
    except Exception as e:
        print(f"Top-level analyze file error: {e}")
        return {
            "analysis": {"summary": "Our AI service experienced an error while uploading or parsing your file.", "sentiment": "Neutral", "key_insights": ["Parse Error"], "risks": [str(e)], "recommendations": ["Ensure file is valid format and under 5MB."]},
            "market": {}, "news_used": [], "apis_used": []
        }

@app.get("/api/history/{symbol}")
async def get_history(symbol: str, period: str = "1mo"):
    try:
        # Handle index symbols like NIFTY 50 -> ^NSEI
        ticker_sym = symbol
        if symbol.upper() == "NIFTY 50": ticker_sym = "^NSEI"
        elif symbol.upper() == "SENSEX": ticker_sym = "^BSESN"
        elif symbol.upper() == "NIFTY BANK": ticker_sym = "^NSEBANK"
        elif not ticker_sym.startswith("^") and not ticker_sym.endswith(".NS") and not ticker_sym.endswith(".BO"):
            ticker_sym = f"{ticker_sym.upper()}.NS"

        ticker = yf.Ticker(ticker_sym)
        hist = await asyncio.to_thread(lambda: ticker.history(period=period))
        if hist.empty:
            return {"error": "No data found", "symbol": symbol}
        
        data = []
        for date, row in hist.iterrows():
            data.append({
                "date": date.strftime("%Y-%m-%d"),
                "close": round(row["Close"], 2),
                "high": round(row["High"], 2),
                "low": round(row["Low"], 2),
                "open": round(row["Open"], 2),
                "volume": int(row["Volume"])
            })
        return {"symbol": symbol, "history": data}
    except Exception as e:
        print(f"History fetch error for {symbol}: {e}")
        return {"error": str(e), "symbol": symbol}

@app.get("/api/stock/{symbol}")
async def get_stock(symbol: str):
    data = await fetch_yahoo_stock_detail(symbol)
    if data:
        return data
    sym = symbol.upper()
    if sym in FALLBACK_STOCKS:
        fb = FALLBACK_STOCKS[sym].copy()
        fb.setdefault("symbol", sym)
        return fb
    return {"error": "Fetch failed", "symbol": symbol}

@app.post("/api/test-notification")
async def test_notification(req: dict):
    from app.services.notification_service import notify_all_channels
    msg = req.get("message", "This is a test notification from PortAI! Institutional quality signals are ready.")
    res = await notify_all_channels(msg)
    return {"status": "dispatched", "results": res}

# ── Broker Integrations ───────────────────────────────────────
@app.get("/api/broker/login/upstox")
async def upstox_login():
    url = generate_upstox_login_url()
    return {"login_url": url}

@app.post("/api/broker/callback/upstox")
async def upstox_callback(req: dict):
    code = req.get("code")
    if not code:
        return {"error": "No code provided"}
    token = await exchange_upstox_code(code)
    if token:
        # In a real app we would save this to the DB. For now, we return it to the frontend to hold in state.
        return {"access_token": token}
    return {"error": "Failed to exchange token"}

@app.post("/api/broker/holdings")
async def get_holdings(req: dict):
    token = req.get("access_token")
    broker = req.get("broker", "upstox")
    if token and broker == "upstox":
        holdings = await fetch_upstox_holdings(token)
        return {"holdings": holdings}
    return {"error": "Invalid token or broker"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
