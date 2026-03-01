# MoneySSutra - Product Requirements Document

## Original Problem Statement
MoneySutra is a premium personal finance application (PWA) built with React + FastAPI + MongoDB. Full financial management engine with detailed entity pages, smart schedulers, AI insights, and a native opportunity system.

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

### Opportunity System (NEW - March 2026)
**Backend - Opportunity Engine** (`backend/routes/opportunities.py`):
- MongoDB collections: `opportunities`, `campaigns`, `user_opportunity_logs`, `opportunity_events`
- User API: `GET /api/opportunities/eligible` (returns max 2 based on rule-based eligibility)
- Dismiss API: `POST /api/opportunities/dismiss` (30-day cooldown)
- Tracking API: `POST /api/opportunities/track` (click/convert events)
- Admin CRUD: `GET /admin/list`, `POST /admin/create`, `PUT /admin/{id}`, `DELETE /admin/{id}`
- Admin Stats: `GET /admin/stats` (impressions, clicks, CTR)
- Campaign Launcher: `POST /admin/campaign/launch`
- Eligibility rules: days_of_safety, wealth_percent, monthly_income, emi_percent, idle_cash, no_active_sip, no_insurance
- Frequency: 7-day cooldown per opportunity, 30-day dismiss, max 2 per request
- Lazy-loads after main content

**Frontend - OpportunityCard** (`frontend/src/components/OpportunityCard.js`):
- Category-specific colors (Safety=green, Growth=blue, Debt=amber, Protection=purple)
- Soft badge, dismiss X button, CTA button with navigation
- No flashing, no popups, native app feel

**Frontend - Opportunities Tab** (`frontend/src/pages/Opportunities.js`):
- Route: `/opportunities`
- Grouped by category with headers
- Scrollable, clean layout

**Frontend - Dashboard Integration** (`frontend/src/Dashboard.js`):
- "Smart Opportunities" section at bottom, max 1 card
- "View All" link to /opportunities page
- Lazy-loaded after main content

**Admin - Monetization Engine** (`frontend/src/pages/admin/MonetizationEngine.js`):
- Route: `/admin/monetization`
- Stats overview: Impressions, Clicks, Dismissed, CTR
- Opportunity list with inline stats, toggle active, edit, delete
- Create/Edit form with rule builder (metric + operator + value)
- View Rules expandable section
- Sidebar link with Rocket icon

### Navigation
- ALL entity clicks navigate to detail pages
- Income type pages (Job, Business, Self-Employed, Commission, Rental) all navigate to `/wealth/income/:id`

### Admin Command Center (All 6 Phases + Monetization)

### Bug Fixes (March 2026)
- Insurance Date Crash, Credit Card UI Overlap, Account Ledger Missing, Income Detail Missing Sections, Income Type Navigation

## Key API Endpoints
- `GET /api/{entity}/:id/detail` - All 8 entities
- `GET /api/opportunities/eligible` - Max 2 eligible opportunities
- `POST /api/opportunities/dismiss` - 30-day dismiss
- `POST /api/opportunities/track` - Event tracking
- `GET/POST/PUT/DELETE /api/opportunities/admin/*` - Admin CRUD + stats + campaign

## Backlog (P2)
- Premium Mode: Hide partner opportunities for premium users
- Cash Flow Engine: Rolling Balance, Timeline
- Decision Impact Engine: Financial simulation
- Deeper Analytics: Behavioral Pattern Detection, Financial Improvement Tracker, Churn Prediction
- Refactor detail pages into generic DetailView wrapper

## Credentials
- Test: test@moneyssutra.com / test (username: test)
- Admin: admin@moneyssutra.com / admin123
