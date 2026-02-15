# Backend Architecture

## Directory Structure (Post-Refactoring - Phase 2 Complete)

```
/app/backend/
├── server.py              # Main FastAPI application (still monolith but can be migrated)
├── database.py            # MongoDB connection (shared)
├── server_backup.py       # Backup of original server.py
│
├── models/                # Pydantic models (16 files, ~600 lines)
│   ├── __init__.py        # Exports all models
│   ├── auth.py            # User, UserSession, JWTLoginRequest, RegisterRequest
│   ├── workspace.py       # Workspace, WorkspaceMember, WorkspaceInvite
│   ├── income.py          # IncomeSource, OtherIncome
│   ├── financial.py       # Account, Expense, Loan, Asset, Investment, CreditCard
│   ├── insurance.py       # Insurance
│   ├── goals.py           # Goal, GoalCreate, GoalPriorityUpdate
│   └── profile.py         # BasicProfile, ExtendedProfile
│
├── services/              # Business logic helpers (~220 lines)
│   ├── __init__.py        # Exports all services
│   ├── auth.py            # hash_password, verify_password, get_current_user
│   └── workspace.py       # get_user_workspace, ensure_user_has_workspace
│
├── routes/                # API routes (~2000 lines extracted)
│   ├── __init__.py        # Exports all routers
│   ├── utils.py           # Common utilities (get_user_filter, etc.)
│   ├── auth.py            # /auth/* endpoints (register, login, logout, etc.)
│   ├── workspace.py       # /workspaces/* endpoints (create, join, invite, etc.)
│   ├── income.py          # /income/* CRUD
│   ├── loans.py           # /loans/* CRUD
│   ├── assets.py          # /assets/* CRUD
│   ├── accounts.py        # /accounts/* CRUD
│   ├── investments.py     # /investments/* CRUD
│   └── credit_cards.py    # /credit-cards/* CRUD
│
└── tests/                 # Test files
    └── test_workspace_api.py
```

## Migration Status

### ✅ Phase 1 Complete: Models & Services
- All Pydantic models extracted to `/models/`
- Common services extracted to `/services/`
- Database connection isolated in `database.py`

### ✅ Phase 2 Complete: Core Routes Extracted
- **Auth routes** (`/auth/*`): register, login, logout, google/session, me
- **Workspace routes** (`/workspaces/*`): full CRUD, invite, join, roles
- **Income routes** (`/income/*`): full CRUD
- **Loans routes** (`/loans/*`): full CRUD + linked-assets
- **Assets routes** (`/assets/*`): full CRUD + rental income auto-create
- **Accounts routes** (`/accounts/*`): full CRUD
- **Investments routes** (`/investments/*`): full CRUD
- **Credit Cards routes** (`/credit-cards/*`): full CRUD

### 🔜 Phase 3 Remaining (Optional):
Routes still in server.py that could be extracted:
- Expenses routes (`/expenses/*`) with process-deductions logic
- Insurance routes (`/insurances/*`)
- Goals routes (`/goals/*`) with complex progress calculation
- Other Income routes (`/other-income/*`)
- Dashboard routes (`/dashboard/*`) with aggregation logic
- Profile routes (`/profile/*`)

## How to Use the Modular Structure

### For New Development:
```python
# Import from routes package
from routes import auth_router, workspace_router, get_current_user

# Import models
from models.financial import Account, Loan, Asset
from models.auth import User

# Import database
from database import db
```

### For Tests:
```python
from routes.auth import get_current_user
from routes.utils import get_user_filter
```

## Statistics
- **Total lines extracted**: ~2861 lines
- **Files created**: 19 new module files
- **Original server.py**: 3900+ lines (can be further reduced by switching to modular routes)

