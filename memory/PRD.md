# MoneySSutra - Product Requirements Document

## Original Problem Statement
MoneySutra is a premium personal finance application (PWA) built with React + FastAPI + MongoDB. It tracks expenses, income, investments, assets, loans, and provides rule-based financial analysis with AI-powered insights. An Admin Command Center is being built in phases to provide platform analytics and user intelligence.

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
- Gamification/Challenges system
- Timezone-aware backend with tz_offset sync
- Test account data seeding

## Admin Command Center
- **Separate Admin Login**: Independent login at `/admin/login` (admin@moneyssutra.com / admin123)
- **Light Theme**: bg: #F8FAFC, white cards, teal accents
- **Phase 1 (DONE)**: Executive Overview (12 KPI cards, PFSI ring, Risk Distribution) + User Growth Analytics (registration graphs, cohort retention)
- **Phase 2 (DONE)**: Engagement Intelligence (session analytics, heatmap, day-of-week) + Feature Usage (page visit stats, funnel)
- **Phase 3 (DONE - Mar 1, 2026)**: User Segmentation Lab — Advanced filter system with 11 filter controls (Age, Gender, City, Occupation, Income, Safety Days, Risk Level, Health Score, Wealth %, EMI %, Monetization Bucket). Summary metrics cards, risk/city distribution pills, paginated user table, CSV export. Backend: `/api/admin/segmentation`.

## Key Technical Decisions
- Shared utility functions in utils.py for financial calculations
- Admin section architecturally isolated from main app in App.js
- Independent admin auth with cookie-based session tokens
- Event-sourced analytics via `user_events` collection
- Profile data joined with computed financial metrics for segmentation

## Backlog
### P0
- [ ] Admin Phase 4: User Support Intelligence (FAQ & search query analytics)

### P1
- [ ] Admin Phase 5: Targeted Campaigns (banner/notification/popup with targeting)
- [ ] Slow Challenge Loading optimization (gamification.py)

### P2
- [ ] Admin Phase 6: Behavioral Pattern Detection, Financial Improvement Tracker, Churn Prediction
- [ ] Cash Flow Engine: Rolling Balance, Timeline, Negative Balance Handling
- [ ] Decision Impact Engine: Financial simulation for large purchases

## Credentials
- Test user: test@moneyssutra.com / test
- Admin login: `/admin/login` with admin@moneyssutra.com / admin123

## 3rd Party Integrations
- OpenAI GPT-5.2 (emergentintegrations)
- Emergent Google Auth
- MongoDB Atlas
- openpyxl, apscheduler, recharts, reportlab, @dnd-kit/core
