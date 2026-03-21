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

### Bug Fixes
- iOS Safe Area, FamilyToggle visibility, Notification dot, Clipboard API fallback
- Bottom nav on all Add pages, Smart back navigation
- Health page zeros for family members
- Badges/Challenges empty for family views

## Key Credentials
- Google Login: `kumaramarendra10@gmail.com`, `chandrashekhar.iter@gmail.com`
- JWT Login: `moneyssutra@gmail.com` / `123456`
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
