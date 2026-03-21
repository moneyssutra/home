# MoneySutra — Product Requirements Document

## Original Problem Statement
Financial management app with profile completion/onboarding flow, income/expense tracking, asset/liability/investment management, and gamified insights.

## Core Architecture
- **Frontend**: React (Vite) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB Atlas
- **Auth**: Emergent-managed Google Auth + JWT + WebAuthn (Biometric) + MPIN
- **Database**: MongoDB Atlas (Prod: `moneyssutra_prod`, Dev: `moneyssutra_dev`)
- **DB Connection**: Uses `CUSTOM_MONGO_URL` + `CUSTOM_DB_PROD` env vars in `database.py`

## Key Features Implemented
- User registration/login (Google, Password, Biometric, MPIN)
- Dashboard with income, expense, net worth overview
- Income management (Job, Business, Self-employed, Rental, etc.)
- Expense tracking with categorization and frequency-based calculations
- Asset management (Bank Balance, Property, Gold, Vehicle, Equipment)
- Liability management (Home/Car/Personal/Education Loans, Credit Cards)
- Investment tracking (Mutual Funds, Stocks, FD, PPF, Gold/SGB, Crypto)
- Profile Health Grid with per-module completion tracking
- **Multi-step Interactive Wizards** for all 5 modules
- **Multi-entry support** (append, not overwrite) for all categories
- **Backend deduplication** prevents duplicate entries (name+amount match)
- **Calendar-based weekly income** (replaced 4.33 multiplier with actual weekday counts)
- **Combined API Endpoints** for Dashboard, Wealth, Intelligence pages (6-9 calls → 1)
- Gamified Insights page
- Admin panel
- **CRED-style Bank Accounts Page** (`/bank-accounts-experimental`)
- **CRED-style Credit Cards Page** (`/credit-cards-experimental`)
- **Family Hub** with member linking and combined financial views
- **Goals** with 5 types: Wealth Creation, Debt Elimination, Investment Target, Emergency Fund, Other
- **Variable Income Window-Based Hybrid Logic**
- **SIP Calculation** (Daily/Weekly dynamic calculation)

## Key Routes
- `/` - Dashboard
- `/onboarding` - Profile Setup
- `/my-income` - Income management
- `/portfolio` - Expense management
- `/wealth` - Net worth / Assets
- `/health` - Gamified Insights
- `/my-goals` - Goals management
- `/bank-accounts-experimental` - CRED-style Bank Accounts
- `/credit-cards-experimental` - CRED-style Credit Cards
- `/family` - Family Hub

## Seed Data (moneyssutra@gmail.com)
### Main User (user_50103ba5a65a)
- Profile: Rahul Kumar Sharma, Software Engineer at Infosys
- Income: 10 sources (Job, Business, Rental, Interest, Dividend, Pension, Commission, Royalty, Gift, Other)
- Expenses: 15 items (Housing, Utilities, Entertainment, Health, Insurance, Education, Food, Transport, Lifestyle, Travel, Misc)
- Assets: 10 items (2 Properties, Land, 2 Vehicles, 2 Gold, Equipment, Collectibles, IP)
- Investments: 16 items (2 MF, 2 Stocks, PPF, NPS, FD, RD, Digital Gold, SGB, US Stocks, Crypto, REIT, Bonds, ELSS, Loan Given)
- Bank Accounts: 5 (SBI, HDFC, ICICI, Kotak, Axis)
- Credit Cards: 3 (HDFC Regalia, SBI Simply Click, Axis Flipkart)
- Loans: 10 (Home, Car, Personal, Education, Gold, Business, Two-Wheeler, CC EMI, Mortgage, Friend)
- Insurance: 4 (Life, Health, Term, Vehicle)
- Goals: 5 (Wealth Creation, Debt Elimination, Investment Target, Emergency Fund, Other/Education)

### Wife (priya.sharma@gmail.com, user_wife_bd14ab39)
- Income: 2, Expenses: 3, Accounts: 2, Investments: 3, Assets: 2, CC: 1, Loans: 1, Insurance: 1

### Family: Sharma Family (4 members: Rahul, Priya, Aarav age 6, Ananya age 3)

## Completed (Mar 21, 2026)
- Comprehensive seed data script written and executed
- Fixed insurance collection name bug (`insurance` → `insurances`)
- Added 5 goals (1 per type) with proper investment/account/loan linking
- All verified: 100% pass rate on backend + frontend tests (iteration_158.json)

## Pending / Upcoming Tasks
### P1 - Finvu SDK Integration
- Integrate Finvu Account Aggregator SDK (awaiting credentials)
- Transaction Linking Design

### P2 - Backlog
- Monthly financial summary email/notification
- Profile Health Score
- Monthly Financial Report PDF generation

## Known Mocks
- Finvu SDK: "Coming Soon" button

## Test Credentials
- Seed User: moneyssutra@gmail.com (Google auth, MPIN set)
- Wife: priya.sharma@gmail.com (user_wife_bd14ab39)
- Admin: admin@moneyssutra.com / admin123

## Critical Notes
- Insurance collection: `insurances` (plural)
- Do not revert Variable Income hybrid logic
- Family Hub route: `/family`
- DB Connection: `CUSTOM_MONGO_URL` + `CUSTOM_DB_PROD`
