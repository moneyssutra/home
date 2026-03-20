# MoneySutra — Product Requirements Document

## Original Problem Statement
Full-stack financial management app ("MoneySutra") with React + FastAPI + MongoDB. Tracks income, expenses, assets, loans, insurance, investments, credit cards, goals with financial health insights, analytics, admin panel.

## Core Architecture
- **Frontend**: React (CRA/Craco) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI on port 8001
- **Database**: MongoDB Atlas (dual: `moneyssutra_dev` / `moneyssutra_prod`)
- **Auth**: JWT sessions + Google OAuth + MPIN + WebAuthn Biometric

## Feature: Profile Setup Overhaul (Mar 20, 2026) - COMPLETE
### What Changed
1. **Renamed** 'Strategic Setup' -> 'Profile Setup' across the app
2. **New Profile Health Grid** - Landing page with 5 category cards (Income, Expenses, Assets, Liabilities, Investments) showing individual completion status, progress ring, and overall %
3. **Extended Wizard** - Now covers ALL 5 categories (previously only 2):
   - Income: Type -> Amount -> Date (with deep details: name, frequency, account)
   - Expenses: Bucket-based (Essentials/Growth/Lifestyle)
   - Assets: Type selector (Bank/Property/Gold/Vehicle), multiple items, "I don't have any" option
   - Liabilities: Loan entry with "No debt" option (deep: loan type, rate)
   - Investments: Type selector (MF/Stocks/FD/PPF), "Not yet" option (deep: frequency)
4. **Progressive Disclosure** - "+ Add Deep Details" toggles on Income, Assets, Liabilities, Investments
5. **Fixed Completion Logic** - Skipped wizard steps now count as completed (was 40%, now 100% after wizard)

## Bug Fix: Duplicate Income (1.5L -> 50K) (Mar 20, 2026) - COMPLETE
### Root Cause
The onboarding save-step handler used `insert_one` for income sources without checking for existing entries. Running the wizard multiple times created duplicate income sources (3x ₹50K = ₹1.5L).
### Fix Applied
1. **Data Cleanup**: Deleted 2 duplicate "Monthly Salary" entries for moneyssutra@gmail.com, keeping 1 at ₹50K
2. **Upsert Logic for ALL onboarding steps**:
   - Step 1 (Income): Checks for existing onboarding source and updates instead of inserting
   - Steps 2-5 (Expenses/Assets/Liabilities/Investments): Deletes old onboarding entries before inserting new ones
3. **Aggregation Verified**: income.py monthly-summary pipeline is correct — it sums per-source, doesn't mix Expected/Received statuses

### Architecture
- **Component**: `/app/frontend/src/components/ProfileSetup.js` (replaces StrategicOnboarding.js)
- **Backend**: `/app/backend/routes/onboarding.py` (upsert logic + completion logic)
- **Entry Points**: Dashboard banner -> navigates to `/onboarding`, auto-popup for 0% users

## Key API Endpoints
- `/api/onboarding/profile-completion` - Returns completion % and per-category status
- `/api/onboarding/save-step` - Steps 1-5 with upsert logic
- `/api/onboarding/complete` - Marks onboarding done
- `/api/onboarding/dismiss` - Dismisses banner
- `/api/income/monthly-summary` - Monthly income summary
- `/api/dashboard/networth` - Dashboard data
- `/api/financial-health` - Financial health analysis

## Other Completed Features
- Auth: Email/password, Google OAuth, MPIN, Biometric (WebAuthn)
- Full CRUD: Income, Expenses, Loans, Assets, Accounts, Insurance, Investments, Credit Cards, Goals
- Dashboard, Financial health, Gamification, Notifications, Reports
- Admin panel with token-based auth
- CRED-Style Rolling Buttons
- Loan Given Investment Type with auto-repayment scheduler
- Skip Payment Feature for expenses
- Financial Health Wizard
- Wealth Page resilient data fetching (Promise.allSettled)
- Back button navigation loop fix
- Investment allocation detailed breakdown
- Reduced badges from 100 to 30
- Start date field for all income forms
- Mobile UI Layout fixes (BottomNav, safe areas, toasts)

## Prioritized Backlog
### P1
- Finvu SDK Integration (when credentials provided)

### P2
- Monthly financial summary notifications
- Profile Health Score (completion % + data freshness)
- Monthly Financial Report PDF generation

### P3
- Layout-based routing for pages with/without BottomNav
