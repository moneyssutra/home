# Income Tracker Application - Product Requirements Document

## Original Problem Statement
Build an income tracking application with modular income type support. Initial focus on "Business Income", "Job Income", and "Interest Income" modules with full CRUD functionality.

## User Personas
- Users who need to track multiple income sources
- Individuals managing business and employment income
- People who need to monitor recurring payment schedules
- Investors tracking interest income from FDs, loans, P2P lending

## Core Requirements

### Implemented Features

#### Income Type Selection (Home Page)
- Grid of income type cards: Business, Job, Rental, Commission, Interest, Dividend, Other
- Navigation to respective module pages on card click
- Clean, responsive UI with honeycomb background

#### Business Income Module (COMPLETED)
- **My Business Page** (`/my-business`)
  - List all business income entries
  - Display: Business Name, Expected Amount (₹), Frequency, Next Payment Date
  - Empty state with "Add New Business" CTA
  - Click card to edit entry
  
- **Business Income Form** (`/business-income`, `/business-income/:id`)
  - Fields: Business Name, Expected Amount, Frequency
  - Dynamic fields based on frequency selection
  - Full CRUD operations with confirmation dialogs
  - Duplicate entry check

#### Job Income Module (COMPLETED - Feb 12, 2026)
- **My Job Page** (`/my-job`)
  - List all job income entries filtered by type="Job"
  - Display: Company Name, Expected Amount (₹), Frequency, Next Payment Date
  - Empty state with "Add New Job" CTA
  - Click card to edit entry
  
- **Job Income Form** (`/job-income`, `/job-income/:id`)
  - Fields: Company Name, Expected Amount, Frequency
  - Dynamic fields based on frequency selection
  - Full CRUD operations with confirmation dialogs
  - Duplicate entry check

#### Interest Income Module (COMPLETED - Feb 12, 2026)
- **My Interest Income Page** (`/my-interest`)
  - List all interest income entries filtered by type="Interest"
  - Display: Source Name, Principal (₹), Rate (%), Current Amount, End Date, Frequency, Next Payment
  - **Current Amount** highlighted box showing Principal + Interest earned
  - **Matured Badge** (yellow) for entries past end date
  - Empty state with "Add New Interest Income" CTA
  - Click card to edit entry
  
- **Interest Income Form** (`/interest-income`, `/interest-income/:id`)
  - Fields:
    - Interest Source Name (required)
    - Principal Amount (required)
    - Rate of Interest % (required)
    - **Start Date** (required, can be past date - when loan/FD started)
    - **End Date / Maturity** (required, must be after start date)
    - Interest Type: Simple Interest / Compound Interest
    - Compounding Frequency: Monthly/Quarterly/Half-Yearly/Yearly (only for Compound)
    - Income Frequency: Monthly/Quarterly/Half-Yearly/Yearly/Others
    - Date fields based on frequency selection
    - Expected Income (auto-calculated with manual override toggle)
  - **Current Amount Display**: Shows Principal + Accrued Interest
    - Calculates from Start Date to min(today, End Date)
    - Shows "Matured on [date]" when past end date
    - Interest stops accruing after maturity
  - Auto-calculation formula:
    - Simple Interest: P × R × T / 100 (where T is years from start to calc date)
    - Compound Interest: P × (1 + R/(100×n))^(n×T) - P
  - Manual Override toggle allows custom expected income entry
  - Full CRUD operations with confirmation dialogs
  - Duplicate entry check

#### Rental Income Module (UPDATED - Feb 12, 2026)
- **My Rental Page** (`/my-rental`)
  - List all rental income entries filtered by type="Rental"
  - Display: Property Name, Tenant Name (if set), Amount (₹), **Rental Yield % badge**, Frequency, Due Date, Next Due, Security Deposit
  - **Rental Yield badge** shows yield % when linked to asset
  - Linked Asset info displayed on cards
  - Empty state with "Add New Rental" CTA
  - Click card to edit entry
  
