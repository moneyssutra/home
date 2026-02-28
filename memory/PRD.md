# MoneySSutra - Product Requirements Document

## Core Architecture
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT + Google OAuth (Emergent-managed)
- **AI**: OpenAI GPT-5.2 via emergentintegrations
- **Test Credentials**: `test@moneyssutra.com` / `test`

## Implemented Features

### Admin Command Center — "Financial Behavior Observatory" (Mar 1, 2026)
- **Route**: `/admin`, `/admin/users`, `/admin/risk`
- **Access**: Email whitelist (`ADMIN_EMAILS` in admin.py)
- **Command Center**: 6 KPI glass cards, PFSI ring (Safety×0.4 + Wealth×0.3 + Health×0.3), Risk Distribution bars, Monetization Buckets
- **User Intelligence**: Filterable table (risk, search), user drawer with sparkline metrics
- **Risk Radar**: 4 risk bucket cards (Critical/High/Moderate/Stable), Risk Drivers panel
- Dark premium theme (#0A0F1C), glass-morphism, animations

### Timezone-Aware Calculations (Mar 1, 2026)
- `get_user_now(request)` reads `tz_offset` from query params
- Frontend sends `new Date().getTimezoneOffset()` with all API calls
- Fixes IST users seeing wrong month data

### Spending Insights Module (Mar 1, 2026)
- `GET /api/expenses/spending-insights` — 5 rules, top 3 cards by severity
- Glass cards with severity gradients, animated progress bars

### "Spent So Far" Fix (Mar 1, 2026)
- Monthly summary returns `spentSoFar` (schedule_day ≤ today) and `upcoming`
- Monthly tab shows "Spent So Far" instead of full month total

### Financial Intelligence Engine + Wealth Impact + Theme Persistence + Seed Data
(See previous sessions)

## Key API Endpoints
- `GET /api/admin/verify` — Lightweight admin check
- `GET /api/admin/command-center` — KPIs + PFSI + user metrics
- `GET /api/admin/risk-radar` — Risk buckets + drivers
- `GET /api/expenses/spending-insights` — Rule-based insights
- `GET /api/expenses/wealth-impact` — Grade + Regret + Opportunity Cost
- `PATCH /api/expenses/{id}/regret` — Set regret flag
- `GET /api/expenses/monthly-summary` — Now includes spentSoFar/upcoming

## Prioritized Backlog
### P1: Admin Phase 2 — Spending Intelligence Heatmap, Monetization Engine, Campaign Manager
### P1: Admin Phase 3 — Financial Impact Analytics, Compliance Panel
### P1: Cash Flow Engine - Phase 1 (Rolling Balance Engine)
### P2: Cash Flow Timeline, Financial Command Center, Decision Impact Engine
### P2: Spending Insights Phase 2 (Safety Days Impact + Future Value)
### P2: Theme - Mint Green (#98FF98) & wide tracking typography

## Mocked
- 2FA/Biometric Login (UI only)

## 3rd Party
openpyxl, recharts, reportlab, @dnd-kit/core, Emergent Google Auth, OpenAI GPT-5.2, MongoDB Atlas
