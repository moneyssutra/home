# MoneySSutra - Product Requirements Document

## Original Problem Statement
MoneySSutra is a sophisticated personal finance application — a "Financial Control Operating System" with gamified insights, advanced analytics, and forecasting tools. Built as a React/FastAPI/MongoDB full-stack app with PWA support.

## Core Architecture
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT + Google OAuth (Emergent-managed)
- **AI**: OpenAI GPT-5.2 via emergentintegrations
- **PDF**: reportlab for report generation
- **Scheduling**: apscheduler for cron jobs

## Test Credentials
- Username: `test@moneyssutra.com`, Password: `test`
- User: Rahul Sharma
- New/Empty User: `newuser@test.com` / `password`

## What's Been Implemented

### Full System Reset & E2E Validation (Feb 25, 2026)
- Complete database reset and fresh realistic test data seeded
- 6 income sources, 27 expenses (12 categories), 16 investments, 5 assets, 4 loans, 5 insurances, 3 credit cards, 3 bank accounts
- Full E2E testing: 100% backend (19/19), 100% frontend
- All calculations verified: Net Worth ₹87.8L, Financial Score 95/100, Survival Days 433

### Financial Health Module
- 10-metric financial health scoring system
- Life Insurance includes Term + ULIP combined
- Investment Allocation uses `investmentCategory` field correctly
- Retirement Readiness identifies NPS/PF/PPF
- Correct field mapping: `coverageAmount` for insurance, `principal` for investments

### Financial Score - Granular Tier Model
- 7-9 granular tiers per pillar for nuanced scoring
- Savings Rate, EMI Load, Safety Buffer, Income Consistency (25pts each)
- Info (i) icon with full tier criteria explanation
- Contextual help text per metric

### Expense Normalization
- Shared `normalizeToMonthly` utility across all pages
- Dashboard, MyExpenses, ExpenseBreakdown, FixedExpenses, VariableExpenses, CategoryExpenses all show consistent monthly totals

### Insurance Form
- Term Insurance + Life Insurance show Covered Person, Maturity Type, Premium Payment Term
- Auto-created expenses include userId correctly
- Premium End Date auto-populates from term

### Branding, PWA, Legal, Reports
- MoneySSutra branding, turquoise theme, Montserrat font
- PWA with service worker + manifest
- Terms, Privacy, Data Deletion pages
- Professional PDF/Excel report generation with font fallback

### UI/UX
- Bottom nav overlap fixed (pb-32 across 34 pages)
- Report Settings date pickers redesigned (flex layout)
- Notification swipe-to-dismiss with smooth animation
- Update button removed from Insights (only refresh remains)

### Insights Empty-State Fix (Feb 25, 2026)
- Fixed Insights page for new users with no data
- All widgets show empty-state fallback UI instead of disappearing
- `hasRealData()` helper distinguishes "no data" from "has data but low runway"

### Financial Health Smart Sort & Reorder (Feb 25, 2026)
- Smart sort by rawScore descending (best-performing metrics at top)
- Drag-to-reorder using @dnd-kit
- Custom order persisted in localStorage
- Toggle between "Best First" (smart) and manual reorder modes

### Enhanced Monthly Cashflow + Bug Fixes (Feb 26, 2026)
- Monthly Cash Flow card now shows 4 boxes: Received, Expected, Spent, Upcoming with progress bars
- Backend calculates schedule-based received/done
- Net Balance = Income Received - Expenses Done
- 4 new detail pages: /income-received, /expected-income, /expenses-done, /upcoming-expenses
- Fixed income source navigation and type icons
- Fixed backend type synonyms (Job↔Salary, Self-Employed↔Freelance)
- Fixed "Invalid Date" on 8 income type pages
- Fixed Quick Add sheet bottom icons and background scrolling
- Fixed 0 amount and validation errors across all forms
- Removed "Open" button from Reports page

### Unified Add Income Refactor + Bug Fixes (Feb 26, 2026)
- Created unified `/add-income` page with all 8 income types
- Updated AddActionSheet to route to `/add-income`
- Backend type synonym filtering: Job↔Salary, Self-Employed↔Freelance

### Dashboard, Login & Navigation Fixes (Feb 26, 2026)
- Added "My Income >" and "My Expenses >" navigation links in Monthly Cashflow widget
- Fixed back button on all 7 income form pages
- Implemented "Remember Me" on Login page
- Fixed Net Worth card text visibility

### Insights Page Overhaul (Feb 26, 2026)
- 3-layer architecture (Hero, Action, Collapsible Accordions)
- Premium Hero Section with dynamic gradients, circular progress meter, share feature
- Gamification Engine fix (badges now awarded properly)
- SIP Auto-Expense fix (linkedInvestmentId added)

### Cash Flow Engine Phase 2: Prepayment System (Feb 27, 2026)
- **Backend**: 3 new endpoints in expenses.py:
  - `GET /api/expenses/by-month?month=YYYY-MM` — returns expenses filtered by month with `_displayStatus` (paid/pending/prepaid)
  - `POST /api/expenses/{id}/mark-paid` — marks expense as paid for current month
  - `POST /api/expenses/{id}/prepay` — creates prepaid record for next month, prevents duplicates
- **Model updates**: Added `prepaidFlag`, `expenseMonth`, `paidDate`, `dueDate`, `linkedPaymentId` to Expense model
- **Route ordering fix**: Moved `/{expense_id}` routes to bottom to prevent conflict with `/by-month`
- **Frontend**: Complete MyExpenses.js rewrite:
  - Month selector with left/right navigation (±2 past, +3 future months)
  - Month summary card: total, paid/prepaid, pending amounts with progress bar
  - "Mark Paid" and "Prepay Next Month" action buttons on pending expenses only
  - Status badges: Paid (green), Pending (yellow), Paid Early (blue)
  - Expense Breakdown and Fixed/Variable split cards (current month only)
- **Hook**: Added `useExpensesByMonth` to useApi.js
- **Tested**: 100% — 13/13 backend, 11/11 frontend (iteration_85.json)

## Prioritized Backlog

### P0 (Next)
- **Cash Flow Engine Phase 1: Rolling Balance** — closing balance of month N becomes opening balance of month N+1
- **Cash Flow Engine Phase 4: Negative Balance Handling** — only warn when total liquid assets truly depleted

### P1 (Upcoming)
- **Cash Flow Engine Phase 3: Cash Flow Timeline** — daily balance projection
- **Financial Command Center**: Cockpit dashboard with Control/Pressure/Risk indicators
- **Decision Impact Engine**: Simulate financial impact of large purchases

### P2 (Future)
- **Refactor Insights.js**: Break monolithic component into smaller reusable components
- **Security Settings**: 2FA and Biometric toggles are non-functional placeholders
- **File Structure Cleanup**: Organize pages from `/src/` root into subdirectories

## Key DB Collections
- users, profiles, user_sessions
- income_sources, expenses, insurances, investments, assets, loans, credit_cards, accounts
- income_transactions, expense_transactions
- user_gamification_profile, user_personality, user_personality_history
- weekly_digests, alerts, notifications, analytics_snapshots

## Data Model Notes
- Investment: requires `investmentMode` (str) and `principal` (float) fields
- IncomeSource: uses `type` and `name` (not incomeType/incomeName)
- Insurance: uses `coverageAmount` (not coverAmount/sumAssured)
- Expense: new fields `prepaidFlag`, `expenseMonth`, `paidDate`, `dueDate`, `linkedPaymentId` for prepayment system
