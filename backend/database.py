"""Database connection module for MongoDB."""
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Use custom variable names (Emergent only overwrites MONGO_URL and DB_NAME)
mongo_url = os.environ['CUSTOM_MONGO_URL']
client = AsyncIOMotorClient(mongo_url)

# Environment-based database selection
is_preview = 'preview.emergentagent.com' in os.environ.get('REACT_APP_BACKEND_URL', os.environ.get('APP_URL', ''))

if is_preview:
    db_name = os.environ.get('CUSTOM_DB_DEV', 'moneyssutra_dev')
    env_label = 'Development/Preview'
else:
    db_name = os.environ.get('CUSTOM_DB_PROD', 'moneyssutra_prod')
    env_label = 'Production'

db = client[db_name]
logger.info(f"Connected to [{env_label}] Database: {db_name}")
print(f"[DB] Connected to [{env_label}] Database: {db_name}")

async def shutdown_db_client():
    """Close database connection on shutdown."""
    client.close()

