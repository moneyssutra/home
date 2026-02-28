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
- **Back Button Fix + Turquoise Theme** (Feb 28) — Back button now switches to List view first from Daily/Weekly/Monthly views before navigating home. All expense pages use consistent turquoise gradient (`#0D9488 → #14B8A6 → #06B6D4`) and turquoise dark theme tokens
- **Premium Dark Navy UI Redesign** (Feb 28) → Updated to **Turquoise Dark Theme** — Redesigned Weekly and Monthly views with warm heatmap colors (teal→turquoise→amber), gradient progress bars, color-coded category tags
- **Behavior Connection Insights** (Feb 28) — Cross-analysis of spending patterns in Monthly view: weekend vs weekday spending, salary week spike detection, spending distribution bars, recurring category tags
- **Multi-Level Expense Intelligence** (Feb 28) — 4-view system (List/Daily/Weekly/Monthly) with premium dark theme, calendar heatmap, weekly trends, monthly summary charts
- **Backend Performance Fix** (Feb 28) — Optimized /api/expenses/by-month from >8s to ~1.5s via MongoDB indexes
- **Excel Import/Export** (Feb 27) — Download sample template with 9 sheets, upload filled Excel
- **Family Financial Tracking** (Feb 27) — Family groups, members, invite codes, combined summaries, dashboard toggle
- **Settings Quick Actions** (Feb 27) — Import from Excel & Family Hub from Settings
- **Expense Calendar** (Feb 27) — Calendar grid at /expense-calendar with due date plotting
- **Prepayment System** (Feb 27) — Mark-paid, prepay, undo functionality

## Design System — Turquoise Dark Theme
- Header gradient: `linear-gradient(135deg, #0D9488 0%, #14B8A6 40%, #06B6D4 100%)`
- Background: `#041418`
- Card: `#0A1F24`, Alt: `#0D2A30`
- Warm spectrum: Teal `#2DD4BF`, Cyan `#14B8A6`, Amber `#F59E0B`, Orange `#FB923C`, Gold `#FBBF24`
- Category colors: Blue `#06B6D4` (Essential), Orange `#F97316` (Lifestyle), Green `#34D399` (Wealth)
- Text: Primary `#E8F5F2`, Secondary `#8BC4B8`, Muted `#547D73`

## Key API Endpoints
- `GET /api/expenses/behavior-insights` — Behavioral spending insights
- `GET /api/expenses/monthly-summary` — Aggregated per month
- `GET /api/expenses/weekly-summary` — Aggregated per week
- `GET /api/expenses/by-month` — Expenses filtered by YYYY-MM

## Prioritized Backlog
### P0: None currently
### P1: Cash Flow Engine Phase 1 (Rolling Balance), Phase 4 (Negative Balance)
### P2: Cash Flow Timeline, Financial Command Center, Decision Impact Engine

## Mocked Features
- Two-Factor Authentication and Biometric Login toggles in Security Settings (UI only)

## 3rd Party Integrations
- openpyxl, apscheduler, recharts, reportlab, @dnd-kit/core, Emergent Google Auth, OpenAI GPT-5.2 (emergentintegrations), MongoDB Atlas
