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
9. "Complete Your Financial Profile" button invisible in dark mode (P1) — Fixed (Mar 19, 2026)
   - Root cause: Light background (`#FEF2F2`) with `var(--text-primary)` which is white in dark mode
   - Fix: Changed to dark backgrounds (`#1C0A0A`) with light text (`#FECACA`) for red zone; same pattern on FinancialHealth.js
10. Skipped expenses still counted in current month total (P1) — Fixed (Mar 19, 2026)
    - Root cause: `monthStats.total` in MyExpenses.js, `get_monthly_summary` in expenses.py, and `_calc_monthly_expenses` in dashboard.py all included skipped expenses
    - Fix: Excluded expenses with current month in `skippedMonths` array from all total calculations; added "Skipped" column to month summary UI
11. Mobile safe area overlap on all pages (P1) — Fixed (Mar 19, 2026)
    - Added global CSS safe area handling + viewport-fit=cover + safe-area-bottom for BottomNav
12. Inflated badge counts (P2) — Fixed (Mar 19, 2026)
    - survival_days=999 when no expenses → now 0; badges require real data; cleaned 40 inflated badges from prod
13. Database visibility (P1) — Fixed: Preview now connects to moneyssutra_prod
14. Production test data cleanup (P1) — Done: Removed test3@test.com and associated data

## Verification (Mar 19, 2026)
- Dashboard vs My Expenses data: Spent=Paid, Upcoming=Pending, Total matches exactly ✅
- Badge count: 36/100 — all legitimate (survival_days=95, score=93, no inflated badges) ✅
- Mobile safe area: Global CSS rule applied to all header elements ✅

## Prioritized Backlog
### P2
- ~~Enhanced "Remember Me" with persistent sessions~~ ✅ DONE (Mar 19, 2026)
  - All login methods (password, MPIN, biometric, Google) now support `remember_me`
  - When enabled: 30-day session; default: 7-day session
  - Google auth saves preference to localStorage before redirect
### P3
- ~~Admin panel data export~~ ✅ DONE (Mar 19, 2026)
  - 3 CSV export endpoints: users, analytics, per-user financial data
  - Export page added to admin sidebar with Download buttons
- ~~User notification preferences~~ ✅ DONE (Mar 19, 2026)
  - Fixed PUT endpoint, camelCase normalization, GET returns proper defaults
  - Frontend NotificationSettings.js connected to backend properly

### Remaining Backlog
- ~~Repayment reminders for Loan Given~~ ✅ DONE (Mar 19, 2026)
  - Added `check_loan_repayment_reminders()` to scheduler — runs daily at startup and 08:00
  - Sends in-app notifications 0-3 days before loan repayment due date
  - Respects user's `billReminders` notification preference
  - Auto-dismisses duplicate reminders (one per loan per day)
- ~~Skipped expense history view~~ ✅ DONE (Mar 19, 2026)
  - Added `GET /api/expenses/skipped-history` endpoint — returns month-grouped skipped expenses with totals
  - Added "Skipped" tab to My Expenses page with grand total card and month-wise breakdown
  - Shows expense name, category, and amount saved per skip

## Feature: Financial Profile Onboarding (Mar 19, 2026) ✅
- **Backend**: `/api/onboarding/profile-completion`, `/save-step`, `/complete`, `/dismiss`, `/progress`
- **Profile Completion Engine**: Auto-detects data from 5 categories (income, expenses, assets, liabilities, investments) = 20% each
- **Manual Flow**: 5-step wizard with preset categories, custom items, skip/resume, progress bar
- **Finvu Integration**: Placeholder ("Coming Soon") — can be plugged in later
- **Dashboard Integration**: Completion banner with percentage + "Complete Now" CTA
- **First Login**: Auto-shows onboarding if profile completion = 0%
- **Entry Points**: Dashboard banner, `/onboarding` route
- **Event Tracking**: `onboarding_events` collection for admin analytics
- **Admin**: `/api/admin/onboarding-stats` endpoint for funnel analytics

## Feature: CRED-Style Rolling Buttons (Mar 19, 2026) ✅
- **Component**: `/app/frontend/src/components/RollingButtons.js`
- **CSS**: `.rb-*` classes in `/app/frontend/src/index.css` (lines 541+)
- **Dashboard**: Renders between header and profile completion banner
- **Design**: 3 pill-shaped buttons with icons, vertically cycling text animation
- **Button Groups**:
  - Track (2.8s): Expenses → Income → Accounts → Cards
  - Grow (3.2s): Invest → Assets → Loans → Insure
  - Plan (3.6s): Goals → Savings → Debts → Worth
- **Animation**: Smooth vertical slide transition (0.35s cubic-bezier), pauses on hover/touch
- **Navigation**: Each button navigates to the currently displayed item's route on click
- **Tested**: Backend 100% (6/6), Frontend 100% (all features verified)

## Bug Fix: Onboarding Dismiss Persistence (Mar 19, 2026) ✅
- **Issue**: Onboarding modal kept re-appearing after user dismissed it
- **Root Cause**: `profile-completion` endpoint didn't return `dismissed` flag, and Dashboard only checked `profileCompletion === 0`
- **Fix**: Added `dismissed` field to profile-completion response; Dashboard now checks `!dismissed` before showing modal


