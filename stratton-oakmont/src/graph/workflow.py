"""LangGraph workflow builder and runner."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from langgraph.graph import END, START, StateGraph

from src.agents.portfolio_manager import portfolio_manager_agent
from src.agents.risk_manager import risk_manager_agent
from src.config.agents import ANALYST_CONFIG, PERSONA_CONFIG
from src.graph.state import AgentState

logger = logging.getLogger(__name__)


def create_workflow(personas: list[str] | None = None) -> StateGraph:
    """Build the LangGraph workflow.

    Topology:
        START ──┬── analyst_1 ──┐
                ├── analyst_2 ──┤
                ├── persona_1 ──┤
                └── ...       ──┤
                                ├── risk_manager ── portfolio_manager ── END
    """
    workflow = StateGraph(AgentState)

    # Register core analyst nodes
    analyst_node_names: list[str] = []
    for key, (node_name, agent_func) in ANALYST_CONFIG.items():
        workflow.add_node(node_name, agent_func)
        analyst_node_names.append(node_name)
        logger.debug(f"Registered analyst node: {node_name}")

    # Register persona nodes (opt-in)
    if personas:
        available = set(PERSONA_CONFIG.keys())
        requested = set(personas) if personas != ["all"] else available
        for key in requested & available:
            node_name, agent_func = PERSONA_CONFIG[key]
            workflow.add_node(node_name, agent_func)
            analyst_node_names.append(node_name)
            logger.debug(f"Registered persona node: {node_name}")
        unknown = requested - available
        if unknown:
            logger.warning(f"Unknown personas ignored: {unknown}. Available: {available}")

    # Register risk manager and portfolio manager
    workflow.add_node("risk_manager", risk_manager_agent)
    workflow.add_node("portfolio_manager", portfolio_manager_agent)

    # Edges: START -> all analysts (parallel fan-out)
    for node_name in analyst_node_names:
        workflow.add_edge(START, node_name)

    # Edges: all analysts -> risk_manager (fan-in)
    for node_name in analyst_node_names:
        workflow.add_edge(node_name, "risk_manager")

    # Edges: risk_manager -> portfolio_manager -> END
    workflow.add_edge("risk_manager", "portfolio_manager")
    workflow.add_edge("portfolio_manager", END)

    return workflow


def run_hedge_fund(
    tickers: list[str],
    start_date: str | None = None,
    end_date: str | None = None,
    portfolio: dict[str, Any] | None = None,
    model_name: str = "gpt-4o-mini",
    model_provider: str = "openai",
    show_reasoning: bool = True,
    use_llm: bool = False,
    personas: list[str] | None = None,
) -> dict[str, Any]:
    """Execute the full hedge fund workflow.

    Returns the final AgentState with all signals and portfolio decisions.
    """
    if end_date is None:
        end_date = datetime.now().strftime("%Y-%m-%d")
    if start_date is None:
        start_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
    if portfolio is None:
        portfolio = {"cash": 100000, "positions": {}, "total_value": 100000}

    workflow = create_workflow(personas=personas)
    graph = workflow.compile()

    logger.info(f"Running hedge fund for {tickers} ({start_date} to {end_date})")

    # Pre-fetch ALL data into state so agents NEVER call the API.
    # This avoids the free-tier rate limit (5 req/min) being blown by
    # 6 agents firing in parallel after prefetch already consumed budget.
    prefetched = _prefetch_all(tickers, start_date, end_date)

    initial_state: AgentState = {
        "messages": [],
        "data": {
            "tickers": tickers,
            "portfolio": portfolio,
            "start_date": start_date,
            "end_date": end_date,
            "analyst_signals": {},
            "current_prices": {},
            **prefetched,
        },
        "metadata": {
            "model_name": model_name,
            "model_provider": model_provider,
            "show_reasoning": show_reasoning,
            "use_llm": use_llm,
        },
    }

    final_state = graph.invoke(initial_state)
    logger.info("Workflow complete.")

    return final_state


def _prefetch_all(tickers: list[str], start_date: str, end_date: str) -> dict[str, Any]:
    """Fetch all data sequentially before agents run. Returns dict for AgentState.

    All data is stored in state["data"] so agents read from memory — zero API
    calls during the parallel agent phase. This keeps within Polygon's free-tier
    5 req/min limit by adding delays and using YFinance as a fallback.
    """
    import time

    import src.data.polygon_client as polygon
    import src.data.yfinance_client as yf
    from src.agents.macro_regime import SECTOR_ETFS
    from src.config.settings import DATA_PROVIDER

    result: dict[str, Any] = {
        "prices": {},       # ticker -> list[Price]
        "financials": {},   # ticker -> list[FinancialMetrics]
        "news": {},         # ticker -> list[CompanyNews]
        "details": {},      # ticker -> CompanyDetails
    }

    all_tickers = tickers + ["SPY"] + list(SECTOR_ETFS.keys())

    for ticker in all_tickers:
        logger.info(f"Prefetching data for {ticker} (Provider: {DATA_PROVIDER})...")
        
        # Mandatory delay to respect Polygon's 5 req/min (12s per request ideally)
        if DATA_PROVIDER == "polygon":
            time.sleep(1.5)

        # 1. Prices
        if DATA_PROVIDER == "yfinance":
            try:
                result["prices"][ticker] = yf.get_prices(ticker, start_date, end_date)
            except Exception as e:
                logger.warning(f"YFinance prices failed for {ticker}, trying Polygon: {e}")
                try:
                    result["prices"][ticker] = polygon.get_prices(ticker, start_date, end_date)
                except Exception as pe:
                    logger.error(f"Polygon prices also failed for {ticker}: {pe}")
                    result["prices"][ticker] = []
        else:
            try:
                result["prices"][ticker] = polygon.get_prices(ticker, start_date, end_date)
            except Exception as e:
                logger.warning(f"Polygon prices failed for {ticker}, trying YFinance: {e}")
                try:
                    result["prices"][ticker] = yf.get_prices(ticker, start_date, end_date)
                except Exception as yfe:
                    logger.error(f"YFinance prices also failed for {ticker}: {yfe}")
                    result["prices"][ticker] = []

        # Skip fundamentals/news/details for SPY and sector ETFs
        if ticker in ("SPY",) or ticker in SECTOR_ETFS:
            continue

        # 2. Financials
        if DATA_PROVIDER == "yfinance":
            try:
                result["financials"][ticker] = yf.get_financial_metrics(ticker, end_date=end_date, limit=8)
            except Exception as e:
                logger.warning(f"YFinance financials failed for {ticker}, trying Polygon: {e}")
                try:
                    result["financials"][ticker] = polygon.get_financial_metrics(ticker, end_date=end_date, limit=8)
                except Exception as pe:
                    logger.error(f"Polygon financials also failed for {ticker}: {pe}")
                    result["financials"][ticker] = []
        else:
            try:
                result["financials"][ticker] = polygon.get_financial_metrics(
                    ticker, end_date=end_date, limit=8
                )
            except Exception as e:
                logger.warning(f"Polygon financials failed for {ticker}, trying YFinance: {e}")
                try:
                    result["financials"][ticker] = yf.get_financial_metrics(ticker, end_date=end_date, limit=8)
                except Exception as yfe:
                    logger.error(f"YFinance financials also failed for {ticker}: {yfe}")
                    result["financials"][ticker] = []

        # 3. News
        if DATA_PROVIDER == "yfinance":
            try:
                result["news"][ticker] = yf.get_company_news(ticker, limit=20)
            except Exception as e:
                logger.warning(f"YFinance news failed for {ticker}, trying Polygon: {e}")
                try:
                    result["news"][ticker] = polygon.get_company_news(
                        ticker, start_date=start_date, end_date=end_date, limit=20
                    )
                except Exception as pe:
                    logger.error(f"Polygon news also failed for {ticker}: {pe}")
                    result["news"][ticker] = []
        else:
            try:
                result["news"][ticker] = polygon.get_company_news(
                    ticker, start_date=start_date, end_date=end_date, limit=20
                )
            except Exception as e:
                logger.warning(f"Polygon news failed for {ticker}, trying YFinance: {e}")
                try:
                    result["news"][ticker] = yf.get_company_news(ticker, limit=20)
                except Exception as yfe:
                    logger.error(f"YFinance news also failed for {ticker}: {yfe}")
                    result["news"][ticker] = []

        # 4. Company details
        if DATA_PROVIDER == "yfinance":
            try:
                result["details"][ticker] = yf.get_company_details(ticker)
            except Exception as e:
                logger.warning(f"YFinance details failed for {ticker}, trying Polygon: {e}")
                try:
                    result["details"][ticker] = polygon.get_company_details(ticker)
                except Exception as pe:
                    logger.error(f"Polygon details also failed for {ticker}: {pe}")
                    result["details"][ticker] = None
        else:
            try:
                result["details"][ticker] = polygon.get_company_details(ticker)
            except Exception as e:
                logger.warning(f"Polygon details failed for {ticker}, trying YFinance: {e}")
                try:
                    result["details"][ticker] = yf.get_company_details(ticker)
                except Exception as yfe:
                    logger.error(f"YFinance details also failed for {ticker}: {yfe}")
                    result["details"][ticker] = None

    return result
