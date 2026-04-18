from fastapi import APIRouter, HTTPException
from app.services.market_data import market_service
from app.services.portfolio_analysis import analysis_service

router = APIRouter()

@router.get("/market/{symbol}")
async def get_market_data(symbol: str):
    data = await market_service.get_stock_info(symbol)
    if "error" in data:
        raise HTTPException(status_code=404, detail=data["error"])
    return data

@router.post("/portfolio/analyze")
async def analyze_portfolio(assets: list):
    analysis = await analysis_service.analyze_diversification(assets)
    return analysis

@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "portai-api"}
