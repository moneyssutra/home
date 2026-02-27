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
- New/Empty User: `newuser@test.com` / `password`

## What's Been Implemented

### Cash Flow Engine Phase 2: Prepayment System (Feb 27, 2026)
- Backend: 5 endpoints — `by-month`, `mark-paid`, `prepay`, `unmark-paid`, `undo-prepay`
- Model: Added `prepaidFlag`, `expenseMonth`, `paidDate`, `dueDate`, `linkedPaymentId` to Expense
- Frontend: MyExpenses.js rewrite with month selector, action buttons, undo buttons, progress bar
- Hook: `useExpensesByMonth` in useApi.js

### Undo Mark Paid / Undo Prepay (Feb 27, 2026)
- Backend: `unmark-paid` and `undo-prepay` endpoints
- Frontend: "Undo Payment" / "Undo Prepayment" buttons on paid/prepaid expense cards

### Insights Page Module Restructure (Feb 27, 2026)
- Reorder: Shock Test → Financial Score → Emergency Runway → Money Personality → Runway Simulator → Future You → Personality Evolution → Badges → Challenges
- Progressive lock/unlock with motivational "Stage X Required" messages
- Badges and Challenges at bottom

### Notification Dismiss Fix (Feb 27, 2026)
- Added visible X dismiss button on each notification card
- Improved swipe handler: non-passive touch listeners, horizontal/vertical detection

### NPS/PPF SIP Auto-Expense Fix (Feb 27, 2026)
- `POST /api/investments/repair-expenses` — retroactively creates missing SIP expenses for orphaned investments
- Fixed PPF Account that had autoCreateExpense=True but no linked expense
- Verified NPS/PPF investment creation correctly links expenses

### Monthly Expense Calendar View (Feb 27, 2026)
- New `/expense-calendar` page with calendar grid
- Expenses plotted on due dates with color-coded dots (paid/pending/prepaid)
- Day cells show total amounts; click to see detailed expense list
- Month navigation, legend, "View as List" link
- Calendar icon button on MyExpenses header

### Previous Features (Feb 25-26, 2026)
- Full E2E validation with seeded realistic test data
- Financial Health 10-metric scoring, granular tiers
- Expense normalization across all pages
- Insurance form improvements, PWA, branding, legal pages, PDF reports
- Insights 3-layer architecture with premium hero section
- Gamification engine fix, SIP auto-expense fix
- Dashboard/Login/Navigation fixes
- Monthly Cashflow 4-box card with detail pages
- Unified Add Income page
- Financial Health smart sort + drag-to-reorder

## Prioritized Backlog

### P0 (Next)
- **Cash Flow Engine Phase 1: Rolling Balance** — Closing balance → Opening balance
- **Cash Flow Engine Phase 4: Negative Balance Handling** — Smart warnings

### P1 (Upcoming)
- **Cash Flow Engine Phase 3: Cash Flow Timeline** — Daily balance projection
- **Financial Command Center** — Cockpit dashboard
- **Decision Impact Engine** — Purchase impact simulator

### P2 (Future)
- Refactor Insights.js into smaller components
- Security Settings (2FA/Biometric - currently mocked)
- File structure cleanup

## Key API Endpoints
- `GET /api/expenses/by-month?month=YYYY-MM` — Month-filtered expenses
- `POST /api/expenses/{id}/mark-paid` — Mark paid
- `POST /api/expenses/{id}/prepay` — Prepay next month
- `POST /api/expenses/{id}/unmark-paid` — Undo paid
- `POST /api/expenses/{id}/undo-prepay` — Undo prepay
- `POST /api/investments/repair-expenses` — Fix orphaned SIP investments
- `GET /api/intelligence/insights` — Insights data + gamification
- `GET /api/intelligence/share-card` — Live shareable score card

## Key Files
- `/app/frontend/src/MyExpenses.js` — Expense list with prepayment system
- `/app/frontend/src/ExpenseCalendar.js` — Calendar view
- `/app/frontend/src/Insights.js` — Gamified insights page
- `/app/frontend/src/components/NotificationBell.js` — Notifications
- `/app/backend/routes/expenses.py` — Expense CRUD + prepayment
- `/app/backend/routes/investments.py` — Investment CRUD + repair
- `/app/backend/routes/intelligence.py` — Insights + gamification
- `/app/backend/routes/dashboard.py` — Dashboard data
