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
- Member context preserved across ALL page navigations
- Family combined net worth view aggregating all members
- Context-aware headers on all pages
- Financial Health widget with unified scoring across views

### Family Combined View Enhancements (Mar 1, 2026)
- Dashboard: Real received income and spent expenses
- Health Page: Full survival clock, scores, breakdowns, money personality
- Financial Health Widget: Derives all 9 modules from combined data
- Analytics/Reports Pages: Context-aware with family combined data

### Data Consistency & Accuracy Fixes (Mar 1, 2026)
- Runway Simulator & Shock Test use family combined data
- Health/Life insurance split correctly
- Family member edit with phone number smart linking

### Smart Financial Schedulers (Mar 1, 2026)
- **SIP Investment Auto-Update**: Daily scheduler adds sipAmount to currentValue/principal when due. Supports Daily/Weekly/Monthly/Quarterly/Half-Yearly/Yearly. Manual trigger: POST /api/investments/trigger-sip-update
- **Loan EMI Auto-Deduction**: Daily scheduler reduces outstandingAmount by principal portion when EMI is due. Calculates interest/principal split based on loan rate. Maintains EMI ledger in `emi_transactions` collection. Manual trigger: POST /api/loans/trigger-emi-update. Ledger endpoints: GET /api/loans/emi-ledger-all, GET /api/loans/emi-ledger/{loan_id}
- **Fixed Income Auto-Recording**: Auto-records fixed income on due dates with notifications
- **Insurance Premium Processing**: Auto-records premium payments on due dates
- **Variable Income Reminders**: Sends reminders at configured times, auto-records after 24hr fallback

### Share Card UI Fixes (Mar 1, 2026)
- Increased score circle from 96px to 120px to prevent number/text overlap
- Fixed Stage badge alignment with flexShrink:0
- Replaced lucide-react icons with inline SVG paths for html2canvas compatibility
- Replaced generic Award icon with actual MoneySutra logo image
- Added capitalizeWords() for proper name display (e.g., "chandra shekhar" -> "Chandra Shekhar")

### Reports Page UI Fix (Mar 1, 2026)
- Removed duplicate "to" span label from date range selector

### Admin Command Center (All 6 Phases Complete)
- Phase 1-6: Executive Overview, User Growth, Engagement Intelligence, Segmentation Lab, Support Intelligence, Campaigns, Behavioral Insights & Churn Prediction
- Mobile responsive admin with hamburger menu

## Key API Endpoints
- GET /api/investments/trigger-sip-update (manual SIP update)
- POST /api/loans/trigger-emi-update (manual EMI processing)
- GET /api/loans/emi-ledger-all (all EMI transactions)
- GET /api/loans/emi-ledger/{loan_id} (loan-specific EMI ledger)
- GET /api/gamification/share-card (share card data)
- GET /api/family/combined-summary

## Key DB Collections
- `emi_transactions`: EMI ledger with principal/interest breakdown per payment
- `investments`: Now includes `lastSipUpdateDate` for tracking SIP auto-updates
- `loans`: Now includes `lastEmiUpdateDate` and `emiSelectedDate`

## Backlog
### P2
- Cash Flow Engine: Rolling Balance, Timeline, Negative Balance Handling
- Decision Impact Engine: Financial simulation for large purchases
- Refactor useIntelligenceData.js into smaller specialized hooks

## Credentials
- Test user: test@moneyssutra.com / test
- Admin: /admin/login with admin@moneyssutra.com / admin123
- Priya: priya@moneyssutra.com / Priya@123

## 3rd Party Integrations
- OpenAI GPT-5.2 (emergentintegrations), Emergent Google Auth, MongoDB Atlas
- openpyxl, apscheduler, recharts, reportlab, @dnd-kit/core, html2canvas
