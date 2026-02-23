# Moneyssutra - Personal Finance Tracker PRD

## Original Problem Statement
Build a comprehensive personal finance tracking application with multi-user workspace support, complete financial management features (income, expenses, assets, investments, loans, insurance, goals), and a modern, professional UI.

## Current Status
**All P0/P1 Tasks COMPLETED** (Feb 23, 2026)

## What Was Implemented (Latest Session - Feb 23, 2026)

### 8. Income Module UI/UX Fixes (COMPLETED ✅ - Feb 23, 2026)
**Feature**: Multiple fixes for income module navigation, data loading, and transaction editing.

**Issues Fixed**:
1. **MySelfEmployed Redesign**: Completely redesigned to match MyExpenses UI with summary cards (Fixed/Variable), quick filters (All/Fixed/Variable), and consistent styling.
2. **Back Button Navigation**: All income forms now navigate back to their respective list pages:
   - BusinessIncome → /my-business
   - JobIncome → /my-job
   - InterestIncome → /my-interest
   - SelfEmployedIncome → /my-self-employed
   - OtherIncomeForm → /my-other-income
3. **Instant Update/Delete**: Added SWR cache mutation to all income forms - changes reflect immediately without page reload.
4. **Frequency Fields Loading**: Fixed issue where frequency-dependent fields (selectedDay, selectedDate, etc.) were being reset when editing existing records.
5. **Other Income Page**: Fixed by creating dedicated `useOtherIncomeList` hook for `/api/other-income` endpoint.
6. **Transaction Edit Button**: Added edit functionality to TransactionHistoryPanel with pencil icon for non-locked transactions.
7. **Profession Dropdown**: Added extra padding to profession picker modal for last option visibility.

**Backend Changes**:
- Added `PUT /api/income-transactions/{transaction_id}` endpoint for editing transactions

**Frontend Changes**:
- Redesigned `MySelfEmployed.js` with SWR and filters
- Updated all income forms with SWR mutation and correct navigation
- Updated `TransactionHistoryPanel.js` with edit button
- Updated `IncomeAmountModal.js` to support editing existing transactions
- Added `useOtherIncomeList` hook to `useApi.js`
- Added `updateIncomeTransaction` function to `transactionApi.js`

**Testing**: 100% pass rate (11/11 backend tests, all frontend tests passed)
- `/app/test_reports/iteration_49.json`

---

### 9. Expense Category Module Restructure (COMPLETED ✅ - Feb 23, 2026)
**Feature**: Expense Breakdown page with category-specific navigation and smart pre-filling.

**New Features Implemented**:
1. **ExpenseBreakdown Page** (`/expense-breakdown`):
   - Total Monthly Expenses summary with Fixed/Variable breakdown
   - Categories with data shown first with progress bars and percentages
   - Empty categories shown as add-new cards
   - Clicking category navigates to `/expenses/{category}`

2. **CategoryExpenses Page** (`/expenses/:category`):
   - Filtered view of expenses for selected category
   - Summary cards (Fixed/Variable totals)
   - Quick filters (All/Fixed/Variable)
   - Contextual Add button redirects appropriately:
     - EMI → `/loan`
     - Insurance → `/insurance`
     - Investments → `/investment`
     - Others → `/expense?category={name}`

3. **Smart Back Navigation**:
   - All back buttons use `navigate(-1)` for proper browser history
   - Saves/deletes navigate back to previous page

4. **Category & Type Pre-filling**:
   - `/expense?category=Housing` pre-fills Housing AND sets Fixed type
   - Categories that default to Fixed: Housing, EMI, Insurance, Utilities, Subscriptions, Investments

5. **Investment Date Picker Fix**:
   - Monthly/Quarterly/Half-Yearly/Yearly now allows 1-31 days (was 28)
   - Note added for month-end handling

**Testing**: 100% pass rate
- `/app/test_reports/iteration_51.json`

---

### 7. Investment Form SIP Enhancements (COMPLETED ✅ - Feb 23, 2026)
**Feature**: Enhanced investment form with dynamic date pickers and auto-expense creation for SIP investments.

