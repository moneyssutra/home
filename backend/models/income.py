"""Income source models."""
from pydantic import BaseModel, Field, ConfigDict
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


class OtherIncome(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None
    workspaceId: Optional[str] = None
    sourceName: str
    category: str  # Gifts, Inheritance, Tax Refund, Cashback, Lottery, Side Hustle, Other
    amount: float
    isRecurring: bool = False
    frequency: Optional[str] = None  # Monthly, Quarterly, etc.
    selectedDate: Optional[int] = None
    selectedMonth: Optional[int] = None
    quarterMonths: Optional[List[int]] = None
    halfYearMonths: Optional[List[int]] = None
    oneTimeDate: Optional[str] = None
    notes: Optional[str] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OtherIncomeCreate(BaseModel):
    sourceName: str
    category: str
    amount: float
    isRecurring: bool = False
    frequency: Optional[str] = None
    selectedDate: Optional[int] = None
    selectedMonth: Optional[int] = None
    quarterMonths: Optional[List[int]] = None
    halfYearMonths: Optional[List[int]] = None
    oneTimeDate: Optional[str] = None
    notes: Optional[str] = None
