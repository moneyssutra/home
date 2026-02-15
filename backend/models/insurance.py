"""Insurance model."""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid


class Insurance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    insuranceType: str
    policyName: str
    coverageAmount: float
    premiumAmount: float
    premiumFrequency: str
    startDate: str
    endDate: Optional[str] = None
    linkedAssetId: Optional[str] = None
    coveredPerson: Optional[str] = None
    linkedExpenseId: Optional[str] = None
    maturityType: Optional[str] = None
    expectedMaturityAmount: Optional[float] = None
    autoCreateExpense: bool = False
    premiumEndDate: Optional[str] = None
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
    linkedAssetId: Optional[str] = None
    coveredPerson: Optional[str] = None
    maturityType: Optional[str] = None
    expectedMaturityAmount: Optional[float] = None
    autoCreateExpense: bool = False
    premiumEndDate: Optional[str] = None
    notes: Optional[str] = None
