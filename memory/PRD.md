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
- **Backend**: 5 endpoints in expenses.py:
  - `GET /api/expenses/by-month?month=YYYY-MM` — month-filtered expenses with `_displayStatus`
  - `POST /api/expenses/{id}/mark-paid` — marks expense as paid
  - `POST /api/expenses/{id}/prepay` — creates prepaid record for next month
  - `POST /api/expenses/{id}/unmark-paid` — undo mark paid
  - `POST /api/expenses/{id}/undo-prepay` — delete prepaid child record
- **Model**: Added `prepaidFlag`, `expenseMonth`, `paidDate`, `dueDate`, `linkedPaymentId` to Expense
- **Frontend**: MyExpenses.js rewrite with month selector, action buttons, undo buttons, progress bar
- **Hook**: `useExpensesByMonth` in useApi.js
- **Tested**: iteration_85.json (13/13 backend, 11/11 frontend)

### Undo Mark Paid / Undo Prepay (Feb 27, 2026)
- Backend: `unmark-paid` and `undo-prepay` endpoints
- Frontend: "Undo Payment" button on paid expenses, "Undo Prepayment" on prepaid
- Tested: iteration_86.json

### Insights Page Module Restructure (Feb 27, 2026)
- Reordered: Shock Test → Financial Score → Emergency Runway → Money Personality → Runway Simulator → Future You → Personality Evolution → Badges → Challenges
- Badges and Challenges moved to bottom (below Personality Evolution)
- Progressive lock/unlock with motivational "Stage X Required" messages
- Locked modules: visible title + lock icon, clickable to show stage requirement
- Tested: iteration_86.json

### Notification Dismiss Fix (Feb 27, 2026)
- Added visible X dismiss button on each notification card
- Improved swipe handler: non-passive touch listeners, horizontal/vertical detection
- `notifContainerRef` for proper event listener attachment
- Tested: iteration_86.json

### Previous Features (Feb 25-26, 2026)
- Full E2E validation with seeded realistic test data
- Financial Health 10-metric scoring, granular tiers
- Expense normalization across all pages
- Insurance form improvements
- PWA, branding, legal pages, PDF reports
- Insights 3-layer architecture with premium hero section
- Gamification engine fix (badges awarded)
- SIP auto-expense fix (linkedInvestmentId)
- Dashboard/Login/Navigation fixes
- Monthly Cashflow 4-box card with detail pages
- Unified Add Income page
- Financial Health smart sort + drag-to-reorder

## Prioritized Backlog

### P0 (Next)
- **Monthly Expense Calendar View** — Plot expenses on due dates for visual timeline
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

## Key DB Collections
- users, profiles, user_sessions
- income_sources, expenses, insurances, investments, assets, loans, credit_cards, accounts
- income_transactions, expense_transactions
- user_gamification_profile, user_personality, user_personality_history

## Key API Endpoints
- `GET /api/expenses/by-month?month=YYYY-MM` — Month-filtered expenses
- `POST /api/expenses/{id}/mark-paid` — Mark paid
- `POST /api/expenses/{id}/prepay` — Prepay next month
- `POST /api/expenses/{id}/unmark-paid` — Undo paid
- `POST /api/expenses/{id}/undo-prepay` — Undo prepay
- `GET /api/intelligence/insights` — Insights data + triggers gamification
- `GET /api/intelligence/share-card` — Live shareable score card data
