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
- Fixed back button on Profile Health page — uses onDismiss when in modal mode, fallback to navigate(-1) or /home
- Fixed back buttons app-wide (MyInvestments, MyAssets, JobIncome, SelfEmployedIncome) with proper fallbacks
- Added BottomNav to Profile Health grid screen — in modal mode, clicking any nav item dismisses modal first via onClickCapture
- Fixed Profile Health modal loop — dismiss now persists to server via /api/onboarding/dismiss
- Replaced ALL hardcoded 4.33 weekly multiplier with calendar-based `get_weekly_multiplier()` across expenses.py, intelligence.py, dashboard.py, family.py
- Parallelized DB queries: profile-completion (8 queries → 1 gather), networth (5 queries → 1 gather), goals summary (2 queries → 1 gather)
- Cleaned up all test data from production (14 test @test.com users removed)
- Cleaned 55 auto-generated test users from prod DB + 35 from dev DB (created by previous testing agents)
- Fixed Admin Growth Analytics: `created_at` vs `createdAt` field name mismatch in admin.py — now reads both fields
- Backfilled `createdAt` for prod users missing the field

## Pending / Upcoming Tasks
### P1 - Finvu SDK Integration
- Integrate Finvu Account Aggregator SDK (awaiting credentials)

### P2 - Backlog
- Monthly financial summary email/notification
- Profile Health Score (combining completion % + data freshness)
- Monthly Financial Report PDF generation

## Known Mocks
- Finvu SDK: Represented by disabled "Coming Soon" button

## Test Credentials
- Google Login: kumaramarendra10@gmail.com, chandrashekhar.iter@gmail.com
- Admin: admin@moneyssutra.com / admin123
- NOTE: All @test.com users have been cleaned from production
