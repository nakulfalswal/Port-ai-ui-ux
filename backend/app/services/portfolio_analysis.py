import pandas as pd
import numpy as np

class PortfolioAnalysisService:
    @staticmethod
    async def analyze_diversification(assets: list):
        """
        assets: list of dicts with {'symbol': str, 'value': float, 'sector': str}
        """
        if not assets:
            return {"score": 0, "message": "No assets to analyze"}
            
        df = pd.DataFrame(assets)
        total_value = df['value'].sum()
        df['weight'] = df['value'] / total_value
        
        # Herfindahl-Hirschman Index (HHI) for diversification
        hhi = (df['weight']**2).sum()
        
        # Sector concentration
        sector_weights = df.groupby('sector')['weight'].sum()
        max_sector_concentration = sector_weights.max()
        
        score = 100 * (1 - hhi) # Simple score for demonstration
        
        return {
            "diversification_score": round(score, 2),
            "hhi": round(hhi, 4),
            "sector_allocation": sector_weights.to_dict(),
            "status": "Healthy" if score > 70 else "Concentrated Risk"
        }

    @staticmethod
    async def detect_biases(transactions: list):
        # Placeholder for bias detection logic
        # FOMO: Buying after a sharp price increase
        # Panic Selling: Selling after a sharp price decrease
        return [
            {"bias": "Recency Bias", "description": "Tendency to over-emphasize recent events.", "severity": "Medium"},
            {"bias": "Overconfidence", "description": "Aggressive positioning in high-volatility assets.", "severity": "Low"}
        ]

analysis_service = PortfolioAnalysisService()
