"""Models package - exports all Pydantic models."""
from models.auth import (
    User, UserSession, JWTLoginRequest, GoogleSessionRequest, RegisterRequest
)
from models.workspace import (
    Workspace, WorkspaceCreate, WorkspaceMember, WorkspaceInvite, WorkspaceInviteByCode
)
from models.income import (
    IncomeSource, IncomeSourceCreate, OtherIncome, OtherIncomeCreate
)
from models.financial import (
    Account, AccountCreate,
    Expense, ExpenseCreate,
    Loan, LoanCreate,
    Asset, AssetCreate,
    Investment, InvestmentCreate,
    CreditCard, CreditCardCreate
)
from models.insurance import Insurance, InsuranceCreate
from models.goals import Goal, GoalCreate, GoalPriorityUpdate
from models.profile import (
    BasicProfile, BasicProfileCreate,
    ExtendedProfile, ExtendedProfileCreate
)

__all__ = [
    # Auth
    'User', 'UserSession', 'JWTLoginRequest', 'GoogleSessionRequest', 'RegisterRequest',
    # Workspace
    'Workspace', 'WorkspaceCreate', 'WorkspaceMember', 'WorkspaceInvite', 'WorkspaceInviteByCode',
    # Income
    'IncomeSource', 'IncomeSourceCreate', 'OtherIncome', 'OtherIncomeCreate',
    # Financial
    'Account', 'AccountCreate',
    'Expense', 'ExpenseCreate',
    'Loan', 'LoanCreate',
    'Asset', 'AssetCreate',
    'Investment', 'InvestmentCreate',
    'CreditCard', 'CreditCardCreate',
    # Insurance
    'Insurance', 'InsuranceCreate',
    # Goals
    'Goal', 'GoalCreate', 'GoalPriorityUpdate',
    # Profile
    'BasicProfile', 'BasicProfileCreate',
    'ExtendedProfile', 'ExtendedProfileCreate',
]