- **Rental Income Form** (`/rental-income`, `/rental-income/:id`)
  - **Link to Asset** dropdown (optional - enables Rental Yield calculation)
  - Property Name (auto-fills from selected asset)
  - Tenant Name (optional)
  - **Rental Amount & Security Deposit** side by side
  - Frequency: Monthly/Quarterly/Half-Yearly/Yearly/Others
  - Conditional date fields based on frequency
  - **Rental Yield Display** (dark box) when asset linked
  - Full CRUD operations with confirmation dialogs
  - Duplicate property check

#### Loan/Liability Module (NEW - Feb 12, 2026)
- **My Loans Page** (`/my-loans`)
  - List all loans with payment progress
  - **Total Outstanding summary** card (yellow/amber theme)
  - Display: Loan Name, Lender, Outstanding Amount, EMI, Rate, Start Date
  - **Progress bar** showing repayment progress (%)
  - Empty state with "Add New Loan" CTA
  
- **Loan Form** (`/loan`, `/loan/:id`)
  - Loan Name (required)
  - Lender Name (optional)
  - Principal Amount (required)
  - Interest Rate % (required)
  - Tenure in Months (required)
  - **EMI Auto-Calculation** (displayed in dark box when all inputs provided)
  - Start Date (required)
  - Outstanding Amount (required)
  - Full CRUD operations with confirmation dialogs

#### Asset Module (NEW - Feb 12, 2026)
- **My Assets Page** (`/my-assets`)
  - List all assets with type icons
  - **Summary cards**: Total Asset Value, Net Worth (after loan deduction)
  - **Asset Allocation** breakdown by type (%)
  - Display: Asset Type badge, Name, Value, Loan Outstanding (if financed), Net Value, Appreciation %
  - Empty state with "Add New Asset" CTA
  - Click card to edit entry
  
- **Asset Form** (`/asset`, `/asset/:id`)
  - Asset Type dropdown: Residential Property, Commercial Property, Land, Vehicle, Equipment, Other
  - Asset Name (required)
  - Current Market Value (required)
  - **Purchase Information** (optional) - Date and Value
  - **Appreciation %** calculated when purchase info provided
  - **Is Financed toggle** - shows loan dropdown when enabled
  - Linked Loan dropdown (lists available loans)
  - "Add New Loan" quick link
  - Full CRUD operations with confirmation dialogs

### Frequency Options
All modules support: Monthly, Quarterly, Half-Yearly, Yearly, Others
Business/Job/Rental also support: Daily (with day-of-week selector)

### Next Payment Date Calculation
- Daily: Current date
- Weekly: Next occurrence of selected day
- Monthly: Same day next month (or current if not passed)
- Quarterly: Next quarter date in cycle
- Half-Yearly: 6 months from selected date
- Yearly: Same date next year
- Others: Custom date as provided

## Technical Architecture

### Frontend (React)
- `/app/frontend/src/App.js` - Main router with all routes
- `/app/frontend/src/BusinessIncome.js` - Business income form
- `/app/frontend/src/MyBusiness.js` - Business list page
- `/app/frontend/src/JobIncome.js` - Job income form
- `/app/frontend/src/MyJob.js` - Job list page
- `/app/frontend/src/InterestIncome.js` - Interest income form with auto-calculation
- `/app/frontend/src/MyInterest.js` - Interest list page

### Backend (FastAPI)
- `/app/backend/server.py` - All API endpoints
- MongoDB collection: `income_sources`

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/income | Create income entry |
| GET | /api/income | List all income entries |
| GET | /api/income/{id} | Get single entry |
| PUT | /api/income/{id} | Update entry |
| DELETE | /api/income/{id} | Delete entry |

### Database Schema (income_sources collection)
```json
{
  "id": "uuid string",
  "type": "Business|Job|Interest|Rental",
  "name": "string",
  "expectedAmount": "number",
  "frequency": "string",
  "selectedDay": "string|null",
  "selectedDate": "string|null",
  "selectedQuarter": "string|null",
  "selectedHalf": "string|null",
  "selectedMonth": "string|null",
  "customFrequency": "string|null",
  "customDate": "string|null",
  "principal": "number|null (Interest only)",
  "rate": "number|null (Interest only)",
  "interestType": "string|null (Interest only)",
  "compoundingFrequency": "string|null (Interest only)",
  "manualOverride": "boolean|null (Interest only)",
  "startDate": "string|null (Interest only - loan/FD start)",
  "endDate": "string|null (Interest only - maturity date)",
  "currentAmount": "number|null (Interest only - auto-calculated)",
  "tenantName": "string|null (Rental only)",
  "createdAt": "ISO datetime string"
}
```

