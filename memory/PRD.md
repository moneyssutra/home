# MoneySutra — Product Requirements Document

## Original Problem Statement
Build and maintain a full-stack financial management app ("MoneySutra") with React + FastAPI + MongoDB. The app tracks income, expenses, assets, loans, insurance, investments, credit cards, goals, and provides financial health insights, analytics, admin panel, and more.

## Core Architecture
- **Frontend**: React (CRA with Craco) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) on port 8001
- **Database**: MongoDB Atlas (dual-database: `moneyssutra_dev` for preview, `moneyssutra_prod` for production)
- **Auth**: JWT sessions (cookie-based) + Emergent-managed Google OAuth + MPIN login
- **Admin**: Token-based auth (localStorage + Bearer header), fully isolated from main app

## Key Environment Variables
- `CUSTOM_MONGO_URL` / `CUSTOM_DB_DEV` / `CUSTOM_DB_PROD` — Auto-switching DB logic in `database.py`
- `REACT_APP_BACKEND_URL` — Frontend API base URL
- Admin credentials: `admin@moneyssutra.com` / `admin123` (hardcoded in `routes/admin.py`)

## User Personas
1. **End Users**: Track personal finances, view dashboards, set goals
2. **Admin**: Monitor platform health, user growth, engagement, risk, campaigns

## Implemented Features

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
- **MPIN Login** (4-digit PIN) — set/verify/login/remove

### Admin Panel
- Command Center (KPIs, PFSI)
- User Growth analytics
- Engagement analytics (heatmap, session duration)
- Feature/Page usage
- Segmentation Lab (filters)
- Support Intelligence (search terms)
- Campaign Manager (CRUD)
- Behavioral Insights (churn risk)
- Monetization Engine (opportunities)
- User Intelligence (user metrics table)
- Risk Radar

### Auth System
- Email/password registration & login
- Google OAuth via Emergent
- MPIN (4-digit PIN) login
- Remember Me
- Forgot/Reset Password
- First-time Google user password setup

## What's Been Completed (Latest Session — Mar 18, 2026)

### P0 Bug Fixes
1. **Admin Login Instability** — FIXED: Switched from cookie-based to token-based auth (localStorage + Authorization: Bearer header). All 11 admin pages updated to use shared `adminApi.js` interceptor. Admin sessions stored in MongoDB `admin_sessions` collection.
2. **Admin Page Long Scroll** — FIXED: Restructured `App.js` to conditionally render admin routes in complete isolation (no ThemeProvider/AuthProvider/etc wrapping admin routes). Previously, both AdminRouter and main App div rendered simultaneously, causing extra height.

### P0 Feature: MPIN Login
- Backend: `/api/mpin/set`, `/api/mpin/status`, `/api/mpin/verify`, `/api/mpin/login`, `/api/mpin/remove`
- Frontend: "Login with MPIN" button on Login page, MPIN setup in Security Settings
- MPIN hashed with bcrypt, stored in `users.mpin_hash`
- 24/24 backend tests passed, all frontend flows working

## Prioritized Backlog

### P1 — Next Up
- **Harden Admin Credentials**: Move hardcoded admin email/password to environment variables
- **Biometric Login (WebAuthn)**: Face ID / Fingerprint login using WebAuthn API
- **Production Test Data Cleanup**: Remove leftover test users from production database

### P2 — Future
- Enhanced "Remember Me" with persistent sessions
- Production deployment stability improvements
- Admin panel data export
- User notification preferences enhancement
