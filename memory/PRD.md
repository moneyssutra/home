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

## Expense Intelligence System (NEW - Feb 28, 2026)
Premium dark navy glassmorphism UI with 4 routed pages:

### Routes
- `/wealth/expenses/overview` — Monthly summary, expense breakdown, top categories, insights, smart action CTA
- `/wealth/expenses/daily` — Calendar heatmap, Expenses/Income/EMIs sub-tabs, click-to-drill daily breakdown
- `/wealth/expenses/weekly` — Weekly bar chart (Mon-Sun), week selector, week comparison bars, categories
- `/wealth/expenses/monthly` — 6-month stacked bar chart (Essential/Lifestyle/Wealth), trend insights, behavior patterns, long-term suggestions

### Design System
- Background: `#0B1220` to `#0F1B2D` gradient
- Cards: Glassmorphism (rgba backdrop-filter blur + subtle border)
- Colors: Essential (#3B82F6), Lifestyle (#F59E0B), Wealth (#10B981), Accent (#6366F1)
- All data dynamically computed from backend APIs

### Files
- `src/pages/expenses/ExpenseLayout.js` — Shared header + tab navigation
- `src/pages/expenses/ExpenseOverview.js` — Overview page
- `src/pages/expenses/ExpenseDaily.js` — Daily/Calendar page
- `src/pages/expenses/ExpenseWeeklyView.js` — Weekly bar chart page
- `src/pages/expenses/ExpenseMonthlyView.js` — Monthly comparison page

## Key Pages & Features
- **Family Tracking**: Family groups, member summaries, dashboard toggle
- **Excel Import/Export**: Bulk data management

## Key API Endpoints
- `GET /api/dashboard/networth` — Net worth, income, expense summary
- `GET /api/expenses/monthly-summary?last=6` — 6-month expense aggregation with Essential/Lifestyle/Wealth breakdown
- `GET /api/expenses/weekly-summary?last=8` — Weekly expense data with by-day breakdown
- `GET /api/expenses/by-month?month=YYYY-MM` — Month-specific expenses with payment status
- `GET /api/expenses/behavior-insights` — Behavioral spending pattern analysis
- `GET /api/income`, `/assets`, `/investments`, `/loans`, `/insurances`, `/accounts`, `/credit-cards`

## Completed Features (Latest)
- [Feb 28, 2026] Bug Fix: ProfileMenu avatar shows correct user initials on Health & Goals pages
- [Feb 28, 2026] Bug Fix: Removed visible scrollbar on Wealth page
- [Feb 28, 2026] Feature: Premium Expense Intelligence System (4 pages) with dark navy glassmorphism UI
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
