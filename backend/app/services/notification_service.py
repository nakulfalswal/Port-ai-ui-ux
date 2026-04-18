import os
import httpx
from twilio.rest import Client
from typing import Optional

# Twilio Config
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

# Telegram Config
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

async def send_sms_alert(message: str, to_number: Optional[str] = None):
    """Sends an SMS alert via Twilio."""
    if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]):
        print("SMS Alert skipped: Twilio credentials missing.")
        return False
    
    target = to_number or os.getenv("USER_PHONE_NUMBER")
    if not target:
        print("SMS Alert skipped: No target phone number.")
        return False

    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        client.messages.create(
            body=f"🚨 PortAI Alert: {message}",
            from_=TWILIO_PHONE_NUMBER,
            to=target
        )
        return True
    except Exception as e:
        print(f"Twilio Error: {e}")
        return False

async def send_telegram_alert(message: str):
    """Sends an alert via Telegram Bot."""
    if not all([TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID]):
        print("Telegram Alert skipped: Bot credentials missing.")
        return False

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": f"🛡️ *PortAI Real-Time Alert*\n\n{message}",
        "parse_mode": "Markdown"
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload)
            return resp.status_code == 200
    except Exception as e:
        print(f"Telegram Error: {e}")
        return False

async def notify_all_channels(message: str):
    """Dispatches alerts to all configured notification channels."""
    sms_status = await send_sms_alert(message)
    tg_status = await send_telegram_alert(message)
    return {"sms": sms_status, "telegram": tg_status}
