# Moneyssutra - Personal Finance Tracker PRD

## Original Problem Statement
Build a comprehensive personal finance tracking application with multi-user workspace support, complete financial management features (income, expenses, assets, investments, loans, insurance, goals), and a modern, professional UI. Evolving into a Financial Control Operating System.

## Current Status
Core features + Financial Intelligence + Gamification (P0 complete). Backend modularized.

## Session 5 Work (Feb 24, 2026)

### Financial Intelligence Engine (DONE)
- **Survival Clock**: liquid funds / daily mandatory burn = survival days + level
- **Control Score**: 0-100 composite (Cash Control + Debt Pressure + Liquidity + Stability)
- **Behavior Alerts**: Overspending, Debt Risk, EMI Stress, Repeating Mistakes, Lifestyle Inflation, Survival warnings

### Gamification Engine P0 (DONE)
- XP System (7 earning rules), 6 Levels (Survival Mode → Money Master)
- 20 Achievements across 11 categories (survival, score, streak, debt, insurance, emergency, investment, goals, income, behavior, starter)
- Streak System with rewards at 4/8/12/24/52 weeks
- 6 Challenges with difficulty ratings, explainers, and leave/abandon option
- Level journey visualization (all 6 levels with progression dots)
- Max Badges Unlocked tracker ("Peak" counter)
- Survival warning banner when < 90 days
- "How to earn XP" toggle
- Weekly cron job (Sunday 23:59) for auto score recalculation
- Push notifications for level up, streak milestones, new achievements, weekly summary

### Backend Modularization (DONE - Session 4)
- server.py: 286 lines (from 7,022)
- 26 route modules under backend/routes/

## Architecture
```
/app/backend/routes/
├── intelligence.py    (Survival Clock, Control Score, Behavior Alerts)
├── gamification.py    (XP, Levels, Streaks, 20 Achievements, 6 Challenges)
├── [24 other modules]
/app/backend/scheduler.py  (Background tasks + weekly gamification cron)
/app/frontend/src/
├── Insights.js        (Intelligence dashboard - all widgets)
├── hooks/useIntelligenceData.js
```

## Test Credentials
- Username: test, Password: test

## Testing
- Iteration 58: 100% (36/36 backend - base refactoring)
- Iteration 59: 100% (16/16 backend + 9/9 frontend - initial intelligence)
- Iteration 60: 100% (18/18 backend + all frontend - P0 polish)

## Upcoming Tasks (P1 - Core Upgrades)
1. **Financial Runway Engine** - Interactive slider simulation (income/expense changes → survival recalculation)
2. **Financial Command Center** - Control/Pressure/Risk cockpit with trend arrows
3. **Money Pattern Recognition** - Personality labels ("High Earning, High Leakage")
4. **Financial Journey** - Stage progression (Survival → Freedom) with unlockable features
5. **Red Zone Mode** - Visual urgency theme when critical

## Future Tasks (P2 - Advanced Intelligence)
- Financial Shock Test (monthly simulated emergencies)
- Future You Score (12-month projection)
- Decision Impact Engine ("Buy X → survival drops Y days")
- Control Recovery Plan (auto-generated action steps)
- Feature Flag System, sync_source fields, 2FA, PWA
