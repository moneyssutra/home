"""Database connection module for MongoDB."""
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

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

async def shutdown_db_client():
    """Close database connection on shutdown."""
    client.close()

