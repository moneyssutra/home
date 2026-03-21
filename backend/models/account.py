"""
Account model
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
from datetime import datetime, timezone
import uuid


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
