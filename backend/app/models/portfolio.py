from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Transaction(BaseModel):
    symbol: str
    quantity: float
    price: float
    date: str
    type: str

class Portfolio(BaseModel):
    id: str
    user_id: str
    name: str
    transactions: List[Transaction]
    created_at: datetime
    updated_at: datetime
