# MoneySutra - Product Requirements Document

## Original Problem Statement
Comprehensive financial management app called "MoneySutra" with precise data intake, complex financial calculations, modern CRED-style UI modules, comprehensive test data, visual "Dream Tracker" goals, and family finance tracking.

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
- SMS + WhatsApp Notifications (Twilio MOCKED until credentials provided)
- Invite Landing Page (`/join/:code`): Public page with family info + app download CTA
- Invite Code on Registration: "Have an invite code?" section, auto-populated from URL
- Auto-Join Family on registration with valid invite code
- Referral Tracking in `referrals` collection
- Share Invite Link button on Family page (Web Share API + fallback)
- Phone validation: 10-digit mandatory for family members

### Category Picker Pages (Mar 2026)
- **Add Investment** (`/add-investment`): 19 category cards including new EPF option
- **Add Asset** (`/add-asset`): 10 asset type cards
- **Add Loan** (`/add-loan`): 9 loan type cards
- **Add Expense** (`/add-expense`): 11 expense category cards
- **Add Insurance** (`/add-insurance`): 9 insurance type cards
- All follow the same design pattern as Add Income page
- Clicking a category navigates to the form with type/category pre-filled via URL params
- All "Add" buttons across the app updated to navigate to category pickers

### Bug Fixes (Mar 2026)
- iOS Safe Area fix: `padding-top: env(safe-area-inset-top)` on `.App`
- FamilyToggle visibility: Shows toggle when family has 1+ members
- Notification green dot alignment
- Clipboard API fallback for invite code copy (document.execCommand fallback)

## Color Theme
- Goals Page: Dusty rose/mauve pink gradient (#9D4E6C → #C06C84 → #D4A5A5)
- Main App: Green brand (#059669)

## Key Credentials
- Google Login: `kumaramarendra10@gmail.com`, `chandrashekhar.iter@gmail.com`
- JWT Login: `moneyssutra@gmail.com` / `123456`
- Admin: `admin@moneyssutra.com` / `admin123`
- Preview Test: `demo@test.com` / `Demo@1234`

## Prioritized Backlog

### P0 — Pending User Action
- Twilio Credentials for SMS/WhatsApp (Account SID, Auth Token, Phone Number)

### P1 — Upcoming
- Finvu SDK Integration (Account Aggregator)
- Transaction Linking Design
- Phone-based login (user mentioned as future direction)

### P2 — Future
- Referral rewards system (tracking built, rewards logic pending)
- Auto AI Image generation for goals
- Monthly financial summary email/notification
- Profile Health Score
- Monthly Financial Report PDF generation
- Refactoring: Break down `ProfileSetup.js` (>1500 lines)

## Key Files
- `/app/frontend/src/pages/AddInvestment.js` — Investment category picker
- `/app/frontend/src/pages/AddAsset.js` — Asset category picker
- `/app/frontend/src/pages/AddLoan.js` — Loan category picker
- `/app/frontend/src/pages/AddExpense.js` — Expense category picker
- `/app/frontend/src/pages/AddInsurance.js` — Insurance category picker
- `/app/frontend/src/pages/AddIncome.js` — Income category picker (reference design)
- `/app/frontend/src/pages/InviteLanding.js` — Invite landing page
- `/app/frontend/src/InvestmentForm.js` — Investment form (EPF added)
- `/app/frontend/src/FamilyPage.js` — Family management + clipboard fix
- `/app/backend/notification_service.py` — Twilio SMS/WhatsApp (MOCKED)
- `/app/backend/routes/family.py` — Family + invite system
- `/app/backend/routes/auth.py` — Registration with invite code

## Test Reports
- `/app/test_reports/iteration_162.json` — Family invite system (13/13 PASS)
- `/app/test_reports/iteration_163.json` — Category picker pages (12/12 PASS)
