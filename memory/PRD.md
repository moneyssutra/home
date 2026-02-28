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
2. **Wealth** (`/wealth`) — Simple list: Income, Expenses, Assets, Investments, Loans, Credit Cards, Insurance, Accounts. Each card clickable → detail page
3. **Add (+)** — Quick Add action sheet
4. **Health** (`/health`) — Financial Safety Score (186 Days), Shock Test, Badges, Challenges. Share/Refresh/Notification in header
5. **Goals** (`/my-goals`) — Financial goals with progress tracking

## Key Pages & Features
- **Expense Intelligence** (`/my-expenses`): 4-view system (List/Daily/Weekly/Monthly) with deep navy theme
- **Daily**: Auto-selects today, category breakdown, heatmap calendar
- **Weekly**: Day breakdown, categories, 8-week trend
- **Monthly**: Essential/Lifestyle/Wealth breakdown, behavior insights, spending distribution, month selector
- **Family Tracking**: Family groups, member summaries, dashboard toggle
- **Excel Import/Export**: Bulk data management

## Design Systems
### Deep Navy (Expense Views): bg `#0E1421`, card `#1A2332`
### App Theme: Green gradient `#0D9488→#047857`, Turquoise header `#0D9488→#06B6D4`

## Key API Endpoints
- `GET /api/dashboard/networth` — Net worth, income, expense summary
- `GET /api/expenses/behavior-insights` — Behavioral spending insights
- `GET /api/expenses/monthly-summary`, `/weekly-summary`, `/by-month`
- `GET /api/income`, `/assets`, `/investments`, `/loans`, `/insurances`, `/accounts`, `/credit-cards`

## Prioritized Backlog
### P1: Wealth page enhancements (Net Worth trend), Health (Risk Exposure, Spending Drift), Cash Flow Engine
### P2: Cash Flow Timeline, Financial Command Center, Decision Impact Engine, Goal-Wealth-Health integration

## Mocked: 2FA and Biometric Login toggles (UI only)

## 3rd Party: openpyxl, recharts, reportlab, @dnd-kit/core, Emergent Google Auth, OpenAI GPT-5.2, MongoDB Atlas
