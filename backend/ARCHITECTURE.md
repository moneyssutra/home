# Backend Architecture

## Directory Structure (Phase 3 Complete - Fully Modular)

```
/app/backend/
├── server.py              # Main FastAPI app (original, still working)
├── database.py            # MongoDB connection
├── server_backup.py       # Backup
│
├── models/                # Pydantic models (~600 lines)
│   ├── __init__.py        # Exports all models
│   ├── auth.py            # User, UserSession, JWTLoginRequest, RegisterRequest
│   ├── workspace.py       # Workspace, WorkspaceMember, WorkspaceInvite
│   ├── income.py          # IncomeSource, OtherIncome
│   ├── financial.py       # Account, Expense, Loan, Asset, Investment, CreditCard
│   ├── insurance.py       # Insurance
│   ├── goals.py           # Goal, GoalCreate, GoalPriorityUpdate
│   └── profile.py         # BasicProfile, ExtendedProfile
│
├── services/              # Business logic (~220 lines)
│   ├── __init__.py
│   ├── auth.py            # hash_password, verify_password, get_current_user
│   └── workspace.py       # get_user_workspace, ensure_user_has_workspace
│
├── routes/                # API routes (~3000 lines) ✅ COMPLETE
│   ├── __init__.py        # Exports all 14 routers
│   ├── utils.py           # Common utilities
│   ├── auth.py            # /auth/* (register, login, logout, google, me)
│   ├── workspace.py       # /workspaces/* (CRUD, invite, join, roles)
│   ├── income.py          # /income/* CRUD
│   ├── other_income.py    # /other-income/* CRUD
│   ├── loans.py           # /loans/* CRUD + linked-assets
│   ├── assets.py          # /assets/* CRUD + rental income
│   ├── accounts.py        # /accounts/* CRUD
│   ├── expenses.py        # /expenses/* CRUD + scheduling
│   ├── investments.py     # /investments/* CRUD
│   ├── credit_cards.py    # /credit-cards/* CRUD
│   ├── insurance.py       # /insurances/* CRUD
│   ├── goals.py           # /goals/* CRUD + progress calculation
│   ├── dashboard.py       # /dashboard/* (networth, breakdown)
│   └── profile.py         # /profile/* (basic, extended, completion)
│
└── tests/
    └── test_workspace_api.py
```

## Statistics

| Category | Files | Lines |
|----------|-------|-------|
| Routes   | 16    | ~3000 |
| Models   | 16    | ~600  |
| Services | 3     | ~220  |
| Database | 1     | ~20   |
| **Total**| **36**| **~4300** |

## All 14 Route Modules

1. **auth** (`/auth/*`) - Authentication endpoints
2. **workspace** (`/workspaces/*`) - Multi-user workspace management
3. **income** (`/income/*`) - Regular income CRUD
4. **other_income** (`/other-income/*`) - One-time/irregular income
5. **loans** (`/loans/*`) - Loan management
6. **assets** (`/assets/*`) - Asset tracking
7. **accounts** (`/accounts/*`) - Bank accounts
8. **expenses** (`/expenses/*`) - Expense tracking + scheduling
9. **investments** (`/investments/*`) - Investment portfolio
10. **credit_cards** (`/credit-cards/*`) - Credit card management
11. **insurance** (`/insurances/*`) - Insurance policies
12. **goals** (`/goals/*`) - Goal setting + progress
13. **dashboard** (`/dashboard/*`) - Financial summary
14. **profile** (`/profile/*`) - User profile

## Usage

```python
# Import routers
from routes import (
    auth_router, workspace_router, income_router, 
    loans_router, goals_router, dashboard_router
)

# Import utilities
from routes import get_current_user, get_user_filter

# Include in FastAPI app
app.include_router(auth_router, prefix="/api")
app.include_router(workspace_router, prefix="/api")
# ... etc
```

## Note
The original `server.py` still contains all the endpoints and works as-is.
The modular routes can be used for:
- New development
- Testing
- Future migration to fully modular architecture

