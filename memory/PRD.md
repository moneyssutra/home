# MoneySutra - Product Requirements Document

## Original Problem Statement
Comprehensive financial management app called "MoneySutra" with precise data intake, complex financial calculations, modern CRED-style UI modules, comprehensive test data, and visual "Dream Tracker" goals.

## Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Auth**: Emergent-managed Google Auth + JWT
- **Hosting**: Emergent Platform

## What's Been Implemented
- Financial tracking dashboard with gamified "Financial Health" system
- CRED-style Bank Accounts and Credit Cards pages
- Visual "Dream Tracker" goals page (dusty rose/mauve pink theme)
- Comprehensive seed data for test users including Family Hub
- Goal image upload API + keyword-based default images
- Notification bell with green dot alignment fix
- **iOS Safe Area fix** (Feb 2026): Global `padding-top: env(safe-area-inset-top)` on `.App` wrapper to prevent content overlapping with iPhone status bar. Affects all pages. Android unaffected.

## Color Theme
- Goals Page: Dusty rose/mauve pink gradient (#9D4E6C → #C06C84 → #D4A5A5)
- Main App: Green brand (#059669)

## Key Credentials
- Google Login: `kumaramarendra10@gmail.com`, `chandrashekhar.iter@gmail.com`
- JWT Login: `moneyssutra@gmail.com` / `123456`
- Admin: `admin@moneyssutra.com` / `admin123`

## Prioritized Backlog
### P1
- Finvu SDK Integration (Account Aggregator)
- Transaction Linking Design

### P2
- Auto AI Image generation for goals
- Monthly financial summary email/notification
- Profile Health Score
- Monthly Financial Report PDF generation
- Refactoring: Break down `ProfileSetup.js` (>1500 lines)

## Key Files
- `/app/frontend/src/App.css` — Global app styles + iOS safe area fix
- `/app/frontend/src/index.css` — CSS tokens, safe area bottom, toast positioning
- `/app/frontend/src/pages/MyGoalsVisual.js` — Dream Tracker visual goals
- `/app/frontend/src/styles/goals-visual.css` — Goals page dusty rose theme
- `/app/backend/routes/goals.py` — Goals CRUD + image upload
- `/app/backend/routes/dashboard.py` — Combined dashboard endpoint
- `/app/frontend/src/components/NotificationBell.js` — Notification UI
