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

## Implemented Features (Latest First)
- **Major Expense Views Redesign** (Feb 28) — Deep navy theme (#0E1421), auto-select today in Daily, category breakdowns in Daily/Weekly, clickable boxes in Monthly, mobile responsive (430px), month pill syncing with chart, matching reference images
- **Chart Fixes** (Feb 28) — Fixed tooltip visibility, removed rectangular focus box on chart click
- **Back Button + Turquoise Header** (Feb 28) — Smart back button (view→list→home), turquoise gradient header
- **Behavior Connection Insights** (Feb 28) — Cross-analysis in Monthly: weekend/weekday, salary week, categories
- **Multi-Level Expense Intelligence** (Feb 28) — 4-view system (List/Daily/Weekly/Monthly)
- **Backend Performance Fix** (Feb 28) — /api/expenses/by-month optimized from >8s to ~1.5s
- **Excel Import/Export** (Feb 27) — Bulk import/export via Excel
- **Family Financial Tracking** (Feb 27) — Family groups, members, combined summaries
- **Prepayment System** (Feb 27) — Mark-paid, prepay, undo

## Design System — Deep Navy Theme
- Background: `#0E1421`
- Card: `#1A2332`, Highlight: `#222D3F`
- Essential Blue: `#3B82F6`, Lifestyle Orange: `#F97316`, Wealth Green: `#22C55E`
- Text: White `#FFFFFF`, Primary `#E2E8F0`, Secondary `#94A3B8`, Muted `#64748B`
- Header: Turquoise gradient `#0D9488→#14B8A6→#06B6D4`
- Accents: Teal `#2DD4BF`, Cyan `#06B6D4`, Amber `#F59E0B`, Gold `#FBBF24`

## Key API Endpoints
- `GET /api/expenses/behavior-insights` — Behavioral spending insights
- `GET /api/expenses/monthly-summary` — Aggregated per month
- `GET /api/expenses/weekly-summary` — Aggregated per week
- `GET /api/expenses/by-month` — Expenses filtered by YYYY-MM

## Prioritized Backlog
### P0: None
### P1: Cash Flow Engine Phase 1 (Rolling Balance), Phase 4 (Negative Balance)
### P2: Cash Flow Timeline, Financial Command Center, Decision Impact Engine

## Mocked Features
- Two-Factor Authentication and Biometric Login toggles in Security Settings (UI only)

## 3rd Party Integrations
- openpyxl, apscheduler, recharts, reportlab, @dnd-kit/core, Emergent Google Auth, OpenAI GPT-5.2 (emergentintegrations), MongoDB Atlas
