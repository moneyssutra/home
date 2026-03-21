# MoneySutra - Product Requirements Document

## Original Problem Statement
Comprehensive financial management app with precise data intake, complex financial calculations, modern CRED-style UI, comprehensive test data, visual "Dream Tracker" goals, family finance tracking, and shared financial responsibilities.

## Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Auth**: Emergent-managed Google Auth + JWT
- **Hosting**: Emergent Platform

## What's Been Implemented

### Core Features
- Financial tracking dashboard with gamified "Financial Health" system
- CRED-style Bank Accounts and Credit Cards pages
- Visual "Dream Tracker" goals page (dusty rose/mauve pink theme)
- Comprehensive seed data for test users including Family Hub
- Goal image upload API + keyword-based default images

### Family Invite/Referral System (Mar 2026)
- SMS + WhatsApp Notifications (Twilio MOCKED until credentials)
- Invite Landing Page, Registration with invite code, auto-join, referral tracking

### Category Picker Pages (Mar 2026)
- Add Investment (19 types incl. EPF), Add Asset (10), Add Loan (9), Add Expense (11), Add Insurance (9)
- All with bottom navigation, smart back (navigate(-1)), matching AddIncome design

### Family Member Health Page Fix (Mar 2026)
- **Backend**: `/api/family/member/{id}/summary` now returns frequency-normalized income/expenses, effectiveFunds, survivalDays, savingsRate, totalEMI
- **Frontend**: `useIntelligenceData.js` properly fetches and calculates health data for individual family members
- **Badges**: Generated dynamically from financial metrics (survival, savings rate, health score, EMI ratio, investments)
- **Challenges**: Context-aware challenges based on member's weak areas
- Both family combined view and individual member view now show proper badges/challenges

### Shared Loan Feature (Mar 2026)
- **"Share Loan with Family" toggle** in LoanForm with member selection + percentage input
- Backend creates shared loan references (`isSharedReference: true`) for co-applicants
- Each shared member gets their proportional outstanding/EMI amounts
- **Family combined view excludes shared references** to prevent double-counting
- Loan stored under primary owner + referenced copies for shared members

### Family Member Data Isolation (Mar 2026)
- **Backend**: All GET list endpoints (loans, expenses, insurance, credit-cards, income, other-income) now accept `?memberId=` and use `get_effective_user_filter()` to return only that member's data
- **Frontend**: MyLoans, MyExpenses, MyInsurance, MyIncome, MyLiabilities all import `useFamilyContext` and pass `memberId` to API calls when a specific family member is selected
- `useExpenseList` hook updated to support `memberId` filter parameter

### Comprehensive Family Data Isolation - Phase 2 (Mar 2026)
- **Backend**: Updated dashboard/networth, dashboard/breakdown, dashboard/combined, bank-overview, cc-overview, expenses/with-next-date, expenses/weekly-summary, expenses/behavior-insights — all now accept `?memberId=` via `get_effective_user_filter`
- **Frontend**: Updated 18+ pages to pass `memberId` when viewing a family member:
  - Dashboard (fetchMemberDashboard now uses networth API for proper counts/amounts)
  - Wealth page (fetchMemberWealth uses networth counts, not empty arrays)
  - MyAccounts, MyCreditCards, Portfolio
  - IncomeReceived, ExpectedIncome, ExpensesDone, UpcomingExpenses
  - BankAccountsExperimental, CreditCardsExperimental
  - FixedExpenses, VariableExpenses
  - ExpenseCalendar, ExpenseMonthly, ExpenseWeekly
- **FamilyToggle** added to Wealth page + Health/Insights page headers (was only on Dashboard before)

### Goal Form Wizard (Mar 2026)
- Restructured GoalForm from single long form to 5-step wizard: Type -> Name -> Image -> Amount/Date/Priority -> Link Sources/Notes
- Step indicator with checkmarks for completed steps, clickable to go back
- Auto-advance on goal type selection (except "Other")
- Per-step validation with error display
- Back/Next navigation with sticky bottom buttons
- Full edit mode support with delete option

### Back Button on Dreams Page (Mar 2026)
- Added `navigate(-1)` back button to MyGoalsVisual.js header

### Health Page Family Member Fix (Mar 2026)
- `useIntelligenceData` member view now uses `/api/dashboard/networth?memberId=` (same reliable API as Dashboard) instead of the old member summary endpoint
- Backend networth API now returns `totalEMI` and `effectiveFunds` fields for Health page calculations
- Challenges never empty: Added growth challenges (Super Saver 30%, 6-Month Safety Net, First Investment, Income Diversification, Health Star 75+, Consistency King)

