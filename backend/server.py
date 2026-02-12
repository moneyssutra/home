from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class IncomeSource(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    name: str
    expectedAmount: float
    frequency: str
    selectedDay: Optional[str] = None
    selectedDate: Optional[str] = None
    selectedQuarter: Optional[str] = None
    selectedHalf: Optional[str] = None
    selectedMonth: Optional[str] = None
    customFrequency: Optional[str] = None
    customDate: Optional[str] = None
    # Interest-specific fields
    principal: Optional[float] = None
    rate: Optional[float] = None
    interestType: Optional[str] = None
    compoundingFrequency: Optional[str] = None
    manualOverride: Optional[bool] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    currentAmount: Optional[float] = None
    # Rental-specific fields
    tenantName: Optional[str] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IncomeSourceCreate(BaseModel):
    type: str
    name: str
    expectedAmount: float
    frequency: str
    selectedDay: Optional[str] = None
    selectedDate: Optional[str] = None
    selectedQuarter: Optional[str] = None
    selectedHalf: Optional[str] = None
    selectedMonth: Optional[str] = None
    customFrequency: Optional[str] = None
    customDate: Optional[str] = None
    # Interest-specific fields
    principal: Optional[float] = None
    rate: Optional[float] = None
    interestType: Optional[str] = None
    compoundingFrequency: Optional[str] = None
    manualOverride: Optional[bool] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    currentAmount: Optional[float] = None
    # Rental-specific fields
    tenantName: Optional[str] = None

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

@api_router.post("/income", response_model=IncomeSource)
async def create_income_source(input: IncomeSourceCreate):
    income_dict = input.model_dump()
    income_obj = IncomeSource(**income_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = income_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    _ = await db.income_sources.insert_one(doc)
    return income_obj

@api_router.get("/income", response_model=List[IncomeSource])
async def get_income_sources():
    # Exclude MongoDB's _id field from the query results
    income_sources = await db.income_sources.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for source in income_sources:
        if isinstance(source['createdAt'], str):
            source['createdAt'] = datetime.fromisoformat(source['createdAt'])
    
    return income_sources

@api_router.get("/income/{income_id}", response_model=IncomeSource)
async def get_income_source(income_id: str):
    # Get a single income source by ID
    income_source = await db.income_sources.find_one({"id": income_id}, {"_id": 0})
    
    if not income_source:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Income source not found")
    
    # Convert ISO string timestamp back to datetime object
    if isinstance(income_source['createdAt'], str):
        income_source['createdAt'] = datetime.fromisoformat(income_source['createdAt'])
    
    return income_source

@api_router.put("/income/{income_id}", response_model=IncomeSource)
async def update_income_source(income_id: str, input: IncomeSourceCreate):
    # Check if income source exists
    existing = await db.income_sources.find_one({"id": income_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Income source not found")
    
    # Update the income source
    income_dict = input.model_dump()
    income_dict['id'] = income_id
    income_dict['createdAt'] = existing['createdAt']  # Keep original creation time
    
    # Convert datetime to ISO string for MongoDB
    if isinstance(income_dict['createdAt'], str):
        pass  # Already a string
    else:
        income_dict['createdAt'] = income_dict['createdAt'].isoformat()
    
    # Update in database
    await db.income_sources.replace_one({"id": income_id}, income_dict)
    
    # Return updated object
    income_obj = IncomeSource(**income_dict)
    if isinstance(income_obj.createdAt, str):
        income_obj.createdAt = datetime.fromisoformat(income_obj.createdAt)
    
    return income_obj

@api_router.delete("/income/{income_id}")
async def delete_income_source(income_id: str):
    # Check if income source exists
    existing = await db.income_sources.find_one({"id": income_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Income source not found")
    
    # Delete the income source
    await db.income_sources.delete_one({"id": income_id})
    
    return {"message": "Income source deleted successfully", "id": income_id}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()