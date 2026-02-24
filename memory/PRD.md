# Moneyssutra - Personal Finance Tracker PRD

## Original Problem Statement
Build a comprehensive personal finance tracking application with multi-user workspace support, complete financial management features (income, expenses, assets, investments, loans, insurance, goals), and a modern, professional UI.

## Current Status
All core features + Financial Intelligence + Gamification implemented. Backend fully modularized.

## Latest Session Work (Feb 24, 2026 - Session 5)

### Financial Intelligence Engine (DONE)
1. **Financial Survival Clock** - Calculates how many days user can survive without income
   - API: `GET /api/intelligence/survival-clock`
   - Returns: liquidFunds, monthlyMandatoryExpense, dailyBurnRate, survivalDays, level
   - Levels: CRITICAL (0-30), VULNERABLE (31-90), STABLE (91-180), SECURE (181-365), FINANCIAL WARRIOR (365+)

2. **Financial Control Score Engine** - Weekly composite score 0-100
   - API: `GET /api/intelligence/control-score`
   - Components: Cash Control (25%), Debt Pressure (25%), Liquidity (25%), Stability (25%)
   - Grades: A (85+), B (70-84), C (55-69), D (40-54), E (<40)

3. **Behavioral Intelligence Engine** - Smart financial alerts
   - API: `GET /api/intelligence/behavior-alerts`
   - Alerts: Overspending, Debt Risk, EMI Stress, Repeating Mistakes, Lifestyle Inflation, Survival warnings

### Gamification Engine (DONE)
- XP System with weekly earning (score bonus, survival increase, debt reduction, clean alerts)
- 6 Levels: Survival Mode → Stabilizing → In Control → Wealth Builder → Financial Commander → Money Master
- Streak System: Consecutive weeks with score ≥ 70 and no high-risk alerts
- 12 Achievements: Survival milestones, score milestones, streak milestones, debt reduction
- Challenge Mode: 4 challenge types (Survival Boost, Debt Sprint, No Inflation, Score Climber)
- Share Card API for social sharing
- APIs: profile, process, challenges, join, share-card, leaderboard

### Frontend Insights Page (DONE)
- Gamification profile widget (level, XP bar, streak, stats)
- Survival Clock widget (circular gauge, level badge, metrics)
- Control Score widget (score circle, grade, 4 breakdown bars)
- Behavior Alerts widget (severity-colored cards with icons)
- Achievements grid (unlocked/locked with icons)
- Challenges widget (active progress, available with Join buttons)
- Navigation cards to Analytics and Reports

### Backend Modularization (DONE - Session 4)
- Reduced `server.py` from 7,022 → 282 lines (96% reduction)
- Created `scheduler.py` for background tasks
- 26 route modules under `backend/routes/`

## Architecture
```
/app/backend/
├── server.py              (286 lines - app setup, CORS, router includes, lifecycle)
├── scheduler.py           (314 lines - background tasks)
├── database.py            (MongoDB connection)
├── server_models.py       (716 lines - all Pydantic models)
├── routes/
│   ├── intelligence.py    (NEW - Survival Clock, Control Score, Behavior Alerts)
│   ├── gamification.py    (NEW - XP, Levels, Streaks, Achievements, Challenges)
│   └── [24 other route modules]
/app/frontend/src/
├── Insights.js            (REWRITTEN - Intelligence dashboard)
├── hooks/useIntelligenceData.js (NEW - data fetching hook)
```

## New MongoDB Collections
- `alerts` - Financial behavior alerts
- `user_gamification_profile` - XP, level, streak, scores
- `user_achievements` - Unlocked achievement badges
- `user_challenges` - Active/completed challenges
- `user_financial_snapshots` - Weekly financial snapshots for trend tracking

## Test Credentials
- Username: test, Password: test

## Testing
- Iteration 58: 100% (36/36 backend endpoints - base refactoring)
- Iteration 59: 100% (16/16 backend + 9/9 frontend - intelligence & gamification)

## Upcoming Tasks (Priority Order)
- P1: Weekly cron job (Sunday) for auto score recalculation
- P1: Push notification integration for gamification events (level up, streak, challenges)
- P1: Feature Flag System
- P1: Add `sync_source` fields for Smart Sync prep
- P2: Full 2FA Implementation (MOCKED UI toggles)
- P2: PWA features
- P3: Mobile OTP/PIN login, Loan amortization, Smart Sync

## 3rd Party Integrations
- OpenAI GPT-5.2 (via emergentintegrations), MongoDB Atlas, Resend, Recharts, reportlab, FPDF, pywebpush, apscheduler, Emergent Google Auth
