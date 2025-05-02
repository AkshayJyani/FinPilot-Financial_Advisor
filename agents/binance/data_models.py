from typing import Dict, List, Any
from pydantic import BaseModel, Field


class InvestmentType:
    """Types of investments in Binance portfolio"""
    SPOT = "spot"
    SPOT_CROSS_MARGIN = "spot_cross_margin"
    FUTURES = "futures"
    FUTURES_CROSS_MARGIN = "futures_cross_margin"


class PortfolioData(BaseModel):
    """Model for storing portfolio data"""
    holdings: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    transactions: List[Dict[str, Any]] = Field(default_factory=list)
    market_data: Dict[str, float] = Field(default_factory=dict)
    sector_allocation: Dict[str, float] = Field(default_factory=dict)
    investment_types: Dict[str, Dict[str, float]] = Field(default_factory=dict) 