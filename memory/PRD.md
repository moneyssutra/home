# MoneySSutra - Product Requirements Document

## Original Problem Statement
MoneySSutra is a sophisticated personal finance application — a "Financial Control Operating System" with gamified insights, advanced analytics, and forecasting tools.

## Core Architecture
- **Frontend**: React + TailwindCSS + Shadcn/UI  
- **Backend**: FastAPI + MongoDB  
- **Auth**: JWT + Google OAuth (Emergent-managed)  
- **AI**: OpenAI GPT-5.2 via emergentintegrations  

## Test Credentials
- Username: `test@moneyssutra.com`, Password: `test`

## Navigation & Back Buttons
- All Wealth sub-pages (Income, Expenses, Assets, Investments, Insurance, Loans, Credit Cards, Accounts) → back to `/wealth`
- Category/Group pages → back via `navigate(-1)` with `/my-expenses` fallback
- Expense tabs → URL param `?tab=` preserves active tab

## Financial Intelligence Engine (NEW Feb 28, 2026)
Rule-based overspend analysis — NO AI, pure math.

### Backend Endpoint: `GET /api/expenses/overspend-analysis`
**3-Layer Trigger System:**
1. **Budget Breach**: category spend > 3-month average
2. **Behavioral Drift**: current > 3M avg × 1.20 (10%/20%/30% escalation levels)
3. **Income Ratio**: lifestyle > 40% income OR lifestyle > wealth allocation

**Per-Overspend Impact Calculations:**
- Safety Impact: `overspend / daily_essential_expense` = safety days lost
- Growth Impact: `FV = P × (1.10)^10` — conservative 10% annual return
- Goal Impact: `overspend / goal_gap × 100`%

**Monthly Structural Health:**
- Actual vs Recommended (50/30/20) allocation ratios
- Wealth Shift Score: alert when lifestyle drift > wealth allocation
- Template selection: safety_growth / long_term_wealth / debt_reduction / goal_acceleration / maintain

**Reallocation Suggestion:**
- Suggests shifting 75% of L2+ overspend to wealth/goals
- Shows safety days gained + 10yr future value

### Frontend: `FinancialIntelligence.js`
- Monthly Allocation bar (actual vs 50/30/20)
- Days of Safety with Strong/Moderate/Build Up badge
- Primary Focus advice (template-based)
- Overspend alerts (expandable with Safety/Growth/Goal impact cards)
- Income ratio alerts, structural alerts, wealth shift alert
- Reallocation card with [Reallocate] / [Ignore This Month] buttons

## Key Bug Fixes (Feb 28, 2026)
- Insurance page: `getNextPremiumDate` guard for invalid date values
- All Wealth sub-page back buttons → `/wealth` (not `/home` or `/my-liabilities`)
- ProfileMenu: consistent single initial across all pages
- Tab persistence via URL search params
- Auto-paid detection for current month expenses

## Prioritized Backlog
### P1: Cash Flow Engine - Phase 1 (Rolling Balance Engine)
### P1: Cash Flow Engine - Phase 4 (Negative Balance Handling UI)
### P2: Cash Flow Engine - Phase 3 (Cash Flow Timeline Engine)
### P2: Financial Command Center enhancements
### P2: Decision Impact Engine (financial simulation)

## Mocked: 2FA and Biometric Login toggles (UI only), Reallocate/Ignore buttons (UI only)
## 3rd Party: openpyxl, recharts, reportlab, @dnd-kit/core, Emergent Google Auth, OpenAI GPT-5.2, MongoDB Atlas
