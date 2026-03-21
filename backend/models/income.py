"""Income source models."""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime, timezone
import uuid


class IncomeSource(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None
    workspaceId: Optional[str] = None
    type: str
    sourceName: str
    expectedAmount: float
    frequency: str
    selectedDay: Optional[str] = None
    selectedDays: Optional[List[int]] = None
    selectedDate: Optional[int] = None
    selectedMonth: Optional[int] = None
    quarterMonths: Optional[List[int]] = None
    halfYearMonths: Optional[List[int]] = None
    oneTimeDate: Optional[str] = None
    # Interest Income specific
    principalAmount: Optional[float] = None
    interestRate: Optional[float] = None
    interestType: Optional[str] = None
    compoundingFrequency: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    manualOverride: Optional[bool] = None
    # Rental Income specific
    tenantName: Optional[str] = None
    securityDeposit: Optional[float] = None
    assetId: Optional[str] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class IncomeSourceCreate(BaseModel):
    type: str
    sourceName: str
    expectedAmount: float
    frequency: str
    selectedDay: Optional[str] = None
    selectedDays: Optional[List[int]] = None
    selectedDate: Optional[int] = None
    selectedMonth: Optional[int] = None
    quarterMonths: Optional[List[int]] = None
    halfYearMonths: Optional[List[int]] = None
    oneTimeDate: Optional[str] = None
    # Interest Income specific
    principalAmount: Optional[float] = None
    interestRate: Optional[float] = None
    interestType: Optional[str] = None
    compoundingFrequency: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    manualOverride: Optional[bool] = None
    # Rental Income specific
    tenantName: Optional[str] = None
    securityDeposit: Optional[float] = None
    assetId: Optional[str] = None

    @field_validator("expectedAmount")
    @classmethod
    def validate_amount(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Expected amount must be positive")
        return v

    @field_validator("principalAmount")
    @classmethod
    def validate_principal(cls, v):
        if v is not None and v < 0:
            raise ValueError("Principal amount cannot be negative")
        return v

    @field_validator("interestRate")
    @classmethod
    def validate_rate(cls, v):
        if v is not None and v < 0:
            raise ValueError("Interest rate cannot be negative")
        return v

    @field_validator("securityDeposit")
    @classmethod
    def validate_deposit(cls, v):
        if v is not None and v < 0:
            raise ValueError("Security deposit cannot be negative")
        return v


# Other Income Model (Non-recurring income: gifts, bonuses, capital gains, etc.)
class OtherIncome(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None
    workspaceId: Optional[str] = None
    incomeName: str
    category: str  # Gift, Bonus, Incentive, Capital Gain, Asset Sale, Tax Refund, etc.
    customCategory: Optional[str] = None
    amount: float
    frequency: str  # One-Time, Monthly, Quarterly, Yearly, Irregular
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

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Amount must be positive")
        return v
