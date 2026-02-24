# Moneyssutra - Personal Finance Tracker PRD

## Original Problem Statement
Build a comprehensive personal finance tracking application with multi-user workspace support, complete financial management features (income, expenses, assets, investments, loans, insurance, goals), and a modern, professional UI.

## Current Status
All core features and recent bug fixes completed (Feb 24, 2026).

## Latest Session Work (Feb 24, 2026 - Session 2)

### Analytics Page Fixes (DONE)
1. **Investment Performance Total Invested = ₹0 FIX**: Backend `analytics.py` was using `amountInvested` field but DB stores it as `principal`. Fixed to use `principal` with fallback to `amountInvested`. Now shows ₹51.15 L.
2. **Wealth Breakdown Liquid=0 pink bar FIX**: Frontend `Analytics.js` bar segments now only render when `Number(percent) > 0`. No more phantom pink bar.

### Server.py Refactoring Complete (DONE)
- Moved complete reports logic (PDF via ReportLab + Excel via openpyxl) from `server.py` to `routes/reports.py`
- Removed ~500 lines of duplicate code from `server.py` (7526 → 7022 lines)
- Reports now support 9 types: income, expense, investment, loan, networth, goal, asset, insurance, cashflow

### Breakdown Pages Refactored (DONE)
- Created generic `CategoryBreakdown.js` component
- Refactored 4 pages to use it: AssetBreakdown, LoanBreakdown, InvestmentBreakdown, InsuranceBreakdown
- ~1100 lines of duplicative code reduced to ~250 lines + 1 shared component

### PDF/Excel Reports (Verified Working)
- **Income Report**: Table with source, type, amount, frequency + total
- **Expense Report**: 2-page table with all expenses by category
- **Investment Report**: Portfolio with invested, current value, gain/loss by category
- **Loan Report**: Outstanding amounts, EMI, interest rates
- **Net Worth Report**: Summary of assets, investments, liquid, liabilities

## Previous Session Work (Feb 24, 2026 - Session 1)
- Notification View modal fix (relatedIncomeId check)
- Self-employed profession field loading fix
- Financial Health tooltip inline display (no overlap)
- Expand All / Collapse All for Financial Health
- Reports verification

## Architecture
```
/app/backend/
├── server.py          (~7022 lines, reduced from 8400+)
├── routes/
│   ├── analytics.py   (investment performance, trends)
│   ├── auth.py        (login, registration, sessions)
│   ├── financial_health.py
│   ├── notifications.py
│   ├── reports.py     (PDF/Excel generation - ReportLab + openpyxl)
│   ├── settings.py    (profile, security)
│   └── workspace.py
/app/frontend/src/
├── components/
│   ├── CategoryBreakdown.js  (NEW - generic breakdown)
│   ├── FinancialHealth.js    (tooltips, expand all)
│   └── NotificationBell.js   (modal fix)
├── AssetBreakdown.js         (refactored)
├── LoanBreakdown.js          (refactored)
├── InvestmentBreakdown.js    (refactored)
├── InsuranceBreakdown.js     (refactored)
└── Analytics.js              (investment + wealth fixes)
```

## Test Credentials
- Username: test, Password: test

## Upcoming Tasks
- P1: Full 2FA Implementation (TOTP QR codes, WebAuthn biometrics) - UI toggles exist but are MOCKED
- P2: Further server.py modularization (still 7000+ lines)
- P2: PWA features (offline support, install prompt)
- P3: Mobile OTP and PIN login
- P3: Loan amortization schedule viewer
- P3: Enable real email sending (Resend API key)

## Testing
- Iteration 56: 100% pass (12/12 backend, all frontend)
- Iteration 57: 100% pass (14/14 backend, all frontend) - verified all 5 items
