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
- Admin credentials: `admin@moneyssutra.com` / `admin123` (hardcoded in `routes/admin.py`)

## Implemented Features

### Auth System (Complete)
- Email/password registration & login
- Google OAuth via Emergent
- **MPIN (4-digit PIN) login** — set/verify/login/remove via `/api/mpin/*`
- **Biometric (WebAuthn) login** — fingerprint/face ID via `/api/biometric/*`
- Remember Me
- Forgot/Reset Password
- First-time Google user password setup

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

## What's Been Completed (Mar 18, 2026)

### P0 Bug Fixes
1. **Admin Login Instability** — FIXED: Token-based auth (localStorage + Bearer header)
2. **Admin Page Long Scroll** — FIXED: Isolated admin routes from main app providers

### P0 Features
1. **MPIN Login** — Full backend + frontend (set/verify/login/remove, 4-digit PIN boxes)
2. **Biometric Login (WebAuthn)** — Full backend + frontend (register/login/status/remove, fingerprint/face ID)

## Prioritized Backlog

### P1 — Next Up
- **Harden Admin Credentials**: Move hardcoded admin email/password to environment variables
- **Production Test Data Cleanup**: Remove leftover test users from production database

### P2 — Future
- Enhanced "Remember Me" with persistent sessions
- Production deployment stability improvements
- Admin panel data export
- User notification preferences enhancement
