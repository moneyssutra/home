# Moneyssutra - Personal Finance Tracker PRD

## Original Problem Statement
Build a comprehensive personal finance tracking application with multi-user workspace support, complete financial management features (income, expenses, assets, investments, loans, insurance, goals), and a modern, professional UI.

## Current Status
**Login & Password Recovery Refined** (Feb 22, 2026)

## What Was Implemented (Latest Session - Feb 22, 2026)

### 1. Refined Login & Password Recovery (COMPLETED)
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
- `/app/backend/atlas_triggers/variable_income_fallback.js` - Atlas Trigger function for 24-hour fallback
- `/app/backend/atlas_triggers/send_reminders.js` - Atlas Trigger function for hourly reminders
- `/app/docs/ATLAS_TRIGGERS_SETUP.md` - 5-step setup guide for MongoDB Atlas

### Modified Files (Feb 22)
- `/app/frontend/src/pages/Login.js` - Refactored with single identifier field
- `/app/frontend/src/pages/ForgotPassword.js` - Simplified password recovery

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
- `/app/test_reports/iteration_42.json` - Login & Password Recovery (100% pass)
- `/app/test_reports/iteration_39.json` - Variable Income backend (100% pass)
- `/app/test_reports/iteration_13.json` - Previous session tests

## Deployment Status
- **Health Check**: PASSED (Feb 21, 2026)
- Ready for production deployment
- Push notifications require HTTPS (working on preview URL)
