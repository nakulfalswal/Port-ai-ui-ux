import os
import httpx
from typing import Dict, List, Optional
from pydantic import BaseModel

class Holding(BaseModel):
    symbol: str
    quantity: int
    avg_price: float
    ltp: float
    pnl: float
    pnl_pct: float

UPSTOX_API_KEY = os.getenv("UPSTOX_API_KEY")
UPSTOX_API_SECRET = os.getenv("UPSTOX_API_SECRET")
UPSTOX_REDIRECT_URI = os.getenv("UPSTOX_REDIRECT_URI", "https://port-ai-alpha.vercel.app/callback/upstox")

# Mock data for when API keys are not provided
MOCK_HOLDINGS = [
    Holding(symbol="TCS", quantity=50, avg_price=3500.50, ltp=3800.00, pnl=14975.0, pnl_pct=8.55),
    Holding(symbol="HDFCBANK", quantity=100, avg_price=1450.00, ltp=1420.00, pnl=-3000.0, pnl_pct=-2.06),
    Holding(symbol="RELIANCE", quantity=25, avg_price=2400.00, ltp=2950.00, pnl=13750.0, pnl_pct=22.91),
    Holding(symbol="INFY", quantity=40, avg_price=1400.00, ltp=1480.00, pnl=3200.0, pnl_pct=5.71)
]

def generate_upstox_login_url() -> str:
    """Generates the OAuth login URL for Upstox."""
    if not UPSTOX_API_KEY:
        # Return a dummy URL to simulate auth flow in the frontend if keys are missing
        return "mock_auth_flow"
        
    url = f"https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id={UPSTOX_API_KEY}&redirect_uri={UPSTOX_REDIRECT_URI}"
    return url

async def exchange_upstox_code(code: str) -> Optional[str]:
    """Exchanges the auth code for an access token."""
    if code == "mock_code" or not UPSTOX_API_KEY or not UPSTOX_API_SECRET:
        return "mock_access_token_12345"
        
    try:
        data = {
            "code": code,
            "client_id": UPSTOX_API_KEY,
            "client_secret": UPSTOX_API_SECRET,
            "redirect_uri": UPSTOX_REDIRECT_URI,
            "grant_type": "authorization_code"
        }
        headers = {
            "accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post("https://api.upstox.com/v2/login/authorization/token", data=data, headers=headers)
            if resp.status_code == 200:
                return resp.json().get("access_token")
            else:
                print(f"Upstox token error: {resp.text}")
                return None
    except Exception as e:
        print(f"Error exchanging Upstox code: {e}")
        return None

async def fetch_upstox_holdings(access_token: str) -> List[Dict]:
    """Fetches holdings from Upstox and normalizes them into our standard format."""
    if access_token == "mock_access_token_12345":
        return [h.model_dump() for h in MOCK_HOLDINGS]
        
    try:
        headers = {
            "accept": "application/json",
            "Authorization": f"Bearer {access_token}"
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get("https://api.upstox.com/v2/portfolio/long-term-holdings", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                holdings = []
                for item in data.get("data", []):
                    # Normalize Upstox item format
                    # Assumes Upstox returns: trading_symbol, quantity, average_price, last_price, pnl, day_change_percentage etc.
                    holding = Holding(
                        symbol=item.get("trading_symbol", "UNKNOWN"),
                        quantity=int(item.get("quantity", 0)),
                        avg_price=float(item.get("average_price", 0.0)),
                        ltp=float(item.get("last_price", 0.0)),
                        pnl=float(item.get("pnl", 0.0)),
                        pnl_pct=float(item.get("day_change_percentage", 0.0))
                    )
                    holdings.append(holding.model_dump())
                return holdings
            else:
                print(f"Upstox holdings error: {resp.text}")
                return []
    except Exception as e:
        print(f"Error fetching Upstox holdings: {e}")
        return []
