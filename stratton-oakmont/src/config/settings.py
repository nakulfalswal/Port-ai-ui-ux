"""Environment settings loaded from .env file."""
import os

from dotenv import load_dotenv

load_dotenv()

# --- Market Data ---
POLYGON_API_KEY: str = os.getenv("POLYGON_API_KEY", "")

# --- Broker ---
QUANTCONNECT_USER_ID: str = os.getenv("QUANTCONNECT_USER_ID", "")
QUANTCONNECT_API_KEY: str = os.getenv("QUANTCONNECT_API_KEY", "")

# --- LLM Providers ---
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")

# --- Defaults ---
DEFAULT_MODEL_NAME: str = "gpt-4o-mini"
DEFAULT_MODEL_PROVIDER: str = "openai"
DATA_PROVIDER: str = os.getenv("DATA_PROVIDER", "yfinance").lower()


def validate_polygon_key() -> None:
    """Raise if POLYGON_API_KEY is not set."""
    if not POLYGON_API_KEY:
        raise ValueError(
            "POLYGON_API_KEY environment variable is required. "
            "Get a free key at https://polygon.io/ and add it to .env"
        )


def validate_quantconnect_key() -> None:
    """Raise if QuantConnect credentials are not set."""
    if not QUANTCONNECT_USER_ID or not QUANTCONNECT_API_KEY:
        raise ValueError(
            "QUANTCONNECT_USER_ID and QUANTCONNECT_API_KEY environment variables are required. "
            "Add them to your .env file."
        )


def validate_llm_key(provider: str) -> None:
    """Raise if the API key for the given provider is not set."""
    key_map = {
        "openai": OPENAI_API_KEY,
        "anthropic": ANTHROPIC_API_KEY,
        "groq": GROQ_API_KEY,
        "google": GOOGLE_API_KEY,
        "deepseek": DEEPSEEK_API_KEY,
        "ollama": "local",  # Ollama doesn't need a key
    }
    if provider not in key_map:
        raise ValueError(f"Unknown LLM provider: {provider}. Choose from: {list(key_map.keys())}")
    if provider != "ollama" and not key_map[provider]:
        raise ValueError(f"{provider.upper()}_API_KEY environment variable is required.")
