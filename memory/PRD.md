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
- Username: `test`, Password: `test`
- User: Rahul Sharma (test@moneyssutra.com)

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
- Fixed Insights page for new users with no data: no more RED ZONE trigger, welcome banner instead
- All widgets (Financial Journey, Score, Emergency Runway, Badges, Challenges, Future You, Personality Evolution) now show empty-state fallback UI instead of disappearing
- `hasRealData()` helper distinguishes "no data" from "has data but low runway"

### Financial Health Smart Sort & Reorder (Feb 25, 2026)
- Smart sort by rawScore descending (best-performing metrics at top)
- Drag-to-reorder using @dnd-kit (same pattern as Goals page)
- Custom order persisted in localStorage
- Toggle between "Best First" (smart) and manual reorder modes
- Reorder mode shows drag handles, Done button, and "Reset to Smart" option

### Enhanced Monthly Cashflow + Bug Fixes (Feb 26, 2026)
- Monthly Cash Flow card now shows 4 boxes: Received, Expected, Spent, Upcoming with progress bars
- Backend calculates schedule-based received/done (by comparing schedule date to today's date)
- Net Balance = Income Received - Expenses Done
- 4 new detail pages: /income-received, /expected-income, /expenses-done, /upcoming-expenses
- Fixed income source navigation (Salary→/my-job, Freelance→/my-self-employed)
- Fixed Quick Add sheet bottom icons hidden by bottom nav (pb-24 padding)
- Fixed background scrolling when Quick Add sheet open (body overflow lock)
- Fixed 0 amount in Income modal showing invalid error
- Fixed validation errors persisting across all forms (11 forms)
- Removed "Open" button from Reports page, only Download remains

## Prioritized Backlog

### P1 (Upcoming)
- **Financial Command Center**: Cockpit dashboard with Control/Pressure/Risk indicators
- **Decision Impact Engine**: Simulate financial impact of large purchases

### P2 (Future)
- **Refactor Insights.js**: Break monolithic component into smaller reusable components
- **Security Settings**: 2FA and Biometric toggles are non-functional placeholders

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
