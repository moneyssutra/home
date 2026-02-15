from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Cookie
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
import hashlib
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta


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

# ============ AUTH MODELS ============
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: str
    name: str
    picture: Optional[str] = None
    auth_type: str = "google"  # "google" or "jwt"
    password_hash: Optional[str] = None  # For JWT auth only
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class JWTLoginRequest(BaseModel):
    username: str
    password: str

class GoogleSessionRequest(BaseModel):
    session_id: str

class IncomeSource(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None  # User isolation
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
    # Rental with Asset link
    assetId: Optional[str] = None
    securityDeposit: Optional[float] = None
    # Commission-specific fields
    isVariable: Optional[bool] = None
    # Dividend-specific fields
    sourceCategory: Optional[str] = None
    units: Optional[float] = None
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
    # Rental with Asset link
    assetId: Optional[str] = None
    securityDeposit: Optional[float] = None
    # Commission-specific fields
    isVariable: Optional[bool] = None
    # Dividend-specific fields
    sourceCategory: Optional[str] = None
    units: Optional[float] = None

# Account Model
class Account(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None  # User isolation
    accountName: str
    accountType: str
    currentBalance: float = 0
    openingBalance: float = 0
    accountNumber: Optional[str] = None
    isPrimary: bool = False
    notes: Optional[str] = None
    # Credit Card specific
    creditLimit: Optional[float] = None
    outstandingAmount: Optional[float] = None
    dueDate: Optional[str] = None
    minimumDue: Optional[float] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AccountCreate(BaseModel):
    accountName: str
    accountType: str
    currentBalance: float = 0
    openingBalance: float = 0
    accountNumber: Optional[str] = None
    isPrimary: bool = False
    notes: Optional[str] = None
    creditLimit: Optional[float] = None
    outstandingAmount: Optional[float] = None
    dueDate: Optional[str] = None
    minimumDue: Optional[float] = None

# Expense Model
class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None  # User isolation
    expenseName: str
    expenseType: str  # Fixed or Variable
    category: str
    expectedAmount: float
    frequency: str
    linkedAccountId: Optional[str] = None
    linkedLoanId: Optional[str] = None
    linkedInsuranceId: Optional[str] = None
    selectedDay: Optional[str] = None
    selectedDate: Optional[str] = None
    selectedQuarter: Optional[str] = None
    selectedHalf: Optional[str] = None
    selectedMonth: Optional[str] = None
    oneTimeDate: Optional[str] = None
    isPaid: bool = False
    lastPaidDate: Optional[str] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExpenseCreate(BaseModel):
    expenseName: str
    expenseType: str
    category: str
    expectedAmount: float
    frequency: str
    linkedAccountId: Optional[str] = None
    linkedLoanId: Optional[str] = None
    linkedInsuranceId: Optional[str] = None
    selectedDay: Optional[str] = None
    selectedDate: Optional[str] = None
    selectedQuarter: Optional[str] = None
    selectedHalf: Optional[str] = None
    selectedMonth: Optional[str] = None
    oneTimeDate: Optional[str] = None
    isPaid: bool = False
    lastPaidDate: Optional[str] = None

# Insurance Model
class Insurance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    insuranceType: str
    policyName: str
    coverageAmount: float
    premiumAmount: float
    premiumFrequency: str
    startDate: str
    endDate: Optional[str] = None
    linkedAssetId: Optional[str] = None
    coveredPerson: Optional[str] = None
    linkedExpenseId: Optional[str] = None
    maturityType: Optional[str] = None
    expectedMaturityAmount: Optional[float] = None
    autoCreateExpense: bool = False
    premiumEndDate: Optional[str] = None
    notes: Optional[str] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InsuranceCreate(BaseModel):
    insuranceType: str
    policyName: str
    coverageAmount: float
    premiumAmount: float
    premiumFrequency: str
    startDate: str
    endDate: Optional[str] = None
    linkedAssetId: Optional[str] = None
    coveredPerson: Optional[str] = None
    maturityType: Optional[str] = None
    expectedMaturityAmount: Optional[float] = None
    autoCreateExpense: bool = False
    premiumEndDate: Optional[str] = None
    notes: Optional[str] = None

# Loan Model
class Loan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None  # User isolation
    loanType: Optional[str] = None
    loanName: str
    lenderName: Optional[str] = None
    principalAmount: float
    outstandingAmount: float
    interestRate: float
    emiAmount: float
    emiFrequency: str = "Monthly"
    tenureMonths: Optional[int] = None
    startDate: str
    endDate: Optional[str] = None
    linkedAssetId: Optional[str] = None
    linkedAccountId: Optional[str] = None
    autoCreateExpense: bool = True
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LoanCreate(BaseModel):
    loanType: Optional[str] = None
    loanName: str
    lenderName: Optional[str] = None
    principalAmount: float
    outstandingAmount: float
    interestRate: float
    emiAmount: float
    emiFrequency: str = "Monthly"
    tenureMonths: Optional[int] = None
    startDate: str
    endDate: Optional[str] = None
    linkedAssetId: Optional[str] = None
    linkedAccountId: Optional[str] = None
    autoCreateExpense: bool = True

# Asset Model
class Asset(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None  # User isolation
    assetType: str
    assetName: str
    purchaseValue: Optional[float] = None
    currentValue: float
    purchaseDate: Optional[str] = None
    depreciationType: Optional[str] = None  # Appreciating, Depreciating, Market Driven
    isFinanced: bool = False
    linkedLoanId: Optional[str] = None
    generatesIncome: bool = False
    linkedIncomeId: Optional[str] = None
    incomeAmount: Optional[float] = None
    incomeFrequency: Optional[str] = None
    renterName: Optional[str] = None
    securityDeposit: Optional[float] = None
    isInsured: bool = False
    linkedInsuranceId: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AssetCreate(BaseModel):
    assetType: str
    assetName: str
    purchaseValue: Optional[float] = None
    currentValue: float
    purchaseDate: Optional[str] = None
    depreciationType: Optional[str] = None
    isFinanced: bool = False
    linkedLoanId: Optional[str] = None
    generatesIncome: bool = False
    linkedIncomeId: Optional[str] = None
    incomeAmount: Optional[float] = None
    incomeFrequency: Optional[str] = None
    renterName: Optional[str] = None
    securityDeposit: Optional[float] = None
    isInsured: bool = False
    linkedInsuranceId: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None

# Investment Model
class Investment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None  # User isolation
    investmentCategory: str
    investmentMode: str
    name: str
    principal: float
    currentValue: float
    startDate: str
    linkedAccountId: Optional[str] = None
    notes: Optional[str] = None
    quantity: Optional[float] = None
    unitPrice: Optional[float] = None
    currentPrice: Optional[float] = None
    returnRate: Optional[float] = None
    compoundingType: Optional[str] = None
    compoundingFrequency: Optional[str] = None
    payoutFrequency: Optional[str] = None
    maturityDate: Optional[str] = None
    expectedMaturityValue: Optional[float] = None
    lockInPeriod: Optional[int] = None
    investmentFrequency: Optional[str] = None  # For SIP: Weekly, Monthly, Quarterly, Yearly
    sipAmount: Optional[float] = None  # SIP amount per frequency
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InvestmentCreate(BaseModel):
    investmentCategory: str
    investmentMode: str
    name: str
    principal: float
    currentValue: float
    startDate: str
    linkedAccountId: Optional[str] = None
    notes: Optional[str] = None
    quantity: Optional[float] = None
    unitPrice: Optional[float] = None
    currentPrice: Optional[float] = None
    returnRate: Optional[float] = None
    compoundingType: Optional[str] = None
    compoundingFrequency: Optional[str] = None
    payoutFrequency: Optional[str] = None
    maturityDate: Optional[str] = None
    expectedMaturityValue: Optional[float] = None
    lockInPeriod: Optional[int] = None
    investmentFrequency: Optional[str] = None
    sipAmount: Optional[float] = None

# Credit Card Model
class CreditCard(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cardName: str
    bankName: str
    creditLimit: float
    outstandingAmount: float = 0
    billingDate: Optional[int] = None
    dueDate: Optional[int] = None
    minimumDue: Optional[float] = None
    interestRate: Optional[float] = None
    linkedAccountId: Optional[str] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreditCardCreate(BaseModel):
    cardName: str
    bankName: str
    creditLimit: float
    outstandingAmount: float = 0
    billingDate: Optional[int] = None
    dueDate: Optional[int] = None
    minimumDue: Optional[float] = None
    interestRate: Optional[float] = None
    linkedAccountId: Optional[str] = None

# Goal Model
class Goal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None  # User isolation
    goalName: str
    goalType: str  # Wealth Creation, Debt Elimination, Investment Target, Emergency Fund, Other
    customTypeName: Optional[str] = None  # For "Other" type
    targetAmount: float
    currentAmount: float = 0
    targetDate: str  # ISO date string
    linkedInvestmentIds: List[str] = []
    linkedLoanId: Optional[str] = None
    linkedCreditCardId: Optional[str] = None
    linkedAccountIds: List[str] = []  # For tracking savings in specific accounts
    autoCalculate: bool = True  # Auto-calculate from linked sources
    manualOverride: bool = False  # User has manually set currentAmount
    priority: int = 1  # 1 = High, 2 = Medium, 3 = Low
    notes: Optional[str] = None
    isCompleted: bool = False
    completedDate: Optional[str] = None
    reachedMilestones: List[int] = []  # Track milestones reached: [25, 50, 75, 100]
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GoalCreate(BaseModel):
    goalName: str
    goalType: str
    customTypeName: Optional[str] = None
    targetAmount: float
    currentAmount: float = 0
    targetDate: str
    linkedInvestmentIds: List[str] = []
    linkedLoanId: Optional[str] = None
    linkedCreditCardId: Optional[str] = None
    linkedAccountIds: List[str] = []
    autoCalculate: bool = True
    manualOverride: bool = False
    priority: int = 1
    notes: Optional[str] = None
    reachedMilestones: List[int] = []

# Other Income Model (Non-recurring income: gifts, bonuses, capital gains, etc.)
class OtherIncome(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    incomeName: str
    category: str  # Gift, Bonus, Incentive, Capital Gain, Asset Sale, Tax Refund, Cashback / Reward, Reimbursement, Freelance / Side Work, Windfall, Refund, Miscellaneous, Other
    customCategory: Optional[str] = None  # For "Other" category
    amount: float
    frequency: str  # One-Time, Monthly, Quarterly, Yearly, Irregular
    dateReceived: Optional[str] = None  # ISO date string for one-time or specific date
    selectedDay: Optional[str] = None  # For weekly
    selectedDate: Optional[str] = None  # Day of month (1-31)
    selectedMonth: Optional[str] = None  # For yearly
    selectedQuarter: Optional[str] = None  # For quarterly
    notes: Optional[str] = None
    isReceived: bool = False  # Track if already received
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OtherIncomeCreate(BaseModel):
    incomeName: str
    category: str
    customCategory: Optional[str] = None
    amount: float
    frequency: str
    dateReceived: Optional[str] = None
    selectedDay: Optional[str] = None
    selectedDate: Optional[str] = None
    selectedMonth: Optional[str] = None
    selectedQuarter: Optional[str] = None
    notes: Optional[str] = None
    isReceived: bool = False

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

# ============ AUTH ENDPOINTS ============

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == hashed

@api_router.post("/auth/register")
async def register_user(request: RegisterRequest, response: Response):
    """Register a new user with email/password"""
    # Check if email already exists
    existing_user = await db.users.find_one({"email": request.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user = {
        "user_id": user_id,
        "email": request.email,
        "name": request.name,
        "picture": None,
        "auth_type": "jwt",
        "password_hash": hash_password(request.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    # Create session
    session_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    return {
        "user_id": user_id,
        "email": request.email,
        "name": request.name,
        "picture": None,
        "session_token": session_token
    }

async def get_current_user(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get current user from session token (cookie or header)"""
    token = session_token
    
    # Fallback to Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        return None
    
    # Find session
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    
    # Check expiry
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    # Get user
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user

@api_router.post("/auth/login")
async def jwt_login(request: JWTLoginRequest, response: Response):
    """JWT-based username/password login"""
    # For demo: accept test/test credentials
    if request.username == "test" and request.password == "test":
        # Check if test user exists
        user = await db.users.find_one({"email": "test@moneyssutra.com"}, {"_id": 0})
        
        if not user:
            # Create test user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user = {
                "user_id": user_id,
                "email": "test@moneyssutra.com",
                "name": "Test User",
                "picture": None,
                "auth_type": "jwt",
                "password_hash": hash_password("test"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user)
        else:
            user_id = user["user_id"]
        
        # Create session
        session_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        session = {
            "session_id": str(uuid.uuid4()),
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.user_sessions.insert_one(session)
        
        # Set cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7 * 24 * 60 * 60
        )
        
        return {
            "user_id": user_id,
            "email": user.get("email"),
            "name": user.get("name"),
            "picture": user.get("picture"),
            "session_token": session_token
        }
    
    # Check actual user credentials
    user = await db.users.find_one({"email": request.username, "auth_type": "jwt"}, {"_id": 0})
    if not user or not verify_password(request.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    session_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session = {
        "session_id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    return {
        "user_id": user["user_id"],
        "email": user.get("email"),
        "name": user.get("name"),
        "picture": user.get("picture"),
        "session_token": session_token
    }

@api_router.post("/auth/google/session")
async def google_session(request: GoogleSessionRequest, response: Response):
    """Process Google OAuth session_id from Emergent Auth"""
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    
    try:
        # Call Emergent Auth to get user data
        async with httpx.AsyncClient() as client:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": request.session_id}
            )
            
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            session_data = auth_response.json()
    except Exception as e:
        logging.error(f"Google auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")
    
    # Check if user exists
    email = session_data.get("email")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not user:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": session_data.get("name"),
            "picture": session_data.get("picture"),
            "auth_type": "google",
            "password_hash": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    else:
        user_id = user["user_id"]
        # Update user data
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": session_data.get("name"),
                "picture": session_data.get("picture")
            }}
        )
    
    # Create session
    session_token = session_data.get("session_token") or str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    return {
        "user_id": user_id,
        "email": email,
        "name": session_data.get("name"),
        "picture": session_data.get("picture"),
        "session_token": session_token
    }

@api_router.get("/auth/me")
async def get_me(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get current authenticated user"""
    user = await get_current_user(request, session_token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return {
        "user_id": user.get("user_id"),
        "email": user.get("email"),
        "name": user.get("name"),
        "picture": user.get("picture")
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response, session_token: Optional[str] = Cookie(None)):
    """Logout and invalidate session"""
    token = session_token
    
    # Fallback to Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    # Clear cookie
    response.delete_cookie(key="session_token", path="/")
    
    return {"message": "Logged out successfully"}

# ============ INCOME ENDPOINTS ============
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

# ============ LOAN ENDPOINTS ============

@api_router.post("/loans", response_model=Loan)
async def create_loan(input: LoanCreate):
    loan_dict = input.model_dump()
    loan_obj = Loan(**loan_dict)
    
    doc = loan_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.loans.insert_one(doc)
    
    # Auto-create EMI expense if enabled
    if loan_obj.autoCreateExpense:
        # Check if expense already exists for this loan
        existing_expense = await db.expenses.find_one({"linkedLoanId": loan_obj.id}, {"_id": 0})
        if not existing_expense:
            # Map EMI frequency to expense frequency
            freq_map = {"Monthly": "Monthly", "Quarterly": "Quarterly", "Half-Yearly": "Half-Yearly"}
            expense_freq = freq_map.get(loan_obj.emiFrequency, "Monthly")
            
            # Calculate selectedDate from startDate
            start_date = datetime.fromisoformat(loan_obj.startDate) if loan_obj.startDate else datetime.now(timezone.utc)
            selected_date = str(start_date.day)
            
            expense_data = {
                "id": str(uuid.uuid4()),
                "expenseName": f"{loan_obj.loanName} EMI",
                "expenseType": "Fixed",
                "category": "EMI",
                "expectedAmount": loan_obj.emiAmount,
                "frequency": expense_freq,
                "linkedAccountId": loan_obj.linkedAccountId,
                "linkedLoanId": loan_obj.id,
                "linkedInsuranceId": None,
                "selectedDay": None,
                "selectedDate": selected_date,
                "selectedQuarter": None,
                "selectedHalf": None,
                "selectedMonth": None,
                "oneTimeDate": None,
                "isPaid": False,
                "lastPaidDate": None,
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
            await db.expenses.insert_one(expense_data)
    
    return loan_obj

@api_router.get("/loans", response_model=List[Loan])
async def get_loans():
    loans = await db.loans.find({}, {"_id": 0}).to_list(1000)
    
    for loan in loans:
        if isinstance(loan['createdAt'], str):
            loan['createdAt'] = datetime.fromisoformat(loan['createdAt'])
    
    return loans

@api_router.get("/loans/{loan_id}", response_model=Loan)
async def get_loan(loan_id: str):
    loan = await db.loans.find_one({"id": loan_id}, {"_id": 0})
    
    if not loan:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Loan not found")
    
    if isinstance(loan['createdAt'], str):
        loan['createdAt'] = datetime.fromisoformat(loan['createdAt'])
    
    return loan

@api_router.put("/loans/{loan_id}", response_model=Loan)
async def update_loan(loan_id: str, input: LoanCreate):
    existing = await db.loans.find_one({"id": loan_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Loan not found")
    
    loan_dict = input.model_dump()
    loan_dict['id'] = loan_id
    loan_dict['createdAt'] = existing['createdAt']
    
    await db.loans.replace_one({"id": loan_id}, loan_dict)
    
    loan_obj = Loan(**loan_dict)
    if isinstance(loan_obj.createdAt, str):
        loan_obj.createdAt = datetime.fromisoformat(loan_obj.createdAt)
    
    return loan_obj

@api_router.delete("/loans/{loan_id}")
async def delete_loan(loan_id: str):
    existing = await db.loans.find_one({"id": loan_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Loan not found")
    
    await db.loans.delete_one({"id": loan_id})
    return {"message": "Loan deleted successfully", "id": loan_id}

@api_router.get("/loans/{loan_id}/linked-assets")
async def get_loan_linked_assets(loan_id: str):
    """Get all assets that are linked to this loan (reverse lookup)"""
    # Find assets where linkedLoanId matches this loan
    linked_assets = await db.assets.find({"linkedLoanId": loan_id}, {"_id": 0}).to_list(1000)
    
    result = []
    for asset in linked_assets:
        if isinstance(asset.get('createdAt'), str):
            asset['createdAt'] = datetime.fromisoformat(asset['createdAt'])
        result.append({
            "id": asset.get('id'),
            "assetName": asset.get('assetName'),
            "assetType": asset.get('assetType'),
            "currentValue": asset.get('currentValue', 0),
            "purchaseValue": asset.get('purchaseValue'),
            "location": asset.get('location')
        })
    
    return result

# ============ ASSET ENDPOINTS ============

@api_router.post("/assets", response_model=Asset)
async def create_asset(input: AssetCreate):
    asset_dict = input.model_dump()
    asset_obj = Asset(**asset_dict)
    
    # Auto-create Rental Income if asset generates income
    if asset_obj.generatesIncome and asset_obj.incomeAmount:
        # Check if rental income already exists for this asset
        existing_income = await db.income_sources.find_one({"assetId": asset_obj.id}, {"_id": 0})
        
        if not existing_income:
            # Create rental income entry
            rental_income = {
                "id": str(uuid.uuid4()),
                "type": "Rental",
                "name": asset_obj.assetName,
                "expectedAmount": asset_obj.incomeAmount,
                "frequency": asset_obj.incomeFrequency or "Monthly",
                "tenantName": asset_dict.get("renterName") or None,
                "securityDeposit": asset_dict.get("securityDeposit") or None,
                "assetId": asset_obj.id,
                "assetValue": asset_obj.currentValue,
                "rentalYield": round((asset_obj.incomeAmount * 12 / asset_obj.currentValue) * 100, 2) if asset_obj.currentValue else None,
                "createdAt": datetime.now(timezone.utc).isoformat(),
            }
            
            await db.income_sources.insert_one(rental_income)
            
            # Update asset with linked income ID
            asset_obj.linkedIncomeId = rental_income["id"]
    
    doc = asset_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.assets.insert_one(doc)
    return asset_obj

@api_router.get("/assets", response_model=List[Asset])
async def get_assets():
    assets = await db.assets.find({}, {"_id": 0}).to_list(1000)
    
    for asset in assets:
        if isinstance(asset['createdAt'], str):
            asset['createdAt'] = datetime.fromisoformat(asset['createdAt'])
    
    return assets

@api_router.get("/assets/{asset_id}", response_model=Asset)
async def get_asset(asset_id: str):
    asset = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    
    if not asset:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Asset not found")
    
    if isinstance(asset['createdAt'], str):
        asset['createdAt'] = datetime.fromisoformat(asset['createdAt'])
    
    return asset

@api_router.put("/assets/{asset_id}", response_model=Asset)
async def update_asset(asset_id: str, input: AssetCreate):
    existing = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Asset not found")
    
    asset_dict = input.model_dump()
    asset_dict['id'] = asset_id
    asset_dict['createdAt'] = existing['createdAt']
    
    # Handle rental income linking
    if asset_dict.get('generatesIncome') and asset_dict.get('incomeAmount'):
        # Check if rental income already exists for this asset
        existing_income = await db.income_sources.find_one({"assetId": asset_id}, {"_id": 0})
        
        if existing_income:
            # Update existing rental income
            await db.income_sources.update_one(
                {"assetId": asset_id},
                {"$set": {
                    "name": asset_dict['assetName'],
                    "expectedAmount": asset_dict['incomeAmount'],
                    "frequency": asset_dict.get('incomeFrequency') or "Monthly",
                    "tenantName": asset_dict.get('renterName'),
                    "securityDeposit": asset_dict.get('securityDeposit'),
                    "assetValue": asset_dict['currentValue'],
                    "rentalYield": round((asset_dict['incomeAmount'] * 12 / asset_dict['currentValue']) * 100, 2) if asset_dict['currentValue'] else None,
                }}
            )
            asset_dict['linkedIncomeId'] = existing_income['id']
        else:
            # Create new rental income
            rental_income = {
                "id": str(uuid.uuid4()),
                "type": "Rental",
                "name": asset_dict['assetName'],
                "expectedAmount": asset_dict['incomeAmount'],
                "frequency": asset_dict.get('incomeFrequency') or "Monthly",
                "tenantName": asset_dict.get('renterName'),
                "securityDeposit": asset_dict.get('securityDeposit'),
                "assetId": asset_id,
                "assetValue": asset_dict['currentValue'],
                "rentalYield": round((asset_dict['incomeAmount'] * 12 / asset_dict['currentValue']) * 100, 2) if asset_dict['currentValue'] else None,
                "createdAt": datetime.now(timezone.utc).isoformat(),
            }
            await db.income_sources.insert_one(rental_income)
            asset_dict['linkedIncomeId'] = rental_income['id']
    elif not asset_dict.get('generatesIncome'):
        # If income generation turned off, remove the linked income
        asset_dict['linkedIncomeId'] = None
        await db.income_sources.delete_many({"assetId": asset_id})
    
    await db.assets.replace_one({"id": asset_id}, asset_dict)
    
    asset_obj = Asset(**asset_dict)
    if isinstance(asset_obj.createdAt, str):
        asset_obj.createdAt = datetime.fromisoformat(asset_obj.createdAt)
    
    return asset_obj

@api_router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str):
    existing = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Asset not found")
    
    await db.assets.delete_one({"id": asset_id})
    return {"message": "Asset deleted successfully", "id": asset_id}

# ============ ACCOUNT ENDPOINTS ============

@api_router.post("/accounts", response_model=Account)
async def create_account(input: AccountCreate):
    account_dict = input.model_dump()
    account_obj = Account(**account_dict)
    
    doc = account_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.accounts.insert_one(doc)
    return account_obj

@api_router.get("/accounts", response_model=List[Account])
async def get_accounts():
    accounts = await db.accounts.find({}, {"_id": 0}).to_list(1000)
    
    for account in accounts:
        if isinstance(account['createdAt'], str):
            account['createdAt'] = datetime.fromisoformat(account['createdAt'])
    
    return accounts

@api_router.get("/accounts/{account_id}", response_model=Account)
async def get_account(account_id: str):
    account = await db.accounts.find_one({"id": account_id}, {"_id": 0})
    
    if not account:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Account not found")
    
    if isinstance(account['createdAt'], str):
        account['createdAt'] = datetime.fromisoformat(account['createdAt'])
    
    return account

@api_router.put("/accounts/{account_id}", response_model=Account)
async def update_account(account_id: str, input: AccountCreate):
    existing = await db.accounts.find_one({"id": account_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Account not found")
    
    account_dict = input.model_dump()
    account_dict['id'] = account_id
    account_dict['createdAt'] = existing['createdAt']
    
    await db.accounts.replace_one({"id": account_id}, account_dict)
    
    account_obj = Account(**account_dict)
    if isinstance(account_obj.createdAt, str):
        account_obj.createdAt = datetime.fromisoformat(account_obj.createdAt)
    
    return account_obj

@api_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str):
    existing = await db.accounts.find_one({"id": account_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Account not found")
    
    await db.accounts.delete_one({"id": account_id})
    return {"message": "Account deleted successfully", "id": account_id}

# ============ EXPENSE ENDPOINTS ============

@api_router.post("/expenses", response_model=Expense)
async def create_expense(input: ExpenseCreate):
    expense_dict = input.model_dump()
    expense_obj = Expense(**expense_dict)
    
    doc = expense_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.expenses.insert_one(doc)
    return expense_obj

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses():
    expenses = await db.expenses.find({}, {"_id": 0}).to_list(1000)
    
    for expense in expenses:
        if isinstance(expense['createdAt'], str):
            expense['createdAt'] = datetime.fromisoformat(expense['createdAt'])
    
    return expenses

@api_router.get("/expenses/with-next-date")
async def get_expenses_with_next_date():
    """Get all expenses with calculated next deduction dates"""
    expenses = await db.expenses.find({}, {"_id": 0}).to_list(1000)
    
    result = []
    for expense in expenses:
        if isinstance(expense.get('createdAt'), str):
            expense['createdAt'] = datetime.fromisoformat(expense['createdAt'])
        
        # Calculate next deduction date
        next_date = calculate_next_deduction_date(expense)
        expense['nextDeductionDate'] = next_date
        
        # Check if linked to loan and get loan details
        if expense.get('linkedLoanId'):
            loan = await db.loans.find_one({"id": expense['linkedLoanId']}, {"_id": 0})
            if loan:
                expense['linkedLoanName'] = loan.get('loanName')
        
        # Check if linked to insurance and get insurance details
        if expense.get('linkedInsuranceId'):
            insurance = await db.insurances.find_one({"id": expense['linkedInsuranceId']}, {"_id": 0})
            if insurance:
                expense['linkedInsuranceName'] = insurance.get('policyName')
        
        result.append(expense)
    
    return result

@api_router.get("/expenses/{expense_id}", response_model=Expense)
async def get_expense(expense_id: str):
    expense = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    
    if not expense:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if isinstance(expense['createdAt'], str):
        expense['createdAt'] = datetime.fromisoformat(expense['createdAt'])
    
    return expense

@api_router.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, input: ExpenseCreate):
    existing = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Expense not found")
    
    expense_dict = input.model_dump()
    expense_dict['id'] = expense_id
    expense_dict['createdAt'] = existing['createdAt']
    
    await db.expenses.replace_one({"id": expense_id}, expense_dict)
    
    expense_obj = Expense(**expense_dict)
    if isinstance(expense_obj.createdAt, str):
        expense_obj.createdAt = datetime.fromisoformat(expense_obj.createdAt)
    
    return expense_obj

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    existing = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Expense not found")
    
    await db.expenses.delete_one({"id": expense_id})
    return {"message": "Expense deleted successfully", "id": expense_id}

# ============ INSURANCE ENDPOINTS ============

@api_router.post("/insurances", response_model=Insurance)
async def create_insurance(input: InsuranceCreate):
    insurance_dict = input.model_dump()
    insurance_obj = Insurance(**insurance_dict)
    
    doc = insurance_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.insurances.insert_one(doc)
    
    # Auto-create Asset entry for Market Linked / Returns on Maturity insurances
    maturity_types_needing_asset = ["Market Linked", "Returns on Maturity"]
    if insurance_obj.maturityType in maturity_types_needing_asset:
        # Check if asset already exists for this insurance
        existing_asset = await db.assets.find_one({"linkedInsuranceId": insurance_obj.id}, {"_id": 0})
        if not existing_asset:
            # Determine current value - use expectedMaturityAmount or premiumAmount as initial value
            current_value = insurance_obj.expectedMaturityAmount or insurance_obj.premiumAmount
            
            asset_data = {
                "id": str(uuid.uuid4()),
                "assetType": "Insurance Asset",
                "assetName": f"{insurance_obj.policyName} (Maturity Value)",
                "currentValue": current_value,
                "purchaseValue": insurance_obj.premiumAmount,  # Initial investment
                "purchaseDate": insurance_obj.startDate,
                "isFinanced": False,
                "linkedLoanId": None,
                "isInsured": True,  # It's itself an insurance
                "linkedInsuranceId": insurance_obj.id,
                "generatesIncome": False,
                "incomeAmount": None,
                "incomeFrequency": None,
                "notes": f"Auto-created from {insurance_obj.insuranceType} policy - {insurance_obj.maturityType}",
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
            await db.assets.insert_one(asset_data)
            
            # Update insurance with linked asset ID
            await db.insurances.update_one(
                {"id": insurance_obj.id},
                {"$set": {"linkedAssetId": asset_data["id"]}}
            )
    
    # Auto-create premium expense if enabled
    if insurance_obj.autoCreateExpense:
        # Check if expense already exists for this insurance
        existing_expense = await db.expenses.find_one({"linkedInsuranceId": insurance_obj.id}, {"_id": 0})
        if not existing_expense:
            # Map premium frequency to expense frequency
            freq_map = {
                "One-Time": "One-Time",
                "Monthly": "Monthly", 
                "Quarterly": "Quarterly", 
                "Half-Yearly": "Half-Yearly", 
                "Yearly": "Yearly"
            }
            expense_freq = freq_map.get(insurance_obj.premiumFrequency, "Yearly")
            
            # Calculate selectedDate from startDate
            start_date = datetime.fromisoformat(insurance_obj.startDate) if insurance_obj.startDate else datetime.now(timezone.utc)
            selected_date = str(start_date.day)
            selected_month = start_date.strftime("%B") if expense_freq == "Yearly" else None
            
            expense_data = {
                "id": str(uuid.uuid4()),
                "expenseName": f"{insurance_obj.policyName} Premium",
                "expenseType": "Fixed",
                "category": "Insurance",
                "expectedAmount": insurance_obj.premiumAmount,
                "frequency": expense_freq,
                "linkedAccountId": None,
                "linkedLoanId": None,
                "linkedInsuranceId": insurance_obj.id,
                "selectedDay": None,
                "selectedDate": selected_date,
                "selectedQuarter": None,
                "selectedHalf": None,
                "selectedMonth": selected_month,
                "oneTimeDate": insurance_obj.startDate if expense_freq == "One-Time" else None,
                "isPaid": False,
                "lastPaidDate": None,
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
            await db.expenses.insert_one(expense_data)
    
    return insurance_obj

@api_router.get("/insurances", response_model=List[Insurance])
async def get_insurances():
    insurances = await db.insurances.find({}, {"_id": 0}).to_list(1000)
    
    for insurance in insurances:
        if isinstance(insurance['createdAt'], str):
            insurance['createdAt'] = datetime.fromisoformat(insurance['createdAt'])
    
    return insurances

@api_router.get("/insurances/{insurance_id}", response_model=Insurance)
async def get_insurance(insurance_id: str):
    insurance = await db.insurances.find_one({"id": insurance_id}, {"_id": 0})
    
    if not insurance:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Insurance not found")
    
    if isinstance(insurance['createdAt'], str):
        insurance['createdAt'] = datetime.fromisoformat(insurance['createdAt'])
    
    return insurance

@api_router.put("/insurances/{insurance_id}", response_model=Insurance)
async def update_insurance(insurance_id: str, input: InsuranceCreate):
    existing = await db.insurances.find_one({"id": insurance_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Insurance not found")
    
    insurance_dict = input.model_dump()
    insurance_dict['id'] = insurance_id
    insurance_dict['createdAt'] = existing['createdAt']
    
    await db.insurances.replace_one({"id": insurance_id}, insurance_dict)
    
    insurance_obj = Insurance(**insurance_dict)
    if isinstance(insurance_obj.createdAt, str):
        insurance_obj.createdAt = datetime.fromisoformat(insurance_obj.createdAt)
    
    return insurance_obj

@api_router.delete("/insurances/{insurance_id}")
async def delete_insurance(insurance_id: str):
    existing = await db.insurances.find_one({"id": insurance_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Insurance not found")
    
    await db.insurances.delete_one({"id": insurance_id})
    return {"message": "Insurance deleted successfully", "id": insurance_id}

# ============ EXPENSE SCHEDULER ENDPOINTS ============

def calculate_next_deduction_date(expense: dict) -> Optional[str]:
    """Calculate the next deduction date for an expense based on its frequency"""
    from calendar import monthrange
    
    today = datetime.now(timezone.utc).date()
    frequency = expense.get('frequency', '')
    
    if frequency == "Daily":
        return today.isoformat()
    
    elif frequency == "Weekly":
        selected_day = expense.get('selectedDay', '')
        if not selected_day:
            return None
        day_mapping = {"Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, "Friday": 4, "Saturday": 5, "Sunday": 6}
        target_day = day_mapping.get(selected_day, 0)
        days_ahead = target_day - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        next_date = today + timedelta(days=days_ahead)
        return next_date.isoformat()
    
    elif frequency == "Monthly":
        selected_date = expense.get('selectedDate', '')
        if not selected_date:
            return None
        day = int(selected_date)
        # Get max days in current month
        _, max_day = monthrange(today.year, today.month)
        day = min(day, max_day)
        
        if today.day < day:
            next_date = today.replace(day=day)
        else:
            # Move to next month
            if today.month == 12:
                next_date = today.replace(year=today.year + 1, month=1, day=min(day, 31))
            else:
                _, max_next_day = monthrange(today.year, today.month + 1)
                next_date = today.replace(month=today.month + 1, day=min(day, max_next_day))
        return next_date.isoformat()
    
    elif frequency == "Quarterly":
        selected_quarter = expense.get('selectedQuarter', '')
        selected_date = expense.get('selectedDate', '')
        if not selected_date:
            return None
        day = int(selected_date)
        # Q1: Jan, Q2: Apr, Q3: Jul, Q4: Oct
        quarter_starts = {"Q1 (Jan–Mar)": 1, "Q2 (Apr–Jun)": 4, "Q3 (Jul–Sep)": 7, "Q4 (Oct–Dec)": 10}
        for q_name, start_month in quarter_starts.items():
            if selected_quarter and q_name.startswith(selected_quarter[:2]):
                # Find next occurrence
                for m in [start_month, start_month + 3, start_month + 6, start_month + 9]:
                    m = ((m - 1) % 12) + 1
                    year = today.year if m >= today.month else today.year + 1
                    _, max_day = monthrange(year, m)
                    target_day = min(day, max_day)
                    target_date = datetime(year, m, target_day).date()
                    if target_date > today:
                        return target_date.isoformat()
        return None
    
    elif frequency == "Half-Yearly":
        selected_half = expense.get('selectedHalf', '')
        selected_date = expense.get('selectedDate', '')
        if not selected_date:
            return None
        day = int(selected_date)
        # H1: Jan-Jun, H2: Jul-Dec
        if "Jan" in selected_half:
            months = [1, 7]
        else:
            months = [7, 1]
        for m in months:
            year = today.year if m >= today.month else today.year + 1
            _, max_day = monthrange(year, m)
            target_day = min(day, max_day)
            target_date = datetime(year, m, target_day).date()
            if target_date > today:
                return target_date.isoformat()
        return None
    
    elif frequency == "Yearly":
        selected_month = expense.get('selectedMonth', '')
        selected_date = expense.get('selectedDate', '')
        if not selected_month or not selected_date:
            return None
        month_mapping = {"January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6, 
                        "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12}
        month = month_mapping.get(selected_month, 1)
        day = int(selected_date)
        year = today.year
        _, max_day = monthrange(year, month)
        target_day = min(day, max_day)
        target_date = datetime(year, month, target_day).date()
        if target_date <= today:
            target_date = datetime(year + 1, month, target_day).date()
        return target_date.isoformat()
    
    elif frequency == "One-Time":
        one_time_date = expense.get('oneTimeDate', '')
        if one_time_date:
            return one_time_date
        return None
    
    return None

@api_router.post("/expenses/process-deductions")
async def process_fixed_expense_deductions():
    """Process fixed expense deductions for today - to be called by a scheduler"""
    today = datetime.now(timezone.utc).date().isoformat()
    
    # Get all fixed expenses
    fixed_expenses = await db.expenses.find({"expenseType": "Fixed"}, {"_id": 0}).to_list(1000)
    
    processed = []
    errors = []
    
    for expense in fixed_expenses:
        try:
            next_date = calculate_next_deduction_date(expense)
            
            # Check if due today
            if next_date == today:
                linked_account_id = expense.get('linkedAccountId')
                amount = expense.get('expectedAmount', 0)
                
                if linked_account_id and amount > 0:
                    # Deduct from linked account
                    account = await db.accounts.find_one({"id": linked_account_id}, {"_id": 0})
                    if account:
                        new_balance = account.get('currentBalance', 0) - amount
                        await db.accounts.update_one(
                            {"id": linked_account_id},
                            {"$set": {"currentBalance": new_balance}}
                        )
                        
                        # Update expense as paid
                        await db.expenses.update_one(
                            {"id": expense['id']},
                            {"$set": {"isPaid": True, "lastPaidDate": today}}
                        )
                        
                        processed.append({
                            "expenseId": expense['id'],
                            "expenseName": expense.get('expenseName'),
                            "amount": amount,
                            "accountId": linked_account_id,
                            "accountName": account.get('accountName'),
                            "newBalance": new_balance
                        })
        except Exception as e:
            errors.append({
                "expenseId": expense.get('id'),
                "error": str(e)
            })
    
    return {
        "processedCount": len(processed),
        "processed": processed,
        "errors": errors,
        "processedDate": today
    }

# ============ INVESTMENT ENDPOINTS ============

@api_router.post("/investments", response_model=Investment)
async def create_investment(input: InvestmentCreate):
    investment_dict = input.model_dump()
    investment_obj = Investment(**investment_dict)
    
    doc = investment_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.investments.insert_one(doc)
    return investment_obj

@api_router.get("/investments", response_model=List[Investment])
async def get_investments():
    investments = await db.investments.find({}, {"_id": 0}).to_list(1000)
    
    for investment in investments:
        if isinstance(investment['createdAt'], str):
            investment['createdAt'] = datetime.fromisoformat(investment['createdAt'])
    
    return investments

@api_router.get("/investments/{investment_id}", response_model=Investment)
async def get_investment(investment_id: str):
    investment = await db.investments.find_one({"id": investment_id}, {"_id": 0})
    
    if not investment:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Investment not found")
    
    if isinstance(investment['createdAt'], str):
        investment['createdAt'] = datetime.fromisoformat(investment['createdAt'])
    
    return investment

@api_router.put("/investments/{investment_id}", response_model=Investment)
async def update_investment(investment_id: str, input: InvestmentCreate):
    existing = await db.investments.find_one({"id": investment_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Investment not found")
    
    investment_dict = input.model_dump()
    investment_dict['id'] = investment_id
    investment_dict['createdAt'] = existing['createdAt']
    
    await db.investments.replace_one({"id": investment_id}, investment_dict)
    
    investment_obj = Investment(**investment_dict)
    if isinstance(investment_obj.createdAt, str):
        investment_obj.createdAt = datetime.fromisoformat(investment_obj.createdAt)
    
    return investment_obj

@api_router.delete("/investments/{investment_id}")
async def delete_investment(investment_id: str):
    existing = await db.investments.find_one({"id": investment_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Investment not found")
    
    await db.investments.delete_one({"id": investment_id})
    return {"message": "Investment deleted successfully", "id": investment_id}

# ============ NET WORTH DASHBOARD ENDPOINTS ============

@api_router.get("/dashboard/networth")
async def get_networth_summary():
    """Aggregate all financial data for net worth calculation"""
    
    # Get all assets
    assets = await db.assets.find({}, {"_id": 0}).to_list(1000)
    total_assets = sum(asset.get('currentValue', 0) for asset in assets)
    
    # Get all investments
    investments = await db.investments.find({}, {"_id": 0}).to_list(1000)
    total_investments = sum(inv.get('currentValue', 0) for inv in investments)
    
    # Get all accounts (liquid balance)
    accounts = await db.accounts.find({}, {"_id": 0}).to_list(1000)
    liquid_balance = sum(
        acc.get('currentBalance', 0) for acc in accounts 
        if acc.get('accountType') != 'Credit Card'
    )
    credit_outstanding = sum(
        acc.get('outstandingAmount', 0) or 0 for acc in accounts 
        if acc.get('accountType') == 'Credit Card'
    )
    
    # Get all credit cards
    credit_cards = await db.credit_cards.find({}, {"_id": 0}).to_list(1000)
    credit_card_outstanding = sum(card.get('outstandingAmount', 0) for card in credit_cards)
    credit_card_limit = sum(card.get('creditLimit', 0) for card in credit_cards)
    
    # Get all loans (liabilities)
    loans = await db.loans.find({}, {"_id": 0}).to_list(1000)
    total_liabilities = sum(loan.get('outstandingAmount', 0) for loan in loans)
    total_liabilities += credit_outstanding + credit_card_outstanding
    
    # Get all income sources - Calculate actual monthly income for current month
    incomes = await db.income_sources.find({}, {"_id": 0}).to_list(1000)
    monthly_income = 0
    current_month = datetime.now(timezone.utc).month
    current_year = datetime.now(timezone.utc).year
    
    for income in incomes:
        amount = income.get('expectedAmount', 0)
        freq = income.get('frequency', 'Monthly')
        
        # For each frequency, determine if this income would be received this month
        if freq == 'Daily':
            # Daily income is received every day
            monthly_income += amount * 30
        elif freq == 'Weekly':
            # Weekly income is received ~4 times per month
            monthly_income += amount * 4
        elif freq == 'Monthly':
            # Monthly income is always received once per month
            monthly_income += amount
        elif freq == 'Quarterly':
            # Check if current month is a payment month (Jan, Apr, Jul, Oct typically)
            selected_quarter = income.get('selectedQuarter', '')
            # For quarterly, check if it matches this month's quarter
            quarter_months = {
                'Q1': [1, 2, 3],
                'Q2': [4, 5, 6],
                'Q3': [7, 8, 9],
                'Q4': [10, 11, 12]
            }
            for q_prefix, months in quarter_months.items():
                if selected_quarter and selected_quarter.startswith(q_prefix):
                    # First month of each quarter is the payment month
                    if current_month == months[0]:
                        monthly_income += amount
                    break
            else:
                # If no quarter specified, assume first month of each quarter
                if current_month in [1, 4, 7, 10]:
                    monthly_income += amount
        elif freq == 'Half-Yearly':
            # Check if current month is a payment month (Jan and Jul typically)
            selected_half = income.get('selectedHalf', '')
            if 'Jan' in selected_half:
                if current_month in [1, 7]:
                    monthly_income += amount
            else:
                if current_month in [7, 1]:
                    monthly_income += amount
        elif freq == 'Yearly':
            # Check if current month matches the selected month
            selected_month = income.get('selectedMonth', '')
            month_mapping = {
                "January": 1, "February": 2, "March": 3, "April": 4, 
                "May": 5, "June": 6, "July": 7, "August": 8, 
                "September": 9, "October": 10, "November": 11, "December": 12
            }
            if month_mapping.get(selected_month) == current_month:
                monthly_income += amount
        elif freq == 'Irregular' or freq == 'Others':
            # For irregular income, use custom date if it falls in current month
            custom_date = income.get('customDate', '')
            if custom_date:
                try:
                    date_obj = datetime.fromisoformat(custom_date).date()
                    if date_obj.month == current_month and date_obj.year == current_year:
                        monthly_income += amount
                except (ValueError, TypeError):
                    pass
        else:
            # Default case - assume monthly
            monthly_income += amount
    
    # Get all other income - Calculate for current month
    other_incomes = await db.other_income.find({}, {"_id": 0}).to_list(1000)
    other_income_total = 0
    for other_inc in other_incomes:
        amount = other_inc.get('amount', 0)
        freq = other_inc.get('frequency', 'One-Time')
        
        if freq == 'One-Time':
            # Check if one-time income falls in current month
            date_received = other_inc.get('dateReceived', '')
            if date_received:
                try:
                    date_obj = datetime.fromisoformat(date_received).date()
                    if date_obj.month == current_month and date_obj.year == current_year:
                        other_income_total += amount
                except (ValueError, TypeError):
                    pass
        elif freq == 'Monthly':
            other_income_total += amount
        elif freq == 'Quarterly':
            selected_quarter = other_inc.get('selectedQuarter', '')
            quarter_months = {
                'Q1': [1, 2, 3], 'Q2': [4, 5, 6], 'Q3': [7, 8, 9], 'Q4': [10, 11, 12]
            }
            for q_prefix, months in quarter_months.items():
                if selected_quarter and selected_quarter.startswith(q_prefix):
                    if current_month == months[0]:
                        other_income_total += amount
                    break
            else:
                if current_month in [1, 4, 7, 10]:
                    other_income_total += amount
        elif freq == 'Yearly':
            selected_month = other_inc.get('selectedMonth', '')
            month_mapping = {
                "January": 1, "February": 2, "March": 3, "April": 4,
                "May": 5, "June": 6, "July": 7, "August": 8,
                "September": 9, "October": 10, "November": 11, "December": 12
            }
            if month_mapping.get(selected_month) == current_month:
                other_income_total += amount
        elif freq == 'Irregular':
            date_received = other_inc.get('dateReceived', '')
            if date_received:
                try:
                    date_obj = datetime.fromisoformat(date_received).date()
                    if date_obj.month == current_month and date_obj.year == current_year:
                        other_income_total += amount
                except (ValueError, TypeError):
                    pass
    
    # Add other income to monthly income
    monthly_income += other_income_total
    
    # Get all expenses - Calculate actual monthly expenses for current month
    expenses = await db.expenses.find({}, {"_id": 0}).to_list(1000)
    monthly_expenses = 0
    for expense in expenses:
        amount = expense.get('expectedAmount', 0)
        freq = expense.get('frequency', 'Monthly')
        
        # For each frequency, determine if this expense would occur this month
        if freq == 'Daily':
            monthly_expenses += amount * 30
        elif freq == 'Weekly':
            monthly_expenses += amount * 4
        elif freq == 'Monthly':
            monthly_expenses += amount
        elif freq == 'Quarterly':
            # Check if current month is a payment month
            selected_quarter = expense.get('selectedQuarter', '')
            quarter_months = {
                'Q1': [1, 2, 3],
                'Q2': [4, 5, 6],
                'Q3': [7, 8, 9],
                'Q4': [10, 11, 12]
            }
            for q_prefix, months in quarter_months.items():
                if selected_quarter and selected_quarter.startswith(q_prefix):
                    if current_month == months[0]:
                        monthly_expenses += amount
                    break
            else:
                if current_month in [1, 4, 7, 10]:
                    monthly_expenses += amount
        elif freq == 'Half-Yearly':
            selected_half = expense.get('selectedHalf', '')
            if 'Jan' in selected_half:
                if current_month in [1, 7]:
                    monthly_expenses += amount
            else:
                if current_month in [7, 1]:
                    monthly_expenses += amount
        elif freq == 'Yearly':
            selected_month = expense.get('selectedMonth', '')
            month_mapping = {
                "January": 1, "February": 2, "March": 3, "April": 4, 
                "May": 5, "June": 6, "July": 7, "August": 8, 
                "September": 9, "October": 10, "November": 11, "December": 12
            }
            if month_mapping.get(selected_month) == current_month:
                monthly_expenses += amount
        elif freq == 'One-Time':
            # Check if one-time expense falls in current month
            one_time_date = expense.get('oneTimeDate', '')
            if one_time_date:
                try:
                    date_obj = datetime.fromisoformat(one_time_date).date()
                    if date_obj.month == current_month and date_obj.year == current_year:
                        monthly_expenses += amount
                except (ValueError, TypeError):
                    pass
        else:
            monthly_expenses += amount
    
    # Calculate net worth
    net_worth = total_assets + total_investments + liquid_balance - total_liabilities
    
    return {
        "netWorth": net_worth,
        "totalAssets": total_assets,
        "totalInvestments": total_investments,
        "liquidBalance": liquid_balance,
        "totalLiabilities": total_liabilities,
        "creditOutstanding": credit_outstanding,
        "creditCardOutstanding": credit_card_outstanding,
        "creditCardLimit": credit_card_limit,
        "creditCardUtilization": (credit_card_outstanding / credit_card_limit * 100) if credit_card_limit > 0 else 0,
        "monthlyIncome": monthly_income,
        "monthlyExpenses": monthly_expenses,
        "monthlySavings": monthly_income - monthly_expenses,
        "assetCount": len(assets),
        "investmentCount": len(investments),
        "accountCount": len(accounts),
        "loanCount": len(loans),
        "creditCardCount": len(credit_cards),
        "incomeCount": len(incomes),
        "expenseCount": len(expenses)
    }

@api_router.get("/dashboard/breakdown")
async def get_breakdown():
    """Get detailed breakdown by category"""
    
    # Asset breakdown by type
    assets = await db.assets.find({}, {"_id": 0}).to_list(1000)
    asset_breakdown = {}
    for asset in assets:
        asset_type = asset.get('assetType', 'Other')
        if asset_type not in asset_breakdown:
            asset_breakdown[asset_type] = 0
        asset_breakdown[asset_type] += asset.get('currentValue', 0)
    
    # Investment breakdown by category
    investments = await db.investments.find({}, {"_id": 0}).to_list(1000)
    investment_breakdown = {}
    for inv in investments:
        category = inv.get('investmentCategory', 'Other')
        if category not in investment_breakdown:
            investment_breakdown[category] = 0
        investment_breakdown[category] += inv.get('currentValue', 0)
    
    # Loan breakdown by type
    loans = await db.loans.find({}, {"_id": 0}).to_list(1000)
    loan_breakdown = {}
    for loan in loans:
        loan_type = loan.get('loanType', 'Other')
        if loan_type not in loan_breakdown:
            loan_breakdown[loan_type] = 0
        loan_breakdown[loan_type] += loan.get('outstandingAmount', 0)
    
    # Income breakdown by type
    incomes = await db.income_sources.find({}, {"_id": 0}).to_list(1000)
    income_breakdown = {}
    for income in incomes:
        income_type = income.get('type', 'Other')
        if income_type not in income_breakdown:
            income_breakdown[income_type] = 0
        income_breakdown[income_type] += income.get('expectedAmount', 0)
    
    # Expense breakdown by category
    expenses = await db.expenses.find({}, {"_id": 0}).to_list(1000)
    expense_breakdown = {}
    for expense in expenses:
        category = expense.get('category', 'Other')
        if category not in expense_breakdown:
            expense_breakdown[category] = 0
        expense_breakdown[category] += expense.get('expectedAmount', 0)
    
    return {
        "assetBreakdown": asset_breakdown,
        "investmentBreakdown": investment_breakdown,
        "loanBreakdown": loan_breakdown,
        "incomeBreakdown": income_breakdown,
        "expenseBreakdown": expense_breakdown
    }

# ============ USER PROFILE ENDPOINTS ============

# Profile Models
class BasicProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fullName: str
    monthlyIncome: float
    primaryGoals: List[str]
    riskAppetite: str
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BasicProfileCreate(BaseModel):
    fullName: str
    monthlyIncome: float
    primaryGoals: List[str]
    riskAppetite: str

class ExtendedProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    userId: str
    dob: Optional[str] = None
    maritalStatus: Optional[str] = None
    dependents: Optional[int] = None
    retirementAge: Optional[int] = None
    emergencyFundTarget: Optional[str] = None
    debtComfortLevel: Optional[float] = None
    equityTarget: Optional[float] = None
    debtTarget: Optional[float] = None
    goldTarget: Optional[float] = None
    existingLifeCover: Optional[float] = None
    existingHealthCover: Optional[float] = None
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExtendedProfileCreate(BaseModel):
    dob: Optional[str] = None
    maritalStatus: Optional[str] = None
    dependents: Optional[int] = None
    retirementAge: Optional[int] = None
    emergencyFundTarget: Optional[str] = None
    debtComfortLevel: Optional[float] = None
    equityTarget: Optional[float] = None
    debtTarget: Optional[float] = None
    goldTarget: Optional[float] = None
    existingLifeCover: Optional[float] = None
    existingHealthCover: Optional[float] = None

@api_router.post("/profile/basic", response_model=BasicProfile)
async def create_basic_profile(input: BasicProfileCreate):
    # Check if profile exists
    existing = await db.profiles.find_one({}, {"_id": 0})
    if existing:
        # Update existing profile
        profile_dict = input.model_dump()
        profile_dict['id'] = existing['id']
        profile_dict['createdAt'] = existing['createdAt']
        await db.profiles.replace_one({"id": existing['id']}, profile_dict)
        return BasicProfile(**profile_dict)
    
    profile_dict = input.model_dump()
    profile_obj = BasicProfile(**profile_dict)
    
    doc = profile_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.profiles.insert_one(doc)
    return profile_obj

@api_router.get("/profile/basic")
async def get_basic_profile():
    profile = await db.profiles.find_one({}, {"_id": 0})
    
    if not profile:
        return None
    
    if isinstance(profile.get('createdAt'), str):
        profile['createdAt'] = datetime.fromisoformat(profile['createdAt'])
    
    return profile

@api_router.put("/profile/extended")
async def update_extended_profile(input: ExtendedProfileCreate):
    # Get basic profile first
    basic = await db.profiles.find_one({}, {"_id": 0})
    if not basic:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Basic profile not found. Complete basic setup first.")
    
    # Check if extended profile exists
    existing = await db.extended_profiles.find_one({"userId": basic['id']}, {"_id": 0})
    
    profile_dict = input.model_dump()
    profile_dict['userId'] = basic['id']
    profile_dict['updatedAt'] = datetime.now(timezone.utc).isoformat()
    
    if existing:
        await db.extended_profiles.replace_one({"userId": basic['id']}, profile_dict)
    else:
        await db.extended_profiles.insert_one(profile_dict)
    
    return profile_dict

@api_router.get("/profile/extended")
async def get_extended_profile():
    basic = await db.profiles.find_one({}, {"_id": 0})
    if not basic:
        return None
    
    extended = await db.extended_profiles.find_one({"userId": basic['id']}, {"_id": 0})
    return extended

@api_router.get("/profile/completion")
async def get_profile_completion():
    """Calculate profile completion percentage"""
    basic = await db.profiles.find_one({}, {"_id": 0})
    extended = await db.extended_profiles.find_one({}, {"_id": 0}) if basic else None
    
    completion = 0
    
    # Basic Info (25%)
    if basic:
        if basic.get('fullName'):
            completion += 10
        if basic.get('monthlyIncome'):
            completion += 10
        if basic.get('riskAppetite'):
            completion += 5
    
    # Extended profile fields
    if extended:
        if extended.get('dob'):
            completion += 5
        if extended.get('maritalStatus'):
            completion += 5
        if extended.get('dependents') is not None:
            completion += 5
        if extended.get('retirementAge'):
            completion += 10
        if extended.get('emergencyFundTarget'):
            completion += 5
        if extended.get('debtComfortLevel') is not None:
            completion += 5
        if extended.get('equityTarget') is not None:
            completion += 5
        if extended.get('debtTarget') is not None:
            completion += 5
        if extended.get('goldTarget') is not None:
            completion += 5
        if extended.get('existingLifeCover') is not None:
            completion += 10
        if extended.get('existingHealthCover') is not None:
            completion += 5
    
    return {
        "completion": min(completion, 100),
        "hasBasicProfile": basic is not None,
        "hasExtendedProfile": extended is not None
    }

# ============ CREDIT CARD ENDPOINTS ============

@api_router.post("/credit-cards", response_model=CreditCard)
async def create_credit_card(input: CreditCardCreate):
    card_dict = input.model_dump()
    card_obj = CreditCard(**card_dict)
    
    doc = card_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.credit_cards.insert_one(doc)
    return card_obj

@api_router.get("/credit-cards", response_model=List[CreditCard])
async def get_credit_cards():
    cards = await db.credit_cards.find({}, {"_id": 0}).to_list(1000)
    
    for card in cards:
        if isinstance(card.get('createdAt'), str):
            card['createdAt'] = datetime.fromisoformat(card['createdAt'])
    
    return cards

@api_router.get("/credit-cards/{card_id}", response_model=CreditCard)
async def get_credit_card(card_id: str):
    card = await db.credit_cards.find_one({"id": card_id}, {"_id": 0})
    
    if not card:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Credit card not found")
    
    if isinstance(card.get('createdAt'), str):
        card['createdAt'] = datetime.fromisoformat(card['createdAt'])
    
    return card

@api_router.put("/credit-cards/{card_id}", response_model=CreditCard)
async def update_credit_card(card_id: str, input: CreditCardCreate):
    existing = await db.credit_cards.find_one({"id": card_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Credit card not found")
    
    card_dict = input.model_dump()
    card_dict['id'] = card_id
    card_dict['createdAt'] = existing['createdAt']
    
    await db.credit_cards.replace_one({"id": card_id}, card_dict)
    
    card_obj = CreditCard(**card_dict)
    if isinstance(card_obj.createdAt, str):
        card_obj.createdAt = datetime.fromisoformat(card_obj.createdAt)
    
    return card_obj

@api_router.delete("/credit-cards/{card_id}")
async def delete_credit_card(card_id: str):
    existing = await db.credit_cards.find_one({"id": card_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Credit card not found")
    
    await db.credit_cards.delete_one({"id": card_id})
    return {"message": "Credit card deleted successfully", "id": card_id}

# ============ GOAL ENDPOINTS ============

async def calculate_goal_progress(goal: dict) -> dict:
    """Calculate the current progress of a goal based on linked sources"""
    calculated_amount = 0
    linked_details = []
    sip_projections = []
    
    # If manual override is set, use the stored currentAmount
    if goal.get('manualOverride') and not goal.get('autoCalculate'):
        return {
            "currentAmount": goal.get('currentAmount', 0),
            "linkedDetails": [],
            "sipProjections": [],
            "calculationMethod": "manual"
        }
    
    goal_type = goal.get('goalType', '')
    target_date = goal.get('targetDate')
    
    # Calculate months until target date for SIP projections
    months_to_target = 0
    if target_date:
        try:
            target_dt = datetime.fromisoformat(target_date).date()
            today = datetime.now(timezone.utc).date()
            days_diff = (target_dt - today).days
            months_to_target = max(0, days_diff / 30)
        except (ValueError, TypeError):
            months_to_target = 0
    
    # For Debt Elimination goals - track loan/credit card payoff
    if goal_type == "Debt Elimination":
        if goal.get('linkedLoanId'):
            loan = await db.loans.find_one({"id": goal['linkedLoanId']}, {"_id": 0})
            if loan:
                # Progress = Principal - Outstanding (amount paid off)
                principal = loan.get('principalAmount', 0)
                outstanding = loan.get('outstandingAmount', 0)
                paid_off = principal - outstanding
                calculated_amount += paid_off
                linked_details.append({
                    "type": "Loan",
                    "name": loan.get('loanName'),
                    "contribution": paid_off,
                    "principal": principal,
                    "outstanding": outstanding,
                    "emiAmount": loan.get('emiAmount', 0)
                })
        
        if goal.get('linkedCreditCardId'):
            card = await db.credit_cards.find_one({"id": goal['linkedCreditCardId']}, {"_id": 0})
            if card:
                # For credit card, progress is credit limit - outstanding
                limit = card.get('creditLimit', 0)
                outstanding = card.get('outstandingAmount', 0)
                available = limit - outstanding
                calculated_amount += available
                linked_details.append({
                    "type": "Credit Card",
                    "name": card.get('cardName'),
                    "contribution": available,
                    "creditLimit": limit,
                    "outstanding": outstanding
                })
    
    # For Investment Target / Wealth Creation goals
    elif goal_type in ["Investment Target", "Wealth Creation"]:
        # Sum up linked investments' current values and calculate SIP projections
        linked_investment_ids = goal.get('linkedInvestmentIds', [])
        for inv_id in linked_investment_ids:
            investment = await db.investments.find_one({"id": inv_id}, {"_id": 0})
            if investment:
                current_value = investment.get('currentValue', 0)
                calculated_amount += current_value
                
                # Calculate SIP projection if investment has recurring frequency
                sip_amount = investment.get('sipAmount', 0)
                frequency = investment.get('investmentFrequency', '')
                return_rate = investment.get('returnRate', 0)
                
                projected_value = current_value
                monthly_contribution = 0
                
                if sip_amount and frequency and months_to_target > 0:
                    # Convert frequency to monthly
                    if frequency == 'Daily':
                        monthly_contribution = sip_amount * 30
                    elif frequency == 'Weekly':
                        monthly_contribution = sip_amount * 4
                    elif frequency == 'Monthly':
                        monthly_contribution = sip_amount
                    elif frequency == 'Quarterly':
                        monthly_contribution = sip_amount / 3
                    elif frequency == 'Yearly':
                        monthly_contribution = sip_amount / 12
                    
                    # Calculate future value with compound growth
                    # FV = PV * (1 + r)^n + PMT * [((1 + r)^n - 1) / r]
                    monthly_rate = (return_rate / 100) / 12 if return_rate else 0
                    n = months_to_target
                    
                    if monthly_rate > 0:
                        # Compound growth of current value
                        pv_growth = current_value * ((1 + monthly_rate) ** n)
                        # Future value of monthly contributions
                        pmt_growth = monthly_contribution * (((1 + monthly_rate) ** n - 1) / monthly_rate)
                        projected_value = pv_growth + pmt_growth
                    else:
                        # No growth rate, simple addition
                        projected_value = current_value + (monthly_contribution * n)
                    
                    sip_projections.append({
                        "investmentId": inv_id,
                        "investmentName": investment.get('name'),
                        "currentValue": current_value,
                        "sipAmount": sip_amount,
                        "frequency": frequency,
                        "monthlyContribution": monthly_contribution,
                        "returnRate": return_rate,
                        "projectedValue": round(projected_value, 2),
                        "projectedGain": round(projected_value - current_value, 2),
                        "monthsToTarget": round(months_to_target, 1)
                    })
                
                linked_details.append({
                    "type": "Investment",
                    "name": investment.get('name'),
                    "category": investment.get('investmentCategory'),
                    "contribution": current_value,
                    "principal": investment.get('principal', 0),
                    "hasSIP": bool(sip_amount and frequency),
                    "sipAmount": sip_amount,
                    "frequency": frequency,
                    "projectedValue": round(projected_value, 2) if sip_amount else None
                })
        
        # Also add linked account balances
        linked_account_ids = goal.get('linkedAccountIds', [])
        for acc_id in linked_account_ids:
            account = await db.accounts.find_one({"id": acc_id}, {"_id": 0})
            if account and account.get('accountType') != 'Credit Card':
                balance = account.get('currentBalance', 0)
                calculated_amount += balance
                linked_details.append({
                    "type": "Account",
                    "name": account.get('accountName'),
                    "accountType": account.get('accountType'),
                    "contribution": balance
                })
    
    # For Emergency Fund goals
    elif goal_type == "Emergency Fund":
        # Sum up linked account balances (savings, FDs, etc.)
        linked_account_ids = goal.get('linkedAccountIds', [])
        for acc_id in linked_account_ids:
            account = await db.accounts.find_one({"id": acc_id}, {"_id": 0})
            if account and account.get('accountType') != 'Credit Card':
                balance = account.get('currentBalance', 0)
                calculated_amount += balance
                linked_details.append({
                    "type": "Account",
                    "name": account.get('accountName'),
                    "accountType": account.get('accountType'),
                    "contribution": balance
                })
        
        # Also include liquid investments with SIP projections
        linked_investment_ids = goal.get('linkedInvestmentIds', [])
        for inv_id in linked_investment_ids:
            investment = await db.investments.find_one({"id": inv_id}, {"_id": 0})
            if investment:
                current_value = investment.get('currentValue', 0)
                calculated_amount += current_value
                
                # Calculate SIP projection
                sip_amount = investment.get('sipAmount', 0)
                frequency = investment.get('investmentFrequency', '')
                return_rate = investment.get('returnRate', 0)
                
                projected_value = current_value
                monthly_contribution = 0
                
                if sip_amount and frequency and months_to_target > 0:
                    if frequency == 'Daily':
                        monthly_contribution = sip_amount * 30
                    elif frequency == 'Weekly':
                        monthly_contribution = sip_amount * 4
                    elif frequency == 'Monthly':
                        monthly_contribution = sip_amount
                    elif frequency == 'Quarterly':
                        monthly_contribution = sip_amount / 3
                    elif frequency == 'Yearly':
                        monthly_contribution = sip_amount / 12
                    
                    monthly_rate = (return_rate / 100) / 12 if return_rate else 0
                    n = months_to_target
                    
                    if monthly_rate > 0:
                        pv_growth = current_value * ((1 + monthly_rate) ** n)
                        pmt_growth = monthly_contribution * (((1 + monthly_rate) ** n - 1) / monthly_rate)
                        projected_value = pv_growth + pmt_growth
                    else:
                        projected_value = current_value + (monthly_contribution * n)
                    
                    sip_projections.append({
                        "investmentId": inv_id,
                        "investmentName": investment.get('name'),
                        "currentValue": current_value,
                        "sipAmount": sip_amount,
                        "frequency": frequency,
                        "monthlyContribution": monthly_contribution,
                        "returnRate": return_rate,
                        "projectedValue": round(projected_value, 2),
                        "projectedGain": round(projected_value - current_value, 2),
                        "monthsToTarget": round(months_to_target, 1)
                    })
                
                linked_details.append({
                    "type": "Investment",
                    "name": investment.get('name'),
                    "category": investment.get('investmentCategory'),
                    "contribution": current_value,
                    "hasSIP": bool(sip_amount and frequency),
                    "projectedValue": round(projected_value, 2) if sip_amount else None
                })
    
    # For Other/Custom goals - use linked sources or manual amount
    else:
        # Sum up any linked investments with SIP projections
        for inv_id in goal.get('linkedInvestmentIds', []):
            investment = await db.investments.find_one({"id": inv_id}, {"_id": 0})
            if investment:
                current_value = investment.get('currentValue', 0)
                calculated_amount += current_value
                
                # Calculate SIP projection
                sip_amount = investment.get('sipAmount', 0)
                frequency = investment.get('investmentFrequency', '')
                return_rate = investment.get('returnRate', 0)
                
                projected_value = current_value
                monthly_contribution = 0
                
                if sip_amount and frequency and months_to_target > 0:
                    if frequency == 'Daily':
                        monthly_contribution = sip_amount * 30
                    elif frequency == 'Weekly':
                        monthly_contribution = sip_amount * 4
                    elif frequency == 'Monthly':
                        monthly_contribution = sip_amount
                    elif frequency == 'Quarterly':
                        monthly_contribution = sip_amount / 3
                    elif frequency == 'Yearly':
                        monthly_contribution = sip_amount / 12
                    
                    monthly_rate = (return_rate / 100) / 12 if return_rate else 0
                    n = months_to_target
                    
                    if monthly_rate > 0:
                        pv_growth = current_value * ((1 + monthly_rate) ** n)
                        pmt_growth = monthly_contribution * (((1 + monthly_rate) ** n - 1) / monthly_rate)
                        projected_value = pv_growth + pmt_growth
                    else:
                        projected_value = current_value + (monthly_contribution * n)
                    
                    sip_projections.append({
                        "investmentId": inv_id,
                        "investmentName": investment.get('name'),
                        "currentValue": current_value,
                        "sipAmount": sip_amount,
                        "frequency": frequency,
                        "monthlyContribution": monthly_contribution,
                        "returnRate": return_rate,
                        "projectedValue": round(projected_value, 2),
                        "projectedGain": round(projected_value - current_value, 2),
                        "monthsToTarget": round(months_to_target, 1)
                    })
                
                linked_details.append({
                    "type": "Investment",
                    "name": investment.get('name'),
                    "contribution": current_value,
                    "hasSIP": bool(sip_amount and frequency),
                    "projectedValue": round(projected_value, 2) if sip_amount else None
                })
        
        # Sum up linked accounts
        for acc_id in goal.get('linkedAccountIds', []):
            account = await db.accounts.find_one({"id": acc_id}, {"_id": 0})
            if account and account.get('accountType') != 'Credit Card':
                calculated_amount += account.get('currentBalance', 0)
                linked_details.append({
                    "type": "Account",
                    "name": account.get('accountName'),
                    "contribution": account.get('currentBalance', 0)
                })
    
    # Calculate total projected value from all SIPs
    total_projected_from_sips = sum(sp.get('projectedValue', 0) for sp in sip_projections)
    total_monthly_sip_contribution = sum(sp.get('monthlyContribution', 0) for sp in sip_projections)
    
    # If manual override is set but auto-calculate is also on, use max of both
    if goal.get('manualOverride'):
        manual_amount = goal.get('currentAmount', 0)
        if manual_amount > calculated_amount:
            return {
                "currentAmount": manual_amount,
                "linkedDetails": linked_details,
                "sipProjections": sip_projections,
                "totalProjectedFromSIPs": total_projected_from_sips,
                "totalMonthlySIPContribution": total_monthly_sip_contribution,
                "monthsToTarget": round(months_to_target, 1),
                "calculationMethod": "manual_override"
            }
    
    return {
        "currentAmount": calculated_amount,
        "linkedDetails": linked_details,
        "sipProjections": sip_projections,
        "totalProjectedFromSIPs": total_projected_from_sips,
        "totalMonthlySIPContribution": total_monthly_sip_contribution,
        "monthsToTarget": round(months_to_target, 1),
        "calculationMethod": "auto"
    }

@api_router.post("/goals", response_model=Goal)
async def create_goal(input: GoalCreate):
    goal_dict = input.model_dump()
    goal_obj = Goal(**goal_dict)
    
    # For Debt Elimination, auto-set target to outstanding amount
    if goal_obj.goalType == "Debt Elimination":
        if goal_obj.linkedLoanId:
            loan = await db.loans.find_one({"id": goal_obj.linkedLoanId}, {"_id": 0})
            if loan and goal_obj.targetAmount == 0:
                goal_obj.targetAmount = loan.get('outstandingAmount', 0)
        elif goal_obj.linkedCreditCardId:
            card = await db.credit_cards.find_one({"id": goal_obj.linkedCreditCardId}, {"_id": 0})
            if card and goal_obj.targetAmount == 0:
                goal_obj.targetAmount = card.get('outstandingAmount', 0)
    
    doc = goal_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.goals.insert_one(doc)
    return goal_obj

@api_router.get("/goals")
async def get_goals():
    """Get all goals with calculated progress"""
    goals = await db.goals.find({}, {"_id": 0}).to_list(1000)
    
    result = []
    for goal in goals:
        if isinstance(goal.get('createdAt'), str):
            goal['createdAt'] = datetime.fromisoformat(goal['createdAt'])
        
        # Calculate progress
        progress_data = await calculate_goal_progress(goal)
        goal['calculatedAmount'] = progress_data['currentAmount']
        goal['linkedDetails'] = progress_data['linkedDetails']
        goal['calculationMethod'] = progress_data['calculationMethod']
        goal['sipProjections'] = progress_data.get('sipProjections', [])
        goal['totalProjectedFromSIPs'] = progress_data.get('totalProjectedFromSIPs', 0)
        goal['totalMonthlySIPContribution'] = progress_data.get('totalMonthlySIPContribution', 0)
        
        # Calculate progress percentage
        target = goal.get('targetAmount', 0)
        current = progress_data['currentAmount']
        goal['progressPercent'] = round((current / target) * 100, 1) if target > 0 else 0
        
        # Calculate projected progress percentage (using SIP projections)
        projected_total = progress_data.get('totalProjectedFromSIPs', 0)
        if projected_total > 0:
            goal['projectedProgressPercent'] = round((projected_total / target) * 100, 1) if target > 0 else 0
        else:
            goal['projectedProgressPercent'] = goal['progressPercent']
        
        # Calculate days remaining
        target_date = goal.get('targetDate')
        if target_date:
            try:
                target_dt = datetime.fromisoformat(target_date).date()
                today = datetime.now(timezone.utc).date()
                days_remaining = (target_dt - today).days
                goal['daysRemaining'] = days_remaining
                goal['isOverdue'] = days_remaining < 0
            except (ValueError, TypeError):
                goal['daysRemaining'] = None
                goal['isOverdue'] = False
        
        result.append(goal)
    
    # Sort by priority (1=high first) then by days remaining
    result.sort(key=lambda x: (x.get('priority', 1), x.get('daysRemaining') or 9999))
    
    return result

@api_router.get("/goals/achievements")
async def get_goal_achievements():
    """Get all completed goals with their milestone history for the achievements page"""
    completed_goals = await db.goals.find({"isCompleted": True}, {"_id": 0}).to_list(1000)
    
    achievements = []
    for goal in completed_goals:
        if isinstance(goal.get('createdAt'), str):
            goal['createdAt'] = datetime.fromisoformat(goal['createdAt'])
        
        # Calculate final progress data
        progress_data = await calculate_goal_progress(goal)
        
        # Build milestone history with dates
        reached_milestones = goal.get('reachedMilestones', [])
        milestone_history = []
        
        # For each standard milestone, check if it was reached
        for milestone in [25, 50, 75, 100]:
            is_reached = milestone in reached_milestones
            milestone_history.append({
                "milestone": milestone,
                "reached": is_reached,
                "label": f"{milestone}% Complete"
            })
        
        # Calculate duration from creation to completion
        created_at = goal.get('createdAt')
        completed_date = goal.get('completedDate')
        duration_days = None
        
        if created_at and completed_date:
            try:
                if isinstance(created_at, str):
                    created_dt = datetime.fromisoformat(created_at)
                else:
                    created_dt = created_at
                completed_dt = datetime.fromisoformat(completed_date)
                duration_days = (completed_dt - created_dt).days
            except (ValueError, TypeError):
                pass
        
        achievement = {
            "id": goal.get('id'),
            "goalName": goal.get('goalName'),
            "goalType": goal.get('goalType'),
            "customTypeName": goal.get('customTypeName'),
            "targetAmount": goal.get('targetAmount', 0),
            "finalAmount": progress_data['currentAmount'],
            "targetDate": goal.get('targetDate'),
            "completedDate": goal.get('completedDate'),
            "createdAt": goal.get('createdAt').isoformat() if isinstance(goal.get('createdAt'), datetime) else goal.get('createdAt'),
            "milestoneHistory": milestone_history,
            "reachedMilestones": reached_milestones,
            "durationDays": duration_days,
            "priority": goal.get('priority', 1),
            "notes": goal.get('notes'),
            "linkedDetails": progress_data.get('linkedDetails', [])
        }
        
        achievements.append(achievement)
    
    # Sort by completion date (most recent first)
    achievements.sort(key=lambda x: x.get('completedDate') or '', reverse=True)
    
    # Calculate summary stats
    total_achieved = sum(a.get('finalAmount', 0) for a in achievements)
    avg_duration = sum(a.get('durationDays', 0) or 0 for a in achievements) / len(achievements) if achievements else 0
    
    return {
        "totalCompleted": len(achievements),
        "totalAmountAchieved": total_achieved,
        "averageDurationDays": round(avg_duration),
        "achievements": achievements
    }

@api_router.get("/goals/{goal_id}")
async def get_goal(goal_id: str):
    """Get a single goal with full details"""
    goal = await db.goals.find_one({"id": goal_id}, {"_id": 0})
    
    if not goal:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Goal not found")
    
    if isinstance(goal.get('createdAt'), str):
        goal['createdAt'] = datetime.fromisoformat(goal['createdAt'])
    
    # Calculate progress
    progress_data = await calculate_goal_progress(goal)
    goal['calculatedAmount'] = progress_data['currentAmount']
    goal['linkedDetails'] = progress_data['linkedDetails']
    goal['calculationMethod'] = progress_data['calculationMethod']
    goal['sipProjections'] = progress_data.get('sipProjections', [])
    goal['totalProjectedFromSIPs'] = progress_data.get('totalProjectedFromSIPs', 0)
    goal['totalMonthlySIPContribution'] = progress_data.get('totalMonthlySIPContribution', 0)
    goal['monthsToTarget'] = progress_data.get('monthsToTarget', 0)
    
    # Calculate progress percentage
    target = goal.get('targetAmount', 0)
    current = progress_data['currentAmount']
    goal['progressPercent'] = round((current / target) * 100, 1) if target > 0 else 0
    
    # Calculate projected progress percentage
    projected_total = progress_data.get('totalProjectedFromSIPs', 0)
    if projected_total > 0:
        goal['projectedProgressPercent'] = round((projected_total / target) * 100, 1) if target > 0 else 0
    else:
        goal['projectedProgressPercent'] = goal['progressPercent']
    
    # Calculate additional monthly savings needed to reach goal
    remaining = target - current
    months_to_target = progress_data.get('monthsToTarget', 0)
    monthly_sip = progress_data.get('totalMonthlySIPContribution', 0)
    
    if months_to_target > 0:
        # Monthly needed without SIP growth
        monthly_needed_total = remaining / months_to_target
        # Additional monthly needed beyond current SIP
        additional_monthly_needed = max(0, monthly_needed_total - monthly_sip)
        goal['additionalMonthlySavingsNeeded'] = round(additional_monthly_needed, 2)
        goal['totalMonthlyNeeded'] = round(monthly_needed_total, 2)
    else:
        goal['additionalMonthlySavingsNeeded'] = 0
        goal['totalMonthlyNeeded'] = 0
    
    # Calculate days remaining
    target_date = goal.get('targetDate')
    if target_date:
        try:
            target_dt = datetime.fromisoformat(target_date).date()
            today = datetime.now(timezone.utc).date()
            days_remaining = (target_dt - today).days
            goal['daysRemaining'] = days_remaining
            goal['isOverdue'] = days_remaining < 0
        except (ValueError, TypeError):
            goal['daysRemaining'] = None
            goal['isOverdue'] = False
    
    # Get full details of linked sources
    linked_investments = []
    for inv_id in goal.get('linkedInvestmentIds', []):
        inv = await db.investments.find_one({"id": inv_id}, {"_id": 0})
        if inv:
            linked_investments.append(inv)
    goal['linkedInvestments'] = linked_investments
    
    linked_accounts = []
    for acc_id in goal.get('linkedAccountIds', []):
        acc = await db.accounts.find_one({"id": acc_id}, {"_id": 0})
        if acc:
            linked_accounts.append(acc)
    goal['linkedAccounts'] = linked_accounts
    
    if goal.get('linkedLoanId'):
        loan = await db.loans.find_one({"id": goal['linkedLoanId']}, {"_id": 0})
        goal['linkedLoan'] = loan
    
    if goal.get('linkedCreditCardId'):
        card = await db.credit_cards.find_one({"id": goal['linkedCreditCardId']}, {"_id": 0})
        goal['linkedCreditCard'] = card
    
    return goal

@api_router.get("/goals/{goal_id}/milestones")
async def check_goal_milestones(goal_id: str):
    """Check and update milestones for a goal, return newly reached milestones"""
    goal = await db.goals.find_one({"id": goal_id}, {"_id": 0})
    
    if not goal:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Calculate current progress
    progress_data = await calculate_goal_progress(goal)
    current_amount = progress_data['currentAmount']
    target_amount = goal.get('targetAmount', 0)
    
    progress_percent = round((current_amount / target_amount) * 100, 1) if target_amount > 0 else 0
    
    # Define milestones
    milestones = [25, 50, 75, 100]
    reached_milestones = goal.get('reachedMilestones', [])
    newly_reached = []
    
    for milestone in milestones:
        if progress_percent >= milestone and milestone not in reached_milestones:
            newly_reached.append(milestone)
            reached_milestones.append(milestone)
    
    # Update milestones in database if any new ones reached
    if newly_reached:
        await db.goals.update_one(
            {"id": goal_id},
            {"$set": {"reachedMilestones": reached_milestones}}
        )
    
    return {
        "goalId": goal_id,
        "goalName": goal.get('goalName', ''),
        "progressPercent": progress_percent,
        "currentAmount": current_amount,
        "targetAmount": target_amount,
        "reachedMilestones": reached_milestones,
        "newlyReached": newly_reached,
        "isCompleted": goal.get('isCompleted', False)
    }

@api_router.put("/goals/{goal_id}")
async def update_goal(goal_id: str, input: GoalCreate):
    existing = await db.goals.find_one({"id": goal_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Goal not found")
    
    goal_dict = input.model_dump()
    goal_dict['id'] = goal_id
    goal_dict['createdAt'] = existing['createdAt']
    goal_dict['isCompleted'] = existing.get('isCompleted', False)
    goal_dict['completedDate'] = existing.get('completedDate')
    
    await db.goals.replace_one({"id": goal_id}, goal_dict)
    
    # Return updated goal with progress
    updated = await db.goals.find_one({"id": goal_id}, {"_id": 0})
    progress_data = await calculate_goal_progress(updated)
    updated['calculatedAmount'] = progress_data['currentAmount']
    updated['progressPercent'] = round((progress_data['currentAmount'] / updated.get('targetAmount', 1)) * 100, 1) if updated.get('targetAmount', 0) > 0 else 0
    
    return updated

@api_router.patch("/goals/{goal_id}/complete")
async def mark_goal_complete(goal_id: str):
    """Mark a goal as completed"""
    existing = await db.goals.find_one({"id": goal_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Goal not found")
    
    await db.goals.update_one(
        {"id": goal_id},
        {"$set": {
            "isCompleted": True,
            "completedDate": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Goal marked as completed", "id": goal_id}

@api_router.patch("/goals/{goal_id}/progress")
async def update_goal_progress(goal_id: str, current_amount: float):
    """Manually update the current amount for a goal"""
    existing = await db.goals.find_one({"id": goal_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Goal not found")
    
    await db.goals.update_one(
        {"id": goal_id},
        {"$set": {
            "currentAmount": current_amount,
            "manualOverride": True
        }}
    )
    
    # Check if goal is now complete
    target = existing.get('targetAmount', 0)
    if current_amount >= target and target > 0:
        await db.goals.update_one(
            {"id": goal_id},
            {"$set": {
                "isCompleted": True,
                "completedDate": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Goal progress updated and marked as completed!", "id": goal_id, "currentAmount": current_amount}
    
    return {"message": "Goal progress updated", "id": goal_id, "currentAmount": current_amount}

@api_router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str):
    existing = await db.goals.find_one({"id": goal_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Goal not found")
    
    await db.goals.delete_one({"id": goal_id})
    return {"message": "Goal deleted successfully", "id": goal_id}

# Pydantic model for batch priority update
class GoalPriorityUpdate(BaseModel):
    id: str
    priority: int

@api_router.patch("/goals/reorder")
async def reorder_goals(updates: List[GoalPriorityUpdate]):
    """Update priorities for multiple goals at once (for drag-and-drop reordering)"""
    updated_count = 0
    
    for update in updates:
        result = await db.goals.update_one(
            {"id": update.id},
            {"$set": {"priority": update.priority}}
        )
        if result.modified_count > 0:
            updated_count += 1
    
    return {"message": f"Updated priorities for {updated_count} goals", "updatedCount": updated_count}

@api_router.get("/goals/summary/dashboard")
async def get_goals_dashboard_summary():
    """Get summary of goals for dashboard widget"""
    goals = await db.goals.find({"isCompleted": False}, {"_id": 0}).to_list(1000)
    
    total_goals = len(goals)
    completed_count = await db.goals.count_documents({"isCompleted": True})
    
    summary = {
        "totalActiveGoals": total_goals,
        "completedGoals": completed_count,
        "goals": []
    }
    
    for goal in goals[:5]:  # Top 5 goals for dashboard
        progress_data = await calculate_goal_progress(goal)
        target = goal.get('targetAmount', 0)
        current = progress_data['currentAmount']
        
        target_date = goal.get('targetDate')
        days_remaining = None
        if target_date:
            try:
                target_dt = datetime.fromisoformat(target_date).date()
                today = datetime.now(timezone.utc).date()
                days_remaining = (target_dt - today).days
            except (ValueError, TypeError):
                pass
        
        summary["goals"].append({
            "id": goal.get('id'),
            "goalName": goal.get('goalName'),
            "goalType": goal.get('goalType'),
            "targetAmount": target,
            "currentAmount": current,
            "progressPercent": round((current / target) * 100, 1) if target > 0 else 0,
            "daysRemaining": days_remaining,
            "priority": goal.get('priority', 1)
        })
    
    # Sort by priority then by progress (lowest progress first - needs attention)
    summary["goals"].sort(key=lambda x: (x.get('priority', 1), x.get('progressPercent', 0)))
    
    return summary

# ============ OTHER INCOME ENDPOINTS ============

@api_router.post("/other-income", response_model=OtherIncome)
async def create_other_income(input: OtherIncomeCreate):
    income_dict = input.model_dump()
    income_obj = OtherIncome(**income_dict)
    
    doc = income_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.other_income.insert_one(doc)
    return income_obj

@api_router.get("/other-income", response_model=List[OtherIncome])
async def get_other_incomes():
    incomes = await db.other_income.find({}, {"_id": 0}).to_list(1000)
    
    for income in incomes:
        if isinstance(income.get('createdAt'), str):
            income['createdAt'] = datetime.fromisoformat(income['createdAt'])
    
    return incomes

@api_router.get("/other-income/{income_id}", response_model=OtherIncome)
async def get_other_income(income_id: str):
    income = await db.other_income.find_one({"id": income_id}, {"_id": 0})
    
    if not income:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Other income not found")
    
    if isinstance(income.get('createdAt'), str):
        income['createdAt'] = datetime.fromisoformat(income['createdAt'])
    
    return income

@api_router.put("/other-income/{income_id}", response_model=OtherIncome)
async def update_other_income(income_id: str, input: OtherIncomeCreate):
    existing = await db.other_income.find_one({"id": income_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Other income not found")
    
    income_dict = input.model_dump()
    income_dict['id'] = income_id
    income_dict['createdAt'] = existing['createdAt']
    
    await db.other_income.replace_one({"id": income_id}, income_dict)
    
    income_obj = OtherIncome(**income_dict)
    if isinstance(income_obj.createdAt, str):
        income_obj.createdAt = datetime.fromisoformat(income_obj.createdAt)
    
    return income_obj

@api_router.delete("/other-income/{income_id}")
async def delete_other_income(income_id: str):
    existing = await db.other_income.find_one({"id": income_id}, {"_id": 0})
    
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Other income not found")
    
    await db.other_income.delete_one({"id": income_id})
    return {"message": "Other income deleted successfully", "id": income_id}

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