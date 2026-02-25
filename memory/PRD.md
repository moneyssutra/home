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

## Recent Changes (Feb 25, 2026)
- Fixed income page "Received" amount visibility (color contrast: green on green → white on green)
- Fixed liquidity classification: FD/RD checked before bank-name regex (ICICI FD → semi_liquid)
- Added cron jobs to scheduler.py for weekly digest and monthly personality eval
- Upgraded PersonalityEvolutionWidget to recharts LineChart
- Implemented Red Zone dark theme override (CSS variables swap when survivalDays < 30)
- Google Auth: auto-creates profile doc in profiles collection for new users
- New Google users redirected to /settings/profile with "Complete Your Profile" banner

## Insights Page Widget Order
1. Red Zone Alert (conditional, with dark theme)
2. Financial Journey (Wealth Builder + 20 stages)
3. Financial Score (4 pillars)
4. Emergency Runway (fund names)
5. Shock Test (4 presets + custom)
6. Runway Simulator
7. Money Personality (20-type engine)
8. Badges (100)
9. Challenges
10. Future You (12-month projection)
11. Personality Evolution (line chart + history)
12. Explore (Analytics, Reports)

## Key API Endpoints
- GET /api/intelligence/future-you — 12-month projection
- GET /api/intelligence/personality-history — Evolution timeline
- POST /api/intelligence/weekly-digest — Weekly snapshot + notification
- POST /api/intelligence/shock-test — Supports customAmount field
- GET /api/intelligence/money-pattern — 20-personality engine
- GET /api/intelligence/survival-clock — Stages + allStages
- GET /api/intelligence/control-score — Score + scorePeriod
- GET /api/financial-health — 9 modules + contributions
- GET /api/income/list/summary — Income sources summary
- POST /api/auth/google/session — Google auth + auto-profile creation
- GET /api/basic-profile — Profile data
- PUT /api/basic-profile — Update profile

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
