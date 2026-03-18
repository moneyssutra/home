# MoneySutra — Product Requirements Document

## Original Problem Statement
Build and maintain a full-stack financial management app ("MoneySutra") with React + FastAPI + MongoDB. Tracks income, expenses, assets, loans, insurance, investments, credit cards, goals, and provides financial health insights, analytics, admin panel.

## Core Architecture
- **Frontend**: React (CRA with Craco) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) on port 8001
- **Database**: MongoDB Atlas (dual: `moneyssutra_dev` for preview, `moneyssutra_prod` for production)
- **Auth**: JWT sessions (cookie-based) + Emergent Google OAuth + MPIN + WebAuthn Biometric

## Implemented Features

### Auth System (Complete)
- Email/password, Google OAuth, MPIN (4-digit PIN), Biometric (WebAuthn)
- Login flow: Biometric -> MPIN -> Password
- Post-login security setup prompt

### Loan Given Investment Type (Complete - Mar 18, 2026)

**Backend:**
- Extended Investment model with loan fields (borrowerName, borrowerContact, interestType, agreedReturnAmount, repaymentType, repaymentFrequency, dueDate, amountReceived, outstandingAmount, loanStatus, lastRepaymentDate)
- Auto-initialization: amountReceived=0, outstandingAmount=principal, loanStatus='active'
- `POST /api/investments/{id}/add-repayment` — Status transitions (active -> partial -> closed)
- `GET /api/investments/{id}/repayments` — Repayment history
- `POST /api/investments/check-loan-risks` — 30-day medium, 90-day default_risk
- `GET /api/investments/{id}/loan-detail` — Full loan detail with risk analysis
- Dashboard networth returns loanGivenTotal, loanGivenAtRisk, loanGivenCount

**Frontend Form (Refined):**
- "Loan Given" in category dropdown
- Investment Mode auto-set (hidden for Loan Given): no interest = "Growth Only", with interest = "Income Generating"
- Field order: Category -> Amount Lent/Loaned -> Loan Label/Reference Name -> Loan Details Section -> Loan Date -> Notes -> Save
- Conditional Loan Details: Borrower Name*, Contact, Interest Type toggle, Interest Rate/Agreed Return, Repayment Type (Flexible/Fixed), Installment Frequency (Daily/Weekly/Monthly/Quarterly/Semi-Annually/Yearly - only for Fixed), Due Date
- ALL irrelevant fields hidden: SIP/Frequency, Digital Metal, SGB, Income Generating mode fields (Return Rate, Interest Type, Payout Frequency), Growth with Maturity fields (Lock-in, Maturity Date, Expected Maturity Value), Current Value, Linked Account, Emergency Fund toggle
- Disclaimer: "Loan Given is not a regulated investment. Recovery depends on borrower reliability."

**Frontend Display:**
- Investment list: Loan cards with borrower, outstanding, status badges (Active/Partial/Closed/At Risk)
- Loan detail page: Recovery progress bar, borrower info, repayment history, Add Repayment modal
- Dashboard: Loan Given total + At Risk in investments card

**Insights:**
- Loan Given > 25% of total assets -> "High Personal Lending Exposure"
- Any default_risk loans -> "Recovery Risk Detected"

### Bug Fixes (Mar 18, 2026)
1. Edit Button Redirect (P0) — Fixed
2. Incorrect Current Month Income (P0) — Fixed
3. Confusing Received/Pending Labels (P0) — Verified

## Prioritized Backlog

### P1
- Production test data cleanup

### P2
- Enhanced "Remember Me" with persistent sessions
- Income integration: auto-create Interest Income on interest repayments

### P3
- Admin panel data export
- User notification preferences
