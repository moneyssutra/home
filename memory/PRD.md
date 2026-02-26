# MoneySSutra - Product Requirements Document

## Original Problem Statement
MoneySSutra is a sophisticated personal finance application — a "Financial Control Operating System" with gamified insights, advanced analytics, and forecasting tools. Built as a React/FastAPI/MongoDB full-stack app with PWA support.

## Core Architecture
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT + Google OAuth (Emergent-managed)
- **AI**: OpenAI GPT-5.2 via emergentintegrations
- **PDF**: reportlab for report generation
- **Scheduling**: apscheduler for cron jobs

## Test Credentials
- Username: `test@moneyssutra.com`, Password: `test`
- User: Rahul Sharma
- New/Empty User: `newuser@test.com` / `password`

## What's Been Implemented

### Full System Reset & E2E Validation (Feb 25, 2026)
- Complete database reset and fresh realistic test data seeded
- 6 income sources, 27 expenses (12 categories), 16 investments, 5 assets, 4 loans, 5 insurances, 3 credit cards, 3 bank accounts
- Full E2E testing: 100% backend (19/19), 100% frontend
- All calculations verified: Net Worth ₹87.8L, Financial Score 95/100, Survival Days 433

### Financial Health Module
- 10-metric financial health scoring system
- Life Insurance includes Term + ULIP combined
- Investment Allocation uses `investmentCategory` field correctly
- Retirement Readiness identifies NPS/PF/PPF
- Correct field mapping: `coverageAmount` for insurance, `principal` for investments

### Financial Score - Granular Tier Model
- 7-9 granular tiers per pillar for nuanced scoring
- Savings Rate, EMI Load, Safety Buffer, Income Consistency (25pts each)
- Info (i) icon with full tier criteria explanation
- Contextual help text per metric

### Expense Normalization
- Shared `normalizeToMonthly` utility across all pages
- Dashboard, MyExpenses, ExpenseBreakdown, FixedExpenses, VariableExpenses, CategoryExpenses all show consistent monthly totals

### Insurance Form
- Term Insurance + Life Insurance show Covered Person, Maturity Type, Premium Payment Term
- Auto-created expenses include userId correctly
- Premium End Date auto-populates from term

### Branding, PWA, Legal, Reports
- MoneySSutra branding, turquoise theme, Montserrat font
- PWA with service worker + manifest
- Terms, Privacy, Data Deletion pages
- Professional PDF/Excel report generation with font fallback

### UI/UX
- Bottom nav overlap fixed (pb-32 across 34 pages)
- Report Settings date pickers redesigned (flex layout)
- Notification swipe-to-dismiss with smooth animation
- Update button removed from Insights (only refresh remains)

### Insights Empty-State Fix (Feb 25, 2026)
- Fixed Insights page for new users with no data
- All widgets show empty-state fallback UI instead of disappearing
- `hasRealData()` helper distinguishes "no data" from "has data but low runway"

### Financial Health Smart Sort & Reorder (Feb 25, 2026)
- Smart sort by rawScore descending (best-performing metrics at top)
- Drag-to-reorder using @dnd-kit
- Custom order persisted in localStorage
- Toggle between "Best First" (smart) and manual reorder modes

### Enhanced Monthly Cashflow + Bug Fixes (Feb 26, 2026)
- Monthly Cash Flow card now shows 4 boxes: Received, Expected, Spent, Upcoming with progress bars
- Backend calculates schedule-based received/done
- Net Balance = Income Received - Expenses Done
- 4 new detail pages: /income-received, /expected-income, /expenses-done, /upcoming-expenses
- Fixed income source navigation and type icons
- Fixed backend type synonyms (Job↔Salary, Self-Employed↔Freelance)
- Fixed "Invalid Date" on 8 income type pages
- Fixed Quick Add sheet bottom icons and background scrolling
- Fixed 0 amount and validation errors across all forms
- Removed "Open" button from Reports page

### Unified Add Income Refactor + Bug Fixes (Feb 26, 2026)
- Created unified `/add-income` page with all 8 income types (Job, Business, Self-Employed, Rental, Commission, Interest, Dividend, Other Income)
- Updated AddActionSheet to route to `/add-income` instead of individual type pages
- Renamed "Salary" to "Job" and "Freelance" to "Self-Employed" in UI (MyIncome.js capitalizeType mapping)
- Backend type synonym filtering: Job↔Salary, Self-Employed↔Freelance
- Fixed/Variable income segments now populate correctly on all income type pages
- Fixed Self-Employed edit crash (fullName undefined error)
- **Tested**: 100% backend (9/9), 100% frontend (7/7 features verified) - `/app/test_reports/iteration_82.json`

