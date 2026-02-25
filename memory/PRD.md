# Moneyssutra - Personal Finance Tracker PRD

## Original Problem Statement
Full-stack personal finance manager with "Financial Control Operating System" on Insights page.

## Core Architecture
- React + Tailwind + Shadcn UI (port 3000) / FastAPI (port 8001, /api) / MongoDB Atlas

## Key Features Implemented
- 20-Personality Classification Engine
- Financial Journey (20 stages, 5 phases)
- Financial Score (4 pillars)
- Emergency Runway (3-tier liquidity)
- Shock Test (4 presets + custom)
- Future You (12-month projection)
- Red Zone Mode + Full Dark Theme Override
- Weekly Health Digest + Monthly Personality Cron Jobs
- Personality Evolution Tracker (recharts line chart)
- 100 Badges, Gamification Challenges
- Financial Health (9-module weighted score)
- Shareable Score Card, Runway Simulator, Money Pattern DNA
- Google Auth: auto-profile creation + profile completion flow
- **Bank-Statement Style Reports**: PDF + Excel for all 9 report types

## Report Design (Bank Statement Style)
- **PDF**: Dark navy header bar with MONEYSSUTRA branding, account holder info, statement period, summary metric boxes (Total/Count/Top/Categories), category-wise grouped tables with subtotals, alternating row backgrounds, grand total, footer disclaimer with Statement ID
- **Excel**: Merged header with branding, summary row with key metrics, navy header row, alternating row fills, bold totals, auto-fitted columns, footer disclaimer
- **Report Types**: Income, Expense, Cashflow, Investment, Loan, Net Worth, Goal, Asset, Insurance
- **Data Sources**: Both `income_sources` AND `other_income` collections included

## Recent Changes (Feb 25, 2026)
- Complete redesign of PDF/Excel reports to bank-statement style
- Category-wise grouping with subtotals in income/expense reports
- Summary boxes showing key metrics at a glance
- Professional header/footer with branding and statement ID
- Net Cash Flow and Savings Rate in cashflow report
- Investment returns with +/- formatting
- Net Worth as balance sheet (Assets vs Liabilities)

## Key API Endpoints
- GET /api/reports/generate/{report_type}?format=pdf|excel
- GET /api/intelligence/future-you
- GET /api/intelligence/personality-history
- POST /api/intelligence/weekly-digest
- POST /api/intelligence/shock-test
- GET /api/intelligence/money-pattern
- GET /api/intelligence/survival-clock
- GET /api/intelligence/control-score
- GET /api/financial-health
- GET /api/income/list/summary
- GET /api/other-income
- POST /api/auth/google/session

## Prioritized Backlog
### P1
- Financial Command Center (Control/Pressure/Risk cockpit)
- Decision Impact Engine (large purchase impact)

### P2
- Goal Tracker integration with Future You
- Refactor Insights.js into smaller component files

## Test Credentials
- Username: `test`, Password: `test`
