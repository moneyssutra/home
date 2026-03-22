# MoneySutra - Product Requirements Document

## Original Problem Statement
MoneySutra is a comprehensive financial management app with CRED-style step-based authentication. Core focus: financial tracking, insights, and family workspace management.

## Architecture
- **Frontend**: React (CRA) + Tailwind + Shadcn UI
- **Backend**: FastAPI + MongoDB Atlas
- **Auth**: CRED-style state machine (Email → OTP → MPIN)
- **Email**: Resend API (plain text for deliverability)
- **SMS**: Twilio (disabled pending DLT compliance)

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

## Bug Fixes (Latest Session - March 2026)
- Fixed `.gitignore` blocking `.env` files from deployment (root cause of OTP not working on deployed app)
- Fixed forgot-mpin cooldown missing `purpose` filter (could block OTP if another flow sent one recently)

## Prioritized Backlog
### P0 (Immediate)
- User must redeploy app after .gitignore fix for production OTP to work

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
- Email Test: chandrashekhar.iter@gmail.com
