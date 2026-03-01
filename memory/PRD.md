# MoneySSutra - Product Requirements Document

## Original Problem Statement
MoneySutra is a premium personal finance application (PWA) built with React + FastAPI + MongoDB. It tracks expenses, income, investments, assets, loans, and provides rule-based financial analysis with AI-powered insights.

## Architecture
- **Frontend**: React (CRA) with ShadCN UI, Recharts, SWR for data fetching
- **Backend**: FastAPI with async MongoDB (motor)
- **Database**: MongoDB Atlas
- **Auth**: Session-based + Emergent Google OAuth
- **AI**: OpenAI GPT-5.2 via emergentintegrations

## Completed Features
- Full CRUD for expenses, income, investments, assets, loans, accounts
- Dashboard with net worth, cash flow, received/expected splits
- Expense views: List, Calendar, Weekly, Monthly tabs
- Spending Insights module (rule-based)
- Theme persistence (light/dark)
- Family/Workspace management with member switching
- Admin Command Center Phase 1 (dark theme, KPIs, User Intelligence, Risk Radar)
- Gamification/Challenges system
- Timezone-aware backend with tz_offset sync
- Test account data seeding

## Recent Fixes (Feb 28, 2026)
- **P0 - Expense Data Consistency**: Harmonized expense calculations across dashboard, monthly-summary, and weekly-summary. All endpoints now use count_weekday_occurrences for Weekly, days_in_month for Daily, and consistent quarterly logic ((month-start)%3==0).
- **P0 - Income Data Consistency**: Created /api/income/monthly-summary endpoint. MyIncome.js now uses backend for received/pending instead of client-side approximations. Dashboard and MyIncome show identical numbers.
- **P0 - User Switching**: Fixed FamilyContext to auto-reset to personal view when navigating away from /home. Dashboard shows member summary even with zero data. No more UI crashes.


## Recent Fixes (Feb 28, 2026)
- **P0 - Expense Data Consistency**: Harmonized expense calculations across dashboard, monthly-summary, and weekly-summary.
- **P0 - Income Data Consistency**: Created /api/income/monthly-summary endpoint. MyIncome.js now uses backend for received/pending.
- **P0 - User Switching**: Fixed FamilyContext to auto-reset when navigating away from dashboard.

## Admin Command Center (Mar 1, 2026)
- **Separate Admin Login**: Independent login page at `/admin/login` with admin@moneyssutra.com / admin123
- **Light Theme**: Switched from dark to light across all admin pages (bg: #F8FAFC, white cards, teal accents)
- **Executive Overview**: 12 KPI cards (Total Users, DAU/WAU/MAU, New Today/Week/Month, Safety Days, Wealth%, Health Score, Critical Risk, Avg Session) + PFSI ring + Risk Distribution
- **User Growth Analytics**: Registration trend charts (daily/weekly/monthly toggle), growth rate bar chart, cohort retention table
- **User Intelligence**: User table with search and risk-level filters, clickable detail drawer
- **Risk Radar**: 4 risk bucket cards with progress bars, risk drivers analysis

## Key Technical Decisions
- Shared utility functions in utils.py: count_weekday_occurrences, normalize_expense_for_month, split_expense_for_month
- Dashboard derives monthlyExpenses/monthlyIncome from split totals (done+upcoming, received+expected) for guaranteed consistency
- Missing selectedDate treated as "expected/not yet received" (conservative approach)
- linkedPaymentId expenses excluded from totals to avoid double-counting

## Backlog
### P1
- [ ] Backend Event Tracking System (foundation for engagement analytics)
- [ ] Admin: User Engagement Analytics (session time, activity heatmap, day-of-week)
- [ ] Admin: Page-wise Activity Analytics (feature usage table, activity funnel)
- [ ] Slow Challenge Loading optimization (gamification.py)

### P2
- [ ] Admin: User Segmentation Lab (advanced filters)
- [ ] Admin: FAQ & User Query Analytics
- [ ] Admin: Campaign Manager (banner/notification/popup with targeting)
- [ ] Admin: Behavioral Pattern Detection
- [ ] Admin: Financial Improvement Tracker
- [ ] Admin: Churn Prediction
- [ ] Admin: Feature Experiment Tracker
- [ ] Cash Flow Engine: Rolling Balance, Timeline, Negative Balance Handling
- [ ] Decision Impact Engine: Financial simulation for large purchases

## Credentials
- Test user: test@moneyssutra.com / test
- **Admin login**: `/admin/login` with admin@moneyssutra.com / admin123
- Admin also accessible via main app login (test@moneyssutra.com) then navigating to `/admin`
- Family member: Priya Sharma (wife, no financial data)

## 3rd Party Integrations
- OpenAI GPT-5.2 (emergentintegrations)
- Emergent Google Auth
- MongoDB Atlas
- openpyxl, apscheduler, recharts, reportlab, @dnd-kit/core
