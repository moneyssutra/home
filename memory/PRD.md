# MoneySutra - Product Requirements Document

## Original Problem Statement
MoneySutra is a comprehensive financial management app with CRED-style step-based authentication. Core focus: financial tracking, insights, and family workspace management.

## Architecture
- **Frontend**: React (CRA) + Tailwind + Shadcn UI
- **Backend**: FastAPI + MongoDB Atlas
- **Auth**: CRED-style state machine (Email -> OTP -> MPIN)
- **Email**: Resend API (plain text, sync calls for reliability)
- **SMS**: Twilio (disabled pending DLT compliance)
- **API Config**: Centralized `apiConfig.js` using `window.location.origin`

## Key Technical Decisions
- OTP emails MUST remain plain text (Gmail blocks HTML variants)
- Never use asyncio.gather for OTP DB writes (race condition risk)
- ALL email functions are sync (no async/asyncio.to_thread)
- Frontend uses `window.location.origin` for API base URL (not build-time env var)
- Emergency Runway uses only ESSENTIAL expenses (not all Fixed expenses)
- isEssential smart defaults: name patterns override category-based defaults

## Completed Features (Current Session - March 2026)
- Fixed `.gitignore` blocking `.env` files from deployment
- Fixed forgot-mpin cooldown missing `purpose` filter
- Removed all broken async/asyncio.to_thread wrappers from email_service.py
- Created centralized `apiConfig.js` using `window.location.origin`
- Updated 90 frontend files to use API_BASE instead of build-time env var
- **Essential Expenses System**: Smart defaults + user override for `isEssential` flag
  - Backend: `compute_is_essential()` in expenses.py with name pattern + category logic
  - PATCH /api/expenses/{id}/essential endpoint for user toggles
  - intelligence.py `_get_monthly_mandatory_expense` now filters by essential only
  - Frontend: Essential/Non-essential breakdown in FixedExpenses header
  - Frontend: Shield toggle per expense card in FixedExpenses list
  - Frontend: "Survival Essential?" yes/no toggle in ExpenseForm for Fixed expenses
  - Result: For user sandeepdash24, Monthly Essentials dropped from Rs.71K to Rs.16K (77% reduction by correctly excluding SIPs/EPF)
- **HD Bank Logos (CRED-style)**: Replaced blurry Google Favicon API (128px max) with HD SVG vector logos from curated open-source repo (`praveenpuglia/indian-banks`). 22 major Indian banks now use crisp SVGs; fintechs/international banks fall back to Google Favicon. Updated BankLogo component with SVG-aware sizing.

## Smart Essential Defaults
- **Essential categories**: Housing, Utilities, Food, Medical, Education, Salary Paid, EMI
- **Non-essential name patterns**: sip, mutual fund, mf, ppf, nps, elss, etf, gold saving, investment
- **Essential name patterns**: emi, loan, rent, insurance premium, premium, petrol, diesel, fuel, commute, transport, electricity, water bill, gas bill, grocery, medicine, school fee, tuition
- Name patterns have PRIORITY over category defaults
- User explicit override (isEssential field) has HIGHEST priority

## Prioritized Backlog
### P0 (Immediate)
- User must redeploy app for all fixes to take effect on production
- ~~Admin Safety Days mismatch~~ — FIXED: admin was counting ALL Fixed expenses, now uses `compute_is_essential()` to match user-facing survival-clock

### P1 (Next Up)
- Financial Level System UI (frontend dashboard visual for score/level)
- Finvu SDK Integration (Account Aggregator)
- Transaction Linking Design

### P2 (Future)
- Biometric WebAuthn (Phase 2)
- Device Trust mapping
- Redis caching upgrade
- Pagination for large lists
- Monthly financial summary email/PDF

### Refactoring
- auth.py (1450+ lines) -> split into sub-modules
- Login.js (600+ lines) -> extract components
- ProfileSetup.js (1500+ lines) -> modularize

## Credentials
- Test User: moneyssutra@gmail.com / MPIN: 1234
- Test User: kumaramarendra10@gmail.com (has MPIN, firstName: Amar)
- Test User: sandeepdash24@gmail.com (prod, has 10 Fixed expenses)
