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
- Theme persistence (light/dark), Gamification/Challenges

### Family Member Switching
- Unified dashboard UI for personal, member, family views
- Context-aware headers, combined net worth, unified scoring

### Smart Financial Schedulers (Mar 1, 2026)
- **SIP Investment Auto-Update**: Daily scheduler adds sipAmount to currentValue/principal
- **Loan EMI Auto-Deduction**: Reduces outstandingAmount with principal/interest split, maintains EMI ledger
- **Fixed Income/Insurance/Variable Income**: Auto-recording and reminders

### Share Card UI Fixes (Mar 1, 2026)
- Fixed circle overlap, Stage badge alignment, inline SVGs for html2canvas, actual logo, capitalized names

### Loan Detail + EMI Ledger Page (Mar 1, 2026) ★ NEW
- **Route**: `/wealth/loans/:id`
- **Loan Summary Header**: Name, type, lender, original amount, interest rate, tenure, EMI, start/end date, outstanding with progress bar
- **EMI Progress**: Paid/Missed/Pending counts with color-coded badges
- **Full Amortization Schedule**: Auto-generated EMI ledger with principal/interest breakdown per period
- **Color-coded Status**: Green=Paid, Red=Missed, Amber=Pending. Clickable to mark as paid
- **Extra Principal Payment**: Modal with amount input and mode selector (Reduce Tenure / Reduce EMI). Recalculates loan terms
- **Loan Insights**: Total interest payable, interest paid, EMI-to-income %, safety impact days
- **Backend**: EMI formula calculation, amortization generation, extra payment processing, mark-emi endpoint

### Investment Detail + Ledger Page (Mar 1, 2026) ★ NEW
- **Route**: `/wealth/investments/:id`
- **Investment Summary Header**: Name, category, mode, current value, invested, gain/loss with percentage
- **Key Metrics**: CAGR, SIP amount/frequency, expected return, duration
- **Projected Growth**: Future value projections for 1yr, 3yr, 5yr, 10yr, 15yr, 20yr
- **Performance Status**: Outperforming / On Track / Underperforming based on CAGR vs expected return
- **Transaction Ledger**: Auto-generated SIP entries (monthly) or single lumpsum entry with gain/loss per period
- **Add Contribution**: Modal to add manual investment contributions
- **Backend**: CAGR/XIRR calculation, future value projections, performance tagging, contribution tracking

### Admin Command Center (All 6 Phases Complete)
- Phase 1-6: Executive Overview, User Growth, Engagement Intelligence, Segmentation Lab, Support Intelligence, Campaigns, Behavioral Insights

## Key API Endpoints (New)
- `GET /api/loans/{id}/amortization` - Full EMI schedule with statuses
- `POST /api/loans/{id}/extra-payment` - Extra principal payment (reduce_tenure/reduce_emi)
- `POST /api/loans/{id}/mark-emi` - Mark specific EMI as paid
- `GET /api/loans/{id}/insights` - Loan financial insights
- `GET /api/investments/{id}/detail` - Full investment detail with CAGR, projections, ledger
- `POST /api/investments/{id}/add-contribution` - Add manual contribution

## Key DB Collections (New)
- `emi_transactions`: EMI ledger with principal/interest per payment
- `loan_extra_payments`: Extra principal payment records
- `investment_transactions`: Manual investment contribution records

## Backlog
### P2
- Cash Flow Engine: Rolling Balance, Timeline, Negative Balance Handling
- Decision Impact Engine: Financial simulation for large purchases
- Refactor useIntelligenceData.js into smaller hooks

## Credentials
- Test user: test@moneyssutra.com / test
- Admin: /admin/login with admin@moneyssutra.com / admin123
- Priya: priya@moneyssutra.com / Priya@123

## 3rd Party Integrations
- OpenAI GPT-5.2 (emergentintegrations), Emergent Google Auth, MongoDB Atlas
- openpyxl, apscheduler, recharts, reportlab, @dnd-kit/core, html2canvas, python-dateutil
