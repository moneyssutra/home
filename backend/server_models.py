"""All Pydantic models for the MoneySsutra application."""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid


# ============ STATUS CHECK ============
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
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
    auth_type: str = "google"
    password_hash: Optional[str] = None
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
    remember_me: bool = False

class GoogleSessionRequest(BaseModel):
    session_id: str
    remember_me: bool = False

class RegisterRequest(BaseModel):
    firstName: str
    middleName: Optional[str] = None
    lastName: str
    email: str
    mobile: Optional[str] = None
    sex: str
    dateOfBirth: str
    password: str

class SetPasswordRequest(BaseModel):
    password: str

class CheckAvailabilityRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None

class ForgotUsernameRequest(BaseModel):
    email: str

class ForgotPasswordRequest(BaseModel):
    username: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ============ WORKSPACE MODELS ============
class Workspace(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: f"ws_{uuid.uuid4().hex[:12]}")
    name: str
    type: str = "Personal"
    owner_id: str
    invite_code: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WorkspaceCreate(BaseModel):
    name: str
    type: str = "Personal"

class WorkspaceMember(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: f"wm_{uuid.uuid4().hex[:12]}")
    workspace_id: str
    user_id: str
    user_email: str
    user_name: str
    role: str = "viewer"
    invited_by: Optional[str] = None
    invited_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    accepted_at: Optional[datetime] = None
    status: str = "pending"

class WorkspaceInvite(BaseModel):
    email: str
    role: str = "viewer"

class WorkspaceInviteByCode(BaseModel):
    invite_code: str


