# MoneySSutra - Product Requirements Document

## Original Problem Statement
MoneySutra is a premium personal finance application (PWA) built with React + FastAPI + MongoDB. It tracks expenses, income, investments, assets, loans, and provides rule-based financial analysis with AI-powered insights. A comprehensive Admin Command Center provides platform analytics, user intelligence, and campaign management.

## Architecture
- **Frontend**: React (CRA) with ShadCN UI, Recharts, SWR for data fetching
- **Backend**: FastAPI with async MongoDB (motor)
- **Database**: MongoDB Atlas
- **Auth**: Session-based + Emergent Google OAuth + Separate admin auth
- **AI**: OpenAI GPT-5.2 via emergentintegrations

## Completed Features

### Core App
- Full CRUD for expenses, income, investments, assets, loans, accounts
- Dashboard with net worth, cash flow, received/expected splits
- Expense views: List, Calendar, Weekly, Monthly tabs
- Spending Insights module (rule-based)
- Theme persistence (light/dark)
- Family/Workspace management with member switching
- Gamification/Challenges system (optimized with asyncio.gather)
- Timezone-aware backend

### Family Member Switching (Fixed Mar 1, 2026)
- Unified dashboard UI for all views (personal, member, family)
- Member context preserved across ALL page navigations (Dashboard > Wealth > Health > Goals > back)
- Family combined net worth view aggregating all members
- FamilyToggle shows: Personal, Members (Priya/Son), Family Combined
- Context-aware headers on all pages: "Sharma Family Wealth", "Priya's Health", etc.
- Financial Health widget: Score 0 for members with no data (cards visible with "No Data"), derived combined score (80/100) for Family view
- Combined Family view correctly shows Insurance (9), Credit Cards (4), and all aggregated financial data
- Dropdown z-index fixed via React Portal (z-index: 999999)
- useEffect dependencies fixed to use activeViewId for proper refetch on view switch

### Family Combined View Enhancements (Mar 1, 2026)
- Dashboard: Received income and Spent expenses show real data instead of 0
- Dashboard: Liabilities shows correct total (loans + CC outstanding)
- Health Page: Full survival clock with runway, stages, fund breakdown
- Health Page: Financial Score shows proper score with Grade and breakdown bars
- Health Page: ActionSection shows actual improvement suggestions
- Health Page: Money Personality works for family view
- Health Page: Emergency Runway shows Liquid Buffer, Extended Buffer, Net Worth values
- Financial Health Widget: Derives all 9 modules from combined data
- Analytics Page: Context-aware with family combined data
- Reports Page: Context-aware header
- Backend: Enhanced /api/family/combined-summary returns detailed financial data

### Data Consistency & Accuracy Fixes (Mar 1, 2026)
- Runway Simulator & Shock Test now use family combined data in family view
- Health Insurance shows actual health coverage, not total insurance
- Money Personality shows proper personality with personalityId, zone, confidence
- Priya's Financial Health: All 10 module cards consistently show "No Data" status
- Family member edit: pencil icon + inline form + PUT /api/family/edit-member endpoint

### Reports Page UI Fix (Mar 1, 2026)
- Removed duplicate "to" span label from date range selector
- Clean FROM and TO labels above respective date inputs

### SIP Investment Auto-Update (Mar 1, 2026)
- Daily scheduler automatically updates investment values when SIP is due
- Supports all frequencies: Daily, Weekly, Monthly, Quarterly, Half-Yearly, Yearly
- Adds sipAmount to both currentValue and principal
- Tracks lastSipUpdateDate to prevent duplicate updates
- Creates notifications when SIP is auto-processed
- Manual trigger endpoint: POST /api/investments/trigger-sip-update
- Investment model updated with lastSipUpdateDate field

### Admin Command Center (All 6 Phases Complete)
- Phase 1: Executive Overview + User Growth Analytics
- Phase 2: Engagement Intelligence + Feature Usage (event-sourced)
- Phase 3: User Segmentation Lab (11 filters, CSV export)
- Phase 4: User Support Intelligence (FAQ/search analytics)
- Phase 5: Targeted Campaigns (CRUD, targeting rules, status management)
- Phase 6: Behavioral Insights & Churn Prediction (scoring, patterns)
- Mobile responsive admin with hamburger menu

## Backlog
### P2
- Cash Flow Engine: Rolling Balance, Timeline, Negative Balance Handling
- Decision Impact Engine: Financial simulation for large purchases
- Admin Phase 6 Deep: Behavioral Pattern Detection, Financial Improvement Tracker, Churn Prediction
- Refactor useIntelligenceData.js into smaller, specialized hooks

## Credentials
- Test user: test@moneyssutra.com / test
- Admin: /admin/login with admin@moneyssutra.com / admin123
- New Independent User (Priya): priya@moneyssutra.com / Priya@123

## 3rd Party Integrations
- OpenAI GPT-5.2 (emergentintegrations), Emergent Google Auth, MongoDB Atlas
- openpyxl, apscheduler, recharts, reportlab, @dnd-kit/core
