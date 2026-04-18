"""Tests for growth analyst agent."""
from unittest.mock import patch

import pytest

from src.agents.growth import growth_agent, _compute_growth_rates
from src.data.models import FinancialMetrics


def _make_state(tickers=("AAPL",), end_date="2024-06-01", financials=None):
    return {
        "messages": [],
        "data": {
            "tickers": list(tickers),
            "start_date": "2024-01-01",
            "end_date": end_date,
            "financials": financials or {},
        },
        "metadata": {"show_reasoning": False},
    }


def _make_metrics(ticker="AAPL", **kwargs):
    defaults = dict(period="quarterly", fiscal_period="Q1")
    defaults.update(kwargs)
    return FinancialMetrics(ticker=ticker, **defaults)


class TestComputeGrowthRates:
    def test_basic_positive_growth(self):
        # [120, 100] newest-first → (120-100)/100 = 0.2
        assert _compute_growth_rates([120, 100]) == pytest.approx([0.2])

    def test_negative_growth(self):
        # [80, 100] → (80-100)/100 = -0.2
        assert _compute_growth_rates([80, 100]) == pytest.approx([-0.2])

    def test_none_values_skipped(self):
        # [120, None, 100] → pairs (120, None) and (None, 100) are both skipped
        assert _compute_growth_rates([120, None, 100]) == []

    def test_zero_denominator_skipped(self):
        assert _compute_growth_rates([100, 0]) == []

    def test_multiple_periods(self):
        # [150, 120, 100] → [(150-120)/120, (120-100)/100] = [0.25, 0.2]
        result = _compute_growth_rates([150, 120, 100])
        assert result == pytest.approx([0.25, 0.2])

    def test_empty_list(self):
        assert _compute_growth_rates([]) == []

    def test_single_value(self):
        assert _compute_growth_rates([100]) == []


class TestGrowthAgent:
    def test_insufficient_data_less_than_2_metrics(self):
        result = growth_agent(_make_state(financials={"AAPL": [_make_metrics()]}))
        signals = result["data"]["analyst_signals"]["growth_analyst"]
        assert signals[0]["signal"] == "neutral"
        assert signals[0]["confidence"] == 10

    def test_strong_bullish(self):
        # 4 metrics with strong growth, high earnings, accelerating, consistent, expanding margins
        result = growth_agent(_make_state(financials={"AAPL": [
            _make_metrics(revenue=200e6, net_income=40e6, net_profit_margin=0.20),
            _make_metrics(revenue=160e6, net_income=28e6, net_profit_margin=0.175),
            _make_metrics(revenue=135e6, net_income=22e6, net_profit_margin=0.163),
            _make_metrics(revenue=120e6, net_income=18e6, net_profit_margin=0.15),
        ]}))
        signals = result["data"]["analyst_signals"]["growth_analyst"]
        assert signals[0]["signal"] == "bullish"

    def test_strong_bearish(self):
        # Declining revenue, declining earnings, decelerating, inconsistent, contracting margins
        result = growth_agent(_make_state(financials={"AAPL": [
            _make_metrics(revenue=60e6, net_income=3e6, net_profit_margin=0.05),
            _make_metrics(revenue=80e6, net_income=8e6, net_profit_margin=0.10),
            _make_metrics(revenue=95e6, net_income=14e6, net_profit_margin=0.147),
            _make_metrics(revenue=100e6, net_income=15e6, net_profit_margin=0.15),
        ]}))
        signals = result["data"]["analyst_signals"]["growth_analyst"]
        assert signals[0]["signal"] == "bearish"

    def test_bearish_threshold_is_0_30(self):
        # Growth agent uses 0.30 for bearish (not 0.35). Ratio=0.31 should be neutral.
        # With 2 metrics, max available: revenue(3) + earnings(3) = 6
        # Need score ~2 for ratio=0.33 → neutral
        result = growth_agent(_make_state(financials={"AAPL": [
            _make_metrics(revenue=102e6, net_income=101e6),
            _make_metrics(revenue=100e6, net_income=100e6),
        ]}))
        signals = result["data"]["analyst_signals"]["growth_analyst"]
        # rev growth 2% (slow, 1pt), earn growth 1% (slow, 1pt) → 2/6=0.33 > 0.30
        assert signals[0]["signal"] == "neutral"

    def test_neutral_mid_range(self):
        # rev growth = 3% (slow, 1pt/3), earn growth = 3% (slow, 1pt/3) → 2/6 = 0.33
        result = growth_agent(_make_state(financials={"AAPL": [
            _make_metrics(revenue=103e6, net_income=10.3e6),
            _make_metrics(revenue=100e6, net_income=10e6),
        ]}))
        signals = result["data"]["analyst_signals"]["growth_analyst"]
        assert signals[0]["signal"] == "neutral"

    def test_acceleration_scoring(self):
        # 3 metrics needed for acceleration (needs 2+ growth rates)
        # rates = [0.20, 0.10] → acceleration = 0.10 > 0.02 → 2pts
        result = growth_agent(_make_state(financials={"AAPL": [
            _make_metrics(revenue=144e6),
            _make_metrics(revenue=120e6),
            _make_metrics(revenue=109e6),
        ]}))
        signals = result["data"]["analyst_signals"]["growth_analyst"]
        assert "accelerating" in signals[0]["reasoning"].lower()

    def test_consistency_all_positive(self):
        # 4 metrics → 3 growth rates, all positive → consistency=1.0 → 2pts
        result = growth_agent(_make_state(financials={"AAPL": [
            _make_metrics(revenue=130e6),
            _make_metrics(revenue=120e6),
            _make_metrics(revenue=110e6),
            _make_metrics(revenue=100e6),
        ]}))
        signals = result["data"]["analyst_signals"]["growth_analyst"]
        assert "3/3 positive" in signals[0]["reasoning"]

    def test_margin_expansion(self):
        result = growth_agent(_make_state(financials={"AAPL": [
            _make_metrics(revenue=120e6, net_profit_margin=0.20),
            _make_metrics(revenue=100e6, net_profit_margin=0.10),
        ]}))
        signals = result["data"]["analyst_signals"]["growth_analyst"]
        assert "expanding" in signals[0]["reasoning"].lower()

    def test_missing_ticker_returns_neutral_confidence_10(self):
        result = growth_agent(_make_state(financials={}))
        signals = result["data"]["analyst_signals"]["growth_analyst"]
        assert signals[0]["signal"] == "neutral"
        assert signals[0]["confidence"] == 10

    def test_all_fields_none_returns_neutral(self):
        # Metrics exist but revenue/net_income/margins all None → max_score=0
        result = growth_agent(_make_state(financials={"AAPL": [_make_metrics(), _make_metrics()]}))
        signals = result["data"]["analyst_signals"]["growth_analyst"]
        assert signals[0]["signal"] == "neutral"
        assert signals[0]["confidence"] == 10
