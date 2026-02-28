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
- New/Empty User: `newuser@test.com` / `password`

## Navigation Structure (Restructured Feb 28)
```
Home | Wealth | + | Health | Goals
```
1. **Home** (`/home`) — Days of Safety hero, Rolling Balance, Upcoming alerts, Quick snapshots. Emotion-focused.
2. **Wealth** (`/wealth`) — Financial Structure Engine. Tabs: Overview | Income | Expenses | Portfolio
   - Net Worth hero (Assets - Liabilities), Safety Days, Income Stability, Savings Rate
   - Overview: Monthly Cash Flow, Wealth Allocation breakdown
   - Income: Summary + link to My Income
   - Expenses: Summary + link to My Expenses
   - Portfolio: Assets, Investments, Loans, Credit Cards, Insurance, Accounts
3. **Add (+)** — Quick Add action sheet (Income, Expense, Investment, Asset, Loan, etc.)
4. **Health** (`/health`) — Intelligence Lab. Financial Safety Score, Shock Test, Badges, Challenges
5. **Goals** (`/my-goals`) — Financial goals with Wealth/Health integration

## Design Systems
### Deep Navy Theme (Expense Intelligence Views)
- Background: `#0E1421`, Card: `#1A2332`, Highlight: `#222D3F`
- Essential Blue: `#3B82F6`, Lifestyle Orange: `#F97316`, Wealth Green: `#22C55E`
- Text: White `#FFFFFF`, Primary `#E2E8F0`, Secondary `#94A3B8`, Muted `#64748B`

### App Theme
- Header: Turquoise gradient `#0D9488→#14B8A6→#06B6D4`
- Brand: Green gradient `#0D9488→#047857`

## Implemented Features (Latest First)
- **Navigation Restructure** (Feb 28) — Home|Wealth|+|Health|Goals. New Wealth page, Health renamed from Insights, Dashboard refocused
- **Expense Views Redesign** (Feb 28) — Deep navy theme, auto-select today, categories in Daily/Weekly, clickable boxes, mobile responsive, month pill sync
- **Behavior Connection Insights** (Feb 28) — Cross-analysis: weekend/weekday, salary week, categories
- **Multi-Level Expense Intelligence** (Feb 28) — 4-view (List/Daily/Weekly/Monthly)
- **Backend Performance Fix** (Feb 28) — /api/expenses/by-month: >8s → ~1.5s
- **Excel Import/Export** (Feb 27) — Bulk import/export
- **Family Financial Tracking** (Feb 27) — Groups, members, combined summaries
- **Prepayment System** (Feb 27) — Mark-paid, prepay, undo

## Key API Endpoints
- `GET /api/dashboard/networth` — Net worth, income, expense summary
- `GET /api/expenses/behavior-insights` — Behavioral spending insights
- `GET /api/expenses/monthly-summary` — Per month aggregation
- `GET /api/expenses/weekly-summary` — Per week aggregation
- `GET /api/expenses/by-month` — Filtered by YYYY-MM
- `GET /api/assets`, `/api/investments`, `/api/loans`, `/api/insurances`, `/api/accounts`, `/api/credit-cards`

## Prioritized Backlog
### P1 (Phase 2 Enhancements)
- Wealth: Net Worth trend chart, Income Stability %, Savings projection
- Health: Risk Exposure score, Lifestyle vs Wealth Ratio, Spending Drift Detection
- Goals: Link to Wealth allocation and Health impact
- Cash Flow Engine Phase 1 (Rolling Balance), Phase 4 (Negative Balance)

### P2 (Future)
- Cash Flow Timeline Engine
- Financial Command Center
- Decision Impact Engine
- Onboarding: "Wealth includes income, expenses, assets and liabilities"

## Mocked Features
- Two-Factor Authentication and Biometric Login toggles (UI only)

## 3rd Party Integrations
- openpyxl, apscheduler, recharts, reportlab, @dnd-kit/core, Emergent Google Auth, OpenAI GPT-5.2 (emergentintegrations), MongoDB Atlas
