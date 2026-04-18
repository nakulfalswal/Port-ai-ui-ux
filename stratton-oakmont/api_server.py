"""Stratton Oakmont — FastAPI server for PortAI frontend integration.

Endpoints:
  GET  /api/personas          — available investor personas
  GET  /api/analysts          — core analyst agents
  GET  /api/providers         — supported LLM providers / models
  POST /api/analyze           — run full hedge fund analysis
  POST /api/backtest          — run backtester
  GET  /api/paper-portfolio   — current paper trading portfolio
  POST /api/paper-trade       — execute AI paper trade cycle
  POST /api/paper-reset       — reset paper portfolio
  GET  /health                — health check
"""
from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

# Ensure the project root is on sys.path when run directly
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.config.agents import ANALYST_CONFIG, PERSONA_CONFIG
from src.config.settings import DEFAULT_MODEL_NAME, DEFAULT_MODEL_PROVIDER, GROQ_API_KEY
from src.graph.workflow import run_hedge_fund

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Stratton Oakmont — AI Hedge Fund API",
    description="Multi-agent stock analysis backend for PortAI",
    version="1.0.0",
)

# Allow requests from frontend (Next.js dev + prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────── Models ──────────────────────────────────────


class AnalyzeRequest(BaseModel):
    tickers: list[str] = Field(..., description="Stock tickers to analyze")
    start_date: str | None = None
    end_date: str | None = None
    cash: float = 100_000
    model_name: str = DEFAULT_MODEL_NAME
    model_provider: str = DEFAULT_MODEL_PROVIDER
    show_reasoning: bool = True
    use_llm: bool = False
    personas: list[str] | None = None


class BacktestRequest(BaseModel):
    tickers: list[str]
    start_date: str | None = None
    end_date: str | None = None
    initial_capital: float = 100_000
    model_name: str = DEFAULT_MODEL_NAME
    model_provider: str = DEFAULT_MODEL_PROVIDER
    use_llm: bool = False
    personas: list[str] | None = None


class PaperTradeRequest(BaseModel):
    tickers: list[str]
    model_name: str = DEFAULT_MODEL_NAME
    model_provider: str = DEFAULT_MODEL_PROVIDER
    use_llm: bool = False
    personas: list[str] | None = None


# ─────────────────────────────── Routes ──────────────────────────────────────


@app.get("/health")
def health():
    return {
        "status": "ok",
        "groq_configured": bool(GROQ_API_KEY),
        "default_model": f"{DEFAULT_MODEL_PROVIDER}/{DEFAULT_MODEL_NAME}",
    }


@app.get("/api/personas")
def get_personas():
    """Return all available investor personas."""
    return {
        "personas": {
            key: {
                "id": key,
                "node_name": node_name,
                "label": key.replace("_", " ").title(),
            }
            for key, (node_name, _) in PERSONA_CONFIG.items()
        }
    }


@app.get("/api/analysts")
def get_analysts():
    """Return all core analyst agents."""
    return {
        "analysts": {
            key: {
                "id": key,
                "node_name": node_name,
                "label": key.replace("_", " ").title(),
            }
            for key, (node_name, _) in ANALYST_CONFIG.items()
        }
    }


@app.get("/api/providers")
def get_providers():
    """Return supported LLM providers and suggested models."""
    providers = {
        "groq": {
            "label": "Groq (Fast & Free)",
            "models": [
                "llama-3.3-70b-versatile",
                "llama-3.1-8b-instant",
                "mixtral-8x7b-32768",
            ],
            "configured": bool(os.getenv("GROQ_API_KEY")),
        },
        "openai": {
            "label": "OpenAI",
            "models": ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
            "configured": bool(os.getenv("OPENAI_API_KEY")),
        },
        "anthropic": {
            "label": "Anthropic",
            "models": ["claude-3-haiku-20240307", "claude-3-5-sonnet-20241022"],
            "configured": bool(os.getenv("ANTHROPIC_API_KEY")),
        },
        "google": {
            "label": "Google Gemini",
            "models": ["gemini-1.5-flash", "gemini-1.5-pro"],
            "configured": bool(os.getenv("GOOGLE_API_KEY")),
        },
    }
    # Only return providers that have an API key configured
    available = {k: v for k, v in providers.items() if v["configured"]}
    return {"providers": available, "all_providers": providers}


