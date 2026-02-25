# MoneySSutra - Product Requirements Document

## Original Problem Statement
MoneySSutra is a sophisticated personal finance application — a "Financial Control Operating System" with gamified insights, advanced analytics, and forecasting tools. Built as a React/FastAPI/MongoDB full-stack app with PWA support.

## Core Architecture
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT + Google OAuth (Emergent-managed)
- **AI**: OpenAI GPT-5.2 via emergentintegrations
- **PDF**: reportlab for report generation
- **Scheduling**: apscheduler for cron jobs

## What's Been Implemented

### Branding & UI
- Official MoneySSutra logo, turquoise color scheme (#14B8A6), Montserrat font
- Consistent branding across Login, Dashboard, Headers, Settings, Legal Pages, Favicon, PDF Reports

### Legal & Compliance
- Terms of Service, Privacy Policy, Data Deletion pages (publicly accessible)

### PWA & Play Store
- Service worker, manifest, icons for installability
- PWABuilder guidance for Google Play Store submission

### Financial Health Module (Feb 2026)
- 10-metric financial health scoring system
- **Fixed (Feb 25, 2026)**: Life Insurance calculation now includes both "Term Insurance" and "Life Insurance" (ULIP) types
- **Fixed (Feb 25, 2026)**: Field name bug — `coverAmount` corrected to `coverageAmount` for insurance calculations
- **Fixed (Feb 25, 2026)**: Investment Allocation was showing 0% because code used wrong field `category` instead of `investmentCategory`
- **Fixed (Feb 25, 2026)**: Retirement Readiness now correctly identifies NPS/PF/PPF from both `investmentCategory` and investment `name` fields
- **Fixed (Feb 25, 2026)**: Liquid funds classification now uses correct `investmentCategory` field

### Insurance Form Enhancement (Feb 2026)
- Term Insurance shows Covered Person and Maturity Type fields
- **Added (Feb 25, 2026)**: Premium Payment Term dropdown for Term Insurance and Life Insurance (1-30 years + Till Maturity)

### Insights & Intelligence
- 20-stage Survival Clock, Financial Score, Shock Test
- Money Pattern personality classification (20 types)
- Behavior Alerts, Runway Simulator, Future You projections
- Personality Evolution chart, Red Zone dark theme

### Reports
- Professional bank-statement-style PDF reports
- Excel export support

### Other Features
- Google Auth with auto profile creation
- Backend cron jobs for weekly/monthly tasks
- Calendar range extended to 2200

## Prioritized Backlog

### P0 (Critical)
- All critical bugs fixed as of Feb 25, 2026

### P1 (Upcoming)
- **Financial Command Center**: Enhance Financial Score widget into cockpit dashboard with Control/Pressure/Risk indicators
- **Decision Impact Engine**: Tool to simulate financial impact of large purchases

### P2 (Future)
- **Refactor Insights.js**: Break monolithic component into smaller reusable components
- **Security Settings**: 2FA and Biometric toggles are non-functional placeholders

## Key DB Collections
- `users`, `profiles`, `user_sessions`
- `income_sources`, `expenses`, `insurances`, `investments`, `assets`, `loans`, `credit_cards`, `accounts`
- `user_personality`, `user_personality_history`, `weekly_digests`, `alerts`, `notifications`
- `analytics_snapshots`, `income_transactions`, `expense_transactions`

## Test Credentials
- Username: `test`, Password: `test`
