"""Persistent SQLite cache for market data API responses."""
from __future__ import annotations

import logging
import pickle
import sqlite3
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)


class DataCache:
    """Persistent SQLite cache with TTL support."""

    def __init__(self, db_path: str = "market_data_cache.db", default_ttl_minutes: int = 60):
        self.db_path = Path(db_path).absolute()
        self._default_ttl = timedelta(minutes=default_ttl_minutes)
        self._lock = threading.Lock()
        self._init_db()

    def _init_db(self):
        """Initialize the SQLite database and table."""
        with self._lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS cache (
                        key TEXT PRIMARY KEY,
                        value BLOB,
                        expires_at TIMESTAMP
                    )
                    """
                )
                conn.execute("CREATE INDEX IF NOT EXISTS idx_expires ON cache(expires_at)")

    def get(self, *key_parts: str) -> Optional[Any]:
        """Return cached value if present and not expired, else None."""
        key = ":".join(str(p) for p in key_parts)
        now = datetime.now()

        with self._lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.execute(
                        "SELECT value, expires_at FROM cache WHERE key = ?", (key,)
                    )
                    row = cursor.fetchone()

                    if row:
                        value_blob, expires_str = row
                        expires_at = datetime.fromisoformat(expires_str)
                        if now < expires_at:
                            return pickle.loads(value_blob)
                        else:
                            # Expired
                            conn.execute("DELETE FROM cache WHERE key = ?", (key,))
            except Exception as e:
                logger.error(f"Cache get error: {e}")
        return None

    def set(self, *key_parts_and_value: Any, ttl_minutes: Optional[int] = None) -> None:
        """Cache a value. Last argument is the value; preceding args form the key."""
        *key_parts, value = key_parts_and_value
        key = ":".join(str(p) for p in key_parts)
        ttl = timedelta(minutes=ttl_minutes) if ttl_minutes else self._default_ttl
        expires_at = datetime.now() + ttl
        value_blob = pickle.dumps(value)

        with self._lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO cache (key, value, expires_at)
                        VALUES (?, ?, ?)
                        """,
                        (key, value_blob, expires_at.isoformat()),
                    )
            except Exception as e:
                logger.error(f"Cache set error: {e}")

    def clear(self) -> None:
        """Clear all cached data."""
        with self._lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute("DELETE FROM cache")
            except Exception as e:
                logger.error(f"Cache clear error: {e}")


# Module-level singleton
_cache = DataCache()


def get_cache() -> DataCache:
    """Return the module-level cache singleton."""
    return _cache
