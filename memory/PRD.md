# MoneySutra — Product Requirements Document

## Original Problem Statement
Build and maintain a full-stack financial management app ("MoneySutra") with React + FastAPI + MongoDB. The app tracks income, expenses, assets, loans, insurance, investments, credit cards, goals, and provides financial health insights, analytics, admin panel, and more.

## Core Architecture
- **Frontend**: React (CRA with Craco) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) on port 8001
- **Database**: MongoDB Atlas (dual-database: `moneyssutra_dev` for preview, `moneyssutra_prod` for production)
- **Auth**: JWT sessions (cookie-based) + Emergent Google OAuth + MPIN login + WebAuthn Biometric login
- **Admin**: Token-based auth (localStorage + Bearer header), fully isolated from main app

## Key Environment Variables
- `CUSTOM_MONGO_URL` / `CUSTOM_DB_DEV` / `CUSTOM_DB_PROD` — Auto-switching DB logic in `database.py`
- `REACT_APP_BACKEND_URL` — Frontend API base URL
- Admin credentials: Read from `ADMIN_EMAILS` and `ADMIN_PASSWORD` env vars in `backend/.env`

## Implemented Features

### Auth System (Complete)
- Email/password registration & login
- Google OAuth via Emergent → new users prompted to set MPIN (not password)
- **Biometric (WebAuthn) login** — DEFAULT login method (fingerprint/face ID)
- **MPIN (4-digit PIN) login** — secondary login method
- Password login — fallback
- Login page flow: Biometric → MPIN → Password
- Remember Me, Forgot/Reset Password

### User-Facing
- Full CRUD for: Income, Expenses, Loans, Assets, Accounts, Insurance, Investments, Credit Cards, Goals
- Dashboard with cashflow summary
- Financial health score & insights
- Gamification (levels, achievements, challenges)
- Notifications & push notifications
- Data import
- Family/workspace management
- Opportunity engine
- Reports & analytics

### Admin Panel (Stable)
- Command Center, User Growth, Engagement, Feature Usage, Segmentation, Support, Campaigns, Behavioral Insights, Monetization, User Intelligence, Risk Radar
- Token-based auth with MongoDB-backed sessions

## What's Been Completed

### Bug Fixes (Mar 18, 2026)
1. **Admin Login Instability** — FIXED: Token-based auth (localStorage + Bearer header)
2. **Admin Page Long Scroll** — FIXED: Isolated admin routes from main app providers
3. **Biometric RPID Mismatch** — FIXED: Uses `x-forwarded-host` header
4. **Existing users not prompted for setup** — FIXED: SecuritySetupPrompt modal
5. **Biometric iframe error** — FIXED: Detects iframe context, shows helpful message
6. **Income Data Discrepancy (P0)** — FIXED: Weekly income showed 0 received in Business Detail but 1.5L in My Income. Root cause: weekly schedule not generated in detail endpoint. All three endpoints now use consistent `count_weekday_occurrences` logic.
7. **Edit Button Redirect (P0)** — FIXED: `getEditRoute()` in IncomeDetail.js was using `data.incomeType` ("fixed"/"variable") instead of `data.type` ("Business"/"Job"/etc.), causing all edit buttons to redirect to /other-income.
8. **Incorrect Current Month Income Total (P0)** — FIXED: MyIncome.js now uses backend-calculated `totalIncome` from `/api/income/monthly-summary` instead of frontend approximation (which used `amount * 4` for weekly).
9. **Confusing Received/Pending Labels (P0)** — VERIFIED: Labels on IncomeDetail.js already show "Received (This Month)" and "Pending (This Month)" to distinguish from schedule data.

### Features
1. **MPIN Login** — Full backend + frontend (set/verify/login/remove, 4-digit PIN boxes)
2. **Biometric Login (WebAuthn)** — Full backend + frontend (register/login/status/remove, fingerprint/face ID)
3. **Login page defaults to Biometric** — Flow: Biometric → MPIN → Password
4. **Post-login Security Setup** — Guided MPIN + biometric setup for existing users after login
5. **New Google user → Set MPIN** — AuthCallback shows SetMPINModal instead of SetPasswordModal

## Prioritized Backlog

### P1 — Next Up
- **Production Test Data Cleanup**: Remove leftover test users from production database

### P2 — Future
- Enhanced "Remember Me" with persistent sessions / auto-login
- Production deployment stability improvements
- Admin panel data export
- User notification preferences enhancement
