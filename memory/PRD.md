# Moneyssutra - Personal Finance Tracker PRD

## Original Problem Statement
Build a comprehensive personal finance tracking application with multi-user workspace support, complete financial management features (income, expenses, assets, investments, loans, insurance, goals), and a modern, professional UI.

## Current Status
**Transaction-Based Data Model - Backend Complete** (Feb 22, 2026)

## What Was Implemented (Latest Session - Feb 22, 2026)

### 1. Historical Transaction Logging & Immutable Records - BACKEND COMPLETE
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

### P0 - Ready to Configure (User Action Required)
- **MongoDB Atlas Triggers**: User needs to configure daily triggers using the provided guide at `/app/docs/ATLAS_TRIGGERS_SETUP.md`
  - Trigger 1: Daily fallback processing at 00:30 UTC
  - Trigger 2: Hourly reminders at :00

### P1 - High Priority
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
- `/app/test_reports/iteration_45.json` - Mobile Notification Panel (100% pass)
- `/app/test_reports/iteration_44.json` - Asset Module Refinement (100% pass)
- `/app/test_reports/iteration_43.json` - Entity Uniqueness Validation (100% pass)

## Deployment Status
- **Health Check**: PASSED (Feb 21, 2026)
- Ready for production deployment
- Push notifications require HTTPS (working on preview URL)
