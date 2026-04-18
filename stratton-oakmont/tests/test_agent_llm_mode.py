"""Tests for LLM mode in analyst agents.

Each agent tests:
1. LLM called when use_llm=True and data exists
2. LLM result mapped to AnalystSignal correctly
3. No data → returns early neutral, LLM not called
"""
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from src.data.models import AnalystSignal, CompanyNews, FinancialMetrics, LLMAnalysisResult, Price, SignalType


def _make_llm_result(signal=SignalType.BULLISH, confidence=80.0, reasoning="LLM says buy."):
    return LLMAnalysisResult(signal=signal, confidence=confidence, reasoning=reasoning)


def _make_metadata(use_llm=True):
    return {
        "model_name": "gpt-4o-mini",
        "model_provider": "openai",
        "show_reasoning": False,
        "use_llm": use_llm,
    }


def _make_metrics(ticker="AAPL", **kwargs):
    defaults = dict(period="quarterly", fiscal_period="Q1")
    defaults.update(kwargs)
    return FinancialMetrics(ticker=ticker, **defaults)


def _make_prices(n=60, base=100.0, trend=0.5):
    return [
        Price(
            open=base + i * trend,
            high=base + i * trend + 1,
            low=base + i * trend - 1,
            close=base + i * trend,
            volume=1_000_000 + i * 10_000,
            timestamp=datetime(2024, 1, 1) + timedelta(days=i),
        )
        for i in range(n)
    ]


# ── Fundamentals ───────────────────────────────────────────────────


class TestFundamentalsLlmMode:
    @patch("src.agents.fundamentals.call_llm")
    def test_llm_called_when_enabled(self, mock_call_llm):
        from src.agents.fundamentals import _analyze_ticker

        mock_call_llm.return_value = _make_llm_result()
        financials = {
            "AAPL": [
                _make_metrics(net_profit_margin=0.20, return_on_equity=0.18, debt_to_equity=0.4, revenue=1_000_000),
                _make_metrics(revenue=800_000),
            ]
        }

        result = _analyze_ticker("AAPL", financials, metadata=_make_metadata())

        mock_call_llm.assert_called_once()
        assert result.signal == SignalType.BULLISH
        assert result.reasoning == "LLM says buy."

    @patch("src.agents.fundamentals.call_llm")
    def test_no_data_returns_early_no_llm(self, mock_call_llm):
        from src.agents.fundamentals import _analyze_ticker

        result = _analyze_ticker("AAPL", {}, metadata=_make_metadata())

        mock_call_llm.assert_not_called()
        assert result.signal == SignalType.NEUTRAL
        assert result.confidence == 10

    @patch("src.agents.fundamentals.call_llm")
    def test_llm_not_called_when_disabled(self, mock_call_llm):
        from src.agents.fundamentals import _analyze_ticker

        financials = {
            "AAPL": [
                _make_metrics(net_profit_margin=0.20, return_on_equity=0.18, debt_to_equity=0.4, revenue=1_000_000),
                _make_metrics(revenue=800_000),
            ]
        }

        result = _analyze_ticker("AAPL", financials, metadata=_make_metadata(use_llm=False))

        mock_call_llm.assert_not_called()
        assert isinstance(result, AnalystSignal)


# ── Sentiment ──────────────────────────────────────────────────────


class TestSentimentLlmMode:
    @patch("src.agents.sentiment.call_llm")
    def test_llm_called_when_enabled(self, mock_call_llm):
        from src.agents.sentiment import _analyze_ticker

        articles = [
            CompanyNews(
                title="Company beats earnings expectations with record growth",
                description="Strong Q4 results.",
                published_utc=datetime(2024, 3, 1),
                article_url="https://example.com/news",
            )
        ] * 10
        mock_call_llm.return_value = _make_llm_result(SignalType.BEARISH, 65.0, "LLM sees risk.")

        result = _analyze_ticker("AAPL", {"AAPL": articles}, metadata=_make_metadata())

        mock_call_llm.assert_called_once()
        assert result.signal == SignalType.BEARISH
        assert result.reasoning == "LLM sees risk."

    @patch("src.agents.sentiment.call_llm")
    def test_no_news_returns_early_no_llm(self, mock_call_llm):
        from src.agents.sentiment import _analyze_ticker

        result = _analyze_ticker("AAPL", {"AAPL": []}, metadata=_make_metadata())

        mock_call_llm.assert_not_called()
        assert result.signal == SignalType.NEUTRAL

    @patch("src.agents.sentiment.call_llm")
    def test_llm_not_called_when_disabled(self, mock_call_llm):
        from src.agents.sentiment import _analyze_ticker

        articles = [
            CompanyNews(
                title="Big gains",
                description="",
                published_utc=datetime(2024, 3, 1),
                article_url="https://example.com/news",
            )
        ] * 10

        result = _analyze_ticker("AAPL", {"AAPL": articles}, metadata=_make_metadata(use_llm=False))

        mock_call_llm.assert_not_called()
        assert isinstance(result, AnalystSignal)


# ── Valuation ──────────────────────────────────────────────────────


