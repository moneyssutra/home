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
- Bank-Statement Style Reports (PDF + Excel, 9 types)
- Legal Pages: Terms of Service, Privacy Policy, Data Deletion Policy

## Legal & Compliance Pages
- `/terms-of-service` — Full ToS with company details (NEXT GENERATION LEADERSHIP PVT LTD)
- `/privacy-policy` — Privacy policy with data collection categories, future permissions
- `/data-deletion` — Google Play compliant deletion page with in-app + email options
- All pages are public (no auth required) for Play Store / app store compliance
- Links added to: Login footer, Settings footer
- Company: CIN U80903JH2021PTC017467, PAN AAHCN8903F, TAN RCHN01417D

## Recent Changes (Feb 25, 2026)
- Created Terms of Service, Privacy Policy, Data Deletion pages
- Added legal links to Settings page footer and Login page footer
- Routes: /terms-of-service, /privacy-policy, /data-deletion (public)
- Bank-statement style reports redesign
- Reports now include other_income collection
- Google Auth auto-profile creation

## Key Routes
- /terms-of-service (public)
- /privacy-policy (public)
- /data-deletion (public)
- /settings (auth)
- /insights (auth)
- /insights/reports (auth)

## Prioritized Backlog
### P1
- Financial Command Center (Control/Pressure/Risk cockpit)
- Decision Impact Engine (large purchase impact)

### P2
- Goal Tracker integration with Future You
- Refactor Insights.js into smaller component files

## Test Credentials
- Username: `test`, Password: `test`
