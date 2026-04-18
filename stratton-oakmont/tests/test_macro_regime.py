"""Tests for macro regime / market environment analyst agent."""
from datetime import datetime, timedelta

from src.agents.macro_regime import (
    AGENT_ID,
    MarketRegime,
    _analyze_ticker,
    _compute_regime,
    _get_ticker_sector,
    macro_regime_agent,
)
from src.data.models import Price, SignalType


def _make_state(tickers=("AAPL",), start_date="2024-01-01", end_date="2024-06-01", prices=None, details=None):
    return {
        "messages": [],
        "data": {
            "tickers": list(tickers),
            "start_date": start_date,
            "end_date": end_date,
            "prices": prices or {},
            "details": details or {},
        },
        "metadata": {"show_reasoning": False},
    }


def _make_prices(closes, volumes=None):
    if volumes is None:
        volumes = [1_000_000] * len(closes)
    return [
        Price(
            open=c, high=c + 1, low=c - 1, close=c, volume=v,
            timestamp=datetime(2024, 1, 1) + timedelta(days=i),
        )
        for i, (c, v) in enumerate(zip(closes, volumes))
    ]


# ── Ticker sector lookup ──────────────────────────────────────────────


class TestGetTickerSector:
    def test_known_override_tech(self):
        assert _get_ticker_sector("AAPL", {}) == "technology"

    def test_known_override_financials(self):
        assert _get_ticker_sector("JPM", {}) == "financials"

    def test_known_override_energy(self):
        assert _get_ticker_sector("XOM", {}) == "energy"

    def test_sic_code_fallback(self):
        from src.data.models import CompanyDetails
        details = CompanyDetails(ticker="UNKNOWN_TICKER", name="Test", sic_code="7372")
        assert _get_ticker_sector("UNKNOWN_TICKER", {"UNKNOWN_TICKER": details}) == "technology"

    def test_no_details_returns_none(self):
        assert _get_ticker_sector("UNKNOWN_TICKER", {}) is None

    def test_missing_ticker_in_details_returns_none(self):
        assert _get_ticker_sector("UNKNOWN_TICKER", {"UNKNOWN_TICKER": None}) is None


# ── Regime computation ────────────────────────────────────────────────


class TestComputeRegime:
    def test_insufficient_spy_data(self):
        prices = {"SPY": _make_prices([100.0] * 30)}  # <50 bars
        regime = _compute_regime(["AAPL"], prices, {})
        assert regime.spy_volatility is None
        assert regime.spy_above_sma50 is None

    def test_bullish_spy_trend(self):
        spy_closes = [400.0 + i * 0.5 for i in range(220)]
        prices = {"SPY": _make_prices(spy_closes)}
        cyclical_etfs = ["XLK", "XLF", "XLE", "XLI", "XLY", "XLB"]
        defensive_etfs = ["XLU", "XLP", "XLV", "XLRE", "XLC"]
        for etf in cyclical_etfs:
            prices[etf] = _make_prices([100.0 + i * 0.8 for i in range(60)])
        for etf in defensive_etfs:
            prices[etf] = _make_prices([100.0 + i * 0.2 for i in range(60)])
        regime = _compute_regime(["AAPL"], prices, {})
        assert regime.spy_above_sma50 is True
        assert regime.spy_above_sma200 is True
        assert regime.cyclical_vs_defensive > 0
        assert regime.score > 0

    def test_bearish_spy_trend(self):
        spy_closes = [500.0 - i * 2.0 for i in range(220)]
        prices = {"SPY": _make_prices(spy_closes)}
        for etf in ["XLU", "XLP", "XLV", "XLRE", "XLC"]:
            prices[etf] = _make_prices([100.0 + i * 0.3 for i in range(60)])
        for etf in ["XLK", "XLF", "XLE", "XLI", "XLY", "XLB"]:
            prices[etf] = _make_prices([100.0 - i * 0.5 for i in range(60)])
        regime = _compute_regime(["AAPL"], prices, {})
        assert regime.spy_above_sma50 is False

    def test_breadth_computation(self):
        prices = {
            "AAPL": _make_prices([100.0 + i * 0.5 for i in range(60)]),
            "MSFT": _make_prices([100.0 + i * 0.5 for i in range(60)]),
        }
        regime = _compute_regime(["AAPL", "MSFT"], prices, {})
        assert regime.breadth_pct is not None
        assert regime.breadth_pct == 1.0

    def test_sector_returns_populated(self):
        prices = {}
        for etf in ["XLK", "XLF", "XLE", "XLI", "XLY", "XLB"]:
            prices[etf] = _make_prices([100.0 + i * 0.3 for i in range(60)])
        regime = _compute_regime(["AAPL"], prices, {})
        assert len(regime.sector_returns) > 0