class TestValuationLlmMode:
    @patch("src.agents.valuation.call_llm")
    def test_llm_called_when_enabled(self, mock_call_llm):
        from src.agents.valuation import _analyze_ticker
        from src.data.models import CompanyDetails

        mock_call_llm.return_value = _make_llm_result(SignalType.NEUTRAL, 50.0, "Fairly valued.")
        financials = {
            "AAPL": [
                _make_metrics(operating_cash_flow=5e9, earnings_per_share=6.0, shareholders_equity=50e9),
                _make_metrics(operating_cash_flow=4e9),
            ]
        }
        details = {
            "AAPL": CompanyDetails(
                ticker="AAPL",
                name="Apple",
                market_cap=100e9,
                weighted_shares_outstanding=10e9,
                share_class_shares_outstanding=10e9,
            )
        }

        result = _analyze_ticker("AAPL", financials, details, metadata=_make_metadata())

        mock_call_llm.assert_called_once()
        assert result.signal == SignalType.NEUTRAL
        assert result.reasoning == "Fairly valued."

    @patch("src.agents.valuation.call_llm")
    def test_no_data_returns_early_no_llm(self, mock_call_llm):
        from src.agents.valuation import _analyze_ticker

        result = _analyze_ticker("AAPL", {}, {}, metadata=_make_metadata())

        mock_call_llm.assert_not_called()
        assert result.signal == SignalType.NEUTRAL


# ── Technical ──────────────────────────────────────────────────────


class TestTechnicalLlmMode:
    @patch("src.agents.technical.call_llm")
    def test_llm_called_when_enabled(self, mock_call_llm):
        from src.agents.technical import _analyze_ticker

        mock_call_llm.return_value = _make_llm_result(SignalType.BULLISH, 85.0, "Strong trend.")

        signal, price = _analyze_ticker("AAPL", {"AAPL": _make_prices(60)}, metadata=_make_metadata())

        mock_call_llm.assert_called_once()
        assert signal.signal == SignalType.BULLISH
        assert signal.reasoning == "Strong trend."
        assert price is not None

    @patch("src.agents.technical.call_llm")
    def test_insufficient_bars_no_llm(self, mock_call_llm):
        from src.agents.technical import _analyze_ticker

        signal, price = _analyze_ticker("AAPL", {"AAPL": _make_prices(10)}, metadata=_make_metadata())

        mock_call_llm.assert_not_called()
        assert signal.signal == SignalType.NEUTRAL

    @patch("src.agents.technical.call_llm")
    def test_llm_not_called_when_disabled(self, mock_call_llm):
        from src.agents.technical import _analyze_ticker

        signal, price = _analyze_ticker("AAPL", {"AAPL": _make_prices(60)}, metadata=_make_metadata(use_llm=False))

        mock_call_llm.assert_not_called()
        assert isinstance(signal, AnalystSignal)


# ── Growth ─────────────────────────────────────────────────────────


class TestGrowthLlmMode:
    @patch("src.agents.growth.call_llm")
    def test_llm_called_when_enabled(self, mock_call_llm):
        from src.agents.growth import _analyze_ticker

        mock_call_llm.return_value = _make_llm_result(SignalType.BULLISH, 90.0, "Accelerating growth.")
        financials = {
            "AAPL": [
                _make_metrics(revenue=1_000_000, net_income=200_000, net_profit_margin=0.23),
                _make_metrics(revenue=850_000, net_income=170_000, net_profit_margin=0.22),
                _make_metrics(revenue=720_000, net_income=145_000, net_profit_margin=0.21),
                _make_metrics(revenue=600_000, net_income=120_000, net_profit_margin=0.20),
            ]
        }

        result = _analyze_ticker("AAPL", financials, metadata=_make_metadata())

        mock_call_llm.assert_called_once()
        assert result.signal == SignalType.BULLISH
        assert result.reasoning == "Accelerating growth."

    @patch("src.agents.growth.call_llm")
    def test_insufficient_data_no_llm(self, mock_call_llm):
        from src.agents.growth import _analyze_ticker

        result = _analyze_ticker("AAPL", {"AAPL": [_make_metrics()]}, metadata=_make_metadata())

        mock_call_llm.assert_not_called()
        assert result.signal == SignalType.NEUTRAL

    @patch("src.agents.growth.call_llm")
    def test_llm_not_called_when_disabled(self, mock_call_llm):
        from src.agents.growth import _analyze_ticker

        financials = {
            "AAPL": [
                _make_metrics(revenue=1_000_000, net_income=200_000, net_profit_margin=0.23),
                _make_metrics(revenue=850_000, net_income=170_000, net_profit_margin=0.22),
                _make_metrics(revenue=720_000, net_income=145_000, net_profit_margin=0.21),
                _make_metrics(revenue=600_000, net_income=120_000, net_profit_margin=0.20),
            ]
        }

        result = _analyze_ticker("AAPL", financials, metadata=_make_metadata(use_llm=False))

        mock_call_llm.assert_not_called()
        assert isinstance(result, AnalystSignal)
