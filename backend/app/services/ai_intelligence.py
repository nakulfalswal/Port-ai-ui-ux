from openai import OpenAI
import os
from typing import List, Dict

class AIIntelligenceService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "sk-placeholder")
        self.client = OpenAI(api_key=self.api_key) if self.api_key != "sk-placeholder" else None

    async def generate_portfolio_report(self, portfolio_data: Dict):
        """
        Generates a professional financial report using LLM.
        """
        prompt = f"Analyze this portfolio: {portfolio_data}. Provide risk assessment, diversification advice, and bias detection."
        
        # In a real scenario, we would call the LLM here
        # For now, return a structured placeholder that mimics the UI requirements
        return {
            "summary": "Your portfolio is heavily tech-weighted. Consider defensive reallocation.",
            "score": 74,
            "biases": ["Recency Bias", "Home Bias"],
            "recommendations": [
                "Diversify into Emerging Markets",
                "Increase Energy sector exposure",
                "Set stop-loss triggers at 15%"
            ]
        }

    async def summarize_news(self, headlines: List[str]):
        return "Market sentiment is mixed with a defensive tilt towards value stocks."

ai_service = AIIntelligenceService()