# ── Per-ticker analysis ───────────────────────────────────────────────


class TestAnalyzeTicker:
    def test_no_regime_returns_neutral(self):
        signal = _analyze_ticker("AAPL", None, {}, {})
        assert signal.signal == SignalType.NEUTRAL
        assert signal.confidence == 10

    def test_empty_regime_returns_neutral(self):
        regime = MarketRegime()  # max_score=0
        signal = _analyze_ticker("AAPL", regime, {}, {})
        assert signal.signal == SignalType.NEUTRAL
        assert signal.confidence == 10

    def test_bullish_regime_high_confidence(self):
        regime = MarketRegime()
        regime.score = 8
        regime.max_score = 8
        regime.reasons = ["SPY bullish", "Cyclicals leading"]
        regime.sector_returns = {"technology": 0.05, "financials": 0.03}
        regime.leading_sectors = ["technology"]
        regime.lagging_sectors = ["financials"]
        signal = _analyze_ticker("AAPL", regime, {}, {})
        assert signal.signal == SignalType.BULLISH
        assert signal.confidence >= 65

    def test_bearish_regime_low_confidence(self):
        regime = MarketRegime()
        regime.score = 1
        regime.max_score = 8
        regime.reasons = ["SPY bearish"]
        regime.sector_returns = {"technology": -0.05}
        regime.leading_sectors = ["utilities"]
        regime.lagging_sectors = ["technology"]
        signal = _analyze_ticker("AAPL", regime, {}, {})
        assert signal.signal == SignalType.BEARISH


# ── Full agent integration ────────────────────────────────────────────


class TestMacroRegimeAgent:
    def test_output_structure(self):
        prices = {"AAPL": _make_prices([100.0 + i * 0.3 for i in range(60)])}
        result = macro_regime_agent(_make_state(prices=prices))
        assert "messages" in result
        assert len(result["messages"]) == 1
        assert "analyst_signals" in result["data"]
        assert AGENT_ID in result["data"]["analyst_signals"]

    def test_multiple_tickers(self):
        prices = {
            "AAPL": _make_prices([100.0 + i * 0.5 for i in range(220)]),
            "MSFT": _make_prices([100.0 + i * 0.5 for i in range(220)]),
        }
        result = macro_regime_agent(_make_state(tickers=("AAPL", "MSFT"), prices=prices))
        signals = result["data"]["analyst_signals"][AGENT_ID]
        assert len(signals) == 2
        tickers = {s["ticker"] for s in signals}
        assert tickers == {"AAPL", "MSFT"}

    def test_missing_prices_returns_neutral(self):
        result = macro_regime_agent(_make_state(prices={}))
        signals = result["data"]["analyst_signals"][AGENT_ID]
        assert signals[0]["signal"] == "neutral"
        assert signals[0]["confidence"] == 10

    def test_signal_fields_present(self):
        prices = {"AAPL": _make_prices([100.0 + i * 0.5 for i in range(220)])}
        result = macro_regime_agent(_make_state(prices=prices))
        signal = result["data"]["analyst_signals"][AGENT_ID][0]
        assert all(k in signal for k in ("agent_id", "ticker", "signal", "confidence", "reasoning"))
        assert signal["agent_id"] == AGENT_ID

    def test_sector_mentioned_for_known_ticker(self):
        # Need SPY and sector ETFs for regime to include sector in reasoning
        prices = {
            "AAPL": _make_prices([100.0 + i * 0.5 for i in range(220)]),
            "SPY": _make_prices([400.0 + i * 0.5 for i in range(220)]),
            "XLK": _make_prices([100.0 + i * 0.8 for i in range(60)]),
            "XLF": _make_prices([100.0 + i * 0.6 for i in range(60)]),
            "XLE": _make_prices([100.0 + i * 0.4 for i in range(60)]),
            "XLI": _make_prices([100.0 + i * 0.3 for i in range(60)]),
            "XLY": _make_prices([100.0 + i * 0.3 for i in range(60)]),
            "XLB": _make_prices([100.0 + i * 0.3 for i in range(60)]),
        }
        result = macro_regime_agent(_make_state(tickers=("AAPL",), prices=prices))
        signal = result["data"]["analyst_signals"][AGENT_ID][0]
        assert "sector" in signal["reasoning"].lower()
