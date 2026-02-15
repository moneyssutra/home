"""Goal models."""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid


class Goal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None
    goalName: str
    goalType: str  # Wealth Creation, Debt Elimination, Investment Target, Emergency Fund, Other
    customTypeName: Optional[str] = None
    targetAmount: float
    currentAmount: float = 0
    targetDate: str  # ISO date string
    linkedInvestmentIds: List[str] = []
    linkedLoanId: Optional[str] = None
    linkedCreditCardId: Optional[str] = None
    linkedAccountIds: List[str] = []
    autoCalculate: bool = True
    manualOverride: bool = False
    priority: int = 1  # 1 = High, 2 = Medium, 3 = Low
    notes: Optional[str] = None
    isCompleted: bool = False
    completedDate: Optional[str] = None
    reachedMilestones: List[int] = []  # [25, 50, 75, 100]
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class GoalCreate(BaseModel):
    goalName: str
    goalType: str
    customTypeName: Optional[str] = None
    targetAmount: float
    currentAmount: float = 0
    targetDate: str
    linkedInvestmentIds: List[str] = []
    linkedLoanId: Optional[str] = None
    linkedCreditCardId: Optional[str] = None
    linkedAccountIds: List[str] = []
    autoCalculate: bool = True
    manualOverride: bool = False
    priority: int = 1
    notes: Optional[str] = None
    reachedMilestones: List[int] = []


class GoalPriorityUpdate(BaseModel):
    id: str
    priority: int
