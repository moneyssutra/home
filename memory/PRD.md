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

### Wealth Impact Analysis System
- **Wealth Grading** (A+ to F): `GET /api/expenses/wealth-impact`
- **Regret Flag**: `PATCH /api/expenses/{id}/regret` — Lifestyle > ₹5K
- **Opportunity Cost (Sutra Swap)**: Loan payoff %, insurance months, goal gap %, investment growth
- **UI**: Expandable bottom-sheet at bottom of Monthly tab

### Theme Persistence (Feb 28, 2026)
- Preferences saved to backend via `POST /api/settings/preferences` (fixed from PUT→POST)
- `ThemeContext.syncThemeFromBackend()` called after login/auth check
- Theme survives logout/login and cross-device sessions

### Test Account Seed Data (Feb 28, 2026)
- `_seed_test_account()` in auth.py auto-populates on first login:
  - 5 assets (real estate, gold, vehicle, FD, emergency fund)
  - 3 credit cards (HDFC, ICICI, SBI)
  - 3 loans (home, car, personal)
  - 2 insurance policies (health, term life)

### Navigation & UI
- All Wealth sub-pages → back to `/wealth`
- Expense tabs → URL param `?tab=` preserves active tab
- Notifications: type-based fallback routing
- MyExpenses: header + tabs + month selector in single gradient wrapper (no gap)

## Bug Fixes Log
- Insurance page crash, Wealth back buttons, ProfileMenu dropdown clipping
- Login: DOM value read for browser autofill
- Feb date: schedule_day capped to days_in_month
- MyExpenses UI overlap: single gradient wrapper
- Badges/Challenges: X/Y summary in accordion headers
- Notification redirect: type-based fallback routes
- Theme: PUT→POST fix + backend sync on login

## Prioritized Backlog
### P1: Cash Flow Engine - Phase 1 (Rolling Balance Engine)
### P1: Cash Flow Engine - Phase 4 (Negative Balance Handling UI)
### P2: Cash Flow Timeline Engine
### P2: Financial Command Center enhancements
### P2: Decision Impact Engine (financial simulation)
### P2: Theme - Mint Green (#98FF98) & wide tracking typography

## Mocked
- 2FA and Biometric Login toggles (UI only)

## 3rd Party
openpyxl, recharts, reportlab, @dnd-kit/core, Emergent Google Auth, OpenAI GPT-5.2, MongoDB Atlas
