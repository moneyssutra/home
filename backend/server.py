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
    isInsured: bool = False
    linkedInsuranceId: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None

# Investment Model
class Investment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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

# ============ LOAN ENDPOINTS ============

@api_router.post("/loans", response_model=Loan)
async def create_loan(input: LoanCreate):
    loan_dict = input.model_dump()
    loan_obj = Loan(**loan_dict)
    
    doc = loan_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.loans.insert_one(doc)
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

# ============ ASSET ENDPOINTS ============

@api_router.post("/assets", response_model=Asset)
async def create_asset(input: AssetCreate):
    asset_dict = input.model_dump()
    asset_obj = Asset(**asset_dict)
    
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
    
    # Get all income sources
    incomes = await db.income_sources.find({}, {"_id": 0}).to_list(1000)
    monthly_income = 0
    for income in incomes:
        amount = income.get('expectedAmount', 0)
        freq = income.get('frequency', 'Monthly')
        if freq == 'Daily':
            monthly_income += amount * 30
        elif freq == 'Weekly':
            monthly_income += amount * 4
        elif freq == 'Monthly':
            monthly_income += amount
        elif freq == 'Quarterly':
            monthly_income += amount / 3
        elif freq == 'Half-Yearly':
            monthly_income += amount / 6
        elif freq == 'Yearly':
            monthly_income += amount / 12
        else:
            monthly_income += amount
    
    # Get all expenses
    expenses = await db.expenses.find({}, {"_id": 0}).to_list(1000)
    monthly_expenses = 0
    for expense in expenses:
        amount = expense.get('expectedAmount', 0)
        freq = expense.get('frequency', 'Monthly')
        if freq == 'Daily':
            monthly_expenses += amount * 30
        elif freq == 'Weekly':
            monthly_expenses += amount * 4
        elif freq == 'Monthly':
            monthly_expenses += amount
        elif freq == 'Quarterly':
            monthly_expenses += amount / 3
        elif freq == 'Half-Yearly':
            monthly_expenses += amount / 6
        elif freq == 'Yearly':
            monthly_expenses += amount / 12
        elif freq == 'One-Time':
            monthly_expenses += 0  # Don't include one-time in monthly
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