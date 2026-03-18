# MoneySutra — Product Requirements Document

## Original Problem Statement
Full-stack financial management app ("MoneySutra") with React + FastAPI + MongoDB. Tracks income, expenses, assets, loans, insurance, investments, credit cards, goals with financial health insights, analytics, admin panel.

## Core Architecture
- **Frontend**: React (CRA/Craco) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI on port 8001
- **Database**: MongoDB Atlas (dual: `moneyssutra_dev` / `moneyssutra_prod`)
- **Auth**: JWT sessions + Google OAuth + MPIN + WebAuthn Biometric

## Loan Given Investment Type (Complete - Mar 18, 2026)

### Form Flow (Order)
Category → Amount Lent/Loaned → Loan Label → **Loan Details Box** → Investment Mode → Loan Date → Notes → Save

### Loan Details Box
- Borrower Name*, Contact (optional)
- Interest Type: No Interest | With Interest
- If With Interest: Interest Rate (%) OR Agreed Return Amount
- **Repayment Plan** (3 types):
  - **Lump Sum** — Full amount returned at once on due date
  - **Fixed EMI** — Fixed ₹X per Y frequency for Z installments
    - Payment Frequency (Daily/Weekly/Monthly/Quarterly/Semi-Annually/Yearly)
    - Amount per Installment ↔ Number of Installments (bidirectional auto-calc)
    - Preview: "₹5,000 x 10 monthly installments = ₹50,000"
  - **Flexible** — Borrower pays when possible, no fixed schedule
- Due Date (optional)

### Investment Mode (auto-set, user-overridable)
- No Interest → "Fixed" (principal returned as-is)
- With Interest + Flexible/Lump Sum → "Growth with Maturity"
- With Interest + Fixed EMI → "Income Generating"
- 4 options: Fixed, Growth Only, Income Generating, Growth with Maturity

### Backend Logic
- Auto-initialization: amountReceived=0, outstandingAmount=principal, loanStatus='active'
- **Income Auto-Creation**: When loan has interest, auto-creates linked income source (`sourceCategory: loan_repayment`)
- **Smart Repayment Split**: Each repayment splits into principalPortion + interestPortion
  - Proportional split when agreedReturnAmount exists
  - Simple interest accrual when returnRate exists
- **Income Transaction**: Interest portion auto-creates entry in `income_received` for cash flow tracking
- Risk Detection: 30-day medium risk, 90-day default_risk auto-status
- Validation: repayment capped at outstanding, negatives/zero blocked

### Cascade Delete (Implemented - Mar 18, 2026)
- When a Loan Given investment is deleted, the linked income source (via `linkedIncomeSourceId`) is also deleted
- All related `investment_transactions` and `income_received` entries are cleaned up

### Auto Loan Repayment Scheduler (Implemented - Mar 18, 2026)
- `auto_process_loan_repayments()` runs daily in the background scheduler
- Checks for fixed-schedule Loan Given investments with payments due today
- Auto-records repayment transactions and updates loan state
- Creates `loan_repayment_due` notification with `requiresConfirmation: true`

### Repayment Confirmation Flow (Implemented - Mar 18, 2026)
- `POST /api/investments/confirm-repayment/{notification_id}` endpoint
- **Confirm** (`action: "confirm"`): Marks auto-recorded transaction as confirmed
- **Reject** (`action: "reject"`): Rolls back the auto-recorded repayment (restores loan amounts, deletes transaction and income entry)
- Frontend: NotificationBell shows "Received" / "Not Received" buttons for these notifications

### API Endpoints
- `POST /api/investments` — Create with auto-init + income source creation + backdated catch-up
- `POST /api/investments/{id}/add-repayment` — Smart split + income auto-creation
- `GET /api/investments/{id}/repayments` — History with split details
- `GET /api/investments/{id}/loan-detail` — Full detail with risk + installment plan
- `POST /api/investments/check-loan-risks` — Batch risk detection
- `POST /api/investments/confirm-repayment/{notification_id}` — Confirm/reject auto-recorded repayment
- `DELETE /api/investments/{id}` — Cascade delete (income source + transactions)
- `POST /api/investments/fix-loan-income-types` — Data migration + cleanup

