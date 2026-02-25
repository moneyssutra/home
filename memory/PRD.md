# Moneyssutra - Personal Finance Tracker PRD

## Original Problem Statement
Full-stack personal finance manager with "Financial Control Operating System" on Insights page.

## Core Architecture
- React + Tailwind + Shadcn UI (port 3000) / FastAPI (port 8001, /api) / MongoDB Atlas

## Key Features Implemented
- 20-Personality Classification Engine (10 input variables, 5 zones, confidence scoring)
- Financial Journey (20 stages, 5 phases, info icon with full list)
- Financial Score (4 pillars, rolling 3-month window, pillar contributions)
- Emergency Runway (3-tier liquidity, individual fund names)
- Shock Test (4 presets + custom amount input)
- Future You (12-month projection with mini chart)
- Red Zone Mode (pulsing alert when survival < 30 days) + Full Dark Theme Override
- Weekly Health Digest (weekly snapshot comparison notifications)
- Personality Evolution Tracker (line chart via recharts + monthly history)
- 100 Badges (8 categories, 4 tiers, scrollable)
- Gamification Challenges (join/leave)
- Financial Health (9-module weighted score with per-module contributions)
- Shareable Score Card, Runway Simulator, Money Pattern with DNA bar
- Cron Jobs: weekly health digest (Sundays) + monthly personality evaluation (1st of month)
- Google Auth: auto-creates profile + redirects new users to complete profile (DOB, phone, etc.)
- Reports: PDF + Excel for income, expense, cashflow, networth, investment, loan, goal, asset, insurance

## Recent Changes (Feb 25, 2026)
- Fixed reports: income/cashflow PDF+Excel now include `other_income` collection (Qnet, etc.)
- Fixed PDF font: installed DejaVu fonts for ₹ symbol rendering in PDF reports
- Fixed income page "Received" amount visibility (green on green → white on green)
- Fixed liquidity classification: FD/RD checked before bank-name regex
- Added cron jobs to scheduler.py for weekly digest and monthly personality eval
- Upgraded PersonalityEvolutionWidget to recharts LineChart
- Implemented Red Zone dark theme override
- Google Auth: auto-creates profile doc for new users, redirects to /settings/profile

## Key API Endpoints
- GET /api/reports/generate/{report_type}?format=pdf|excel — Report generation
- GET /api/intelligence/future-you — 12-month projection
- GET /api/intelligence/personality-history — Evolution timeline
- POST /api/intelligence/weekly-digest — Weekly snapshot + notification
- POST /api/intelligence/shock-test — Supports customAmount field
- GET /api/intelligence/money-pattern — 20-personality engine
- GET /api/intelligence/survival-clock — Stages + allStages
- GET /api/intelligence/control-score — Score + scorePeriod
- GET /api/financial-health — 9 modules + contributions
- GET /api/income/list/summary — Income sources summary
- GET /api/other-income — Other income sources
- POST /api/auth/google/session — Google auth + auto-profile creation

## Prioritized Backlog
### P1
- Financial Command Center (Control/Pressure/Risk cockpit)
- Decision Impact Engine (large purchase impact)

### P2
- Goal Tracker integration with Future You
- Refactor Insights.js into smaller component files

## Test Credentials
- Username: `test`, Password: `test`

## Test Reports
- Latest: /app/test_reports/iteration_64.json (100% pass rate)
