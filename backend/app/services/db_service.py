from app.supabase_client import get_supabase
from typing import Dict, Any, Optional
import uuid

def save_ai_report(report_data: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any] | None:
    supabase = get_supabase()
    if not supabase:
        return None
    
    try:
        data = {
            "query": report_data.get("query", ""),
            "summary": report_data.get("summary", ""),
            "sentiment": report_data.get("sentiment", ""),
            "portfolio_score": report_data.get("portfolio_score", 0),
            "key_insights": report_data.get("key_insights", []),
            "risks": report_data.get("risks", []),
            "recommendations": report_data.get("recommendations", []),
            "sector_exposure": report_data.get("sector_exposure", {}),
            "data_sources": report_data.get("data_sources", []),
            "user_id": user_id
        }
        res = supabase.table("ai_reports").insert(data).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        import traceback
        print(f"Error saving report to Supabase: {e}")
        traceback.print_exc()
        return None

def upload_file_to_supabase(file_content: bytes, filename: str, bucket: str = "portfolios") -> str | None:
    """Uploads a file to Supabase Storage and returns its public URL."""
    supabase = get_supabase()
    if not supabase:
        return None

    try:
        # Create a unique path
        file_path = f"{uuid.uuid4()}_{filename}"
        
        # Determine content type
        content_type = "application/octet-stream"
        if filename.lower().endswith(".pdf"): content_type = "application/pdf"
        elif filename.lower().endswith((".jpg", ".jpeg")): content_type = "image/jpeg"
        elif filename.lower().endswith(".png"): content_type = "image/png"
        elif filename.lower().endswith(".csv"): content_type = "text/csv"

        # Upload to Supabase Storage
        res = supabase.storage.from_(bucket).upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": content_type}
        )
        
        # Get public URL
        url_res = supabase.storage.from_(bucket).get_public_url(file_path)
        return url_res
    except Exception as e:
        print(f"Error uploading file to Supabase Storage: {e}")
        return None
