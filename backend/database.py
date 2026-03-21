"""Database connection module for MongoDB."""
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import time

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['CUSTOM_MONGO_URL']
client = AsyncIOMotorClient(mongo_url)

db_name = os.environ.get('CUSTOM_DB_PROD', 'moneyssutra_prod')
env_label = 'Production'

db = client[db_name]
logger.info(f"Connected to [{env_label}] Database: {db_name}")
print(f"[DB] Connected to [{env_label}] Database: {db_name}")


# ─── Simple TTL Cache ───
class TTLCache:
    """In-memory cache with per-key TTL expiry."""
    def __init__(self, default_ttl=30):
        self._store = {}
        self._ttl = default_ttl

    def get(self, key):
        entry = self._store.get(key)
        if entry and time.time() - entry["ts"] < self._ttl:
            return entry["data"]
        if entry:
            del self._store[key]
        return None

    def set(self, key, data):
        self._store[key] = {"data": data, "ts": time.time()}

    def invalidate(self, key_prefix):
        keys = [k for k in self._store if k.startswith(key_prefix)]
        for k in keys:
            del self._store[k]


dashboard_cache = TTLCache(default_ttl=30)


async def shutdown_db_client():
    """Close database connection on shutdown."""
    client.close()

