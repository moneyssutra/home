"""Financial models - Account, Expense, Loan, Asset, Investment, CreditCard."""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid


# Account Model
class Account(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None
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
    userId: Optional[str] = None
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
    isEssential: Optional[bool] = None


# Loan Model
class Loan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None
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
    userId: Optional[str] = None
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
    userId: Optional[str] = None
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
    investmentFrequency: Optional[str] = None  # For SIP
    sipAmount: Optional[float] = None
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
