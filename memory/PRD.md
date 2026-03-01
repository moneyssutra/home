# MoneySSutra - Product Requirements Document

## Original Problem Statement
MoneySutra is a premium personal finance application (PWA) built with React + FastAPI + MongoDB. Full financial management engine with detailed entity pages, smart schedulers, and AI insights.

## Architecture
- **Frontend**: React (CRA) with ShadCN UI, Recharts, SWR
- **Backend**: FastAPI with async MongoDB (motor)
- **Database**: MongoDB Atlas
- **Auth**: Session-based + Emergent Google OAuth
- **AI**: OpenAI GPT-5.2 via emergentintegrations

## Completed Features

### Core App
- Full CRUD for all entities (expenses, income, investments, assets, loans, accounts, credit cards, insurance)
- Dashboard, Expense views, Spending Insights, Theme persistence, Family management, Gamification

### Smart Financial Schedulers
- SIP Investment Auto-Update, Loan EMI Auto-Deduction with ledger
- Fixed Income/Insurance/Variable Income auto-recording and reminders

### Entity Detail Pages (ALL 8 Complete)
| Entity | Route | Key Features |
|--------|-------|-------------|
| Loan | `/wealth/loans/:id` | Amortization schedule, EMI ledger (Paid/Pending), mark-EMI-paid, extra payment (3 modes), loan insights |
| Investment | `/wealth/investments/:id` | CAGR, projected growth (1-20yr), performance tag, SIP transaction ledger, add contribution |
| Credit Card | `/wealth/credit-cards/:id` | Utilization bar, APR, monthly interest, payoff estimate, record payment, payment history |
| Insurance | `/wealth/insurance/:id` | Premium schedule (paid/upcoming), coverage ratio, premium-to-income % |
| Asset | `/wealth/assets/:id` | Appreciation %, CAGR, net equity, linked loan/insurance/income |
| Income | `/wealth/income/:id` | Receipt schedule, transaction history, linked asset |
| Expense | `/wealth/expenses/:id` | Monthly/yearly cost, expense-to-income %, linked entities |
| Account | `/wealth/accounts/:id` | Transaction ledger, inflow/outflow/net monthly flow, linked loans/investments/income/expenses |

### Navigation
- ALL entity clicks across the app navigate to detail pages (not edit forms)
- Edit buttons on detail pages navigate to respective edit form routes
- Fixed: MyJob, MyBusiness, MySelfEmployed, MyCommission, MyRental now navigate to /wealth/income/:id

### Admin Command Center (All 6 Phases)

### Bug Fixes (March 2026)
- **Insurance Date Crash (P0)**: Fixed `RangeError: Invalid time value` in CategoryInsurance.js
- **Credit Card UI Overlap (P0)**: Fixed payment history date handling and CSS spacing
- **Account Ledger Missing (P1)**: Added transaction ledger with Opening Balance to AccountDetail
- **Income Detail Missing Sections (P1)**: Always-visible sections with empty-state placeholders; schedule generated from createdAt
- **Income Type Pages Navigation (P1)**: Fixed MyJob, MyBusiness, MySelfEmployed, MyCommission, MyRental to navigate to /wealth/income/:id instead of edit forms

## Key API Endpoints
- `GET /api/{entity}/:id/detail` - All 8 entities
- `POST /api/loans/:id/extra-payment` (3 modes)
- `POST /api/loans/:id/mark-emi`
- `POST /api/credit-cards/:id/record-payment`
- `POST /api/investments/:id/add-contribution`
- `GET /api/loans/:id/amortization`
- `GET /api/loans/emi-ledger-all`

## Backlog (P2)
- Cash Flow Engine: Rolling Balance, Timeline
- Decision Impact Engine: Financial simulation
- Deeper Analytics: Behavioral Pattern Detection, Financial Improvement Tracker, Churn Prediction
- Refactor detail pages into generic DetailView wrapper to reduce code duplication

## Credentials
- Test: test@moneyssutra.com / test (username: test)
- Admin: admin@moneyssutra.com / admin123
