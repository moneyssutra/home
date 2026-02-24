# Moneyssutra - Personal Finance Tracker PRD

## Original Problem Statement
Full-stack personal finance manager (React/FastAPI/MongoDB) with a "Financial Control Operating System" on the Insights page. Features include survival clock, financial score, gamification engine (100 badges, 20 stages), money pattern recognition, emergency runway, and shareable score cards.

## Core Architecture
- **Frontend**: React + Tailwind + Shadcn UI (port 3000)
- **Backend**: FastAPI (port 8001, prefixed /api)
- **Database**: MongoDB Atlas via MONGO_URL
- **Auth**: Session-based (session_token cookie)
- **3rd Party**: OpenAI GPT-5.2 (emergentintegrations), Resend, html2canvas, reportlab

## What's Been Implemented

### Feb 24, 2026 Session
- **Financial Health Contributions**: Each module card shows score/max badge (e.g., 8.8/17.5). Debt to Asset Ratio added to scoring (10% weight). Removed "HOW YOUR SCORE ADDS UP" verbose section.
- **Financial Score Period**: Shows "Rolling 3-month window: start — end" based on 3-month data window
- **XP Rules Bug Fix**: Fixed invisible labels (was "None" due to action vs rule key mismatch) and double text ("++20 XP XP" → "+20 XP")
- **Badge Icons in Notifications**: Trophy for badge unlocks, Star for level-ups, Flame for streaks. Backend stores badgeIcon field in notifications.
- **Stage Journey Redesign**: All 20 levels shown in visual bar + info (i) icon expands scrollable detail list with checkmarks/locks/YOU badge
- **Fund Breakdown Detail**: Semi-Liquid & Illiquid sections show individual asset names with amounts
- **Stage Explanation**: Kid-friendly one-liner under each stage name (STAGE_EXPLAIN mapping)
- **ObjectId Fix**: Fixed _unlock_achievement to remove _id after MongoDB insert

### Previous Sessions
- Shareable Financial Score Card (html2canvas)
- Financial Runway Simulator (what-if sliders)
- Money Pattern Recognition endpoint
- 100-badge gamification system (8 categories, 4 tiers)
- 20 survival stages (5 phases: Critical/Stabilizing/Control/Growth/Power)
- 3-tier liquidity classification (Liquid 100%, Semi-Liquid 60%, Illiquid 0%)
- Backend modularization (routes split from monolithic server.py)
- Emergency Runway widget, Control Score widget
- Google Auth integration, Push notifications

## Key Files
- `backend/routes/intelligence.py` — survival-clock, control-score, money-pattern, runway-simulator
- `backend/routes/gamification.py` — 100 badges, XP, levels, challenges
- `backend/routes/financial_health.py` — 9-module health score with weighted contributions
- `frontend/src/Insights.js` — Main insights dashboard (all widgets)
- `frontend/src/components/FinancialHealth.js` — Health score with per-module contribution badges
- `frontend/src/components/NotificationBell.js` — Badge-specific notification icons

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

## Prioritized Backlog

### P1 - Upcoming
- Financial Command Center (Control/Pressure/Risk cockpit with trend arrows)
- Financial Journey (multi-stage progression: Survival → Freedom)
- Financial Shock Test (monthly simulated emergencies)

### P2 - Future
- "Future You" Score (12-month projection)
- Decision Impact Engine (large purchase impact)
- Red Zone Mode (urgency theme for critical metrics)
- Weekly Health Digest notification

### Refactoring
- Break Insights.js (600+ lines) into smaller components
- Simplify state management in useData hook

## Test Credentials
- Username: `test`, Password: `test`
- Email: `test@moneyssutra.com`

## Mocked Features
- 2FA and Biometric Login toggles (UI only, non-functional)
