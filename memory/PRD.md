# Moneyssutra - Personal Finance Tracker PRD

## Original Problem Statement
Build a comprehensive personal finance tracking application with multi-user workspace support, complete financial management features (income, expenses, assets, investments, loans, insurance, goals), and a modern, professional UI. Evolving into a Financial Control Operating System.

## Current Status
Core features + Financial Intelligence + Gamification (P0 complete, clarity improvements verified). Backend modularized.

## Session 5 Work (Feb 24, 2026)

### Financial Intelligence Engine (DONE)
- **Emergency Runway (Survival Clock)**: liquid funds / daily mandatory burn = survival days + level
- **Financial Score (Control Score)**: 0-100 composite (Savings Rate + EMI Load + Safety Buffer + Income Consistency)
- **Smart Alerts (Behavior Alerts)**: Overspending, Debt Risk, EMI Stress, Repeating Mistakes, Lifestyle Inflation, Survival warnings

### Gamification Engine P0 (DONE)
- XP System (7 earning rules), **20 Levels** (Getting Started → Financial Freedom)
- 24 gender-friendly achievements/badges across 11 categories
- Streak System with rewards at 4/8/12/24/52 weeks
- 6 Challenges with difficulty ratings (Easy/Medium/Hard), explainers, and leave/abandon option
- Level journey visualization with 20-level progression dots
- Max Badges Unlocked tracker ("Peak" counter)
- Survival warning banner when < 90 days
- "How to earn XP" toggle
- Weekly cron job for auto score recalculation
- Push notifications for level up, streak milestones, new achievements

### Clarity Improvements (DONE - Feb 24, 2026)
- FDs included in liquid funds at 90% effective value (semi-liquid category)
- "Score" renamed to "Financial Score" throughout
- Explanatory tooltips/help text on all 4 score pillars
- 20-level system (from 6) with faster early progression
- Gender-friendly badge names (24 total)
- "Peak" max badges metric displayed
- Challenge abandon/leave button
- Fund breakdown shows Instant/Semi-Liquid/Marketable/Locked categories

### Shareable Financial Score Card (DONE - Feb 24, 2026)
- Premium dark gradient card with user name, level, score, grade
- 4 stat tiles: Runway days, Badges, Streak, Health rating
- Download as PNG (html2canvas), Share (Web Share API), Copy link
- MoneySutra branding and generation date
- Component: `frontend/src/components/ShareScoreCard.js`
- Backend: `/api/gamification/share-card` (pre-existing)

### Financial Runway Simulator (DONE - Feb 24, 2026)
- Interactive "what-if" tool with 3 sliders: Income Change (-100% to +100%), Expense Change (-50% to +100%), One-Time Savings (₹0 to ₹10L)
- Current vs Projected comparison card with level badges
- 12-month runway projection bar chart with year-end delta badge
- Dynamic insight text explaining the impact
- 6 Quick Scenarios: Job Loss, 50% Pay Cut, Cut 20% Expenses, +2L Savings, Raise+Save, Reset
- Component: `frontend/src/components/RunwaySimulator.js`
- Backend: `GET /api/intelligence/runway-simulator` with query params

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
- Iteration 61: 100% (24/24 backend + all frontend - clarity improvements verified)
- Iteration 62: 100% (15/15 backend + all frontend - Runway Simulator)

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