# ============ INCOME MODELS ============
class IncomeSource(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None
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
    principal: Optional[float] = None
    rate: Optional[float] = None
    interestType: Optional[str] = None
    compoundingFrequency: Optional[str] = None
    manualOverride: Optional[bool] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    currentAmount: Optional[float] = None
    tenantName: Optional[str] = None
    assetId: Optional[str] = None
    securityDeposit: Optional[float] = None
    isVariable: Optional[bool] = None
    sourceCategory: Optional[str] = None
    units: Optional[float] = None
    profession: Optional[str] = None
    incomeType: Optional[str] = "fixed"
    lastRecordedAmount: Optional[float] = None
    reminderTime: Optional[str] = None
    lastEntryDate: Optional[str] = None
    nextDueDate: Optional[str] = None
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
    principal: Optional[float] = None
    rate: Optional[float] = None
    interestType: Optional[str] = None
    compoundingFrequency: Optional[str] = None
    manualOverride: Optional[bool] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    currentAmount: Optional[float] = None
    tenantName: Optional[str] = None
    assetId: Optional[str] = None
    securityDeposit: Optional[float] = None
    isVariable: Optional[bool] = None
    sourceCategory: Optional[str] = None
    units: Optional[float] = None
    profession: Optional[str] = None
    incomeType: Optional[str] = "fixed"
    lastRecordedAmount: Optional[float] = None
    reminderTime: Optional[str] = None
    lastEntryDate: Optional[str] = None
    nextDueDate: Optional[str] = None


# ============ ACCOUNT MODEL ============
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


# ============ EXPENSE MODEL ============
class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None
    expenseName: str
    expenseType: str
    category: str
    expectedAmount: float
    frequency: str
    linkedAccountId: Optional[str] = None
    linkedLoanId: Optional[str] = None
    linkedInsuranceId: Optional[str] = None
    linkedInvestmentId: Optional[str] = None
    selectedDay: Optional[str] = None
    selectedDate: Optional[str] = None
    selectedQuarter: Optional[str] = None
    selectedHalf: Optional[str] = None
    selectedMonth: Optional[str] = None
    oneTimeDate: Optional[str] = None
    isPaid: bool = False
    lastPaidDate: Optional[str] = None
    paidDate: Optional[str] = None
    prepaidFlag: bool = False
    expenseMonth: Optional[str] = None
    dueDate: Optional[str] = None
    linkedPaymentId: Optional[str] = None
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
    linkedInvestmentId: Optional[str] = None
    selectedDay: Optional[str] = None
    selectedDate: Optional[str] = None
    selectedQuarter: Optional[str] = None
    selectedHalf: Optional[str] = None
    selectedMonth: Optional[str] = None
    oneTimeDate: Optional[str] = None
    isPaid: bool = False
    lastPaidDate: Optional[str] = None
    paidDate: Optional[str] = None
    prepaidFlag: bool = False
    expenseMonth: Optional[str] = None
    dueDate: Optional[str] = None
    linkedPaymentId: Optional[str] = None


# ============ INSURANCE MODEL ============
class Insurance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None
    insuranceType: str
    policyName: str
    coverageAmount: float
    premiumAmount: float
    premiumFrequency: str
    startDate: str
    endDate: Optional[str] = None
    premiumPaymentDate: Optional[str] = None
    linkedAssetId: Optional[str] = None
    coveredPerson: Optional[str] = None
    linkedExpenseId: Optional[str] = None
    maturityType: Optional[str] = None
    expectedMaturityAmount: Optional[float] = None
    autoCreateExpense: bool = False
    premiumEndDate: Optional[str] = None
    premiumPaymentTerm: Optional[str] = None
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
    premiumPaymentDate: Optional[str] = None
    linkedAssetId: Optional[str] = None
    coveredPerson: Optional[str] = None
    maturityType: Optional[str] = None
    expectedMaturityAmount: Optional[float] = None
    autoCreateExpense: bool = False
    premiumEndDate: Optional[str] = None
    premiumPaymentTerm: Optional[str] = None
    notes: Optional[str] = None


# ============ LOAN MODEL ============
class Loan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None
    loanType: Optional[str] = None
    loanName: str
    lenderName: Optional[str] = None
    principalAmount: float
    outstandingAmount: Optional[float] = None
    interestRate: float
    emiAmount: float
    emiFrequency: str = "Monthly"
    tenureMonths: Optional[int] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    linkedAssetId: Optional[str] = None
    linkedAccountId: Optional[str] = None
    autoCreateExpense: bool = True
    lastEmiUpdateDate: Optional[str] = None
    emiSelectedDate: Optional[str] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LoanCreate(BaseModel):
    loanType: Optional[str] = None
    loanName: str
    lenderName: Optional[str] = None
    principalAmount: float
    outstandingAmount: Optional[float] = None
    interestRate: float
    emiAmount: float
    emiFrequency: str = "Monthly"
    tenureMonths: Optional[int] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    linkedAssetId: Optional[str] = None
    linkedAccountId: Optional[str] = None
    autoCreateExpense: bool = True
    emiSelectedDate: Optional[str] = None


# ============ ASSET MODEL ============
class Asset(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None
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


# ============ INVESTMENT MODEL ============
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
    investmentFrequency: Optional[str] = None
    sipAmount: Optional[float] = None
    sipSelectedDay: Optional[str] = None
    sipSelectedDate: Optional[str] = None
    sipSelectedQuarter: Optional[str] = None
    sipSelectedHalf: Optional[str] = None
    sipSelectedMonth: Optional[str] = None
    autoCreateExpense: bool = False
    isLiquidAsset: bool = False
    linkedExpenseId: Optional[str] = None
    lastSipUpdateDate: Optional[str] = None
    # Loan Given fields
    borrowerName: Optional[str] = None
    borrowerContact: Optional[str] = None
    interestType: Optional[str] = None  # "none", "simple", "custom"
    agreedReturnAmount: Optional[float] = None
    repaymentType: Optional[str] = None  # "flexible", "fixed", "lump_sum"
    repaymentFrequency: Optional[str] = None  # "Daily", "Weekly", "Monthly", "Quarterly", "Half-Yearly", "Yearly"
    installmentAmount: Optional[float] = None
    numberOfInstallments: Optional[int] = None
    paymentDay: Optional[str] = None  # "Monday" for weekly, "1"-"28" for monthly
    linkedIncomeSourceId: Optional[str] = None  # auto-created income source for interest
    dueDate: Optional[str] = None
    amountReceived: Optional[float] = 0
    outstandingAmount: Optional[float] = None
    loanStatus: Optional[str] = None  # "active", "partial", "closed", "default_risk"
    lastRepaymentDate: Optional[str] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InvestmentCreate(BaseModel):
    investmentCategory: str
    investmentMode: str
    name: str
    principal: float = 0
    currentValue: float = 0
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
    sipSelectedDay: Optional[str] = None
    sipSelectedDate: Optional[str] = None
    sipSelectedQuarter: Optional[str] = None
    sipSelectedHalf: Optional[str] = None
    sipSelectedMonth: Optional[str] = None
    autoCreateExpense: bool = False
    isLiquidAsset: bool = False
    # Loan Given fields
    borrowerName: Optional[str] = None
    borrowerContact: Optional[str] = None
    interestType: Optional[str] = None
    agreedReturnAmount: Optional[float] = None
    repaymentType: Optional[str] = None
    repaymentFrequency: Optional[str] = None
    installmentAmount: Optional[float] = None
    numberOfInstallments: Optional[int] = None
    paymentDay: Optional[str] = None
    dueDate: Optional[str] = None
    amountReceived: Optional[float] = 0
    outstandingAmount: Optional[float] = None
    loanStatus: Optional[str] = None
    lastRepaymentDate: Optional[str] = None


# ============ CREDIT CARD MODEL ============
class CreditCard(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None
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


# ============ GOAL MODEL ============
class Goal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None
    goalName: str
    goalType: str
    customTypeName: Optional[str] = None
    targetAmount: float
    currentAmount: float = 0
    targetDate: str
    goalImage: Optional[str] = None
    linkedInvestmentIds: List[str] = []
    linkedInvestments: List[dict] = []
    linkedLoanId: Optional[str] = None
    linkedCreditCardId: Optional[str] = None
    linkedAccountIds: List[str] = []
    linkedAccounts: List[dict] = []
    autoCalculate: bool = True
    manualOverride: bool = False
    priority: int = 1
    notes: Optional[str] = None
    isCompleted: bool = False
    completedDate: Optional[str] = None
    reachedMilestones: List[int] = []
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GoalCreate(BaseModel):
    goalName: str
    goalType: str
    customTypeName: Optional[str] = None
    targetAmount: float
    currentAmount: float = 0
    targetDate: str
    goalImage: Optional[str] = None
    linkedInvestmentIds: List[str] = []
    linkedInvestments: List[dict] = []
    linkedLoanId: Optional[str] = None
    linkedCreditCardId: Optional[str] = None
    linkedAccountIds: List[str] = []
    linkedAccounts: List[dict] = []
    autoCalculate: bool = True
    manualOverride: bool = False
    priority: int = 1
    notes: Optional[str] = None
    reachedMilestones: List[int] = []

class GoalPriorityUpdate(BaseModel):
    id: str
    priority: int


# ============ OTHER INCOME MODEL ============
class OtherIncome(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None
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


# ============ PROFILE MODELS ============
class BasicProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    firstName: str
    middleName: Optional[str] = None
    lastName: str
    fullName: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    sex: Optional[str] = None
    dateOfBirth: Optional[str] = None
    profilePicture: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class BasicProfileCreate(BaseModel):
    firstName: str
    middleName: Optional[str] = None
    lastName: str
    mobile: Optional[str] = None
    sex: Optional[str] = None
    dateOfBirth: Optional[str] = None

class ExtendedProfileCreate(BaseModel):
    occupation: Optional[str] = None
    industry: Optional[str] = None
    employerName: Optional[str] = None
    annualIncome: Optional[float] = None
    panNumber: Optional[str] = None
    aadhaarLast4: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    taxFilingStatus: Optional[str] = None
    riskAppetite: Optional[str] = None


# ============ NOTIFICATION MODEL ============
class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    title: str
    message: str
    type: str = "income_reminder"
    relatedIncomeId: Optional[str] = None
    relatedIncomeName: Optional[str] = None
    isRead: bool = False
    actionUrl: Optional[str] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationCreate(BaseModel):
    userId: str
    title: str
    message: str
    type: str = "income_reminder"
    relatedIncomeId: Optional[str] = None
    relatedIncomeName: Optional[str] = None
    actionUrl: Optional[str] = None


# ============ INCOME TRANSACTION MODEL ============
class IncomeTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    entityId: str
    entityType: str
    entityName: str
    amount: float
    transactionDate: str
    notes: Optional[str] = None
    source: str = "manual"
    isLocked: bool = False
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IncomeTransactionCreate(BaseModel):
    entityId: str
    amount: float
    transactionDate: str
    notes: Optional[str] = None

class IncomeTransactionUpdate(BaseModel):
    amount: float
    transactionDate: str
    notes: Optional[str] = None


# ============ EXPENSE TRANSACTION MODEL ============
class ExpenseTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    entityId: str
    entityName: str
    category: str
    amount: float
    transactionDate: str
    notes: Optional[str] = None
    source: str = "manual"
    isLocked: bool = False
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExpenseTransactionCreate(BaseModel):
    entityId: str
    amount: float
    transactionDate: str
    notes: Optional[str] = None


# ============ PUSH SUBSCRIPTION MODEL ============
class PushSubscription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    endpoint: str
    keys: dict
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============ ENTITY UNIQUENESS ============
class EntityUniquenessRequest(BaseModel):
    collection: str
    field: str
    value: str
    exclude_id: Optional[str] = None
    type_filter: Optional[str] = None


# ============ ANALYTICS ============
class AnalyticsSnapshot(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    month: int
    year: int
    netWorth: float = 0
    totalAssets: float = 0
    totalInvestments: float = 0
    totalLiabilities: float = 0
    liquidBalance: float = 0
    monthlyIncome: float = 0
    monthlyExpense: float = 0
    savingsRate: float = 0
    investmentGains: float = 0
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Permission levels for roles
ROLE_PERMISSIONS = {
    "owner": {"view": True, "add": True, "edit": True, "delete": True, "invite": True},
    "admin": {"view": True, "add": True, "edit": True, "delete": False, "invite": False},
    "editor": {"view": True, "add": True, "edit": True, "delete": False, "invite": False},
    "viewer": {"view": True, "add": False, "edit": False, "delete": False, "invite": False}
}

MAX_NOTIFICATIONS_PER_USER = 10
