# MoneySutra — Product Requirements Document

## Original Problem Statement
Financial management app with profile completion/onboarding flow, income/expense tracking, asset/liability/investment management, and gamified insights.

## Core Architecture
- **Frontend**: React (Vite) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB Atlas
- **Auth**: Emergent-managed Google Auth + JWT + WebAuthn (Biometric) + MPIN

## Key Features Implemented
- User registration/login (Google, Password, Biometric, MPIN)
- Dashboard with income, expense, net worth overview
- Income management (Job, Business, Self-employed, Rental, etc.)
- Expense tracking with categorization and frequency-based calculations
- Asset management (Bank Balance, Property, Gold, Vehicle, Equipment)
- Liability management (Home/Car/Personal/Education Loans, Credit Cards)
- Investment tracking (Mutual Funds, Stocks, FD, PPF, Gold/SGB, Crypto)
- Profile Health Grid with per-module completion tracking
- **Multi-step Interactive Wizards** for all 5 modules
- **Multi-entry support** (append, not overwrite) for all categories
- **Backend deduplication** prevents duplicate entries (name+amount match)
- **ReadOnly name fields** auto-filled from type selection
- **Back button** replaces X dismiss on Profile Health Grid
- **Calendar-based weekly income** (replaced 4.33 multiplier with actual weekday counts)
- **Form state reset** on category/module change (prevents stale data carry-over)
- Gamified Insights page
- Admin panel

## Onboarding Wizard Architecture
### MODULE_STEPS
- Income: income-type → income-amount → income-date
- Expenses: expenses (single step)
- Assets: asset-type → asset-details → asset-deep
- Liabilities: liability-type → liability-details → liability-deep
- Investments: invest-type → invest-details → invest-deep

### Data Model
- All categories are **list-based** (multiple entries per user)
- Backend uses `insert_one` with **dedup check** (no `delete_many` or upsert)
- Dedup keys: userId + name + amount + source="onboarding"
- Frontend uses array state: `assetItems[]`, `loanItems[]`, `investItems[]`
- "Add another" button appends new items to the array

### Module Mode
- Accessed via `/onboarding?module=<name>` (e.g., `?module=assets`)
- Auto-starts at first step of that module
- "Save & Done" returns to Profile Health Grid

## Key Routes
- `/` - Dashboard
- `/onboarding` - Profile Setup (full wizard or module-specific)
- `/my-income` - Income management
- `/portfolio` - Expense management
- `/wealth` - Net worth / Assets
- `/health` - Gamified Insights

## API Endpoints
- `POST /api/onboarding/save-step` - Append entries with dedup (steps 1-5)
- `GET /api/onboarding/profile-completion` - Get completion status
- `POST /api/onboarding/complete` - Mark onboarding as complete
- `GET /api/dashboard/breakdown` - Expense breakdown
- `GET /api/expenses/monthly-summary` - Monthly expense summary

## Completed (Mar 20, 2026)
- Fixed wizard type-selection layout (justify-center → justify-start pt-4) for all 4 wizards
- Removed "Quick Setup — All Categories" button from Profile Health page
- Fixed back button on Profile Health page (navigate(-1) for proper history navigation)
- Added BottomNav (Home, Wealth, +, Health, Goals) to Profile Health grid screen
- Consistent weekly calculation: replaced 4.33 multiplier with calendar-based logic in expenses.py and intelligence.py (pending)

## Pending / Upcoming Tasks
### P1 - Finvu SDK Integration
- Integrate Finvu Account Aggregator SDK (awaiting credentials)

### P1 - Consistent Weekly Calculation
- Replace hardcoded 4.33 multiplier in expenses.py and intelligence.py with calendar-based utility

### P2 - Backlog
- Monthly financial summary email/notification
- Profile Health Score (combining completion % + data freshness)
- Monthly Financial Report PDF generation

## Known Mocks
- Finvu SDK: Represented by disabled "Coming Soon" button

## Test Credentials
- Google Login: kumaramarendra10@gmail.com, chandrashekhar.iter@gmail.com
- JWT (Test): testuser99@test.com / Test1234!
- Admin: admin@moneyssutra.com / admin123
