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
- **SMS + WhatsApp Notifications**: Twilio integration (MOCKED until credentials are provided). When adding a family member, SMS + WhatsApp invite is triggered with app download link and invite code.
- **Invite Landing Page** (`/join/:code`): Public page showing family info, invite code, and CTA to download app or register on web. Detects OS for app store redirect.
- **Invite Code on Registration**: "Have an invite code?" collapsible section on registration form. Auto-populates from URL param (`/login?invite=CODE`). Valid codes show family name + inviter info with green check.
- **Auto-Join Family**: When registering with a valid invite code, user is automatically added to the family. If their phone matches a pending member, their relationship is pre-filled.
- **Referral Tracking**: All family joins via invite code are tracked in `referrals` collection for future reward system.
- **Share Invite Link**: Family page has "Share Invite Link" button using Web Share API (fallback: clipboard copy).
- **Phone Validation**: Family member phone is mandatory (10-digit), with real-time validation in the add member form.

### Bug Fixes
- iOS Safe Area fix: `padding-top: env(safe-area-inset-top)` on `.App` wrapper
- FamilyToggle visibility fix: Shows toggle when family has 1+ members (not 2+)
- Notification green dot alignment fix

## Color Theme
- Goals Page: Dusty rose/mauve pink gradient (#9D4E6C → #C06C84 → #D4A5A5)
- Main App: Green brand (#059669)

## Key Credentials
- Google Login: `kumaramarendra10@gmail.com`, `chandrashekhar.iter@gmail.com`
- JWT Login: `moneyssutra@gmail.com` / `123456`
- Admin: `admin@moneyssutra.com` / `admin123`

## Prioritized Backlog

### P0 — Pending User Action
- **Twilio Credentials**: Need Account SID, Auth Token, Phone Number to activate SMS/WhatsApp notifications (currently MOCKED)

### P1 — Upcoming
- Finvu SDK Integration (Account Aggregator)
- Transaction Linking Design
- Phone-based login (user mentioned as future direction)

### P2 — Future
- Referral rewards system (tracking is built, rewards logic pending)
- Auto AI Image generation for goals
- Monthly financial summary email/notification
- Profile Health Score
- Monthly Financial Report PDF generation
- Refactoring: Break down `ProfileSetup.js` (>1500 lines)

## Key Files
- `/app/backend/notification_service.py` — Twilio SMS/WhatsApp service (MOCKED)
- `/app/backend/routes/family.py` — Family CRUD, invite-info endpoint, notification trigger, referral tracking
- `/app/backend/routes/auth.py` — Registration with invite code auto-join
- `/app/backend/server_models.py` — RegisterRequest with inviteCode field
- `/app/frontend/src/pages/InviteLanding.js` — Invite landing page
- `/app/frontend/src/components/RegisterForm.js` — Registration with invite code section
- `/app/frontend/src/pages/Login.js` — Passes invite code from URL
- `/app/frontend/src/FamilyPage.js` — Add member with phone + notifications + share invite
- `/app/frontend/src/App.css` — iOS safe area fix
- `/app/frontend/src/components/FamilyToggle.js` — Profile switcher

## Key API Endpoints
- `GET /api/family/invite-info/{code}` — Public: Lookup invite code info
- `POST /api/family/add-member` — Add member + trigger SMS/WhatsApp
- `POST /api/family/join/{code}` — Join family with referral tracking
- `POST /api/auth/register` — Register with optional inviteCode for auto-join
- `GET /api/dashboard/combined` — Core dashboard endpoint

## DB Collections
- `families` — Family groups with members, inviteCode
- `referrals` — Tracks invite code usage for reward system
- `goals` — With goalImage field
- `insurances` — Always plural

## Test Reports
- `/app/test_reports/iteration_162.json` — Family invite system (13/13 PASS)
