# Moneyssutra - Personal Finance Tracker PRD

## Original Problem Statement
Full-stack personal finance manager with "Financial Control Operating System" on Insights page.

## Core Architecture
- React + Tailwind + Shadcn UI (port 3000) / FastAPI (port 8001, /api) / MongoDB Atlas

## Brand Identity
- **Company**: NEXT GENERATION LEADERSHIP PRIVATE LIMITED
- **CIN**: U80903JH2021PTC017467
- **Primary Color**: Teal #00D1CC
- **Navy Background**: #1B263B
- **Highlight**: #48E5E8
- **Font**: Montserrat (brand), Inter (body)
- **Logo Files**: `/frontend/public/assets/branding/`
  - `logo-full.svg` (icon + wordmark)
  - `logo-icon.svg` (dark bg, square with rounded corners)
  - `logo-icon-light.svg` (white bg version)
  - `favicon.svg` (16x16)
- **Logo Component**: `/frontend/src/components/Logo.js`

## Logo Implementation Checklist
- [x] Favicon (SVG)
- [x] Login page (icon + wordmark)
- [x] Dashboard header (icon, top-left)
- [x] Settings page (icon + wordmark + version + company)
- [x] Terms of Service header
- [x] Privacy Policy header
- [x] Data Deletion header
- [x] PDF reports (navy branding)
- [x] Open Graph meta tags
- [x] Page title: "MoneySSutra"
- [x] Montserrat font loaded

## Legal & Compliance Pages (Public Routes)
- `/terms-of-service` — Full ToS
- `/privacy-policy` — Privacy Policy
- `/data-deletion` — Data Deletion (Play Store compliant)

## Key Features Implemented
- 20-Personality Classification Engine
- Financial Journey, Score, Runway, Shock Test
- Future You, Personality Evolution (recharts)
- Red Zone Dark Theme, Cron Jobs
- Bank-Statement Style Reports (PDF + Excel)
- Google Auth + auto-profile creation
- 100 Badges, Gamification Challenges

## Prioritized Backlog
### P1
- Financial Command Center (cockpit dashboard)
- Decision Impact Engine

### P2
- Goal Tracker + Future You
- Refactor Insights.js into components

## Test Credentials
- Username: `test`, Password: `test`
