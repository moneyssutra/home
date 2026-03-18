# MoneySutra — Product Requirements Document

## Original Problem Statement
Build and maintain a full-stack financial management app ("MoneySutra") with React + FastAPI + MongoDB. The app tracks income, expenses, assets, loans, insurance, investments, credit cards, goals, and provides financial health insights, analytics, admin panel, and more.

## Core Architecture
- **Frontend**: React (CRA with Craco) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) on port 8001
- **Database**: MongoDB Atlas (dual-database: `moneyssutra_dev` for preview, `moneyssutra_prod` for production)
- **Auth**: JWT sessions (cookie-based) + Emergent Google OAuth + MPIN login + WebAuthn Biometric login
- **Admin**: Token-based auth (localStorage + Bearer header)

## Implemented Features

### Auth System (Complete)
- Email/password, Google OAuth, MPIN (4-digit PIN), Biometric (WebAuthn)
- Login flow: Biometric -> MPIN -> Password
- Post-login security setup prompt for new users

### User-Facing (Complete)
- Full CRUD: Income, Expenses, Loans, Assets, Accounts, Insurance, Investments, Credit Cards, Goals
- Dashboard with cashflow summary, net worth
- Financial health score & insights
- Gamification, Notifications, Data import, Family management
- Opportunity engine, Reports & analytics

### Loan Given Investment Type (NEW - Mar 18, 2026)
**Backend:**
- Extended Investment model with loan-specific fields (borrowerName, borrowerContact, interestType, agreedReturnAmount, repaymentType, dueDate, amountReceived, outstandingAmount, loanStatus, lastRepaymentDate)
- Auto-initialization on create: amountReceived=0, outstandingAmount=principal, loanStatus='active'
- `POST /api/investments/{id}/add-repayment` — Records repayments, auto-updates status (active -> partial -> closed)
- `GET /api/investments/{id}/repayments` — Repayment history with summary
- `POST /api/investments/check-loan-risks` — Risk detection (30-day medium, 90-day default_risk)
- `GET /api/investments/{id}/loan-detail` — Comprehensive loan detail with risk analysis
- Validation: repayment capped at outstanding, negatives blocked
- Dashboard networth returns loanGivenTotal, loanGivenAtRisk, loanGivenCount

**Frontend:**
- "Loan Given" in investment category dropdown
- Conditional form: Borrower Name*, Contact, Interest Type (No Interest/With Interest), Interest Rate/Agreed Return Amount, Repayment Type (Flexible/Fixed), Due Date
- Investment list: Loan-specific cards with borrower, outstanding, status badges (Active/Partial/Closed/At Risk)
- Loan detail page: Recovery progress bar, borrower info, repayment history table, Add Repayment modal with validation
- Dashboard: Loan Given total + At Risk amount in investments card
- Disclaimer: "Loan Given is not a regulated investment. Recovery depends on borrower reliability."

**Insights:**
- Rule 1: Loan Given > 25% of total assets -> "High Personal Lending Exposure"
- Rule 2: Any default_risk loans -> "Recovery Risk Detected"

### Admin Panel (Stable)
- Full admin dashboard with analytics, user management, campaigns, etc.
- Token-based auth with MongoDB-backed sessions

## Bug Fixes (Mar 18, 2026)
1. **Edit Button Redirect (P0)** — Fixed: IncomeDetail.js used data.type instead of data.incomeType
2. **Incorrect Current Month Income (P0)** — Fixed: MyIncome.js uses backend totalIncome
3. **Confusing Received/Pending Labels (P0)** — Verified: Labels show "(This Month)"

## Prioritized Backlog

### P1
- Production test data cleanup

### P2
- Enhanced "Remember Me" with persistent sessions / auto-login
- Income integration: auto-create Interest Income entries when interest repayments are recorded

### P3
- Production deployment stability improvements
- Admin panel data export
- User notification preferences enhancement
