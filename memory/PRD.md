# MoneySSutra - Product Requirements Document

## Original Problem Statement
MoneySutra is a premium personal finance application (PWA) built with React + FastAPI + MongoDB. It tracks expenses, income, investments, assets, loans, and provides rule-based financial analysis with AI-powered insights.

## Architecture
- **Frontend**: React (CRA) with ShadCN UI, Recharts, SWR
- **Backend**: FastAPI with async MongoDB (motor)
- **Database**: MongoDB Atlas
- **Auth**: Session-based + Emergent Google OAuth
- **AI**: OpenAI GPT-5.2 via emergentintegrations

## Completed Features

### Core App
- Full CRUD for expenses, income, investments, assets, loans, accounts
- Dashboard, Expense views, Spending Insights, Theme persistence, Family management, Gamification

### Smart Financial Schedulers (Mar 1, 2026)
- SIP auto-update, Loan EMI auto-deduction with ledger, Fixed income/Insurance/Variable income auto-recording

### Loan Detail + EMI Ledger Page (Mar 1, 2026)
- Route: `/wealth/loans/:id`
- Full amortization schedule, color-coded statuses (Paid/Pending), mark-EMI-paid
- Extra payment with 3 modes: Reduce Tenure, Reduce EMI, Prepay Principal
- Loan insights (interest payable, EMI-to-income %, safety impact)
- Past EMIs default to "Paid" when no ledger data exists

### Investment Detail + Ledger Page (Mar 1, 2026)
- Route: `/wealth/investments/:id`
- CAGR, projected growth (1yr-20yr), performance tagging
- Auto-generated SIP transaction ledger, add contribution feature

### Navigation Fixes (Mar 1, 2026)
- All loan clicks across app (Liabilities, Category, Expenses, Assets) → `/wealth/loans/:id`
- All investment clicks across app (Category, Expenses) → `/wealth/investments/:id`

### Share Card UI Fixes (Mar 1, 2026)
- Fixed circle overlap, Stage badge, inline SVGs, actual logo, capitalized names

### Admin Command Center (All 6 Phases Complete)

## Key API Endpoints
- `GET /api/loans/{id}/amortization` - Full EMI schedule
- `POST /api/loans/{id}/extra-payment` - 3 modes: reduce_tenure/reduce_emi/reduce_principal
- `POST /api/loans/{id}/mark-emi` - Mark EMI as paid
- `GET /api/loans/{id}/insights` - Loan insights
- `GET /api/investments/{id}/detail` - Full detail with CAGR, projections, ledger
- `POST /api/investments/{id}/add-contribution` - Manual contribution

## Key DB Collections
- `emi_transactions`, `loan_extra_payments`, `investment_transactions`

## Backlog (P2)
- Cash Flow Engine: Rolling Balance, Timeline
- Decision Impact Engine: Financial simulation
- Refactor useIntelligenceData.js

## Credentials
- Test: test@moneyssutra.com / test
- Admin: admin@moneyssutra.com / admin123
- Priya: priya@moneyssutra.com / Priya@123

## 3rd Party
- OpenAI GPT-5.2, Emergent Google Auth, MongoDB Atlas, html2canvas, python-dateutil