@app.post("/api/analyze")
def analyze(req: AnalyzeRequest):
    """Run the full multi-agent hedge fund analysis."""
    tickers = [t.strip().upper() for t in req.tickers if t.strip()]
    if not tickers:
        raise HTTPException(status_code=400, detail="At least one ticker is required")

    try:
        result = run_hedge_fund(
            tickers=tickers,
            start_date=req.start_date,
            end_date=req.end_date,
            portfolio={"cash": req.cash, "positions": {}, "total_value": req.cash},
            model_name=req.model_name,
            model_provider=req.model_provider,
            show_reasoning=req.show_reasoning,
            use_llm=req.use_llm,
            personas=req.personas,
        )

        # Serialise Pydantic / datetime objects for JSON
        data = result.get("data", {})

        def _serialise(obj: Any) -> Any:
            if hasattr(obj, "model_dump"):
                return obj.model_dump(mode="json")
            if hasattr(obj, "isoformat"):
                return obj.isoformat()
            if isinstance(obj, dict):
                return {k: _serialise(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [_serialise(i) for i in obj]
            return obj

        return {
            "tickers": tickers,
            "analyst_signals": _serialise(data.get("analyst_signals", {})),
            "risk_adjusted_signals": _serialise(data.get("risk_adjusted_signals", [])),
            "portfolio_output": _serialise(data.get("portfolio_output", {})),
        }

    except Exception as exc:
        logger.exception("Analysis failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/backtest")
def backtest(req: BacktestRequest):
    """Run the backtester."""
    tickers = [t.strip().upper() for t in req.tickers if t.strip()]
    if not tickers:
        raise HTTPException(status_code=400, detail="At least one ticker is required")

    try:
        from src.backtester import Backtester
        bt = Backtester(
            tickers=tickers,
            start_date=req.start_date or (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d"),
            end_date=req.end_date or datetime.now().strftime("%Y-%m-%d"),
            initial_capital=req.initial_capital,
            model_name=req.model_name,
            model_provider=req.model_provider,
            use_llm=req.use_llm,
            personas=req.personas,
        )
        results = bt.run()
        return results if isinstance(results, dict) else {"results": str(results)}
    except ImportError:
        raise HTTPException(status_code=501, detail="Backtester module not available")
    except Exception as exc:
        logger.exception("Backtest failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ── Paper Trading ─────────────────────────────────────────────────────────────

PAPER_PORTFOLIO_FILE = Path(__file__).parent / "paper_portfolio.json"

def _load_paper_portfolio() -> dict:
    if PAPER_PORTFOLIO_FILE.exists():
        try:
            return json.loads(PAPER_PORTFOLIO_FILE.read_text())
        except Exception:
            pass
    return {"cash": 100_000, "positions": {}, "total_value": 100_000, "trades": []}


def _save_paper_portfolio(portfolio: dict) -> None:
    PAPER_PORTFOLIO_FILE.write_text(json.dumps(portfolio, indent=2, default=str))


@app.get("/api/paper-portfolio")
def get_paper_portfolio():
    return _load_paper_portfolio()


@app.post("/api/paper-trade")
def paper_trade(req: PaperTradeRequest):
    """Run one AI trade cycle against the paper portfolio."""
    tickers = [t.strip().upper() for t in req.tickers if t.strip()]
    if not tickers:
        raise HTTPException(status_code=400, detail="At least one ticker is required")

    portfolio = _load_paper_portfolio()

    try:
        result = run_hedge_fund(
            tickers=tickers,
            portfolio={"cash": portfolio["cash"], "positions": portfolio.get("positions", {}), "total_value": portfolio.get("total_value", portfolio["cash"])},
            model_name=req.model_name,
            model_provider=req.model_provider,
            use_llm=req.use_llm,
            personas=req.personas,
        )

        decisions = result.get("data", {}).get("portfolio_output", {})
        trades_executed = []

        for pos in decisions.get("positions", []):
            action = pos.get("action", "hold")
            ticker = pos.get("ticker", "")
            qty = int(pos.get("quantity", 0))

            if action == "buy" and qty > 0:
                # Estimate cost (simplified — no live price lookup here)
                portfolio["positions"][ticker] = portfolio["positions"].get(ticker, 0) + qty
                trade = {"timestamp": datetime.now().isoformat(), "action": "buy", "ticker": ticker, "quantity": qty}
                trades_executed.append(trade)
                portfolio.setdefault("trades", []).append(trade)

            elif action == "sell" and qty > 0:
                current_qty = portfolio["positions"].get(ticker, 0)
                sold = min(qty, current_qty)
                portfolio["positions"][ticker] = current_qty - sold
                if portfolio["positions"][ticker] <= 0:
                    del portfolio["positions"][ticker]
                trade = {"timestamp": datetime.now().isoformat(), "action": "sell", "ticker": ticker, "quantity": sold}
                trades_executed.append(trade)
                portfolio.setdefault("trades", []).append(trade)

        # Update cash and total from decisions if present
        if "cash_remaining" in decisions:
            portfolio["cash"] = decisions["cash_remaining"]
        if "total_value" in decisions:
            portfolio["total_value"] = decisions["total_value"]

        _save_paper_portfolio(portfolio)
        return {"portfolio": portfolio, "trades_executed": trades_executed, "decisions": decisions}

    except Exception as exc:
        logger.exception("Paper trade failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/paper-reset")
def paper_reset():
    """Reset the paper portfolio to $100,000 cash."""
    portfolio = {"cash": 100_000, "positions": {}, "total_value": 100_000, "trades": []}
    _save_paper_portfolio(portfolio)
    return {"message": "Paper portfolio reset", "portfolio": portfolio}


# ─────────────────────────────── Entry point ─────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api_server:app", host="0.0.0.0", port=8000, reload=True)
