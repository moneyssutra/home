"""
Asset model
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
from datetime import datetime, timezone
import uuid


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

    @field_validator("purchaseValue")
    @classmethod
    def validate_purchase(cls, v):
        if v is not None and v < 0:
            raise ValueError("Purchase value cannot be negative")
        return v

    @field_validator("currentValue")
    @classmethod
    def validate_current(cls, v):
        if v is not None and v < 0:
            raise ValueError("Current value cannot be negative")
        return v

    @field_validator("incomeAmount")
    @classmethod
    def validate_income(cls, v):
        if v is not None and v < 0:
            raise ValueError("Income amount cannot be negative")
        return v

    @field_validator("securityDeposit")
    @classmethod
    def validate_deposit(cls, v):
        if v is not None and v < 0:
            raise ValueError("Security deposit cannot be negative")
        return v
