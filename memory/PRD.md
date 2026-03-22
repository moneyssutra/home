# MoneySutra - Product Requirements Document

## Original Problem Statement
MoneySutra is a comprehensive financial management app with CRED-style step-based authentication. Core focus: financial tracking, insights, and family workspace management.

## Architecture
- **Frontend**: React (CRA) + Tailwind + Shadcn UI
- **Backend**: FastAPI + MongoDB Atlas
- **Auth**: CRED-style state machine (Email → OTP → MPIN)
- **Email**: Resend API (plain text, sync calls for reliability)
- **SMS**: Twilio (disabled pending DLT compliance)
- **API Config**: Centralized `apiConfig.js` using `window.location.origin` for deployment portability

## What's Been Implemented
- Full CRED-style authentication (email check → OTP → MPIN setup/login)
- MPIN login with 3-attempt lockout (5-min cooldown)
- Forgot MPIN via email OTP
- MPIN change in Settings (current MPIN or OTP fallback)
- Async OTP email delivery via FastAPI BackgroundTasks
- Plain text OTP emails (bypasses Gmail spam filters)
- Sequential DB writes for OTP (no race conditions)
- Multi-OTP validation (accepts any unexpired/unused code)
- Family workspace with combined dashboard
- Financial Level System (backend rule engine: 0-100 score, 5 levels)
- Emergency Runway / Survival Clock
- Financial Control Score
- Money Pattern / Personality Engine (20 types)
- Shock Test Simulator
- Future Projection Engine
- Behavior Alerts
- Full expense/income/investment/loan/insurance CRUD
- Credit card tracking
- Goals system
- Gamification & notifications

## Key Technical Decisions
- OTP emails MUST remain plain text (Gmail blocks HTML variants)
- Never use asyncio.gather for OTP DB writes (race condition risk)
- OTP validation accepts ANY unexpired/unused code for the email (not just latest)
- Twilio SMS is code-complete but disabled via ENABLE_SMS_OTP=false
- Cooldown checks MUST filter by purpose field to avoid cross-flow contamination
- ALL email functions are sync (no async/asyncio.to_thread — causes silent failures)
- Frontend uses `window.location.origin` for API base URL (not build-time env var)

## Bug Fixes (Current Session - March 2026)
- Fixed `.gitignore` blocking `.env` files from deployment
- Fixed forgot-mpin cooldown missing `purpose` filter
- Removed all broken async/asyncio.to_thread wrappers from email_service.py
- Fixed sms_service.py await on now-sync send_otp_email
- Created centralized `apiConfig.js` using `window.location.origin` — fixes deployed app calling stale preview URL
- Updated 90 frontend files to use API_BASE instead of build-time REACT_APP_BACKEND_URL

## Prioritized Backlog
### P0 (Immediate)
- User must redeploy app for production fixes to take effect

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
- auth.py (1450+ lines) → split into sub-modules
- Login.js (600+ lines) → extract components
- ProfileSetup.js (1500+ lines) → modularize

## Credentials
- Test User: moneyssutra@gmail.com (has MPIN + family data)
- Test User: kumaramarendra10@gmail.com (has MPIN, firstName: Amar)
- Email Test: chandrashekhar.iter@gmail.com
