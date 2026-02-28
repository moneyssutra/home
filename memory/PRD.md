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

## Navigation Structure
```
Home | Wealth | + | Health | Goals
```

## My Expenses Page (`/my-expenses`)
Tabbed interface: **List** | **Daily** | **Weekly** | **Monthly**

### List Tab
- Month selector, summary card with Paid/Prepaid vs Pending split
- Expense breakdown by category, fixed/variable split, expense list
- Auto-paid detection: expenses with due date <= today show as "Paid" in current month

### Daily Tab
- Calendar heatmap with color-coded spend intensity
- Week stats, selected day detail, categories

### Weekly Tab (Redesigned Feb 28, 2026)
- **Week selector pills** at top (8 weeks)
- Summary card with total, budget bar (Essential/Lifestyle/Wealth), weekday/weekend split
- **Expense Breakdown**: 3 clickable cards (Essential, Lifestyle, Wealth Building) → navigate to group pages
- Day-by-day horizontal bars with color coding
- Categories section (clickable → `/expenses/:category`)
- 8-week trend chart with drill-down
- Behavior insights

### Monthly Tab (Updated Feb 28, 2026)
- **Month selector pills** at top (6 months)
- Summary card with total, % of income, budget bar
- **Expense Breakdown**: 3 clickable cards → navigate to group pages
- 6-month trend bar chart (clickable bars update selection)
- **Top Categories**: clickable → navigate to `/expenses/:category`
- Spending insights, behavior patterns, spending distribution

## Expense Group Pages (NEW Feb 28, 2026)
Routes: `/expenses/group/essential`, `/expenses/group/lifestyle`, `/expenses/group/wealth-building`
- Colored header with group name, description, monthly total
- Categories within the group with expense counts
- Individual expenses listed under each category (clickable → expense detail)
- Smart back button (navigate(-1) with fallback to /my-expenses)

### Category Mapping
- **Essential**: Housing, Utilities, Food, Medical, Education, Insurance, EMI
- **Lifestyle**: Travel, Shopping, Subscriptions, Business Expense, Salary Paid
- **Wealth Building**: Investments, Savings

## Key API Endpoints
- `GET /api/expenses/by-month?month=YYYY-MM` — with auto-paid status detection
- `GET /api/expenses/weekly-summary?last=8` — now includes essential/lifestyle/wealth per week
- `GET /api/expenses/monthly-summary?last=6` — with essential/lifestyle/wealth
- `GET /api/expenses/behavior-insights` — behavioral patterns
- `GET /api/dashboard/networth`, `/api/income`, `/assets`, `/investments`, `/loans`

## Completed Features (Latest Session)
- [Feb 28, 2026] Bug fix: ProfileMenu avatar shows correct initials on Health & Goals pages
- [Feb 28, 2026] Bug fix: Hidden scrollbar on Wealth page
- [Feb 28, 2026] Bug fix: Auto-paid status — expenses due before today show as "Paid" in List tab
- [Feb 28, 2026] Weekly tab redesigned to match Monthly (week pills, Expense Breakdown, budget bar)
- [Feb 28, 2026] Monthly tab: month pills moved to top, top categories clickable
- [Feb 28, 2026] Expense Breakdown cards clickable → new group detail pages
- [Feb 28, 2026] Created ExpenseGroup pages (Essential, Lifestyle, Wealth Building)
- [Feb 28, 2026] Smart back button logic across expense pages
- [Feb 28, 2026] Backend: weekly summary now returns essential/lifestyle/wealth breakdown
- Light theme consistency across all expense tabs

## Prioritized Backlog
### P1: Cash Flow Engine - Phase 1 (Rolling Balance Engine)
### P1: Cash Flow Engine - Phase 4 (Negative Balance Handling UI)
### P2: Cash Flow Engine - Phase 3 (Cash Flow Timeline Engine)
### P2: Financial Command Center enhancements
### P2: Decision Impact Engine (financial simulation)

## Mocked: 2FA and Biometric Login toggles (UI only)
## 3rd Party: openpyxl, recharts, reportlab, @dnd-kit/core, Emergent Google Auth, OpenAI GPT-5.2, MongoDB Atlas
