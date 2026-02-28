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
- **Premium Dark Navy UI Redesign** (Feb 28) — Redesigned Weekly and Monthly views with warm heatmap colors (teal→cyan→amber→orange), gradient progress bars, color-coded category tags, and premium dark navy theme matching user reference images
- **Behavior Connection Insights** (Feb 28) — Cross-analysis of spending patterns in Monthly view: weekend vs weekday spending, salary week spike detection, spending distribution bars, recurring category tags, category growth trends, income coverage ratio
- **Multi-Level Expense Intelligence** (Feb 28) — 4-view system (List/Daily/Weekly/Monthly) with premium dark theme, calendar heatmap, weekly trends, monthly summary charts
- **Backend Performance Fix** (Feb 28) — Optimized /api/expenses/by-month from >8s to ~1.5s via MongoDB indexes
- **Excel Import/Export** (Feb 27) — Download sample template with 9 sheets, upload filled Excel to bulk import data
- **Family Financial Tracking** (Feb 27) — Create family groups, add/remove members, invite code, combined/individual financial summaries, dashboard family toggle
- **Settings Quick Actions** (Feb 27) — Import from Excel & Family Hub accessible from Settings page
- **Family Toggle in Dashboard** (Feb 27) — Switch between Personal and family member views; member view shows summary card
- **Comprehensive Data Seeding** (Feb 27) — All types seeded via API
- **Investment Form Restructure** (Feb 27) — SIP after name, principal=0 allowed
- **Expense Calendar** (Feb 27) — Calendar grid at /expense-calendar with due date plotting
- **NPS/PPF SIP Fix** (Feb 27) — repair-expenses endpoint for orphaned investments
- **Notification Dismiss Fix** (Feb 27) — X button + improved mobile swipe
- **Insights Module Restructure** (Feb 27) — Progressive lock/unlock, Badges/Challenges always open
- **Undo Mark Paid/Prepay** (Feb 27) — Undo buttons on paid/prepaid expense cards
- **Prepayment System** (Feb 27) — 5 endpoints: by-month, mark-paid, prepay, unmark-paid, undo-prepay

## Design System — Dark Navy Theme
- Background: `#060D1B`
- Card: `#0C1829`, Alt: `#0F1D32`
- Warm spectrum: Teal `#2DD4BF`, Cyan `#22D3EE`, Amber `#F59E0B`, Orange `#FB923C`, Gold `#FBBF24`
- Category colors: Blue `#3B82F6` (Essential), Orange `#F97316` (Lifestyle), Green `#34D399` (Wealth)
- Text: Primary `#E8EDF5`, Secondary `#8B9DC3`, Muted `#546A8D`

## Key API Endpoints
- `GET /api/expenses/behavior-insights` — Cross-analysis behavioral spending insights
- `GET /api/expenses/monthly-summary` — Aggregated expense data per month
- `GET /api/expenses/weekly-summary` — Aggregated expense data per week
- `GET /api/expenses/by-month` — Expenses filtered by YYYY-MM
- `GET /api/data/sample-excel` — Downloads blank Excel template
- `POST /api/data/import-excel` — Uploads and processes filled Excel

## Prioritized Backlog
### P0: None currently
### P1: Cash Flow Engine Phase 1 (Rolling Balance), Phase 4 (Negative Balance)
### P2: Cash Flow Timeline, Financial Command Center, Decision Impact Engine, Insights refactor, Security Settings, File cleanup

## Mocked Features
- Two-Factor Authentication and Biometric Login toggles in Security Settings (UI only)

## 3rd Party Integrations
- openpyxl (Excel), apscheduler, recharts, reportlab, @dnd-kit/core, Emergent Google Auth, OpenAI GPT-5.2 (emergentintegrations), MongoDB Atlas
