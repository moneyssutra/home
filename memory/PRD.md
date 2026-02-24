# Moneyssutra - Personal Finance Tracker PRD

## Original Problem Statement
Full-stack personal finance manager (React/FastAPI/MongoDB) with a "Financial Control Operating System" on the Insights page.

## Core Architecture
- **Frontend**: React + Tailwind + Shadcn UI (port 3000)
- **Backend**: FastAPI (port 8001, prefixed /api)
- **Database**: MongoDB Atlas via MONGO_URL
- **Auth**: Session-based (session_token cookie)

## 20-Personality Classification Engine
### Input Variables (10)
survivalDays, controlScore, debtToIncomeRatio, savingsRate, discretionaryRatio, incomeGrowthRate, incomeVolatility, investmentRatio, incomeSourcesCount, alertCountMonthly

### Zones & Personalities
- **Survival (1-4)**: Firefighter, Drifter, EMI Trapped, Lifestyle Inflator
- **Stabilizing (5-8)**: Recovering Planner, Buffer Builder, Expense Controller, Debt Warrior
- **Control (9-12)**: Structured Controller, Stability Seeker, Silent Saver, Score Climber
- **Growth (13-16)**: Wealth Builder, Diversifier, Income Multiplier, Strategic Planner
- **Advanced (17-20)**: Capital Guardian, Risk Balancer, Financial Architect, Sovereign

### Classification Rules
- Evaluated highest-level first (20→1)
- Confidence = matched_conditions / total_conditions × 100
- Requires 70%+ confidence, else falls to best partial match
- Stores primary + secondary personality in user_personality collection

## Insights Page Widget Order
1. Financial Journey (Wealth Builder + 20 stages + info icon)
2. Financial Score (4 pillars, rolling 3-month window)
3. Emergency Runway (3-tier liquidity + fund names)
4. Shock Test (4 emergency scenarios)
5. Runway Simulator (what-if sliders)
6. Money Personality (20-type engine with zone, confidence, secondary)
7. Badges (100 badges, 8 categories, 4 tiers)
8. Challenges
9. Explore (Analytics, Reports)

## Key API Endpoints
- GET /api/intelligence/money-pattern — 20-personality classification engine
- POST /api/intelligence/shock-test — Shock simulation
- GET /api/intelligence/survival-clock — Stages, funds, survival days
- GET /api/intelligence/control-score — Financial Score with period
- GET /api/financial-health — Health score with contributions
- GET /api/gamification/profile — 100 badges, XP, levels

## Prioritized Backlog
### P1
- Financial Command Center (Control/Pressure/Risk cockpit)
- "Future You" Score (12-month projection)
- Decision Impact Engine (large purchase impact)

### P2
- Red Zone Mode, Weekly Health Digest, Custom shock scenarios
- Monthly cron for personality re-evaluation
- Personality history timeline

## Test Credentials
- Username: `test`, Password: `test`
