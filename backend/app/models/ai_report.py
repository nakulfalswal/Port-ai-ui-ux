from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class AIReportCreate(BaseModel):
    query: str
    summary: str
    sentiment: str
    portfolio_score: int
    risk_alerts: List[Dict[str, Any]]
    market_insights: List[Dict[str, Any]]
    behavioral_insights: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    sector_exposure: Dict[str, Any]
    data_sources: List[str]
    user_id: Optional[str] = None

class AIReport(AIReportCreate):
    id: str
    created_at: datetime
