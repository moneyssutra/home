# Moneyssutra - Personal Finance Tracker PRD

## Original Problem Statement
Full-stack personal finance manager (React/FastAPI/MongoDB) with a "Financial Control Operating System" on the Insights page. Features include survival clock, financial score, gamification engine (100 badges, 20 stages), money pattern recognition, emergency runway, shareable score cards, financial journey, and shock test.

## Core Architecture
- **Frontend**: React + Tailwind + Shadcn UI (port 3000)
- **Backend**: FastAPI (port 8001, prefixed /api)
- **Database**: MongoDB Atlas via MONGO_URL
- **Auth**: Session-based (session_token cookie)
- **3rd Party**: OpenAI GPT-5.2 (emergentintegrations), Resend, html2canvas, reportlab

## What's Been Implemented

### Feb 24, 2026 Session (Latest)
- **Financial Journey Widget**: 5-phase progression (Survival→Stability→Control→Growth→Freedom) with vertical timeline, checkmarks, NOW badge
- **Financial Shock Test**: 4 scenarios (Job Loss, Medical ₹5L, Repair ₹2L, EMI Hike 20%). POST /api/intelligence/shock-test endpoint. Shows before/after survival days, severity, tip
- **Financial Score reordered**: Moved directly under Wealth Builder widget, removed sum/pts breakdown
- **Financial Health Contributions**: Each module card shows score/max badge (e.g., 8.8/17.5). Debt to Asset added (10% weight). Removed verbose breakdown section
- **Financial Score Period**: Rolling 3-month window display
- **XP Rules Bug Fix**: Fixed invisible labels + double text
- **Badge Icons in Notifications**: Trophy/Star/Flame per type
- **Stage Journey Redesign**: All 20 levels + info icon with scrollable detail
- **Fund Breakdown Detail**: Individual asset names in Semi-Liquid & Illiquid
- **Stage Explanation**: Kid-friendly one-liners
- **ObjectId Fix**: _unlock_achievement

## Key API Endpoints
- POST /api/intelligence/shock-test — Shock simulation (scenarioId in body)
- GET /api/intelligence/shock-scenarios — Available scenarios
- GET /api/intelligence/survival-clock — Stages, funds, survival days
- GET /api/intelligence/control-score — Financial Score with period
- GET /api/intelligence/money-pattern — Spending personality
- GET /api/financial-health — Health score with contributions
- GET /api/gamification/profile — 100 badges, XP, levels
- POST /api/gamification/process — Weekly XP processing

## Financial Health Weights
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

## Insights Page Widget Order
1. Survival Warning
2. Level & Stages (Wealth Builder)
3. Financial Score
4. Emergency Runway
5. Runway Simulator
6. Money Pattern
7. Badges
8. Challenges
9. Financial Journey
10. Shock Test
11. Explore (Analytics, Reports)

## Prioritized Backlog

### P1 - Upcoming
- Financial Command Center (Control/Pressure/Risk cockpit with trend arrows)
- "Future You" Score (12-month projection)
- Decision Impact Engine (large purchase impact)

### P2 - Future
- Red Zone Mode (urgency theme for critical metrics)
- Weekly Health Digest notification
- Custom shock scenarios (user-defined amounts)

### Refactoring
- Break Insights.js (700+ lines) into smaller components
- Simplify state management in useData hook

## Test Credentials
- Username: `test`, Password: `test`
- Email: `test@moneyssutra.com`

## Mocked Features
- 2FA and Biometric Login toggles (UI only, non-functional)
