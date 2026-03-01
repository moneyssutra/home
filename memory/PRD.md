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
- Member context preserved across ALL page navigations (Dashboard → Wealth → Health → Goals → back)
- Family combined net worth view aggregating all members
- FamilyToggle shows: Personal, Members (Priya/Son), Family Combined
- Context-aware headers on all pages: "Sharma Family Wealth", "Priya's Health", etc.
- Financial Health widget: Score 0 for members with no data, derived combined score (71/100) for Family view
- Combined Family view correctly shows Insurance (9), Credit Cards (4), and all aggregated financial data
- Dropdown z-index fixed via React Portal (z-index: 999999)
- useEffect dependencies fixed to use activeViewId for proper refetch on view switch

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

## Credentials
- Test user: test@moneyssutra.com / test
- Admin: /admin/login with admin@moneyssutra.com / admin123

## 3rd Party Integrations
- OpenAI GPT-5.2 (emergentintegrations), Emergent Google Auth, MongoDB Atlas
- openpyxl, apscheduler, recharts, reportlab, @dnd-kit/core
