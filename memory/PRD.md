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
All pages share consistent header: ProfileMenu avatar + NotificationBell

1. **Home** (`/home`) — Days of Safety hero, Rolling Balance, Alerts, Financial Health Score
2. **Wealth** (`/wealth`) — Simple list: Income, Expenses, Assets, Investments, Loans, Credit Cards, Insurance, Accounts. Each card clickable -> detail page
3. **Add (+)** — Quick Add action sheet
4. **Health** (`/health`) — Financial Safety Score (186 Days), Shock Test, Badges, Challenges. Share/Refresh/Notification in header
5. **Goals** (`/my-goals`) — Financial goals with progress tracking

## My Expenses Page (`/my-expenses`)
Tabbed interface: List | Daily | Weekly | Monthly
- All tabs use consistent light theme (matching List page colors)
- **List**: Month selector, summary card, expense breakdown by category, fixed/variable split, expense list
- **Daily**: Calendar heatmap with color-coded spend intensity, week stats, selected day detail, categories
- **Weekly**: Week summary, day-by-day horizontal bars, categories, 8-week trend chart, behavior insights
- **Monthly**: Summary card, expense breakdown (Essential/Lifestyle/Wealth Building), 6-month bar chart, spending insights, top categories, behavior insights, spending distribution

## Key API Endpoints
- `GET /api/dashboard/networth` — Net worth, income, expense summary
- `GET /api/expenses/monthly-summary?last=6` — 6-month expense aggregation
- `GET /api/expenses/weekly-summary?last=8` — Weekly expense data
- `GET /api/expenses/by-month?month=YYYY-MM` — Month-specific expenses
- `GET /api/expenses/behavior-insights` — Behavioral spending patterns
- `GET /api/income`, `/assets`, `/investments`, `/loans`, `/insurances`, `/accounts`, `/credit-cards`

## Completed Features (Latest)
- [Feb 28, 2026] Bug Fix: ProfileMenu avatar shows correct user initials on Health & Goals pages
- [Feb 28, 2026] Bug Fix: Removed visible scrollbar on Wealth page
- [Feb 28, 2026] Changed Daily/Weekly/Monthly expense tabs from dark navy to light theme matching List page
- Navigation overhaul: Home | Wealth | + | Health | Goals
- Wealth page redesign (portfolio-style list)
- Financial Health Score on Home & Health pages
- Standardized headers across all pages
- Back button consistency
- Mobile responsiveness fixes

## Prioritized Backlog
### P1: Cash Flow Engine - Phase 1 (Rolling Balance Engine)
### P1: Cash Flow Engine - Phase 4 (Negative Balance Handling UI)
### P2: Cash Flow Engine - Phase 3 (Cash Flow Timeline Engine)
### P2: Financial Command Center enhancements
### P2: Decision Impact Engine (financial simulation)

## Mocked: 2FA and Biometric Login toggles (UI only)

## 3rd Party: openpyxl, recharts, reportlab, @dnd-kit/core, Emergent Google Auth, OpenAI GPT-5.2, MongoDB Atlas