### Dashboard, Login & Navigation Fixes (Feb 26, 2026)
- Added "My Income >" and "My Expenses >" navigation links in Monthly Cashflow widget on Dashboard
- Fixed back button on all 7 income form pages (Job, Business, Self-Employed, Rental, Commission, Interest, Dividend) to use `navigate(-1)` instead of hardcoded paths
- Implemented "Remember Me" on Login page: saves email+password to localStorage, prefills on next visit
- Fixed Net Worth card text visibility: "Total Net Worth", "Growing" badge, "Assets"/"Investments"/"Cash" labels now use font-semibold and text-shadow for better contrast on teal background
- **Tested**: 100% frontend (7/7 features verified) - `/app/test_reports/iteration_83.json`

### Income Redirect Refactor, UI & Bug Fixes (Feb 26, 2026)
- Interest/Dividend income "Add" flows now redirect to Investment page (`/investment`)
- Rental income "Add" flow now redirects to Asset page (`/asset`)
- Deleted InterestIncome.js, DividendIncome.js, RentalIncome.js form pages (routes removed from App.js)
- MyInterest/MyDividend list item clicks navigate to /my-investments, MyRental items to /my-assets
- All income form pages now scroll to top on load (window.scrollTo(0,0) in useEffect)
- Fixed OtherIncomeForm scroll conflict (conditionalRef scrollIntoView was overriding scrollTo on mount)
- Net Worth "Growing" badge now uses solid green gradient with glow effect, Cash indicator uses brighter #34D399, all labels use bold white with text-shadow
- Fixed notification swipe-to-dismiss bug (stale closure: captured swipingId in local variable before setTimeout)
- **Tested**: 100% frontend (9/9 features verified) - `/app/test_reports/iteration_84.json`

### Toggle Fix, Duplicate Income Check, Insights Restructure (Feb 26, 2026)
- Fixed "Already Received" toggle on OtherIncomeForm: background changed from dark #1E293B to themed var(--bg-card), text from dark #334155 to themed vars, toggle knob from dark to white
- Added duplicate income check on InvestmentForm: when typing investment name, checks if matching Interest/Dividend income already exists and shows warning
- **Insights Page Major Restructure** (3-layer architecture):
  - Layer 1 HERO: Large "X Days Safe / Stage Name / N levels to Sovereign" + "Improve My Position" CTA
  - Layer 2 ACTION: "How To Improve" with up to 3 dynamic suggestions based on savings rate, EMI load, buffer gap, pending challenges
  - Layer 3 COLLAPSIBLE: 9 accordion modules (Financial Score, Emergency Runway, Shock Test, Runway Simulator, Money Personality, Badges, Challenges, Future You, Personality Evolution) - all collapsed by default, only one open at a time, smooth 300ms animation
  - Progressive unlock: Shock Test (Stage 5), Simulator (Stage 7), Evolution (Stage 9), Challenges (Stage 12) - locked modules show blurred card + lock icon
  - Removed LevelAndStagesWidget from main layout, replaced with clean HeroSection
- **Tested**: Visual verification via screenshots

## Prioritized Backlog

### P1 (Upcoming)
- **Financial Command Center**: Cockpit dashboard with Control/Pressure/Risk indicators
- **Decision Impact Engine**: Simulate financial impact of large purchases

### P2 (Future)
- **Refactor Insights.js**: Break monolithic component into smaller reusable components
- **Security Settings**: 2FA and Biometric toggles are non-functional placeholders
- **File Structure Cleanup**: Organize pages from `/src/` root into subdirectories

## Key DB Collections
- users, profiles, user_sessions
- income_sources, expenses, insurances, investments, assets, loans, credit_cards, accounts
- income_transactions, expense_transactions
- user_gamification_profile, user_personality, user_personality_history
- weekly_digests, alerts, notifications, analytics_snapshots

## Data Model Notes
- Investment: requires `investmentMode` (str) and `principal` (float) fields
- IncomeSource: uses `type` and `name` (not incomeType/incomeName)
- Insurance: uses `coverageAmount` (not coverAmount/sumAssured)
- Income `incomeType` field: "fixed" or "variable" (seeded data may have legacy values like "Salary", "Freelance" which default to "fixed")
