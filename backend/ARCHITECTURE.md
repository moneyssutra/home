# Backend Architecture

## Directory Structure (Post-Refactoring)

```
/app/backend/
├── server.py              # Main FastAPI application (3900+ lines - MONOLITH)
├── database.py            # MongoDB connection (shared across all modules)
├── server_backup.py       # Backup of original server.py
│
├── models/                # Pydantic models (extracted from server.py)
│   ├── __init__.py        # Exports all models
│   ├── auth.py            # User, UserSession, JWTLoginRequest, RegisterRequest
│   ├── workspace.py       # Workspace, WorkspaceMember, WorkspaceInvite
│   ├── income.py          # IncomeSource, OtherIncome
│   ├── financial.py       # Account, Expense, Loan, Asset, Investment, CreditCard
│   ├── insurance.py       # Insurance
│   ├── goals.py           # Goal, GoalCreate, GoalPriorityUpdate
│   └── profile.py         # BasicProfile, ExtendedProfile
│
├── services/              # Business logic helpers (extracted from server.py)
│   ├── __init__.py        # Exports all services
│   ├── auth.py            # hash_password, verify_password, get_current_user
│   └── workspace.py       # get_user_workspace, ensure_user_has_workspace
│
├── routes/                # API routes (FUTURE - not yet extracted)
│   └── __init__.py
│
└── tests/                 # Test files
    └── test_workspace_api.py
```

## Current State

### Completed Refactoring
1. **Models extracted** to `/models/` - All Pydantic model definitions are now in separate files
2. **Services created** in `/services/` - Common business logic functions extracted
3. **Database module** - MongoDB connection isolated in `database.py`

### Pending Refactoring
The `server.py` file still contains:
- All API route definitions (~100+ endpoints)
- Duplicate model definitions (need to be replaced with imports)
- Complex business logic (calculate_goal_progress, calculate_next_deduction_date)

## Migration Guide

### To use the new modular structure:

1. **Import models from modules:**
```python
from models.auth import User, UserSession, RegisterRequest
from models.workspace import Workspace, WorkspaceMember
from models.financial import Account, Expense, Loan, Asset, Investment
```

2. **Import services:**
```python
from services.auth import get_current_user, hash_password
from services.workspace import get_user_workspace, check_permission
```

3. **Import database:**
```python
from database import db, client
```

### Full server.py refactoring (next phase):
1. Replace inline model definitions with imports
2. Extract routes to separate files in `/routes/`
3. Move complex calculations to `/services/calculations.py`
4. Reduce server.py to ~100 lines (app setup + router includes)

## API Categories

| Category | Endpoint Prefix | Model(s) |
|----------|-----------------|----------|
| Auth | `/api/auth/*` | User, UserSession |
| Workspace | `/api/workspaces/*` | Workspace, WorkspaceMember |
| Income | `/api/income/*` | IncomeSource |
| Other Income | `/api/other-income/*` | OtherIncome |
| Loans | `/api/loans/*` | Loan |
| Assets | `/api/assets/*` | Asset |
| Accounts | `/api/accounts/*` | Account |
| Expenses | `/api/expenses/*` | Expense |
| Investments | `/api/investments/*` | Investment |
| Insurance | `/api/insurances/*` | Insurance |
| Credit Cards | `/api/credit-cards/*` | CreditCard |
| Goals | `/api/goals/*` | Goal |
| Profile | `/api/profile/*` | BasicProfile, ExtendedProfile |
| Dashboard | `/api/dashboard/*` | (aggregation endpoints) |

## Notes

- The original `server.py` still works without changes
- New development can use modular imports
- Full migration to modular routes planned for future sprint
