# MoneySSutra - Product Requirements Document

## Original Problem Statement
MoneySSutra is a sophisticated personal finance application — a "Financial Control Operating System" with gamified insights, advanced analytics, and forecasting tools.

## Core Architecture
- **Frontend**: React + TailwindCSS + Shadcn/UI  
- **Backend**: FastAPI + MongoDB  
- **Auth**: JWT + Google OAuth (Emergent-managed)  
- **AI**: OpenAI GPT-5.2 via emergentintegrations  

## Test Credentials
- Username: `test@moneyssutra.com`, Password: `test`

## Implemented Features

### Financial Intelligence Engine (Rule-Based)
- Endpoint: `GET /api/expenses/overspend-analysis`
- 3-Layer Trigger: Budget Breach, Behavioral Drift, Income Ratio
- Per-category impact: Safety days, Growth FV, Goal %

### Wealth Impact Analysis System (Feb 28, 2026)
- **Wealth Grading** (A+ to F): `GET /api/expenses/wealth-impact`
  - Based on 50/30/20 rule (Needs ≤50%, Wants ≤30%, Savings ≥20%)
  - Deviation scoring: double-weight savings shortfall
- **Regret Flag**: `PATCH /api/expenses/{id}/regret`
  - Lifestyle/Want expenses > ₹5,000 trigger Regret Check
  - Happy face (regret=false) vs Regret face (regret=true) stored as permanent metadata
- **Opportunity Cost (Sutra Swap)**:
  - For regret spend, calculates: loan payoff %, insurance months, goal gap %, investment growth
  - Rule-based, deterministic calculations (no AI)
- **UI**: Expandable bottom-sheet at bottom of Monthly tab in My Expenses
  - Grade ring visualization, allocation bars with targets, Regret Check cards, Sutra Swap suggestions

### Navigation & Back Buttons
- All Wealth sub-pages -> back to `/wealth`
- Expense tabs -> URL param `?tab=` preserves active tab
- Notifications: type-based fallback routing (gamification/achievement/streak -> /health)

## Bug Fixes Log
- Insurance page crash: guard for invalid date values
- Wealth sub-page back buttons -> `/wealth`
- ProfileMenu dropdown clipped on Wealth page: removed `overflow-hidden`
- Login: Read DOM values directly on form submit (browser autofill fix)
- Feb date: Cap schedule_day to days_in_month
- MyExpenses UI overlap: removed negative margins
- Badges/Challenges: X/Y summary in accordion headers
- Notification redirect: type-based fallback routes for notifications without actionUrl

## Key API Endpoints
- `POST /api/auth/login`
- `GET /api/expenses/wealth-impact` (Wealth Grade + Regret + Opportunity Cost)
- `PATCH /api/expenses/{id}/regret` (Set regret flag)
- `GET /api/expenses/overspend-analysis` (Financial Intelligence)
- `GET /api/expenses/weekly-summary`
- `GET /api/expenses/monthly-summary`
- `GET /api/dashboard/networth`

## Prioritized Backlog
### P1: Cash Flow Engine - Phase 1 (Rolling Balance Engine)
### P1: Cash Flow Engine - Phase 4 (Negative Balance Handling UI)
### P2: Cash Flow Engine - Phase 3 (Cash Flow Timeline Engine)
### P2: Financial Command Center enhancements
### P2: Decision Impact Engine (financial simulation)
### P2: Theme refinement - Mint Green (#98FF98) & wide tracking typography (app-wide or section-specific TBD)

## Mocked
- 2FA and Biometric Login toggles (UI only)
- Reallocate/Ignore buttons in Financial Intelligence (UI only)

## 3rd Party Integrations
openpyxl, recharts, reportlab, @dnd-kit/core, Emergent Google Auth, OpenAI GPT-5.2, MongoDB Atlas
