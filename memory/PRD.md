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
- `GET /api/dashboard/combined` - Combined dashboard data
- `GET /api/combined/wealth` - Combined wealth page data
- `GET /api/combined/intelligence` - Combined insights page data

## Completed (Mar 20-21, 2026)
- Fixed wizard type-selection layout (justify-center → justify-start pt-4) for all 4 wizards
- Removed "Quick Setup — All Categories" button from Profile Health page
- Fixed back button on Profile Health page — uses onDismiss when in modal mode, fallback to navigate(-1) or /home
- Fixed back buttons app-wide (MyInvestments, MyAssets, JobIncome, SelfEmployedIncome) with proper fallbacks
- Added BottomNav to Profile Health grid screen — in modal mode, clicking any nav item dismisses modal first via onClickCapture
- Fixed Profile Health modal loop — dismiss now persists to server via /api/onboarding/dismiss
- Replaced ALL hardcoded 4.33 weekly multiplier with calendar-based `get_weekly_multiplier()` across expenses.py, intelligence.py, dashboard.py, family.py
- Parallelized DB queries: profile-completion (8 queries → 1 gather), networth (5 queries → 1 gather), goals summary (2 queries → 1 gather)
- Cleaned up all test data from production (14 test @test.com users removed)
- Cleaned 55 auto-generated test users from prod DB + 35 from dev DB
- Fixed Admin Growth Analytics: `created_at` vs `createdAt` field name mismatch
- Created combined backend endpoints for faster page loading
- Updated Dashboard.js, Wealth.js, useIntelligenceData.js to use combined endpoints
- Updated Finvu Account Aggregator banner color to gentle blue gradient
- Fixed income received/expected calculation in combined endpoints
- Fixed date auto-save in onboarding wizard
- Fixed income selectedDate not saving (dedup logic now updates date fields)
- Fixed startDate construction from user's selected day
- **Fixed P0: Income module showing "Complete" with 0 items** — Changed `_get_profile_completion` to only override module completion to `True` when user explicitly skipped (`step_X_skipped`), not when `{name}_completed` is set (which was true even with 0 items)
- **Fixed: Onboarding expense missing `expenseType` and `selectedDate`** — Expenses saved from onboarding wizard were missing `expenseType` (Fixed/Variable) causing 500 Internal Server Error on `/api/expenses`, and missing `selectedDate` field (expense scheduling date). Fixed onboarding save + patched existing records. Also added dedup-update logic for expense date changes (matching income behavior).
- **Added: Expense Detail payment status, due date, and payment schedule** — Expense detail page now shows: This Month paid/pending status, due date (e.g., "1st of every month"), next due date banner, and a 12-month payment schedule with Paid/Pending/Upcoming status. Matches income detail page experience.
- **Fixed: Navigation from Expenses Done/Upcoming to Expense Detail** — Clicking an expense from the "Spent" or "Upcoming Expenses" dashboard sections now correctly navigates to the detail page (`/wealth/expenses/{id}`) instead of the edit page (`/expense/{id}`).
- **Fixed: Onboarding investment save missing `investmentMode` and `principal`** — Investment list API was at risk of 500 errors because onboarding-created investments were missing required Pydantic model fields. Now saves both fields + `sipAmount`. Backfilled existing records.
- **Fixed: Expense schedule showing fake "paid" months** — Schedule now respects `startDate` or `createdAt` — won't show "paid" entries for months before the expense existed. If no start date set, uses current month.
- **Fixed: Admin Safety Days showing 0d for all users** — `_compute_user_metrics` was querying empty `liquid_assets` collection. Now reads from `accounts` collection (bank balances) and `loans` (EMIs); also fixed asset value field name (`currentValue` instead of `value`).
- **Auto-creation: Loan EMI → Expense** — Onboarding step 4 now auto-creates linked EMI expense for each loan with EMI > 0. Includes dedup-update on re-save.
- **Auto-creation: SIP Investment → Expense** — Onboarding step 5 now auto-creates linked SIP expense for recurring investments. Includes dedup-update on re-save.
- **Backfilled all missing auto-linked expenses** — Created 1 EMI, 9 SIP, and 3 insurance premium expenses for existing users in production DB.
- **Fixed: Investment "00" rendering bug** — React `{0 && <JSX>}` renders `0` as text. Two such patterns in investment card produced "00" when principal was 0. Fixed with `principal > 0` checks.
- **Fixed: Expense due date inconsistency** — Added `parseDueDay()` to handle both "28" and "2024-01-28" selectedDate formats. Added `formatOrdinal()` for proper suffix (1st, 2nd, 3rd, 28th). Missing selectedDate now enriched from dueDate/startDate on backend.
- **Fixed: Expense card alignment on mobile** — Changed flex alignment from `items-center` to `items-start` for consistent vertical positioning regardless of content height.
- **Fixed: Expense sorting** — Expenses now sorted by due day ascending within each status group (pending → skipped → paid).
- **Fixed: Gamification data not loading on Health page** — Combined endpoint was fetching from wrong collection (`gamification_profiles` vs `user_gamification_profile`). Now calls `get_gamification_profile()` directly for proper allAchievements and badges data.
- **Added: Shared `parse_due_day()` utility** — Backend utility in routes/utils.py handles all selectedDate formats consistently across expenses.py, dashboard.py.
- **NEW: Bank Accounts Experimental Page (CRED-style)** — Created `/bank-accounts-experimental` route with 4 tabs (Accounts/Transactions/Recurring/Cashflow). Features horizontal snap-scroll cards with gradient backgrounds (ICICI/HDFC/SBI/Kotak), dot indicators, quick actions, refresh interaction, transaction history, cashflow summary, and Finvu coming-soon banner. Home rolling button "Savings" replaced with "Banks" linking to new page. All mock data, no backend changes. Existing features untouched.

## Completed (Mar 20, 2026 - Cont.)
- **NEW: Credit Cards Experimental Page (CRED-style)** — Created `/credit-cards-experimental` route with 3 tabs (Cards/Payments/Insights). Features horizontal snap-scroll credit card widgets with bank-specific gradient backgrounds (ICICI orange), chip/network visuals, cardholder name, outstanding amounts, utilization bars, due date badges, credit utilization summary, quick actions (Pay Bill/Statements/Add Card), All Cards list with per-card refresh, sync notifications, and credit health insights with high-utilization alerts. Wired up route in App.js and RollingButtons "Cards" entry. Backend `/api/cc-overview` pulls live data from `credit_cards` and `cc_payments` collections. Fully tested (16/16 backend, all frontend tests passed).

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

## Critical Notes
- **DO NOT create auto-generated test users** without cleaning them up
- **Combined Endpoints**: Dashboard, Wealth, Health pages use single combined endpoints
- **DB Connection**: App uses `CUSTOM_MONGO_URL` + `CUSTOM_DB_PROD` (not `MONGO_URL` / `DB_NAME`)
