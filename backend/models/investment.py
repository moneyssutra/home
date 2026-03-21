"""
Investment model
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
from datetime import datetime, timezone
import uuid


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
    investmentFrequency: Optional[str] = None
    sipAmount: Optional[float] = None
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

    @field_validator("principal")
    @classmethod
    def validate_principal(cls, v):
        if v is not None and v < 0:
            raise ValueError("Principal cannot be negative")
        return v

    @field_validator("returnRate")
    @classmethod
    def validate_return_rate(cls, v):
        if v is not None and v < 0:
            raise ValueError("Return rate cannot be negative")
        return v

    @field_validator("sipAmount")
    @classmethod
    def validate_sip_amount(cls, v):
        if v is not None and v < 0:
            raise ValueError("SIP amount cannot be negative")
        return v
