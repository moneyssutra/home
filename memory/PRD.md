# MoneySSutra - Product Requirements Document

## Original Problem Statement
MoneySutra is a premium personal finance application (PWA) built with React + FastAPI + MongoDB. Full financial management engine with detailed entity pages, smart schedulers, AI insights, and a native opportunity system with premium mode.

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
| Loan | `/wealth/loans/:id` | Amortization schedule, EMI ledger, mark-EMI-paid, extra payment |
| Investment | `/wealth/investments/:id` | CAGR, projected growth, SIP transaction ledger |
| Credit Card | `/wealth/credit-cards/:id` | Utilization bar, payoff estimate, payment history |
| Insurance | `/wealth/insurance/:id` | Premium schedule, coverage ratio |
| Asset | `/wealth/assets/:id` | Appreciation %, CAGR, net equity |
| Income | `/wealth/income/:id` | Receipt schedule, transaction history, linked asset |
| Expense | `/wealth/expenses/:id` | Monthly/yearly cost, expense-to-income % |
| Account | `/wealth/accounts/:id` | Transaction ledger, inflow/outflow/net monthly flow |

### Opportunity System (March 2026)
**Backend Engine** (`backend/routes/opportunities.py`):
- MongoDB collections: `opportunities`, `campaigns`, `user_opportunity_logs`, `opportunity_events`
- User API: `GET /eligible` (max 2, rule-based), `POST /dismiss` (30-day), `POST /track`
- Admin CRUD + Stats + Campaign launcher
- Eligibility rules engine with financial metric evaluation

**Frontend**:
- `OpportunityCard` component with category colors, dismiss, CTA, premium badge
- `/opportunities` page grouped by category
- Dashboard integration (lazy-loaded, max 1 card)
- Admin Monetization Engine at `/admin/monetization`

### Premium Mode (March 2026)
**Backend**:
- `is_premium` and `partner_consent` fields in PreferencesSettings model
- Premium users: campaign-type opportunities hidden, premium_only opportunities shown
- Non-premium users: premium_only opportunities hidden
- `premium_only` flag on opportunities (admin-configurable)

**Frontend**:
- Settings > Preferences: "Subscription & Opportunities" section
  - Premium Mode toggle (amber Crown icon, ACTIVE badge)
  - Partner Suggestions toggle (green Handshake icon)
- OpportunityCard: PREMIUM badge with Crown icon for premium_only opportunities
- Admin form: Premium Only checkbox

### Navigation & Bug Fixes
- ALL entity clicks navigate to detail pages
- Income type navigation fixed (Job, Business, Self-Employed, Commission, Rental)
- Insurance date crash, Credit Card UI overlap, Account ledger, Income sections fixed
- Opportunities page UI overlap fixed

### Admin Command Center (All 6 Phases + Monetization)

## Key API Endpoints
- `GET /api/{entity}/:id/detail` - All 8 entities
- `GET /api/opportunities/eligible` - Max 2 eligible (respects premium mode)
- `POST /api/opportunities/dismiss` - 30-day dismiss
- `POST /api/opportunities/track` - Event tracking
- `GET/POST/PUT/DELETE /api/opportunities/admin/*` - Admin CRUD + stats
- `GET/POST /api/settings/preferences` - Premium & partner consent

## Backlog (P2)
- Cash Flow Engine: Rolling Balance, Timeline
- Decision Impact Engine: Financial simulation
- Deeper Analytics: Behavioral Pattern Detection, Financial Improvement Tracker, Churn Prediction
- Refactor detail pages into generic DetailView wrapper

## Credentials
- Test: test@moneyssutra.com / test (username: test)
- Admin: admin@moneyssutra.com / admin123
