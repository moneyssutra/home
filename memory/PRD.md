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
- Username: `test@moneyssutra.com`, Password: `test` (data cleared Feb 27)
- New/Empty User: `newuser@test.com` / `password`

## What's Been Implemented (Chronological)

### Feb 25-26, 2026
- Full E2E validation with seeded test data
- Financial Health 10-metric scoring with granular tiers
- Expense normalization across all pages
- Insurance form improvements, PWA, branding, legal pages, PDF reports
- Insights 3-layer architecture with premium hero section
- Gamification engine fix (badges), SIP auto-expense fix
- Dashboard/Login/Navigation fixes, Monthly Cashflow 4-box card
- Unified Add Income page, Financial Health smart sort + drag-to-reorder

### Feb 27, 2026
- **Prepayment System**: 5 endpoints (by-month, mark-paid, prepay, unmark-paid, undo-prepay)
- **Undo Mark Paid / Undo Prepay**: Undo buttons on paid/prepaid expense cards
- **Insights Module Restructure**: Reordered modules with progressive lock/unlock
- **Notification Dismiss Fix**: X button + improved mobile swipe
- **NPS/PPF SIP Fix**: repair-expenses endpoint + orphaned PPF fix
- **Monthly Expense Calendar**: /expense-calendar with plotted due dates
- **Investment Form Restructure**: SIP section after name, principal=0 allowed
- **User Data Clear**: All Rahul data wiped for fresh start

## Key API Endpoints
- `GET /api/expenses/by-month?month=YYYY-MM` — Month-filtered expenses
- `POST /api/expenses/{id}/mark-paid` / `unmark-paid` — Toggle paid
- `POST /api/expenses/{id}/prepay` / `undo-prepay` — Toggle prepay
- `POST /api/investments/repair-expenses` — Fix orphaned SIP investments

## Prioritized Backlog

### P0 (Next)
- **Cash Flow Engine Phase 1: Rolling Balance** — Closing → Opening balance
- **Cash Flow Engine Phase 4: Negative Balance Handling** — Smart warnings

### P1 (Upcoming)
- Cash Flow Engine Phase 3: Cash Flow Timeline (daily projection)
- Financial Command Center (cockpit dashboard)
- Decision Impact Engine (purchase simulator)

### P2 (Future)
- Refactor Insights.js into smaller components
- Security Settings (2FA/Biometric - currently mocked)

## Key Files
- `/app/frontend/src/MyExpenses.js` — Expense list + prepayment
- `/app/frontend/src/ExpenseCalendar.js` — Calendar view
- `/app/frontend/src/InvestmentForm.js` — Restructured investment form
- `/app/frontend/src/Insights.js` — Gamified insights
- `/app/backend/routes/expenses.py` — Expense CRUD + prepayment
- `/app/backend/routes/investments.py` — Investment CRUD + repair
