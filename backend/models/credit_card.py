"""
Credit Card model
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
from datetime import datetime, timezone
import uuid


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

    @field_validator("creditLimit")
    @classmethod
    def validate_credit_limit(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Credit limit must be positive")
        return v

    @field_validator("outstandingAmount")
    @classmethod
    def validate_outstanding(cls, v):
        if v is not None and v < 0:
            raise ValueError("Outstanding amount cannot be negative")
        return v

    @field_validator("interestRate")
    @classmethod
    def validate_rate(cls, v):
        if v is not None and v < 0:
            raise ValueError("Interest rate cannot be negative")
        return v
