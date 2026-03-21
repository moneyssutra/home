"""
Expense model
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
from datetime import datetime, timezone
import uuid


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
    linkedInvestmentId: Optional[str] = None
    selectedDay: Optional[str] = None
    selectedDate: Optional[str] = None
    selectedQuarter: Optional[str] = None
    selectedHalf: Optional[str] = None
    selectedMonth: Optional[str] = None
    oneTimeDate: Optional[str] = None
    isPaid: bool = False
    lastPaidDate: Optional[str] = None
    expenseMonth: Optional[str] = None
    dueDate: Optional[str] = None
    paidDate: Optional[str] = None
    prepaidFlag: bool = False
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
    expenseMonth: Optional[str] = None
    dueDate: Optional[str] = None
    paidDate: Optional[str] = None
    prepaidFlag: bool = False
    linkedPaymentId: Optional[str] = None

    @field_validator("expectedAmount")
    @classmethod
    def validate_amount(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Expense amount must be positive")
        return v
