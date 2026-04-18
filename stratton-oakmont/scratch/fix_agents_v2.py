import os
import re

agents_dir = "/Users/avishukla/Desktop/stratton-oakmont/src/agents"
# We want to fix almost all persona agents
persona_agents = [
    f for f in os.listdir(agents_dir) 
    if f.endswith(".py") and f not in ["__init__.py", "fundamentals.py", "growth.py", "macro_regime.py", "portfolio_manager.py", "risk_manager.py", "sentiment.py", "technical.py", "valuation.py"]
]

def fix_file(filepath):
    with open(filepath, "r") as f:
        content = f.read()
    
    # 1. Fix imports
    # Remove any polygon imports
    content = re.sub(r'from src\.data\.polygon_client import.*', '', content)
    
    # Ensure necessary items are imported from models
    if "CompanyDetails" not in content:
        content = content.replace(
            "from src.data.models import AnalystSignal, LLMAnalysisResult, SignalType",
            "from src.data.models import AnalystSignal, CompanyDetails, FinancialMetrics, LLMAnalysisResult, SignalType"
        )
    
    # 2. Fix the main agent function signature (if needed)
    # Most likely already updated by previous script but let's be sure.
    
    # 3. Fix _analyze_ticker calls in the main agent function
    content = re.sub(
        r'signal = _analyze_ticker\(ticker, end_date, metadata\)',
        r'signal = _analyze_ticker(ticker, financials_map, details_map, metadata)',
        content
    )
    
    # 4. Fix _analyze_ticker definition
    content = re.sub(
        r'def _analyze_ticker\(ticker: str, end_date: str, metadata: dict\) -> AnalystSignal:',
        """def _analyze_ticker(
    ticker: str,
    financials_map: dict[str, list],
    details_map: dict[str, Any],
    metadata: dict,
) -> AnalystSignal:""",
        content
    )
    
    # 5. Fix the inside of _analyze_ticker to use prefetched data
    # We want to replace calls like:
    # metrics = get_financial_metrics(ticker, end_date=end_date, limit=10)
    # details = get_company_details(ticker)
    
    # Use a regex that catches variations in arguments
    content = re.sub(
        r'metrics = get_financial_metrics\(ticker,.*?\)\n\s*details = get_company_details\(ticker\)',
        """metrics_raw = financials_map.get(ticker, [])
    metrics: list[FinancialMetrics] = [
        FinancialMetrics.model_validate(m) if isinstance(m, dict) else m for m in metrics_raw
    ]
    details_raw = details_map.get(ticker)
    details = CompanyDetails.model_validate(details_raw) if isinstance(details_raw, dict) else details_raw""",
        content,
        flags=re.DOTALL
    )

    with open(filepath, "w") as f:
        f.write(content)

for filename in persona_agents:
    fix_file(os.path.join(agents_dir, filename))
    print(f"Fixed {filename}")
