"""Tests for fundamentals analyst agent."""
from unittest.mock import patch

from src.agents.fundamentals import fundamentals_agent
from src.data.models import FinancialMetrics


def _make_state(tickers=("AAPL",), end_date="2024-06-01", financials=None, details=None):
    return {
        "messages": [],
        "data": {
            "tickers": list(tickers),
            "start_date": "2024-01-01",
            "end_date": end_date,
            "financials": financials or {},
            "details": details or {},
        },
        "metadata": {"show_reasoning": False},
    }


def _make_metrics(ticker="AAPL", **kwargs):
    defaults = dict(period="quarterly", fiscal_period="Q1")
    defaults.update(kwargs)
    return FinancialMetrics(ticker=ticker, **defaults)


class TestFundamentalsAgent:
    def test_strong_bullish_all_metrics_good(self):
        result = fundamentals_agent(_make_state(financials={"AAPL": [
            _make_metrics(net_profit_margin=0.20, return_on_equity=0.20, debt_to_equity=0.3, revenue=120e6),
            _make_metrics(revenue=100e6),
        ]}))
        signals = result["data"]["analyst_signals"]["fundamentals_analyst"]
        assert signals[0]["signal"] == "bullish"
        assert signals[0]["confidence"] == 100  # 8/8

    def test_strong_bearish_all_metrics_bad(self):
        result = fundamentals_agent(_make_state(financials={"AAPL": [
            _make_metrics(net_profit_margin=0.02, return_on_equity=0.03, debt_to_equity=2.0, revenue=80e6),
            _make_metrics(revenue=100e6),
        ]}))
        signals = result["data"]["analyst_signals"]["fundamentals_analyst"]
        assert signals[0]["signal"] == "bearish"
        assert signals[0]["confidence"] == 0  # 0/8

    def test_no_metrics_returns_neutral(self):
        result = fundamentals_agent(_make_state(financials={"AAPL": []}))
        signals = result["data"]["analyst_signals"]["fundamentals_analyst"]
        assert signals[0]["signal"] == "neutral"
        assert signals[0]["confidence"] == 10

    def test_only_one_metric_no_revenue_growth(self):
        # With only 1 metric, revenue growth can't be computed (needs 2)
        result = fundamentals_agent(_make_state(financials={"AAPL": [
            _make_metrics(net_profit_margin=0.20, return_on_equity=0.20, debt_to_equity=0.3),
        ]}))
        signals = result["data"]["analyst_signals"]["fundamentals_analyst"]
        # Score=6/6 (revenue growth excluded), ratio=1.0 → bullish
        assert signals[0]["signal"] == "bullish"

    def test_all_fields_none(self):
        # Metrics present but all optional fields are None → max_score=0
        result = fundamentals_agent(_make_state(financials={"AAPL": [_make_metrics()]}))
        signals = result["data"]["analyst_signals"]["fundamentals_analyst"]
        assert signals[0]["signal"] == "neutral"
        assert signals[0]["confidence"] == 10
        assert "Insufficient data" in signals[0]["reasoning"]

    def test_moderate_metrics_neutral(self):
        # margin=0.08 (1/2), ROE=0.10 (1/2), D/E=1.0 (1/2), growth=5% (1/2) → 4/8=0.5
        result = fundamentals_agent(_make_state(financials={"AAPL": [
            _make_metrics(net_profit_margin=0.08, return_on_equity=0.10, debt_to_equity=1.0, revenue=105e6),
            _make_metrics(revenue=100e6),
        ]}))
        signals = result["data"]["analyst_signals"]["fundamentals_analyst"]
        assert signals[0]["signal"] == "neutral"
        assert signals[0]["confidence"] == 50

    def test_missing_ticker_returns_neutral_confidence_10(self):
        result = fundamentals_agent(_make_state(financials={}))
        signals = result["data"]["analyst_signals"]["fundamentals_analyst"]
        assert signals[0]["signal"] == "neutral"
        assert signals[0]["confidence"] == 10

    def test_revenue_growth_zero_previous_revenue(self):
        # metrics[1].revenue = 0 → revenue growth check skipped (no division error)
        result = fundamentals_agent(_make_state(financials={"AAPL": [
            _make_metrics(net_profit_margin=0.20, revenue=100e6),
            _make_metrics(revenue=0),
        ]}))
        signals = result["data"]["analyst_signals"]["fundamentals_analyst"]
        # Should not crash, revenue growth excluded from scoring
        assert signals[0]["signal"] in ("bullish", "neutral", "bearish")

    def test_boundary_margin_exactly_0_15(self):
        # margin=0.15: threshold is > 0.15 for strong, so this is "moderate" (1pt)
        result = fundamentals_agent(_make_state(financials={"AAPL": [_make_metrics(net_profit_margin=0.15)]}))
        signals = result["data"]["analyst_signals"]["fundamentals_analyst"]
        # 1/2 = 0.5 → neutral
        assert signals[0]["confidence"] == 50

    def test_boundary_margin_exactly_0_05(self):
        # margin=0.05: threshold is > 0.05 for moderate, so this is "weak" (0pt)
        result = fundamentals_agent(_make_state(financials={"AAPL": [_make_metrics(net_profit_margin=0.05)]}))
        signals = result["data"]["analyst_signals"]["fundamentals_analyst"]
        # 0/2 = 0.0 → bearish
        assert signals[0]["signal"] == "bearish"
        assert signals[0]["confidence"] == 0

    def test_multiple_tickers(self):
        result = fundamentals_agent(_make_state(
            tickers=("AAPL", "MSFT"),
            financials={"AAPL": [_make_metrics(net_profit_margin=0.20)]},
        ))
        signals = result["data"]["analyst_signals"]["fundamentals_analyst"]
        assert len(signals) == 2
        assert {s["ticker"] for s in signals} == {"AAPL", "MSFT"}
