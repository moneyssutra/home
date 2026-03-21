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
- Backend: `/api/family/member/{id}/summary` returns frequency-normalized data
- Frontend: `useIntelligenceData.js` properly fetches health data for family members

### Shared Loan Feature (Mar 2026)
- "Share Loan with Family" toggle in LoanForm with member selection
- Backend creates shared loan references for co-applicants

### Family Member Data Isolation (Mar 2026)
- All GET list endpoints accept `?memberId=` for data filtering
- 18+ pages updated to pass memberId when viewing a family member

### Wizard Form Conversions Complete (Mar 2026)
All 12 financial data entry forms converted to step-by-step wizards using WizardShell.js:
1. JobIncome - 3-step wizard
2. BusinessIncome - wizard pattern
3. SelfEmployedIncome - wizard pattern
4. CommissionIncome - wizard pattern
5. OtherIncomeForm - wizard pattern
6. ExpenseForm - 3-step wizard (Name+Type -> Amount+Account -> Frequency+Schedule)
7. AccountForm - 2-step wizard (Info -> Balance+Details)
8. CreditCardForm - wizard pattern
9. InvestmentForm - 4-step wizard (Category/Mode -> Name -> Amount/Schedule -> Options)
10. LoanForm - 4-step wizard (Type/Name -> Amounts -> Schedule -> Options)
11. InsuranceForm - 4-step wizard (Type/Name -> Coverage/Premium -> Dates -> Details)
12. AssetForm - 4-step wizard (Type/Name -> Valuation -> Financing/Income -> Insurance/Notes)

### Confetti Animation + Category Lock (Mar 2026)
- All wizard forms fire canvas-confetti on successful save
- Category/Type fields completely hidden (not shown as chip) when pre-selected from category picker
- Step count stays SAME regardless of lock — type/category field just hidden from step 1
- Dynamic titles: "Add Housing Expense", "Add Home Loan", "Add Mutual Fund" etc.
- Applies to: InvestmentForm, LoanForm, InsuranceForm, AssetForm, AccountForm, ExpenseForm

### Backend Phase 1 Refactoring (Mar 2026)
- Created `/backend/services/financial_engine.py` — Central FinancialSnapshot class
- Created `/backend/services/financial_service.py` — Shared utilities
- Added `/api/dashboard/summary` — Single endpoint returning ALL financial data
- Added Pydantic field validators to Investment, Loan, Expense models

### Dashboard Performance Optimizations (Mar 2026)
- Single `/api/dashboard/combined` endpoint already in place (5-7 API calls → 1)
- Added 30-second TTL in-memory cache (TTLCache in database.py) for dashboard responses
- Cache auto-invalidated on create/update/delete across all 8 financial routes
- MongoDB indexes already comprehensive (userId, id, compound indexes for frequency/category queries)

### Family View Data Consistency Fix (Mar 2026)
- Fixed bug where list pages (MyExpenses, MyIncome, MyInvestments, MyLoans, MyAssets, MyInsurance) showed personal data instead of combined family data when dashboard was toggled to Family View
- Backend `get_effective_user_filter` in utils.py accepts `?family=true` and builds `$in` filter for all family members
- Updated `useExpenseList` hook in useApi.js to support `family` filter parameter
- Fixed MyExpenses.js `fetchMonthExpenses` to correctly pass `family=true` to by-month endpoint
- All 6 list pages correctly construct `?family=true` query param when `isFamilyView` is active
- Tested: 19/19 backend API tests passed, 6/6 frontend pages verified (iteration_179)

### Family Data Summary Badge (Mar 2026)
- Added `/api/family/quick-summary` endpoint returning memberCount and combinedNetworth
- FamilyToggle dropdown now shows "3 members, ₹2.4L combined" on the Family option
- Toggle button shows member count in parentheses when family view is active
- FamilyContext fetches quick summary in parallel with family data (no extra load time)
- Tested: iteration_180 - 7/7 backend tests, frontend verified

### Email Branding Update (Mar 2026)
- Sender updated from `Moneyssutra <noreply@moneyssutra.app>` to `MoneySSutra Support <noreply@moneyssutra.com>`
- All email templates updated with correct "MoneySSutra" branding (username reminder, password reset, password changed)
- Tested: iteration_180 - env vars and template branding verified

### Rule-Based Financial Insights Engine (Mar 2026)
- Replaced AI/GPT-based ai_insights.py with deterministic rule engine
- 10 financial rules: expense ratio, savings rate, emergency fund, investments, debt burden, insurance gaps, credit utilization, loan exposure, overall health
- Financial Level System: 5 levels (Survival → Stability → Security → Growth → Freedom) with 0-100 score
- Action-based insights with specific amounts in Indian notation (₹L/Cr)
- Priority sorting (critical > high > medium > low)
- Removed ALL OpenAI/GPT/prompt dependencies

### Wizard Form Step Layout Updates (Mar 2026)
- InvestmentForm: Empty category-only page removed when locked (3 steps). Name + Mode merged into "Investment Details" step.
- LoanForm: Step 1 heading renamed to "Loan & Lender Name"
- InsuranceForm: Step 1 heading renamed to "Policy Details"
- All forms: Improved padding (WizardShell pt-6, step headings mb-5) for better breathing room
- ProfileSetup: Category cards now link to dedicated Add Forms (/add-income, /add-expense, /add-asset, /add-loan, /add-investment)

- iOS Safe Area, FamilyToggle visibility, Notification dot, Clipboard API fallback
- Bottom nav on all Add pages, Smart back navigation
- Health page zeros for family members, Badges/Challenges empty for family views
- GoalForm wizard blinking fix, Close button, proper badge counts
- Biometric prompt skip options, Edit Goal UX improvements
- Analytics/Reports for family members, Profile Health page fix
- GoalForm keystroke refresh fix, old pages deleted

## Key Credentials
- Google Login: `kumaramarendra10@gmail.com`, `chandrashekhar.iter@gmail.com`
- JWT Login: `moneyssutra@gmail.com` / `123456`
- JWT Test User: `test@moneysutra.com` / `Test@123` (MPIN: 1234)
- Admin: `admin@moneyssutra.com` / `admin123`

## Prioritized Backlog

### P0
- Implement "Financial Level" System (USP/Top Priority)
- Twilio Credentials for SMS/WhatsApp (currently MOCKED)

### P1
- Backend Refactoring Phase 2: Pydantic validation sweep, naming conventions, remove DB calls in loops
- Finvu SDK Integration (Account Aggregator)
- Transaction Linking Design

### P2
- Redis caching for dashboard + Pagination for lists
- Auto AI goal images, Monthly summary email/notification
- Refactoring: `ProfileSetup.js` (>1500 lines), `Dashboard.js` (>700 lines)

## Test Reports
- iteration_180: Family quick summary badge + email branding - backend 100% (7/7), frontend 100%
- iteration_179: Family View data consistency fix - backend 100% (19/19 API tests), frontend 100% (6/6 pages)
- iteration_177: Wizard form step structure revert - frontend 100% (all 6 forms: correct step counts, hidden type/category when locked, validation, save button on final step)
- iteration_176: Code review of locked category removal
- iteration_175: Investment/Loan/Insurance wizard forms
- iteration_174: Job Income wizard
- iteration_173: GoalForm keystroke fix, Profile Health, old pages deleted
