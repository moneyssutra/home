# Moneyssutra - Personal Finance Tracker PRD

## Original Problem Statement
Full-stack personal finance manager (React/FastAPI/MongoDB) with a "Financial Control Operating System" on the Insights page. Features include survival clock, financial score, gamification engine (100 badges, 20 stages), money pattern recognition, emergency runway, shareable score cards, shock test.

## Core Architecture
- **Frontend**: React + Tailwind + Shadcn UI (port 3000)
- **Backend**: FastAPI (port 8001, prefixed /api)
- **Database**: MongoDB Atlas via MONGO_URL
- **Auth**: Session-based (session_token cookie)
- **3rd Party**: OpenAI GPT-5.2 (emergentintegrations), Resend, html2canvas, reportlab

## Insights Page Widget Order
1. Financial Journey (Wealth Builder + 20 stages + info icon)
2. Financial Score (4 pillars, rolling 3-month window)
3. Emergency Runway (3-tier liquidity + fund names)
4. Shock Test (4 emergency scenarios)
5. Runway Simulator (what-if sliders)
6. Money Pattern (spending personality)
7. Badges (100 badges, 8 categories, 4 tiers)
8. Challenges
9. Explore (Analytics, Reports)

## Financial Health Weights (9 modules)
| Module | Weight |
|--------|--------|
| Emergency Fund | 17.5% |
| Life Insurance | 7.5% |
| Health Insurance | 7.5% |
| Savings Rate | 12.5% |
| Loan Burden | 12.5% |
| Credit Utilization | 10% |
| Investment Allocation | 12.5% |
| Retirement Readiness | 10% |
| Debt to Asset | 10% |

## Key API Endpoints
- POST /api/intelligence/shock-test — Shock simulation
- GET /api/intelligence/survival-clock — Stages, funds, survival days (allStages array)
- GET /api/intelligence/control-score — Financial Score with scorePeriod
- GET /api/intelligence/money-pattern — Spending personality
- GET /api/financial-health — Health score with contributions + maxContribution
- GET /api/gamification/profile — 100 badges, XP, levels, xpRules
- POST /api/gamification/process — Weekly XP processing (badgeIcon in notifications)

## What's Been Implemented (Feb 24, 2026)
- Financial Journey heading with rocket icon on top widget
- Shock Test: 4 scenarios (Job Loss, Medical, Repair, EMI Hike) with severity
- Financial Health: per-module contribution badges (score/max), Debt to Asset added
- Financial Score: rolling 3-month period display
- XP rules fix: invisible labels + double text bug
- Badge icons in notifications: Trophy/Star/Flame per type
- All 20 stages with info icon + kid-friendly explanations
- Fund breakdown with individual asset names in Semi-Liquid & Illiquid
- ObjectId serialization fix in gamification process
- Widget reordering: Score under Wealth Builder, Shock Test above Simulator

## Prioritized Backlog
### P1
- Financial Command Center (Control/Pressure/Risk cockpit with trend arrows)
- "Future You" Score (12-month projection)
- Decision Impact Engine (large purchase impact)

### P2
- Red Zone Mode (urgency theme for critical metrics)
- Weekly Health Digest notification
- Custom shock scenarios (user-defined amounts)
- Refactor Insights.js into smaller components

## Test Credentials
- Username: `test`, Password: `test`

## Mocked Features
- 2FA and Biometric Login toggles (UI only)
