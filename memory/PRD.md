# MoneySutra — Product Requirements Document

## Original Problem Statement
Financial management app with profile completion/onboarding flow, income/expense tracking, asset/liability/investment management, and gamified insights.

## Core Architecture
- **Frontend**: React (Vite) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB Atlas
- **Auth**: Emergent-managed Google Auth + JWT + WebAuthn (Biometric) + MPIN
- **Database**: MongoDB Atlas (Prod: `moneyssutra_prod`, Dev: `moneyssutra_dev`)
- **DB Connection**: Uses `CUSTOM_MONGO_URL` + `CUSTOM_DB_PROD` env vars in `database.py`

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
- **Calendar-based weekly income** (replaced 4.33 multiplier with actual weekday counts)
- **Combined API Endpoints** for Dashboard, Wealth, Intelligence pages (6-9 calls → 1)
- Gamified Insights page
- Admin panel
- **CRED-style Bank Accounts Page** (`/bank-accounts-experimental`)
- **CRED-style Credit Cards Page** (`/credit-cards-experimental`)
- **Family Hub** with member linking and combined financial views
- **Variable Income Window-Based Hybrid Logic**
- **SIP Calculation** (Daily/Weekly dynamic calculation)

## Key Routes
- `/` - Dashboard
- `/onboarding` - Profile Setup (full wizard or module-specific)
- `/my-income` - Income management
- `/portfolio` - Expense management
- `/wealth` - Net worth / Assets
- `/health` - Gamified Insights
- `/bank-accounts-experimental` - CRED-style Bank Accounts
- `/credit-cards-experimental` - CRED-style Credit Cards
- `/family` - Family Hub

## API Endpoints
- `POST /api/onboarding/save-step` - Append entries with dedup (steps 1-5)
- `GET /api/onboarding/profile-completion` - Get completion status
- `POST /api/onboarding/complete` - Mark onboarding as complete
- `GET /api/dashboard/combined` - Combined dashboard data
- `GET /api/combined/wealth` - Combined wealth page data
- `GET /api/combined/intelligence` - Combined insights page data
- `GET /api/family` - Family hub data
- `GET /api/income/monthly-summary` - Monthly income overview
- `GET /api/income/list/summary` - All income sources list
- `GET /api/expenses` - All expenses

## Completed (Mar 21, 2026)
- **Comprehensive Seed Data Script** (`/app/backend/seed_data.py`) — Fully written and executed
  - Main user (moneyssutra@gmail.com): 10 income sources (all types), 15 expenses, 10 assets, 16 investments, 5 bank accounts, 3 credit cards, 10 loans (all types), 4 insurances, complete profile
  - Wife account (priya.sharma@gmail.com): 2 incomes, 3 expenses, 2 accounts, 3 investments, 2 assets, 1 CC, 1 loan, 1 insurance
  - Family Hub: Sharma Family — 4 members (Rahul Self, Priya Wife, Aarav Son age 6, Ananya Daughter age 3)
  - Fixed insurance collection name bug (singular `insurance` → plural `insurances`)
- **Verified**: All seed data renders correctly across Dashboard (₹2.34Cr net worth), Income (10 sources), Expenses (15 items), Wealth, Bank Accounts (5), Credit Cards (3), Loans (10), Insurance (4), Family Hub (4 members). 100% pass rate on 19 backend + all frontend tests (iteration_158.json)

## Pending / Upcoming Tasks
### P1 - Finvu SDK Integration
- Integrate Finvu Account Aggregator SDK (awaiting credentials)
- Transaction Linking Design: Allow users to link fetched bank transactions to specific expenses/incomes

### P2 - Backlog
- Monthly financial summary email/notification
- Profile Health Score (combining completion % + data freshness)
- Monthly Financial Report PDF generation

## Known Mocks
- Finvu SDK: Represented by disabled "Coming Soon" button

## Test Credentials
- Google Login: kumaramarendra10@gmail.com, chandrashekhar.iter@gmail.com
- Seed Data User: moneyssutra@gmail.com (Google auth, MPIN set)
- Admin: admin@moneyssutra.com / admin123
- Wife (seed): priya.sharma@gmail.com (user_wife_bd14ab39)

## Critical Notes
- **DO NOT create auto-generated test users** without cleaning them up
- **Combined Endpoints**: Dashboard, Wealth, Health pages use single combined endpoints
- **DB Connection**: App uses `CUSTOM_MONGO_URL` + `CUSTOM_DB_PROD` (not `MONGO_URL` / `DB_NAME`)
- **Insurance collection**: Uses `insurances` (plural), NOT `insurance` (singular)
- **Do not revert Income logic**: Variable income hybrid logic was refined across 4 views
- **Family Hub route**: `/family` (not `/family-hub`)