## Bug Fix: Google Auth Crash (Mar 19, 2026) ✅
- **Issue**: All Google logins failing with `AttributeError: 'GoogleSessionRequest' object has no attribute 'remember_me'`
- **Root Cause**: "Remember Me" feature added `request.remember_me` but `GoogleSessionRequest` model didn't have the field
- **Fix**: Added `remember_me: bool = False` to `GoogleSessionRequest` in `server_models.py`

## Bug Fix: Header White Line Flash (Mar 19, 2026) ✅
- **Issue**: White line flashing at header boundary when rolling buttons animated
- **Root Cause**: `backdrop-blur-xl` on Net Worth card caused Safari to re-composite during nearby animations
- **Fix**: Replaced `backdrop-blur-xl` with solid `rgba(255,255,255,0.12)` background

## Feature: Rolling Buttons Shimmer Effect (Mar 19, 2026) ✅
- Added green light sweep animation (`@keyframes rbShimmer`) using a real DOM `<span>` element (Safari doesn't support `::after` on `<button>`)
- Staggered delays: 0s, 1.3s, 2.6s for cascading shimmer

## Bug Fix: Back Button Navigation (Mar 19, 2026) ✅
- **Issue**: Back buttons on all wealth pages hardcoded to `/wealth` instead of using browser history
- **Fix**: Changed to `navigate(-1)` on 8 pages: MyIncome, MyExpenses, MyAccounts, MyInvestments, MyAssets, MyInsurance, MyLiabilities, MyCreditCards

## Bug Fix: Dashboard Header Spacing (Mar 19, 2026) ✅
- **Issue**: Global CSS `header { padding-top: 3.5rem !important }` added excessive space on desktop
- **Fix**: Changed to `env(safe-area-inset-top, 0px)` so padding only applies on notched devices

## Feature: Onboarding Modal Scroll Lock (Mar 19, 2026) ✅
- Added `document.body.style.overflow = "hidden"` when onboarding modal is open
- Added `overscroll-behavior: none` to prevent elastic bounce
- Raised modal z-index to 999

## Feature: Challenge Content in Active View (Mar 19, 2026) ✅
- Active challenges now show description, "How to Complete" explainer, difficulty badge
- Backend returns `explainer` for active challenges (was only in available challenges)

## Feature: Pre-fill Last Email on Login (Mar 19, 2026) ✅

## Bug Fix: Income Received/Pending Calculation (Mar 19, 2026) ✅
- **Issue**: Business income "Qnet1" with `selectedDate=2026-04-01` (starts in April) was incorrectly showing ₹2L as "Received" in March
- **Root Cause**: `int("2026-04-01")` fails → fallback to day 1 → `1 <= current_day` = true → marked as Received
- **Fix**: Created `_parse_selected_date()` helper that handles both full ISO dates and day numbers, checks if income applies to current month
- **Applied to**: All 3 income endpoints (`/list/summary`, `/monthly-summary`, `/{income_id}`)
- **Testing**: 12/12 tests passed

## Bug Fix: Income Edit Routing (Mar 19, 2026) ✅
- **Issue**: Clicking Edit on Salary income detail page redirected to Other Income form
- **Root Cause**: `getEditRoute()` in IncomeDetail.js was missing "Salary" and "Interest" type mappings
- **Fix**: Added `"Salary" → /job-income/{id}` and `"Interest" → /other-income/{id}` to the routes map

- On logout, saves user email to `localStorage`
- Login page pre-fills email field from last logged-in user

## Documentation: Admin Panel Guide (Mar 19, 2026) ✅
- Created `/app/memory/ADMIN_GUIDE.md` with detailed explanation of every element, metric, tab, and column across all 12 admin pages

## Bug Fix: Mobile UI Layout — BottomNav on Form Pages (Mar 19, 2026) ✅
- **Issue**: BottomNav was rendered on all form pages, obscuring Save/Submit buttons on mobile
- **Fix**: Removed BottomNav and AddActionSheet from 13 form files: CreditCardForm, LoanForm, GoalForm, InvestmentForm, InsuranceForm, ExpenseForm, AccountForm, OtherIncomeForm, JobIncome, SelfEmployedIncome, BusinessIncome, CommissionIncome, AssetForm
- **Non-form pages** (Dashboard, Wealth, Settings, MyGoals, Insights, etc.) still retain BottomNav
- **Testing**: 100% pass — all form pages verified without BottomNav, all list pages verified with BottomNav

## Bug Fix: Toast Notification Safe Area (Mar 19, 2026) ✅
- **Issue**: Toast notifications overlapped with mobile status bar
- **Fix**: Added `offset="max(16px, env(safe-area-inset-top, 16px))"` to Sonner Toaster component
- **CSS**: Added `[data-sonner-toaster] { top: env(safe-area-inset-top) !important }` for mobile
- **Added**: `.form-safe-bottom` CSS class for future form safe area padding needs