## Financial Health Wizard (Implemented - Mar 18, 2026)
- 6-step guided wizard: Income → Expenses → Savings → Debts → Insurance → Investments
- Saves to `financial_health_wizard` collection
- Backend merges wizard data with auto-collected data for score calculation
- Shows "Complete Your Financial Profile" button on the Financial Health page
- API: `GET/POST /api/financial-health/wizard`

## Skip Payment Feature (Implemented - Mar 18, 2026)
- Added "Skip" button alongside "Mark Paid" and "Prepay" for pending expenses
- "Skipped" status with amber badge, line-through amount, and "Undo Skip" option
- Per-month tracking via `skippedMonths` array
- API: `POST /api/expenses/{id}/skip`, `POST /api/expenses/{id}/undo-skip`

### Display
- **Investment List**: Loan cards with borrower, outstanding, status badges
- **Loan Detail Page**: Recovery progress, borrower info, installment plan tracker, 6-column repayment history (Date, Amount, Principal, Interest, Balance, Notes), Add Repayment modal
- **Dashboard**: Loan Given total + At Risk in investments card
- **Insights**: High lending exposure (>25% assets), Recovery risk detection
- Disclaimer: "Loan Given is not a regulated investment."

## Other Completed Features
- Auth: Email/password, Google OAuth, MPIN, Biometric (WebAuthn)
- Full CRUD: Income, Expenses, Loans, Assets, Accounts, Insurance, Investments, Credit Cards, Goals
- Dashboard, Financial health, Gamification, Notifications, Reports
- Admin panel with token-based auth

## Bug Fixes (Mar 18-19, 2026)
1. Edit Button Redirect (P0) — Fixed
2. Incorrect Current Month Income (P0) — Fixed
3. Confusing Received/Pending Labels (P0) — Verified
4. Loan Given showing fake income in Current Month (P0) — Fixed
   - Root cause: `auto_record_fixed_income()` scheduler was treating loan repayment income sources as regular fixed income, auto-recording fake transactions
   - Also: Frontend `calculateMonthlyAmount()` was counting loan repayment `expectedAmount` in "Current Month Income" total
   - Fix: Excluded `sourceCategory: "loan_repayment"` from both the scheduler query and frontend calculation
   - Cleanup: `POST /api/investments/fix-loan-income-types` now also removes any fake `auto_fixed` transactions for loan sources
5. "Next: Not set" for Weekly/Daily interest income sources (P0) — Fixed
   - Root cause: `getNextPaymentDateObj` in MyInterest.js had no `case "Weekly"` or `case "Daily"` — fell to default null
   - Fix: Added Weekly (uses selectedDay to compute next occurrence) and Daily (tomorrow) cases
6. Investment Breakdown showing "Other" for Loan Given (P1) — Fixed
   - Root cause: `investmentTypeConfig` in InvestmentBreakdown.js had no "loan-given" entry
   - Fix: Added "loan-given" with HandCoins icon and orange color
7. Monthly Cashflow Received incorrectly including loan repayments (P0) — Fixed
   - Root cause: `get_income_monthly_summary` backend was including loan repayment income sources
   - Fix: Added `sourceCategory != 'loan_repayment'` check in the loop

8. Insights Page Crash (P0) — Fixed (Mar 19, 2026)
   - Root cause: `backendUrl` not defined in main `Insights` component; `isPersonalView` used in `useEffect` before assignment from `useFamilyContext()`
   - Fix: Moved `backendUrl` definition and hook calls (`useIntelligenceData`, `useFamilyContext`) before the `useEffect` that depends on them

## Prioritized Backlog
### P1
- Production test data cleanup
### P2
- Enhanced "Remember Me" with persistent sessions
### P3
- Admin panel data export
- User notification preferences