### Bug Fixes
- iOS Safe Area, FamilyToggle visibility, Notification dot, Clipboard API fallback
- Bottom nav on all Add pages, Smart back navigation
- Health page zeros for family members
- Badges/Challenges empty for family views
- Family member list filtering (data bleed fix across all entity pages)
- GoalForm wizard blinking fix: replaced setTimeout with direct setStep() to avoid stale closures (Mar 2026)
- Added Close (X) button to GoalForm header when creating new goals (Mar 2026)
- Fixed Badges showing 7/7 (all unlocked incorrectly) - now shows proper unlocked/total count (Mar 2026)
- Fixed Challenges showing 0/1 - now shows proper completed/total count with dynamic challenges (Mar 2026)
- Biometric prompt: added "Skip for now" + "I'll set it up from Settings" options (Mar 2026)
- Edit Goal now starts at Step 4 (Amount/Date) instead of Step 1 (Type) for better UX (Mar 2026)
- Add button on Bank Accounts Experimental and Credit Cards Experimental pages now opens AddActionSheet (Mar 2026)
- Goals bottom nav and all references now use /dream-goals (new visual page), /my-goals redirects (Mar 2026)
- Edit Goal now shows all fields in single scrollable form with numbered sections (not wizard) for better editing UX (Mar 2026)
- Old /my-accounts redirects to /bank-accounts-experimental, old /my-credit-cards redirects to /credit-cards-experimental (Mar 2026)
- New Add Account type picker page: Cash, Bank Account, Wallet, Others options before form (Mar 2026)
- Fixed insurance coverage showing 0: coverageAmount field was not being checked (Mar 2026)
- Fixed family member badges showing 10/10: expanded to 30 badges in 8 categories matching backend (Mar 2026)
- Fixed Analytics charts not loading for family members: now fetches real data via memberId (Mar 2026)
- Fixed Reports not generating for family members: added get_effective_user_filter + memberId param (Mar 2026)
- Fixed Profile Health page + button not opening AddActionSheet (Mar 2026)
- Fixed GoalForm wizard keystroke refresh: converted Step arrow functions to plain JSX variables to prevent React remounting (Mar 2026)
- Deleted old pages: MyAccounts.js, MyCreditCards.js, MyGoals.js — all routes redirect to new experimental pages (Mar 2026)
- Wired AddActionSheet to BottomNav on all remaining pages: FamilyPage, DataImport, ProfileSetup (Mar 2026)
- Job Income form converted to 3-step wizard: Step 1 "Who pays you?" (Company + Type), Step 2 "How much & how often?" (Amount + Frequency grid), Step 3 "When to expect?" (Schedule + Save). Edit mode shows all fields at once. (Mar 2026)

## Key Credentials
- Google Login: `kumaramarendra10@gmail.com`, `chandrashekhar.iter@gmail.com`
- JWT Login: `moneyssutra@gmail.com` / `123456`
- JWT Test User: `test@moneysutra.com` / `Test@123` (MPIN: 1234)
- Admin: `admin@moneyssutra.com` / `admin123`

## Prioritized Backlog

### P0
- Twilio Credentials for SMS/WhatsApp

### P1
- Finvu SDK Integration (Account Aggregator)
- Transaction Linking Design
- Phone-based login

### P2
- Referral rewards, Auto AI goal images, Monthly summary, Profile Health Score, PDF reports
- Refactoring: `ProfileSetup.js` (>1500 lines)

## Test Reports
- iteration_162: Family invite system (13/13 PASS)
- iteration_163: Category picker pages (12/12 PASS)
- iteration_164: Health page + shared loans (9/9 PASS)
- iteration_165: Family member data isolation Phase 1 - backend 18/18 PASS, frontend 100%
- iteration_166: GoalForm wizard - frontend 100% PASS (all 5 steps verified)
- iteration_167: Comprehensive family data isolation Phase 2 - backend 23/23 PASS, frontend 100% (18+ pages)
- iteration_168: Health page member fix + challenges - backend 90% (9/10, 1 skipped), frontend 100%, challenges logic 3/3 PASS
- iteration_169: Financial Health member view fix - backend 14/14 PASS, frontend 100% (Health page fetches real member data)
- iteration_170: P0 Bug fixes verification - frontend 100% (5/5 PASS: GoalForm blinking fix, Close button, Badges 19/30 not 7/7, Challenges 0/6 not 0/1, Health page data)
- iteration_171: 4 UI fixes - frontend 100% (6/6 PASS: Biometric prompt options, Add button on experimental pages, Goals nav to /dream-goals, Edit Goal starts at step 4)
- iteration_172: 8 fixes - 100% (Edit Goal single form, page redirects, Add Account type picker, insurance coverage field, 30 badges, Analytics for members, Reports for members)
- iteration_173: 3 fixes - 100% (GoalForm keystroke fix, Profile Health + button, old pages deleted, Add button on all pages)
- iteration_174: Job Income wizard - 100% (9/9: 3-step wizard, step indicator, conditional fields, save flow, edit mode, no keystroke refresh)