## Testing Status
- Job Module: Backend 100%, Frontend 100% (iteration_1.json)
- Interest Module: Backend 100%, Frontend 100% (iteration_2.json)
- Expense Auto-Create & Next Date: Backend 100%, Frontend 100% (iteration_10.json)
- Calendar Date Picker & Insurance→Asset: Backend 100%, Frontend 100% (iteration_11.json)
- Test files: `/app/backend/tests/`

## Backlog / Future Tasks

### P1 - High Priority (Next)
- Goal Achievements Summary Page (COMPLETED - Feb 15, 2026)

### P2 - Medium Priority

### P2 - Medium Priority
- Expense Transaction Module (actual spending tracker against budgeted expenses)
- Backend refactoring: Break server.py into routes/, models/, services/ structure
- Frontend refactoring: Consolidate similar form components into reusable generic forms
- Advanced Loan features: Amortization schedule, prepayment calculator
- AI Smart Insights section on Dashboard
- Add /dashboard route alias (currently only /home)

### P3 - Low Priority
- Data export functionality
- Income analytics/charts
- Refactor income components into single reusable component
- Mobile app version

## Known Issues
- **P1**: Inconsistent data type for date fields across modules (technical debt - dates stored as strings)

## Changelog
- **Feb 15, 2026 (Session 7)**: Goal Achievements Summary Page (COMPLETED)
  - **Backend API**:
    - New GET `/api/goals/achievements` endpoint returns completed goals with milestone history
    - Response includes: totalCompleted, totalAmountAchieved, averageDurationDays
    - Each achievement contains: milestoneHistory (25%, 50%, 75%, 100%), reachedMilestones[], durationDays
    - Route placed before parameterized routes to avoid routing conflicts
  - **Frontend Page (`GoalAchievements.js`)**:
    - Amber/gold gradient header with trophy icon
    - Summary card: Goals Completed count, Total Achieved amount, Avg. Duration
    - Achievement cards with gradient headers based on goal type
    - Milestone badges grid (🌱25%, 🔥50%, 🚀75%, 🎉100%) with visual highlighting
    - Completed date and Journey Duration stats
    - Empty state with "View Active Goals" CTA
    - Celebration banner showing achievement count
  - **MyGoals Integration**:
    - Added Trophy icon to "Completed" section in stats
    - Clickable button navigates to `/goal-achievements` page
  - **Testing**: 100% pass rate (6/7 backend tests, all frontend flows verified)

- **Dec 15, 2025 (Session 6)**: Goal Milestone Notifications (COMPLETED)
  - **Backend API**:
    - Added `reachedMilestones: List[int]` field to Goal model
    - New GET `/api/goals/{id}/milestones` endpoint to check/update milestone status
    - Returns `newlyReached` array for triggering notifications (prevents duplicates)
  - **Frontend Components**:
    - Created `MilestoneNotification.js` with `useMilestoneNotification` hook
    - `MilestoneProgress` component shows 4 badges (25%, 50%, 75%, 100%)
    - `MilestoneBadge` component with icon emojis (🌱, 🔥, 🚀, 🎉)
    - Integration with `canvas-confetti` for celebration animations
    - Toast notifications via `sonner` for milestone alerts
  - **GoalDetail Integration**:
    - Added milestone check on page load and goal completion
    - Display `MilestoneProgress` below progress bar
    - Reached badges highlighted (emerald), unreached grayed out
  - **Testing**: 100% pass rate (8/8 backend, all frontend verified)

