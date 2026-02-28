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
Tabbed interface with URL persistence: **List** (`?tab=list`) | **Daily** (`?tab=daily`) | **Weekly** (`?tab=weekly`) | **Monthly** (`?tab=monthly`)

### List Tab
- Auto-paid detection: expenses due before today show as "Paid" in current month
- Paid/Prepaid vs Pending summary with percentage

### Daily Tab
- Calendar heatmap, week stats, selected day detail
- **Categories clickable** → navigate to `/expenses/:category`

### Weekly Tab (Redesigned)
- Week selector pills at top, summary card with budget bar (Essential/Lifestyle/Wealth)
- Expense Breakdown: 3 clickable cards → navigate to group pages
- Day-by-day bars, categories (clickable), 8-week trend, behavior insights

### Monthly Tab
- **Month selector pills at top** (6 months, clickable)
- Summary card, Expense Breakdown (clickable → group pages)
- 6-month trend chart, **Top Categories clickable** → `/expenses/:category`
- Spending insights, behavior patterns

## Expense Group Pages (`/expenses/group/:group`)
Routes: `/expenses/group/essential`, `/expenses/group/lifestyle`, `/expenses/group/wealth-building`
- Colored header, categories with expenses listed (first 3 shown)
- **"View all X expenses" expands inline** (toggle, no page navigation)
- Smart back button (navigate(-1) with /my-expenses fallback)

### Category Mapping
- **Essential**: Housing, Utilities, Food, Medical, Education, Insurance, EMI
- **Lifestyle**: Travel, Shopping, Subscriptions, Business Expense, Salary Paid
- **Wealth Building**: Investments, Savings

## Key Fixes
- ProfileMenu: single initial (e.g., "R") consistent across all 4 main pages
- Health page header: removed `overflow-hidden` so dropdown isn't cut off
- My Income: "Other" category now navigates to `/my-other-income`
- Tab persistence: URL search params preserve active tab across navigation

## Key API Endpoints
- `GET /api/expenses/by-month?month=YYYY-MM` — with auto-paid status detection
- `GET /api/expenses/weekly-summary?last=8` — includes essential/lifestyle/wealth
- `GET /api/expenses/monthly-summary?last=6` — with essential/lifestyle/wealth
- `GET /api/expenses/behavior-insights`
- `GET /api/dashboard/networth`, `/api/income`, `/assets`, `/investments`, `/loans`

## Completed Features
- [Feb 28, 2026] Fix: ProfileMenu dropdown cut off on Health page
- [Feb 28, 2026] Fix: Consistent single-letter avatar initial across all pages
- [Feb 28, 2026] Fix: "Other" clickable in My Income → /my-other-income
- [Feb 28, 2026] Fix: Back button preserves active tab (Monthly/Weekly/Daily)
- [Feb 28, 2026] Feature: Categories clickable in Daily & Weekly tabs
- [Feb 28, 2026] Feature: Inline expand for "View all X expenses" in group pages
- [Feb 28, 2026] Fix: Auto-paid status for expenses past due date
- [Feb 28, 2026] Weekly tab redesigned (week pills, Expense Breakdown, budget bar)
- [Feb 28, 2026] Monthly tab: month pills moved to top, categories clickable
- [Feb 28, 2026] Expense Group pages (Essential, Lifestyle, Wealth Building)

## Prioritized Backlog
### P1: Cash Flow Engine - Phase 1 (Rolling Balance Engine)
### P1: Cash Flow Engine - Phase 4 (Negative Balance Handling UI)
### P2: Cash Flow Engine - Phase 3 (Cash Flow Timeline Engine)
### P2: Financial Command Center enhancements
### P2: Decision Impact Engine (financial simulation)

## Mocked: 2FA and Biometric Login toggles (UI only)
## 3rd Party: openpyxl, recharts, reportlab, @dnd-kit/core, Emergent Google Auth, OpenAI GPT-5.2, MongoDB Atlas
