"""
Profile models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid


class BasicProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userName: str
    monthlyIncome: float
    primaryGoal: str
    riskAppetite: str
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BasicProfileCreate(BaseModel):
    userName: str
    monthlyIncome: float
    primaryGoal: str
    riskAppetite: str


class ExtendedProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: Optional[str] = None
    phone: Optional[str] = None
    dateOfBirth: Optional[str] = None
    occupation: Optional[str] = None
    maritalStatus: Optional[str] = None
    dependents: int = 0
    emergencyFundMonths: int = 6
    investmentExperience: Optional[str] = None
    preferredNotifications: List[str] = []
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ExtendedProfileCreate(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    dateOfBirth: Optional[str] = None
    occupation: Optional[str] = None
    maritalStatus: Optional[str] = None
    dependents: int = 0
    emergencyFundMonths: int = 6
    investmentExperience: Optional[str] = None
    preferredNotifications: List[str] = []