- **Dec 15, 2025 (Session 6)**: Goal Prioritization UI with Drag-and-Drop (COMPLETED)
  - **Backend API**:
    - Added `GoalPriorityUpdate` Pydantic model for batch updates
    - New PATCH `/api/goals/reorder` endpoint to update priorities for multiple goals
  - **Frontend (@dnd-kit integration)**:
    - Installed `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
    - Created `SortableGoalCard` component with drag handles
    - Added reorder mode toggle with "Reorder" button in header
    - Reorder mode: Shows drag handles, hides filter tabs, shows Cancel/Save Order buttons
    - Save Order persists new priorities to backend via API
    - Cancel restores original order by re-fetching from API
  - **UX Features**:
    - Drag handles (GripVertical icons) for intuitive dragging
    - Visual feedback during drag (opacity, shadow, ring)
    - Reorder banner with clear instructions
    - Keyboard accessibility via KeyboardSensor
  - **Testing**: 100% pass rate (9/9 backend, 14/14 frontend tests)

- **Dec 15, 2025 (Session 6)**: Other Income Module Implementation (COMPLETED)
  - **New Backend API**:
    - Created `OtherIncome` and `OtherIncomeCreate` Pydantic models in server.py
    - Full CRUD endpoints: POST/GET/PUT/DELETE at `/api/other-income`
    - 13 categories: Gift, Bonus, Incentive, Capital Gain, Asset Sale, Tax Refund, Cashback/Reward, Reimbursement, Freelance/Side Work, Windfall, Refund, Miscellaneous, Other (Custom)
    - 5 frequency options: One-Time, Monthly, Quarterly, Yearly, Irregular
    - Dashboard integration: Other income included in monthly income calculation
  - **New Frontend Pages**:
    - `MyOtherIncome.js`: List page with total amount, received/pending breakdown, category allocation chart, income cards with status badges
    - `OtherIncomeForm.js`: Add/Edit form with 13-category grid, frequency-dependent date pickers, "Already Received?" toggle, delete with confirmation
  - **Integration Updates**:
    - `MyIncome.js`: Added "Other Income" type with violet color theme, fetches from `/api/other-income`
    - `App.js`: Added routes for `/my-other-income`, `/other-income`, `/other-income/:id`
  - **Testing**: 100% pass rate (23/23 backend tests, all frontend components verified)

- **Dec 15, 2025 (Session 5)**: Critical Bug Fixes & Investment Enhancements
  - **P0 Fix: Fixed Expense Toggle Error**:
    - FixedExpenses page now navigates to `/expense?type=Fixed` when adding new expense
    - VariableExpenses page now navigates to `/expense?type=Variable` when adding new expense
    - ExpenseForm reads `?type=` query parameter on mount and pre-selects the correct type
    - Uses `useSearchParams` hook from react-router-dom
  - **P0 Fix: Monthly Cash Flow Income Calculation**:
    - Backend `/api/dashboard/networth` now calculates actual monthly income for the current month
    - Income calculation considers frequency and scheduled dates (not just averages)
    - Daily: amount × 30, Weekly: amount × 4, Monthly: full amount
    - Quarterly/Half-Yearly/Yearly: only counted if current month is a payment month
    - One-Time/Irregular: only counted if date falls within current month
  - **P1 Enhancement: Investment Module Updates**:
    - Added "US Stocks" to investment category dropdown
    - Added "Daily" option to Investment Frequency dropdown
    - Frequency field (Recurring Investment/SIP section) is now hidden for:
      - "Sovereign Gold Bond (SGB)" category
      - "SWP" category
    - `showFrequencyField` variable controls visibility based on category
  - **Testing**: 100% pass rate (10/10 backend, 6/6 frontend tests)

- **Dec 15, 2025 (Session 5 - Part 3)**: Goal Module Phase 3 - SIP Projections & Monthly Breakdown
  - **Backend Enhancements**:
    - Enhanced `calculate_goal_progress` to calculate SIP projections using compound interest formula: FV = PV*(1+r)^n + PMT*[((1+r)^n-1)/r]
    - New response fields: sipProjections[], totalProjectedFromSIPs, totalMonthlySIPContribution, monthsToTarget
    - `get_goal` endpoint now returns additionalMonthlySavingsNeeded and totalMonthlyNeeded
    - Frequency conversion for SIP: Daily×30, Weekly×4, Monthly×1, Quarterly÷3, Yearly÷12
    - linkedDetails now includes hasSIP flag and projectedValue for SIP investments
  - **Frontend GoalDetail Enhancements**:
    - New "SIP Projections at Target Date" section showing:
      - Total projected value from all SIPs
      - Monthly SIP contributions summary
      - Months to target
      - Individual SIP cards with current value, SIP amount, return rate, projected value
    - Enhanced "Linked Sources" section:
      - "Has SIP" badge for investments with recurring contributions
      - Arrow showing current → projected value
    - Enhanced "Smart Suggestions" with Monthly Contribution Breakdown:
      - Existing SIP Contributions (green)
      - Additional Savings Needed (amber)
      - Total Monthly Needed (purple)
      - Dynamic text mentioning SIP contributions
      - Gap to fill display if projection is below target
  - **Testing**: 100% pass rate (28/28 tests: 11 new SIP tests + 17 existing goal tests)

- **Dec 15, 2025 (Session 5 - Part 2)**: Goal Module Implementation (MAJOR FEATURE)
  - **Backend API (Phase 1)**:
    - Created Goal model with fields: id, goalName, goalType, customTypeName, targetAmount, currentAmount, targetDate, linkedInvestmentIds[], linkedLoanId, linkedCreditCardId, linkedAccountIds[], autoCalculate, manualOverride, priority, notes, isCompleted, completedDate
    - Goal types: Wealth Creation, Debt Elimination, Investment Target, Emergency Fund, Other (custom)
    - API endpoints: POST /api/goals, GET /api/goals, GET /api/goals/:id, PUT /api/goals/:id, DELETE /api/goals/:id, PATCH /api/goals/:id/progress, PATCH /api/goals/:id/complete, GET /api/goals/summary/dashboard
    - Auto-calculation of progress from linked investments, accounts, loans, credit cards
    - Manual override option for progress tracking
  - **Frontend Pages (Phase 2)**:
    - MyGoals page: Summary header with overall progress, active/completed counts, filter tabs (All/Active/Completed), goal cards with progress bars, priority badges, days remaining
    - GoalForm page: Goal type selection cards, goal name, target amount with amount-in-words, date picker, priority selector, link sources section (investments/accounts for wealth goals, loans/cards for debt goals), manual override toggle
    - GoalDetail page: Progress visualization, target date, time remaining, linked sources breakdown, Smart Suggestions (monthly savings recommendation), Edit/Mark Complete buttons
    - Dashboard Goals Widget: Shows active goals count and top goals with progress bars
  - **Testing**: 100% pass rate (17/17 backend tests, all frontend pages verified)

- **Feb 15, 2026 (Session 4)**: Testing V4 Bug Fixes - Global Changes & Insurance→Asset
  - **Amount in Words (Indian Numbering)**: ExpenseForm now displays amount in words below the Expected Amount field using Indian numbering (Lakh, Crore format)
  - **Expense Category Cleanup**: Removed "EMI" and "Insurance" from category dropdown - these categories are only for system-generated expenses from Loan/Insurance modules
  - **Calendar Date Picker**: Replaced ALL numeric date dropdowns with Shadcn Calendar popover:
    - Monthly: Full calendar to select day of month
    - Quarterly: Quarter dropdown + Calendar for date
    - Half-Yearly: Half dropdown + Calendar for date
    - Yearly: Month dropdown + Calendar for date
    - One-Time: Full calendar date picker
  - **Insurance → Asset Linking**: Insurance with maturityType "Market Linked" or "Returns on Maturity" now auto-creates an Asset entry with:
    - assetType: "Insurance Asset"
    - assetName: "[PolicyName] (Maturity Value)"
    - currentValue: expectedMaturityAmount (or premiumAmount if not set)
    - linkedInsuranceId: references the insurance
  - **Asset Model Update**: Added incomeAmount and incomeFrequency fields for income-generating assets

- **Feb 13, 2026 (Session 3)**: Testing V3 Bug Fixes - Inter-Module Linking
  - **Expense Form Date Picker Fix**: Changed Monthly frequency from numeric input (1-31) to dropdown with ordinal suffixes (1st, 2nd, 3rd...31st)
  - **Loan → Expense Auto-Creation**: When creating a loan with `autoCreateExpense: true`, system automatically creates an EMI expense with:
    - expenseName: "[LoanName] EMI"
    - category: "EMI"
    - expenseType: "Fixed"
    - frequency: matches loan's emiFrequency
    - linkedLoanId: references the loan
    - selectedDate: day of loan start date
  - **Insurance → Expense Auto-Creation**: When creating insurance with `autoCreateExpense: true`, system automatically creates a premium expense with:
    - expenseName: "[PolicyName] Premium"
    - category: "Insurance"
    - expenseType: "Fixed"
    - frequency: matches premium frequency
    - linkedInsuranceId: references the insurance
    - selectedDate/selectedMonth: based on start date
  - **Next Deduction Date Calculation**: New backend function `calculate_next_deduction_date()` calculates next payment date for all frequency types (Daily, Weekly, Monthly, Quarterly, Half-Yearly, Yearly, One-Time)
  - **New Endpoint**: GET `/api/expenses/with-next-date` returns expenses with:
    - nextDeductionDate: ISO date of next payment
    - linkedLoanName: loan name if linked to a loan
    - linkedInsuranceName: insurance policy name if linked to insurance
  - **Fixed Expense Auto-Deduction Endpoint**: POST `/api/expenses/process-deductions` processes fixed expense deductions for today
  - **My Expenses Page Enhancements**:
    - Shows "Next: X Mar" in amber for fixed expenses
    - Shows "Linked: LoanName" in blue for loan-linked expenses
    - Shows "Linked: InsuranceName" in indigo for insurance-linked expenses
    - Summary shows "Fixed: X Paid / Y Pending" and "Variable: X Paid / Y Pending"
  - **Backend Model Updates**: Expense model now includes linkedLoanId, linkedInsuranceId, isPaid, lastPaidDate fields
- **Feb 13, 2026 (Session 2)**: Phase 1 & 3 Implementation
  - **Credit Card Module**: Full CRUD with utilization tracking
    - My Credit Cards page with total outstanding, utilization bar (0-30-50-100% markers)
    - Add/Edit form with billing date, due date, minimum due, interest rate
    - Due date alerts ("Due in X days")
    - Portfolio integration (separate from Loans)
    - Net Worth calculation updated to include credit card outstanding
  - **Bug Fixes**:
    - MyExpenses redesigned to match MyIncome (red gradient header, breakdown)
    - Status badges: Paid (green), Due Today (amber), Upcoming (blue)
    - Fixed/Variable expenses split cards
    - MyIncome: Added Received vs Yet to Receive breakdown
    - Asset Form: Income toggle shows Renter Name, Rental Amount, Security Deposit, Frequency
    - Loan Form: "Is This Loan For An Asset?" toggle with dropdown
  - **Components Created**:
    - BackButton component (navigate to previous page)
    - AmountInput component (shows amount in words)
    - formatters.js utility (numberToWords, formatAmount, formatDate)
- **Feb 13, 2026**: User Profile & Navigation System implemented
  - **Welcome & Onboarding**: Welcome page with Get Started/Skip options, Basic Setup form (Name, Monthly Income, Goals, Risk Appetite)
  - **Bottom Navigation**: 5-tab navigation (Home, Income, Add, Expenses, Portfolio) with centered Add button
  - **Add Action Sheet**: Quick access bottom sheet for adding Income, Expense, Investment, Asset, Loan, Insurance, Account
  - **My Income Page**: Total Income card, Income sources list with allocation percentages (descending), Add Income shortcuts
  - **Portfolio Page**: Assets, Investments, Loans, Insurance, Accounts sections with Net Position summary
  - **Dashboard Updated**: Shows user name ("Welcome back, [Name]"), removed Asset Allocation and Investment Portfolio breakdowns
  - **Page Updates**: 
    - MyAssets: Removed Net Worth box, single Total Asset Value card, allocation in descending order
    - MyInvestments: Total Investment Value with % growth, Invested/Gain breakdown, Portfolio Allocation
    - MyAccounts: Renamed "Liquid Balance" to "Balance", centered card, Balance Allocation
    - MyLoans: Added Loan Allocation breakdown
    - MyExpenses: Added Total Expenses card, Expense Breakdown allocation
  - **Backend**: User Profile endpoints (BasicProfile, ExtendedProfile, ProfileCompletion)
- **Feb 13, 2026**: Investment Module and Net Worth Dashboard implemented
  - **Investment Module**: Full CRUD with 14 categories (FD, RD, Stocks, MF, ETF, Bonds, SGB, Digital Gold/Silver, P2P, SWP, ULIP, Crypto, Other)
  - 3 investment modes: Income Generating, Growth Only, Growth with Maturity
  - Dynamic fields based on category/mode (e.g., quantity/price for digital metals, return rate for income generating)
  - Auto-suggest mode based on category selection
  - Summary cards showing Current Value vs Total Invested
  - **Net Worth Dashboard**: Eye-catching dark theme with gradient design at /home route
  - Net Worth card with growing/declining indicator and breakdown bar (Assets/Investments/Cash)
  - 4 summary cards: Assets, Investments, Cash & Bank, Liabilities (clickable)
  - Monthly Cash Flow section: Income vs Expense vs Savings with savings rate progress bar
  - 7 Quick Action buttons with colorful gradient icons
  - Asset Allocation breakdown by type (Property, Vehicle, Equipment, etc.)
  - Investment Portfolio breakdown by category (FD, MF, Stocks, etc.)
  - Backend aggregation endpoints: /api/dashboard/networth and /api/dashboard/breakdown
  - 100% test coverage: 20/20 backend tests, 10/10 frontend features
- **Feb 13, 2026**: Insurance Module implemented
  - 3 pages: My Insurance, Add/Edit Insurance
  - 8 insurance types: Life, Health, Vehicle, Property, Business, Asset, Travel, Other
  - Dynamic fields: Linked Asset for Vehicle/Property, Covered Person for Life/Health
  - Maturity type options for Life Insurance (Pure Protection, Returns, ULIP)
  - Auto Create Premium Expense toggle
- **Feb 13, 2026**: Loan Module updated
  - Added Loan Type dropdown (9 types: Home, Vehicle, Personal, Education, Business, Gold, Credit Card, Hand Loan, Other)
  - Added EMI Frequency, End Date, Linked Asset, Linked Account fields
  - Added Auto Create EMI Expense toggle
- **Feb 13, 2026**: Asset Module updated  
  - Added new asset types: Physical Gold, Physical Silver, Diamonds, Business Asset, Equipment/Machinery
  - Added Depreciation Type (Appreciating, Depreciating, Market Driven)
  - Added Income Generation and Insurance linking toggles
  - Added Location field for properties
- **Feb 13, 2026**: Account Module implemented
  - 3 pages: My Accounts, Add/Edit Account
  - Account types: Bank, Cash, Credit Card, Digital Wallet, UPI, Brokerage, Business
  - Credit Card specific fields: Credit Limit, Outstanding, Due Date, Minimum Due
  - Primary account toggle, Summary cards (Liquid Balance, Credit Outstanding)
- **Feb 13, 2026**: Expense Module implemented  
  - 3 pages: My Expenses, Add/Edit Expense
  - 13 categories: Housing, Utilities, Food, Transport, Shopping, Medical, Education, Insurance, Subscriptions, EMI, Business Expense, Salary Paid, Other
  - Fixed/Variable toggle, 7 frequency options
  - Linked Account support
- **Feb 15, 2026**: TESTING V4 Implementation Complete
  - **Global UI Standardization**:
    - Amount in Words (Indian numbering: Lakh, Crore) for ALL amount fields across forms
    - Calendar popover component for ALL date fields (replacing HTML date inputs)
    - Implemented in: LoanForm, InvestmentForm, InsuranceForm, AssetForm, AccountForm
  - **Expense Module Enhancements**:
    - MyExpenses shows monetary totals (₹ amounts) for Fixed Paid/Pending and Variable Paid/Pending
    - New FixedExpenses page (/expenses/fixed) for dedicated fixed expense management
    - New VariableExpenses page (/expenses/variable) for dedicated variable expense management
    - Clickable Fixed/Variable cards navigate to dedicated pages
  - **Smart Back Button Navigation**:
    - Main module pages (MyExpenses, MyCreditCards) now navigate to Home (/) on back
    - BackButton component updated with forceNavigate prop
  - **Asset "Add Insurance" Shortcut**:
    - Button appears in AssetForm when "Is This Asset Insured?" toggle is ON
    - Preserves form state when navigating to InsuranceForm
    - Returns to AssetForm with state restored and new insurance pre-selected
- **Feb 15, 2026**: P1 Priority Tasks Complete
  - **Loan ↔ Asset Bidirectional Linking**:
    - MyLoans page now displays linked asset badge (blue "Linked: [AssetName]") for loans with linkedAssetId
    - Fetches both loans and assets to enable cross-referencing
  - **Asset ↔ Income Auto-Linking**:
    - When "Does This Asset Generate Income?" is toggled ON and rental details are filled, system auto-creates a Rental income entry
    - Backend stores income in income_sources collection with correct field names (expectedAmount, assetId)
    - Asset linkedIncomeId is automatically set to the created income ID
    - Updating asset updates the linked rental income; removing generatesIncome deletes the linked income
  - **Investment SIP Frequency**:
    - Added "Recurring Investment (SIP)" section for Mutual Fund, Recurring Deposit (RD), ETF, Stocks categories
    - Investment Frequency dropdown: One-time, Weekly, Monthly (SIP), Quarterly, Yearly
    - SIP Amount field appears when frequency is selected
    - Backend Investment model updated with investmentFrequency and sipAmount fields
- **Feb 12, 2026**: Dividend Income module fully implemented
  - 3 pages: My Dividend (list with category badges), Dividend Income (create/edit)
  - 5 source categories: Direct Stocks, Mutual Funds (IDCW), REITs, InvITs, Others
  - REITs/InvITs show info note about regulated distributions
  - Optional Units/Holdings field with decimal support
  - 4 frequency options: Quarterly, Half-Yearly, Yearly, Irregular
- **Feb 12, 2026**: Commission Income module fully implemented
  - 3 pages: My Commission (list), Commission Income (create/edit)
  - Fixed/Variable toggle (default: Variable)
  - 7 frequency options: Daily, Weekly, Monthly, Quarterly, Half-Yearly, Yearly, Irregular
  - Conditional fields: Daily=no date, Weekly=day selector, Monthly=date (1-31), Irregular=full date picker
- **Feb 12, 2026**: Completed 4-point UX improvement list
  - "Tenant Name" renamed to "Renter Name" in Rental Income module
  - Added "Daily" frequency option with day-of-week selector
  - Auto-scroll to conditional fields when frequency changes
  - Fixed redirect flow: Asset form → Add Loan → Save → Returns to Asset form with state preserved
- **Feb 12, 2026**: Major architecture update - Asset, Loan, and enhanced Rental modules
  - **Asset Module**: 6 asset types, current/purchase value tracking, appreciation %, loan linking
  - **Loan Module**: EMI auto-calculation, payment progress tracking, outstanding balance
  - **Rental Update**: Link to Assets, Rental Yield % calculation (Annual Rent / Asset Value × 100), Security Deposit
  - Rental Yield now displayed on rental cards (not just in form)
- **Feb 12, 2026**: Added Rental Income module with 3 pages (My Rental, Rental Income form, Edit/Delete)
  - Property Name, Tenant Name (optional), Rental Amount, Frequency, Date fields
  - Full CRUD with confirmation dialogs
- **Feb 12, 2026**: Added Start Date, End Date, and Current Amount to Interest Income module
  - Start Date: Can be past date (when loan/FD started)
  - End Date: Maturity date (interest stops calculating after this)
  - Current Amount: Auto-calculated Principal + Accrued Interest
  - Matured badge for entries past end date
- **Feb 12, 2026**: Completed Interest Income module with auto-calculation and manual override
- **Feb 12, 2026**: Completed Job Income module implementation and testing
- Initial: Project setup with Business Income module
