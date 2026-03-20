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

### Architecture
- **Component**: `/app/frontend/src/components/ProfileSetup.js` (replaces StrategicOnboarding.js)
- **Backend**: `/app/backend/routes/onboarding.py` (updated skip handler + completion logic)
- **Entry Points**: Dashboard banner -> navigates to `/onboarding`, auto-popup for 0% users
- **Testing**: 100% backend (23/23), 100% frontend (all screens verified)

## Key API Endpoints
- `/api/onboarding/profile-completion` - Returns completion % and per-category status
- `/api/onboarding/save-step` - Steps 1-5 (income/expenses/assets/liabilities/investments)
- `/api/onboarding/complete` - Marks onboarding done
- `/api/onboarding/dismiss` - Dismisses banner
- `/api/dashboard/networth` - Dashboard data
- `/api/financial-health` - Financial health analysis
- `/api/loans` - Loans CRUD
- `/api/investments` - Investments CRUD

## Other Completed Features
- Auth: Email/password, Google OAuth, MPIN, Biometric (WebAuthn)
- Full CRUD: Income, Expenses, Loans, Assets, Accounts, Insurance, Investments, Credit Cards, Goals
- Dashboard, Financial health, Gamification, Notifications, Reports
- Admin panel with token-based auth
- CRED-Style Rolling Buttons
- Loan Given Investment Type with auto-repayment scheduler
- Skip Payment Feature for expenses
- Financial Health Wizard
- Strategic Onboarding v1 (now replaced by Profile Setup)
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