**New Features Implemented**:
1. **PPF and NPS Categories**: Added "PPF" and "NPS" to investment category dropdown
2. **Frequency-Based Date Pickers**:
   - **Weekly**: Day-of-week buttons (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
   - **Monthly/Quarterly/Half-Yearly/Yearly**: Day-of-month dropdown (1-28)
3. **Auto Create SIP Expense Toggle**:
   - Appears when frequency is set AND SIP amount > 0
   - When enabled, creates linked recurring expense on investment save
   - Expense details:
     - Name: "SIP - {investment_name}"
     - Category: "Investments"
     - Type: "Fixed"
     - Frequency: Matches investment frequency
     - selectedDay/selectedDate: Copied from investment

**Backend Changes**:
- Updated `Investment` model with `sipSelectedDay`, `sipSelectedDate`, `autoCreateExpense`, `isLiquidAsset`, `linkedExpenseId`
- Updated `Expense` model with `linkedInvestmentId` for bidirectional linking
- Modified `POST /api/investments` to auto-create expense when toggle is enabled

**Frontend Changes**:
- `InvestmentForm.js`: Added UI for frequency-based date pickers and auto-expense toggle
- Payload now includes new fields for backend processing

**Testing**: 100% pass rate (16/16 backend tests, all frontend tests passed)
- `/app/test_reports/iteration_48.json`
- `/app/backend/tests/test_investment_sip_expense_api.py`

---

## What Was Previously Implemented (Feb 23, 2026)

### 1. Automated Income Ledger System (COMPLETED ✅)
**Feature**: Overhauled Income Module to "dynamic ledger" system with unique, date-stamped transactions.

**Key Changes**:
- **Removed**: Old "Record Income" manual flow with overwrite logic
- **Added**: "Income Ledger" section replaces "Record Transaction"
- **Added**: "Add Today's Income" button for Variable income types
- **Added**: New streamlined `IncomeAmountModal` component
- **Updated**: Notification click opens Income Amount modal directly

**UI/UX Improvements**:
- **Income Amount Modal**:
  - Entity name in header with "Expected: ₹XXXX" reference in green
  - "Income Amount *" as primary input with ₹ prefix
  - Numeric keypad by default on mobile (inputMode="numeric")
  - Transaction Date auto-set to today
  - "Save Income" button in Moneyssutra Mint Green (#00D09C)

**Logic by Income Type**:
- **Fixed Income**: Auto-recorded based on frequency (label: "Auto-recorded based on frequency")
- **Variable Income**: Manual entry via "Add Today's Income" button (label: "Track your variable earnings")

**Forms Updated (ALL 8 COMPLETE ✅)**:
- BusinessIncome.js ✓
- JobIncome.js ✓
- RentalIncome.js ✓
- SelfEmployedIncome.js ✓
- CommissionIncome.js ✓
- DividendIncome.js ✓
- InterestIncome.js ✓
- OtherIncomeForm.js ✓ (Bug fixed: was using old RecordTransactionModal)

**New Components**:
- `IncomeAmountModal.js` - Streamlined modal for Variable income entry
- `NotificationBell.js` - Updated to open Income Amount modal on notification click

**Testing Status**:
- Frontend testing agent verified BusinessIncome Fixed/Variable UI ✓
- IncomeAmountModal functionality verified ✓
- Backend API (income-transactions) verified via curl ✓
- Bug fixed in OtherIncomeForm.js (was using old modal component) ✓

### 2. Income List Pages Redesign (COMPLETED ✅ - Feb 23, 2026)
**Feature**: Redesigned ALL 7 income list pages to match My Expenses page design and logic.

**Pages Updated**:
1. **MyBusiness.js** - Green gradient (#10B981 → #14B8A6)
2. **MyJob.js** - Blue-purple gradient (#3B82F6 → #8B5CF6)
3. **MyRental.js** - Orange-red gradient (#F59E0B → #EF4444)
4. **MyInterest.js** - Cyan-blue gradient (#06B6D4 → #3B82F6)
5. **MyCommission.js** - Pink-purple gradient (#EC4899 → #8B5CF6)
6. **MyDividend.js** - Purple-cyan gradient (#8B5CF6 → #06B6D4)
7. **MyOtherIncome.js** - Orange-pink gradient (#F59E0B → #EC4899)

**Design Features (Consistent Across All)**:
- **Gradient Header** with back button navigating to `/my-income`
- **Summary Card**: Total income, Fixed/Variable breakdown with Received/Pending
- **Income by Frequency/Category**: Visual breakdown with progress bars
- **Fixed vs Variable Cards**: Side-by-side cards showing top 3 entries
- **List Section**: Cards with status badges (Upcoming/Due Today/Received), frequency icons
- **Add New Button**: Dashed border CTA at bottom

### 3. Quick Filters on Income List Pages (COMPLETED ✅ - Feb 23, 2026)
**Feature**: Added All/Fixed/Variable filter buttons to all 7 income list pages.

**Implementation**:
- Filter buttons show in list section header with count (e.g., "All (12)", "Fixed (4)", "Variable (8)")
- Active filter has white background with brand color text
- Variable filter has warning yellow color
- Clicking filter instantly filters the list
- "No {filter} items found" message with "Show all" button when empty

**Pages with Filters**:
- MyBusiness, MyJob, MyRental, MyInterest, MyCommission, MyDividend (6 pages)

### 4. Notification → Modal Flow (COMPLETED ✅ - Feb 23, 2026)
**Feature**: Clicking income reminder notification opens IncomeAmountModal directly.

**Flow**:
1. User clicks notification bell → Panel opens
2. Shows income_reminder notification with "Expected: ₹X,XXX"
3. Click notification → IncomeAmountModal opens
4. Modal pre-filled with entity name and expected amount
5. User enters actual amount → Save Income
6. Transaction created, notification dismissed

**Testing**: 100% pass rate (14/14 features verified)

### 5. Auto-Record Fixed Income Scheduler (COMPLETED ✅ - Feb 23, 2026)
**Feature**: Backend scheduler auto-generates transactions for Fixed income on due dates.

**Implementation** (`server.py auto_record_fixed_income()`):
- Runs daily as part of background scheduler
- Checks all Fixed income sources
- Calculates if today is due date based on frequency (Daily, Weekly, Monthly, Quarterly, Half-Yearly, Yearly, Others)
- Creates income_transaction record with `source: "auto_fixed"`
- Creates notification: "Income Recorded: {name}"
- Prevents duplicates by checking existing transactions for today

### 6. Check Due Premiums Implementation (COMPLETED ✅ - Feb 23, 2026)
**Feature**: Auto-record insurance premium expense transactions on due dates.

**Implementation** (`server.py check_and_process_due_premiums()`):
- Runs daily via scheduler
- Supports One-Time, Monthly, Quarterly, Half-Yearly, Yearly frequencies
- Checks premium end date and policy end date
- Creates expense_transaction with `source: "auto_premium"`
- Creates notification for user
- **Business List Cards**: New card design with:
  - Frequency icons with color coding
  - Status badges (Upcoming/Due Today/Received)
  - Fixed/Variable income type labels
  - Next payment date for Fixed income
- **Consistent Styling**: Uses CSS variables for colors, shadows, and typography

### 2. Performance Optimization (COMPLETED - Feb 23, 2026)
**A. Database Indexing (MongoDB)**:
- Added compound indexes: `(userId, name)`, `(userId, type)`, `(entityId, transactionDate)`

**B. API Response Optimization**:
- `GET /api/income/list/summary` - Lightweight list with transaction stats
- `GET /api/expenses/list/summary` - Same for expenses

**C. Frontend Caching (SWR)**:
- Installed `swr` package
- Created `/hooks/useApi.js` with reusable hooks
- Updated MyBusiness.js, MyExpenses.js, MyIncome.js

---

### 2. Insurance Form Frequency Logic (COMPLETED)
**Feature**: Premium payment date selection mirrors BusinessIncome frequency logic.

**Implementation**:
- **Monthly**: Simple date picker
- **Quarterly**: Quarter → Month → Date cascade
- **Half-Yearly**: Half → Month → Date cascade
- **Yearly**: Month → Date picker

**Testing**: Verified all frequency modes work correctly in InsuranceForm.

---

### 3. Mobile Time Picker Visibility Fix (COMPLETED)
**Issue**: "Set Reminder Time" field was not showing options on mobile devices.

**Fix Applied**:
- Replaced `<select>` dropdown with native `<input type="time">` for better mobile support
- Implemented `showPicker()` API to force native time wheel to open on tap
- Applied CSS overrides: `WebkitAppearance: none`, `colorScheme: light`, white background
- Set `fontSize: 16px` to prevent iOS auto-zoom on focus
- Set `minHeight: 52px` for proper touch target size
- Added transparent calendar picker indicator covering full input for easier tapping
- Ensured high z-index (10+) so picker appears above other form elements

**Files Modified**:
- `/app/frontend/src/components/ReminderTimePicker.js` - Complete rewrite

**Forms Using This Component**:
- BusinessIncome.js, JobIncome.js, RentalIncome.js
- CommissionIncome.js, DividendIncome.js, InterestIncome.js
- SelfEmployedIncome.js

**Testing**: Verified on mobile viewport (390x844) - native time picker wheel opens correctly.

---

### 2. Historical Transaction Logging - Backend Complete
**Feature**: Implemented a transaction-based model for tracking income and expense entries while preserving historical data integrity.

**Backend Implementation**:
- **Income Transaction Endpoints**:
  - `POST /api/income-transactions` - Create new income transaction
  - `GET /api/income-transactions` - Get all income transactions with filters
  - `GET /api/income-transactions/history/{entity_id}` - Get complete history for an income source
  - `GET /api/income-transactions/monthly-summary` - Monthly aggregation for cash flow
  - `DELETE /api/income-transactions/{transaction_id}` - Delete (with 24-hour lock check)
  - `POST /api/income-transactions/{transaction_id}/adjust` - Create adjustment entries for locked transactions

- **Expense Transaction Endpoints** (NEW):
  - `POST /api/expense-transactions` - Create new expense transaction
  - `GET /api/expense-transactions` - Get all expense transactions with filters
  - `GET /api/expense-transactions/history/{entity_id}` - Get complete history for an expense
  - `GET /api/expense-transactions/monthly-summary` - Monthly aggregation by category
  - `DELETE /api/expense-transactions/{transaction_id}` - Delete (with 24-hour lock check)

**Data Model**:
- **IncomeTransaction**: `id`, `userId`, `entityId`, `entityType`, `entityName`, `amount`, `transactionDate`, `notes`, `source`, `isLocked`, `createdAt`
- **ExpenseTransaction**: `id`, `userId`, `entityId`, `entityName`, `category`, `amount`, `transactionDate`, `notes`, `source`, `isLocked`, `createdAt`

**Key Features**:
- **Immutable Records**: Transactions become locked after 24 hours
- **Adjustment Entries**: Create correction entries for locked transactions instead of modifying
- **Legacy Data Support**: Endpoints handle both new (userId present) and legacy (userId null) data
- **Database Indexes**: Added indexes for optimized querying on userId + transactionDate

**Architecture Decision**:
- **Dashboard continues using "expected" amounts** from templates (income_sources, expenses)
- **Transaction records store "actual" amounts** for historical accuracy
- This hybrid approach preserves budget vs. actual comparison capability

**Testing Results**:
- All CRUD operations tested via curl ✓
- Transaction creation, retrieval, deletion working ✓
- Monthly summaries aggregating correctly ✓
- Legacy data compatibility verified ✓

---

## What Was Implemented (Previous Session - Feb 22, 2026)

### 1. Mobile Notification Panel Redesign (COMPLETED)
**Feature**: Redesigned notification dropdown into a mobile-optimized bottom sheet drawer.

**UI Changes**:
- **Bottom Sheet Drawer**: Slides up from bottom with 300ms animation
- **Full Width**: 100% viewport width with 16px side margins (mx-4)
- **Backdrop Blur**: Dark overlay (bg-black/40) with backdrop-blur-sm
- **Fixed Header**: Bell icon, "Notifications" title, unread count, X close button
- **Scrollable Content**: Notifications scroll while header stays fixed
- **z-index**: 101 for drawer (above bottom nav at 50)

**Notification Card Design**:
- Mint green icons (Coins, RefreshCw, BellRing) based on notification type
- Proper text wrapping with break-words
- "View →" styled links with arrow icon
- Unread indicator (green dot)
- Timestamp display

**Interactions**:
- Swipe right to dismiss individual notifications
- Click X to close entire panel
- Click backdrop to close
- Click "View →" navigates and auto-closes panel
- "Mark all read" button in header

**Empty State**: "You're all caught up!" with Inbox icon

**Testing Results** (iteration_45.json):
- Frontend: 100% (11/11 features passed)

### 2. Asset Module Refinement (COMPLETED)
**Feature**: Made "Current Market Value" optional and enforced mandatory insurance selection.

**Current Market Value Changes**:
- Removed required validation - now shows "(Optional)" label
- Placeholder dynamically shows Purchase Value when entered
- Helper text: "Leave blank to use Purchase Value for Net Worth"
- `performSave` defaults to Purchase Value if left blank

**Insurance Validation Changes**:
- When toggle is ON, policy selection is mandatory (shows red asterisk *)
- Save blocked if no policy selected
- Toast notification using sonner: "Please select an insurance policy or turn off the insurance toggle to save."
- Red error message with AlertTriangle icon below dropdown
- Error clears when policy is selected
- "+ Add Insurance" button for quick policy creation

**Testing Results** (iteration_44.json):
- Frontend: 100% (10/10 tests passed)
- All validation scenarios verified ✓
- Toast notifications working ✓
- Default value logic verified ✓

### 2. Global Entity Uniqueness Validation (COMPLETED)
**Feature**: Real-time validation to prevent duplicate entity names for a single user.

**Implementation**:
- Backend API `/api/check-entity-uniqueness` - Supports all collections with case-insensitive search
- `useEntityUniqueness` hook - Reusable React hook with debouncing and abort controller
- Visual feedback: Loading spinner, green checkmark (unique), red X (duplicate)
- Disabled Save button when name is not unique

**Forms Updated**:
- BusinessIncome.js - Business Name validation
- JobIncome.js - Company Name validation
- AssetForm.js - Asset Name validation
- LoanForm.js - Loan Name validation
- CreditCardForm.js - Card Name validation
- InsuranceForm.js - Policy Name validation
- ExpenseForm.js - Expense Name validation
- DividendIncome.js - Investment Name validation
- InterestIncome.js - Source Name validation

**Testing Results** (iteration_43.json):
- Backend: 100% (14/14 tests passed)
- Frontend: 100% (all forms validated)
- Case-insensitive search works ✓
- Edit mode (exclude_id) works ✓
- Duplicate detection works ✓

### 2. Refined Login & Password Recovery (COMPLETED)
**Feature**: Simplified login to use single "Email ID or Mobile Number" field.

**Changes Made**:
- Replaced separate Username/Email fields with single "Email ID or Mobile Number" input
- Removed "Forgot Username" functionality entirely
- Updated Forgot Password to accept email OR mobile number
- Fixed duplicated JSX in Login.js (was broken from previous refactoring)
- Added "Remember Me" checkbox that extends session from 7 days to 30 days

**Files Modified**:
- `frontend/src/pages/Login.js` - Complete rewrite with single identifier field + Remember Me
- `frontend/src/pages/ForgotPassword.js` - Simplified to only handle password recovery
- `frontend/src/context/AuthContext.js` - Added remember_me parameter to login function
- `backend/server.py` - Updated JWTLoginRequest model and session duration logic

**Testing Results** (iteration_42.json):
- Backend: 100% (14/14 tests passed)
- Frontend: 100% (all UI features verified)
- Login with email works ✓
- Login with demo credentials works ✓
- Forgot Password accepts email/mobile ✓
- No "Forgot Username" exists ✓

### 2. MongoDB Atlas Triggers Documentation (COMPLETED)
**Feature**: Provide server-side functions and setup guide for Atlas Triggers.

**Files Created**:
- `/app/backend/atlas_triggers/variable_income_fallback.js` - 24-hour fallback function
- `/app/backend/atlas_triggers/send_reminders.js` - Hourly reminder function
- `/app/docs/ATLAS_TRIGGERS_SETUP.md` - 5-step setup guide

---

## What Was Implemented (Previous Session - Feb 21, 2026)

### 1. "Add Asset" Loop within Loan Module (COMPLETED)
**Feature**: Enable users to create a new Asset from the Add Loan page without losing progress.

**UI Changes**:
- Added `+ Add New Asset` button below "Linked Asset" dropdown (visible when toggle is ON)
- Shows helper text: "Link to Property, Vehicle, or other financed asset"

**Technical Logic**:
- `handleAddAsset()` function saves current loan form state to route state
- Navigates to `/asset` with `{ returnTo: '/loan', loanFormData: {...}, fromLoanFlow: true }`
- AssetForm's `handleBack()` returns to Loan with preserved data
- On asset save, auto-redirects back to Loan with `newAssetId` for auto-selection
- useEffect restores form fields from `location.state.loanFormData`

### 2. Automated Loan Tenure & End Date Logic (COMPLETED)
**Feature**: Auto-calculate End Date based on Start Date + Tenure Months.

**Implementation**:
- `useEffect` calculates End Date: `startDate.setMonth(startDate.getMonth() + tenure)`
- `endDateManuallySet` flag tracks if user manually overrode the calculation
- `handleTenureChange()` resets manual flag to allow auto-calculation
- `handleEndDateChange()` sets manual flag to true
- Tenure helper shows breakdown: "20 years 0 months" for 240 months
- End Date helper shows status: "Auto-calculated from start date + tenure" or "Manually set (override)"

**Edge Cases**:
- Minimum tenure validation (must be > 0)
- Reset logic: Clearing tenure clears End Date
- Manual override preserved until tenure is changed

### 3. Strict Date Validation Fix (COMPLETED)
**Bug Fixed**: `react-day-picker` `fromDate`/`toDate` props didn't prevent selection.

**Fix Applied**: Added explicit `disabled` function in RestrictedDatePicker:
```jsx
disabled={(date) => {
  if (toDate && date > toDate) return true;
  if (fromDate && date < fromDate) return true;
  return false;
}}
```

### 5. Username/Email Availability Check Fix (COMPLETED)
**Bug Reported**: User entered "test" which exists in the database, but system incorrectly showed "Available".

**Root Cause**:
- The check compared against the `name` field, but users login with their email prefix
- Test user's `name` was "Test User", not "test"
- Email was `test@moneyssutra.com`, so "test" needed to match the email prefix too

**Fix Applied**:
1. **Backend** (`/api/auth/check-availability`):
   - Case-insensitive search for both username and email
   - Username check now also searches for email prefix match (e.g., "test" matches "test@...")
   - Returns clear boolean + message

2. **Backend** (`/api/auth/register`):
   - Added duplicate username check before creating user
   - Also checks email prefix collision

**Testing Protocol Verified**:
- ✅ "test" (lowercase) → username_available: false
- ✅ "TEST" (uppercase) → username_available: false
- ✅ "test@moneyssutra.com" → email_available: false
- ✅ "TEST@MONEYSSUTRA.COM" → email_available: false
- ✅ New username/email → shows "available" with green checkmark
- ✅ Create Account button disabled when validation fails

### Test Results (Iteration 40)
- **Frontend**: 100% (all Loan form + Asset loop features verified)
- Tenure breakdown, End Date auto-calc, + Add New Asset, state preservation all working

## Key Files

### New Files This Session (Feb 22)
- `/app/frontend/src/hooks/useEntityUniqueness.js` - Reusable hook for uniqueness validation
- `/app/frontend/src/components/UniqueNameInput.js` - Input component with uniqueness feedback
- `/app/backend/tests/test_entity_uniqueness.py` - Backend test file for uniqueness endpoint
- `/app/backend/atlas_triggers/variable_income_fallback.js` - Atlas Trigger function for 24-hour fallback
- `/app/backend/atlas_triggers/send_reminders.js` - Atlas Trigger function for hourly reminders
- `/app/docs/ATLAS_TRIGGERS_SETUP.md` - 5-step setup guide for MongoDB Atlas

### Modified Files (Feb 22)
- `/app/frontend/src/pages/Login.js` - Refactored with single identifier field
- `/app/frontend/src/pages/ForgotPassword.js` - Simplified password recovery
- `/app/backend/server.py` - Added entity uniqueness endpoint and remember_me logic
- All form files (BusinessIncome, JobIncome, AssetForm, LoanForm, etc.) - Added uniqueness validation

### New Files Previous Session
- `/app/backend/push_service.py` - Push notification service
- `/app/frontend/public/sw.js` - Service worker
- `/app/frontend/src/utils/pushNotifications.js` - Push utilities
- `/app/frontend/src/components/PushNotificationToggle.js` - Toggle component

### Modified Files
- `/app/backend/server.py` - Added VAPID endpoint, updated cron jobs with push support
- `/app/frontend/src/Dashboard.js` - Added PushNotificationToggle
- `/app/frontend/src/components/NotificationBell.js` - Added error handling
- `/app/frontend/src/components/IncomeTypeToggle.js` - Fixed contrast issue

## Code Architecture
```
/app/
├── backend/
│   ├── server.py           # Cron endpoints, notification APIs
│   ├── push_service.py     # Push notification functions (NEW)
│   └── email_service.py    # Email templates
├── frontend/
│   ├── public/
│   │   └── sw.js           # Service worker (NEW)
│   └── src/
│       ├── Dashboard.js
│       ├── components/
│       │   ├── NotificationBell.js
│       │   ├── IncomeTypeToggle.js
│       │   ├── ReminderTimePicker.js
│       │   └── PushNotificationToggle.js  (NEW)
│       └── utils/
│           └── pushNotifications.js       (NEW)
```

## API Endpoints

### Cron Job Endpoints
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/cron/process-variable-income` | POST | Daily auto-entry processing | API Key |
| `/api/cron/send-reminder-notifications` | POST | Hourly reminder sending | API Key |

### Push Notification Endpoints
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/push/vapid-key` | GET | Get VAPID public key | None |
| `/api/push/subscribe` | POST | Subscribe to push | Session |
| `/api/push/unsubscribe` | DELETE | Unsubscribe | Session |

### Notification Endpoints
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/notifications` | GET | Get all notifications | Session |
| `/api/notifications/unread-count` | GET | Get unread count | Session |
| `/api/notifications/{id}/read` | PATCH | Mark as read | Session |
| `/api/notifications/mark-all-read` | PATCH | Mark all as read | Session |
| `/api/notifications/{id}` | DELETE | Delete notification | Session |

### Transaction Endpoints (NEW)
| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/income-transactions` | POST | Create income transaction | Session |
| `/api/income-transactions` | GET | Get income transactions | Session |
| `/api/income-transactions/history/{entity_id}` | GET | Get history for income source | Session |
| `/api/income-transactions/monthly-summary` | GET | Monthly income summary | Session |
| `/api/income-transactions/{id}` | DELETE | Delete transaction | Session |
| `/api/income-transactions/{id}/adjust` | POST | Create adjustment | Session |
| `/api/expense-transactions` | POST | Create expense transaction | Session |
| `/api/expense-transactions` | GET | Get expense transactions | Session |
| `/api/expense-transactions/history/{entity_id}` | GET | Get history for expense | Session |
| `/api/expense-transactions/monthly-summary` | GET | Monthly expense summary | Session |
| `/api/expense-transactions/{id}` | DELETE | Delete transaction | Session |

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
CRON_API_KEY=moneyssutra_cron_secret_2026
VAPID_PRIVATE_KEY=<base64 encoded key>
VAPID_PUBLIC_KEY=<base64 encoded key>
VAPID_CLAIMS_EMAIL=mailto:support@moneyssutra.com
```

## Upcoming Tasks

### P0 - Expense Category Module Restructure
- **Create Expense Breakdown Page**: New main page listing all expense categories
- **Category-Specific Pages**: EMI, Housing, Insurance, Utilities, etc. with filtered data
- **Contextual Add Buttons**: Redirect to appropriate forms (Add Loan, Add Insurance, Add Expense with pre-filled category)

### P1 - High Priority
- **MongoDB Atlas Triggers**: User needs to configure daily triggers using the provided guide at `/app/docs/ATLAS_TRIGGERS_SETUP.md`
  - Trigger 1: Daily fallback processing at 00:30 UTC
  - Trigger 2: Hourly reminders at :00
- Dark mode toggle
- PWA features (offline support, install prompt)
- Data export functionality

### P2 - Medium Priority
- Backend scheduler for expense deductions
- Loan amortization schedule view
- Enable actual email sending (configure Resend API key)

### P3 - Future
- Mobile biometric login
- Two-Factor Authentication (2FA)
- Mobile OTP/PIN authentication
- Refactor server.py into smaller route files

## Test Credentials
- **Test User**: test@moneyssutra.com / test
- **Cron API Key**: moneyssutra_cron_secret_2026

## 3rd Party Integrations
- **OpenAI GPT-5.2**: AI Smart Insights
- **Emergent Google Auth**: Social login
- **Resend**: Email service (MOCKED)
- **pywebpush**: Browser push notifications
- **react-day-picker**: Calendar component
- **MongoDB Atlas Triggers**: Scheduled cron jobs (setup required)

## Recent Test Reports
- `/app/test_reports/iteration_51.json` - Expense Module UX Fixes (100% pass)
- `/app/test_reports/iteration_49.json` - Income Module UI/UX Fixes (100% pass)
- `/app/test_reports/iteration_48.json` - Investment SIP Auto-Expense (100% pass)

## Deployment Status
- **Health Check**: PASSED (Feb 21, 2026)
- Ready for production deployment
- Push notifications require HTTPS (working on preview URL)
