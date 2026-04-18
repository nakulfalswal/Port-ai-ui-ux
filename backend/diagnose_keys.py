import os
import httpx
from supabase import create_client
from dotenv import load_dotenv
import traceback
from pathlib import Path

# Try to find .env in current dir or parent
_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

def test_groq():
    key = os.getenv("GROQ_API_KEY")
    if not key:
        return "ERROR: GROQ_API_KEY missing in .env"
    try:
        from groq import Groq
        client = Groq(api_key=key)
        # Simple completion to test key
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "test"}],
            max_tokens=5
        )
        return f"OK: Groq API responds: {completion.choices[0].message.content.strip()}"
    except Exception as e:
        return f"ERROR: Groq Error: {e}"

def test_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        return "ERROR: Supabase URL/Key missing in .env"
    try:
        client = create_client(url, key)
        # Try a simple fetch to a known table or just check init
        return f"OK: Supabase client initialized (URL: {url[:15]}...)"
    except Exception as e:
        return f"ERROR: Supabase Error: {e}"

def test_newsapi():
    key = os.getenv("NEWS_API_KEY")
    if not key:
        return "WARNING: NEWS_API_KEY missing (will use fallback data)"
    try:
        resp = httpx.get(f"https://newsapi.org/v2/top-headlines?country=in&apiKey={key}")
        if resp.status_code == 200:
            return "OK: NewsAPI responds correctly"
        return f"ERROR: NewsAPI status {resp.status_code}: {resp.text}"
    except Exception as e:
        return f"ERROR: NewsAPI exception: {e}"

if __name__ == "__main__":
    print("\n--- PORTAI SYSTEM DIAGNOSTICS ---")
    print(f"Env file path: {_ENV_PATH}")
    print("-" * 30)
    print(f"Groq:     {test_groq()}")
    print(f"Supabase: {test_supabase()}")
    print(f"NewsAPI:  {test_newsapi()}")
    print("-" * 30 + "\n")
