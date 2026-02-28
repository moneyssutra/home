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

### Timezone-Aware Calculations (Mar 1, 2026)
- `get_user_now(request)` in utils.py reads `tz_offset` from query params
- Frontend sends `new Date().getTimezoneOffset()` with all dashboard/expense API calls
- Ensures IST users see correct month data even when server runs UTC
- Applied to: dashboard/networth, expenses/monthly-summary, behavior-insights, weekly-summary, overspend-analysis, wealth-impact, spending-insights

### Spending Insights Module (Mar 1, 2026)
- Endpoint: `GET /api/expenses/spending-insights?tz_offset=`
- **5 Rules**: Category Growth (15%+), Subscription Concentration (>10% income), Lifestyle vs Wealth Imbalance, Budget Breach (>85% income), Drift vs 3-Month Average (>20%)
- Returns top 3 insights sorted by severity (High → Medium → Low)
- Frontend: Glass cards with severity gradients, animated progress bars, fade-in animations
- Placement: Bottom of Monthly tab above Financial Intelligence

### Financial Intelligence Engine (Rule-Based)
- Endpoint: `GET /api/expenses/overspend-analysis`
- 3-Layer Trigger: Budget Breach, Behavioral Drift, Income Ratio

### Wealth Impact Analysis System
- Wealth Grading (A+ to F): `GET /api/expenses/wealth-impact`
- Regret Flag: `PATCH /api/expenses/{id}/regret`
- Opportunity Cost (Sutra Swap): loan payoff %, insurance months, goal gap %

### Theme Persistence
- POST /api/settings/preferences saves theme
- syncThemeFromBackend() on login/auth check

### Test Account Seed Data
- Auto-populates assets, credit cards, loans, insurance on first login

## Bug Fixes
- Insurance crash, Wealth back buttons, ProfileMenu clipping
- Login browser autofill, Feb date capping, UI overlap
- Badges/Challenges accordion summary, Notification redirects
- Theme PUT→POST, Timezone UTC→user local

## Prioritized Backlog
### P1: Cash Flow Engine - Phase 1 (Rolling Balance Engine)
### P1: Cash Flow Engine - Phase 4 (Negative Balance Handling UI)
### P2: Cash Flow Timeline Engine
### P2: Financial Command Center enhancements
### P2: Decision Impact Engine (financial simulation)
### P2: Spending Insights Phase 2 (Safety Days Impact + Future Value for high-severity)
### P2: Theme - Mint Green (#98FF98) & wide tracking typography

## Mocked
- 2FA and Biometric Login toggles (UI only)

## 3rd Party
openpyxl, recharts, reportlab, @dnd-kit/core, Emergent Google Auth, OpenAI GPT-5.2, MongoDB Atlas
