# Moneyssutra - Personal Finance Tracker PRD

## Original Problem Statement
Build a comprehensive personal finance tracking application with multi-user workspace support, complete financial management features (income, expenses, assets, investments, loans, insurance, goals), and a modern, professional UI.

## Current Status
**Light Theme Implementation: COMPLETE ✅**

The application has been updated with a new, professional light theme based on Groww-style design principles following the user's detailed color token system.

## Implemented Features

### Authentication & User Management
- JWT-based authentication with login/registration
- Google OAuth integration (Emergent-managed)
- Multi-user Workspace architecture with data isolation
- User profile management

### Financial Modules
- **Income Tracking**: Business, Job, Rental, Commission, Interest, Dividend, Other Income
- **Expense Management**: Fixed and Variable expenses with categories
- **Assets**: Real estate, vehicles, jewelry, etc. with linked loans
- **Investments**: Stocks, mutual funds, bonds, etc.
- **Loans**: EMI tracking, linked assets, outstanding balance
- **Insurance**: Life, health, vehicle, property insurance
- **Credit Cards**: Outstanding balance, credit limit tracking
- **Bank Accounts**: Multiple account types

### Goals Module
- Goal creation with types (Wealth Creation, Debt Elimination, etc.)
- Progress tracking with milestones
- Priority-based ordering (drag-and-drop)
- Goal achievements summary

### Dashboard
- Net worth overview with breakdown
- Monthly cash flow (Income vs Expense)
- Goals progress widget
- Quick navigation to all modules

## Technical Stack
- **Frontend**: React 18, Tailwind CSS, Shadcn/UI, React Router
- **Backend**: FastAPI (Python), Modular architecture (routes, models, services)
- **Database**: MongoDB
- **Authentication**: JWT + Google OAuth

## Light Theme Color System (NEW)

### Brand Colors
- `brand-primary`: #059669 (Green)
- `brand-primary-light`: #10B981
- `brand-primary-soft`: #D1FAE5
- `brand-secondary`: #14B8A6 (Teal)
- `brand-secondary-soft`: #CCFBF1

### Background Colors
- `bg-app`: #F5F7FA (Soft grey)
- `bg-card`: #FFFFFF (White)
- `bg-subtle`: #F8FAFC
- `bg-disabled`: #F1F5F9

### Text Colors
- `text-primary`: #1F2937 (Dark charcoal)
- `text-secondary`: #6B7280
- `text-muted`: #94A3B8
- `text-inverse`: #FFFFFF

### Status Colors
- Success: #16A34A / #DCFCE7
- Error: #EF4444 / #FEE2E2
- Warning: #F59E0B / #FEF3C7
- Info: #3B82F6 / #DBEAFE

### Navigation
- Active: #059669 (Green)
- Inactive: #9CA3AF (Grey)
- Background: #FFFFFF (White)

### Design Principles Applied
✅ Lots of whitespace
✅ Rounded corners (12-16px)
✅ Thin dividers (1px borders)
✅ No thick borders
✅ Green only for meaningful actions
✅ Soft shadows (Groww style)
✅ No neon shades

## Upcoming Tasks

### P0 - Immediate
- **Expense Transaction Module**: Track spending transactions with receipt upload

### P1 - High Priority
- PWA features (offline support, install prompt)
- Data export functionality (PDF/Excel)

### P2 - Medium Priority
- AI Smart Insights on Dashboard
- Backend scheduler for automatic fixed expense deductions
- Loan amortization schedule view

### P3 - Future
- Mobile OTP, PIN, Biometric Login
- Two-Factor Authentication (2FA)
- Dark mode toggle

## Files Updated (Light Theme)

### Core Pages
- `frontend/src/Dashboard.js`
- `frontend/src/pages/Login.js`
- `frontend/src/Welcome.js`
- `frontend/src/Portfolio.js`
- `frontend/src/MyIncome.js`
- `frontend/src/MyExpenses.js`
- `frontend/src/MyGoals.js`

### Components
- `frontend/src/components/BottomNav.js`
- `frontend/src/components/AddActionSheet.js`
- `frontend/src/components/BackButton.js`

### Styles
- `frontend/src/index.css` - CSS variables and honeycomb-bg overrides

### Form Pages (CSS Override Applied)
- ExpenseForm.js (Header, buttons, dialogs updated)
- Other forms use honeycomb-bg CSS overrides

## Test Credentials
- **Test User**: test / test
- **New Users**: Register via the UI

## API Endpoints (Key)
- `/api/auth/*` - Authentication
- `/api/dashboard/networth` - Dashboard data
- `/api/income/*`, `/api/expenses/*` - Income/Expense CRUD
- `/api/assets/*`, `/api/investments/*` - Assets/Investments
- `/api/loans/*`, `/api/insurances/*` - Loans/Insurance
- `/api/goals/*` - Goals management
- `/api/workspaces/*` - Workspace management
