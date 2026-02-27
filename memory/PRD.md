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

## Current Data State (Seeded Feb 27, 2026)
- 8 income sources, 44 expenses, 16 investments, 11 assets, 9 loans, 4 credit cards, 9 insurances, 4 accounts, 5 goals
- Net Worth: ~₹1.49 Cr | Monthly Income: ~₹2.73L | Survival Days: 186

## Implemented Features (Latest First)
- **Comprehensive Data Seeding** (Feb 27) — All types seeded via API
- **Investment Form Restructure** (Feb 27) — SIP after name, principal=0 allowed
- **Expense Calendar** (Feb 27) — Calendar grid at /expense-calendar with due date plotting
- **NPS/PPF SIP Fix** (Feb 27) — repair-expenses endpoint for orphaned investments
- **Notification Dismiss Fix** (Feb 27) — X button + improved mobile swipe
- **Insights Module Restructure** (Feb 27) — Progressive lock/unlock, Badges/Challenges always open
- **Undo Mark Paid/Prepay** (Feb 27) — Undo buttons on paid/prepaid expense cards
- **Prepayment System** (Feb 27) — 5 endpoints: by-month, mark-paid, prepay, unmark-paid, undo-prepay

## Prioritized Backlog
### P0: Cash Flow Engine Phase 1 (Rolling Balance), Phase 4 (Negative Balance)
### P1: Cash Flow Timeline, Financial Command Center, Decision Impact Engine
### P2: Insights refactor, Security Settings, File cleanup
