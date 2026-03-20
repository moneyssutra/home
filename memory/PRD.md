# MoneySutra — Product Requirements Document

## Original Problem Statement
Full-stack financial management app ("MoneySutra") with React + FastAPI + MongoDB. Tracks income, expenses, assets, loans, insurance, investments, credit cards, goals with financial health insights, analytics, admin panel.

## Core Architecture
- **Frontend**: React (CRA/Craco) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI on port 8001
- **Database**: MongoDB Atlas (dual: `moneyssutra_dev` / `moneyssutra_prod`)
- **Auth**: JWT sessions + Google OAuth + MPIN + WebAuthn Biometric

## Feature: Targeted Module Wizards (Mar 20, 2026) - COMPLETE
### What Was Built
1. **Targeted Routing**: Clicking a category card on Profile Health Grid launches a module-specific wizard via `?module=income|expenses|assets|liabilities|investments` query param
2. **Module Isolation**: Each module shows only its own steps with a colored badge label. Income has 3 steps, others have 1 deep step each.
3. **Auto-expanded Deep Details**: In module mode, deep data fields are visible by default (no toggle needed). In full wizard mode, they remain behind "+ Add Deep Details" toggle.
4. **Deep Data Intake**:
   - Income: receivedDate (day of month), frequency, linked account
   - Expenses: dueDate (day), needOrWant (Need vs Want for Regret Flag engine)
   - Assets: purchaseDate, growthRate (%), linkedAccountId
   - Liabilities: interestRate, tenureRemaining (months), nextDueDate (day)
   - Investments: frequency, startDate, growthRate (%), linkedAccountId
5. **Contextual Tooltips**: Premium inline hints on all technical fields:
   - Income Frequency: "We use this to project your annual income"
   - Income Date: "We use this to notify you if your salary is delayed"
   - Asset Growth: "12% recommended for Indian Mutual Funds"
   - Loan Rate: "Helps calculate your real cost of borrowing"
   - Loan Tenure: "How many months left on this loan?"
   - Loan Due Date: "We'll remind you before it's due"
   - Investment Returns: "12% is a conservative estimate for Indian Mutual Funds"
6. **Exit Behavior**: Module wizards show "Save & Done" and return to Profile Health Grid (not Dashboard). Grid refreshes with updated completion %.
7. **Backend**: All deep fields persisted to MongoDB (expenses.dueDate, loans.tenureMonths, etc.)

## Feature: Profile Setup Overhaul (Mar 20, 2026) - COMPLETE
- Renamed 'Strategic Setup' → 'Profile Setup'
- Profile Health Grid with 5 category cards + progress ring
- Extended wizard covers all 5 categories
- Progressive Disclosure ("+ Add Deep Details" toggle)
- Fixed completion logic (skipped steps count as completed)

## Bug Fix: Duplicate Income (1.5L → 50K) (Mar 20, 2026) - COMPLETE
- Cleaned 2 duplicate income sources for moneyssutra@gmail.com
- Implemented upsert logic for all onboarding save-steps

## Key API Endpoints
- `/api/onboarding/profile-completion` - Returns completion % and per-category status
- `/api/onboarding/save-step` - Steps 1-5 with upsert logic + deep fields
- `/api/onboarding/complete` - Marks onboarding done
- `/api/onboarding/dismiss` - Dismisses banner
- `/api/income/monthly-summary` - Monthly income summary
- `/api/dashboard/networth` - Dashboard data
- `/api/financial-health` - Financial health analysis

## Key Components
- `/app/frontend/src/components/ProfileSetup.js` - Profile Health Grid + Targeted Module Wizards
- `/app/backend/routes/onboarding.py` - Backend save-step with upsert + deep fields
- `/app/frontend/src/Dashboard.js` - Banner → /onboarding navigation
- `/app/frontend/src/pages/OnboardingPage.js` - Route handler

## Prioritized Backlog
### P1
- Finvu SDK Integration (when credentials provided)

### P2
- Monthly financial summary notifications
- Profile Health Score (completion % + data freshness)
- Monthly Financial Report PDF generation

### P3
- Layout-based routing for pages with/without BottomNav
