# MoneySSutra - Product Requirements Document

## Original Problem Statement
MoneySutra is a premium personal finance application (PWA) built with React + FastAPI + MongoDB. It tracks expenses, income, investments, assets, loans, and provides rule-based financial analysis with AI-powered insights. A comprehensive Admin Command Center provides platform analytics, user intelligence, and campaign management.

## Architecture
- **Frontend**: React (CRA) with ShadCN UI, Recharts, SWR for data fetching
- **Backend**: FastAPI with async MongoDB (motor)
- **Database**: MongoDB Atlas
- **Auth**: Session-based + Emergent Google OAuth + Separate admin auth
- **AI**: OpenAI GPT-5.2 via emergentintegrations

## Admin Command Center — All Phases Complete

### Phase 1 (DONE): Executive Overview + User Growth Analytics
- 12 KPI cards (all clickable → navigate to relevant pages)
- PFSI ring chart, Risk Distribution
- User Growth: Registration graphs, cohort retention tables

### Phase 2 (DONE): Engagement Intelligence + Feature Usage
- Event tracking system (`POST /api/events/track`, `user_events` collection)
- Session analytics, activity heatmaps, day-of-week charts
- Feature adoption funnel, page visit stats

### Phase 3 (DONE): User Segmentation Lab
- 11 filter controls (Age, Gender, City, Occupation, Income, Safety Days, Risk Level, Health Score, Wealth %, EMI %, Monetization Bucket)
- Summary metrics, risk/city distribution pills
- Paginated user table, CSV export

### Phase 4 (DONE - Mar 1, 2026): User Support Intelligence
- Search query aggregation from events collection
- Top Search Terms table with trending indicators
- Most Visited Help Pages table
- 4 stat cards (Total Searches, Unique Searchers, Unique Terms, 7d Searches)

### Phase 5 (DONE - Mar 1, 2026): Targeted Campaigns
- Full CRUD: Create, Read, Update, Delete campaigns
- 3 campaign types: Banner, Notification, Popup
- 4 priority levels: Low, Normal, High, Urgent
- Status management: Draft, Active, Paused, Expired with toggle
- Targeting rules: All users, By Risk Level, By Income Band, By City
- Status filter tabs with counts
- Expandable campaign cards with performance metrics

### Phase 6 (DONE - Mar 1, 2026): Behavioral Insights & Churn Prediction
- Churn risk scoring (0-100) based on: inactivity days, activity decay, score trends, low engagement
- 3-tier churn classification: High (60+), Medium (30-59), Low (<30)
- Churn distribution bar chart
- Risk indicator explanations
- Tab navigation: Churn Risk Users, Improving, Declining, All Users
- User behavior table: Events, Activity Change, Days Inactive, Score Trend, Churn Score

### Bug Fix (DONE - Mar 1, 2026): Slow Challenge Loading
- Gamification `/profile` and `/challenges` endpoints optimized with `asyncio.gather` for parallel DB queries
- Achievement lookup converted from O(n) to O(1) with set-based approach
- DB indexes added for gamification and events collections

## Key Technical Decisions
- Shared utility functions in `utils.py` for financial calculations
- Admin section architecturally isolated from main app in `App.js`
- Independent admin auth with cookie-based session tokens
- Event-sourced analytics via `user_events` collection
- Parallel DB queries with `asyncio.gather` for performance

## Admin Nav Structure (10 items)
Overview → User Growth → Engagement → Feature Usage → Segmentation Lab → Support Intel → Campaigns → Behavioral → User Intelligence → Risk Radar

## Backlog
### P2
- Cash Flow Engine: Rolling Balance, Timeline, Negative Balance Handling
- Decision Impact Engine: Financial simulation for large purchases

## Credentials
- Test user: test@moneyssutra.com / test
- Admin: /admin/login with admin@moneyssutra.com / admin123

## 3rd Party Integrations
- OpenAI GPT-5.2 (emergentintegrations)
- Emergent Google Auth
- MongoDB Atlas
- openpyxl, apscheduler, recharts, reportlab, @dnd-kit/core
