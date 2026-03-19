# MoneySutra Admin Panel — Complete Reference Guide

**Login URL**: `/admin/login`  
**Email**: `admin@moneyssutra.com`  
**Password**: `admin123`

---

## 1. COMMAND CENTER (`/admin`)
*Your real-time platform health dashboard — check this every morning*

| Element | What It Means |
|---------|--------------|
| **Total Users** | Total registered accounts on MoneySutra |
| **Active 7D** | Users who logged in at least once in the last 7 days |
| **Active 30D** | Users who logged in at least once in the last 30 days |
| **PFSI (Platform Financial Strength Index)** | A composite score (0-100) measuring the overall financial health of ALL your users combined. Formula: 40% Safety Days + 30% Wealth Allocation + 30% Health Score. Higher = your users are financially stronger |
| **Avg Safety Days** | Average number of days all users can survive without income, based on their liquid savings vs essential expenses. Example: "45 days" means on average your users can go 45 days without earning |
| **Avg Wealth %** | Average percentage of income users allocate to wealth-building (investments, SIPs, FDs). Higher = users are saving more |
| **Avg Health Score** | Average financial health score (0-100) across all users |
| **% Low Safety** | Percentage of users who have less than 30 days of emergency runway — these users are financially vulnerable |
| **Risk Distribution** | Pie chart showing how many users are in each risk category: **Critical** (<15 days runway), **High** (15-30 days), **Moderate** (30-60 days), **Stable** (60+ days) |
| **Monetization Buckets** | Users grouped by the product/service they'd most benefit from: **Safety Boost** (low safety + high lifestyle spending), **Wealth Optimization** (high income but low investment), **Debt Optimization** (high EMI burden) |
| **User Metrics Table** | Per-user breakdown with columns: User ID, Income Band, Safety Days, Wealth%, Lifestyle%, EMI%, Health Score, Risk Level |

### Key Metrics Explained
- **Income Band**: Which monthly income bracket a user falls in: <25K, 25K-50K, 50K-100K, 100K-200K, 200K+
- **Safety Days**: How many days a user can survive without income using their liquid savings divided by daily essential expenses
- **Wealth %**: Percentage of income going to wealth-building activities (investments, SIPs, mutual funds, FDs)
- **Lifestyle %**: Percentage of income going to non-essential spending (dining, entertainment, shopping, subscriptions, travel)
- **EMI %**: Percentage of income going to loan repayments (home loan, car loan, personal loan, education loan)
- **Health Score (0-100)**: Composite score = 40% safety component + 30% wealth component + 30% efficiency component
- **Risk Level**: Based on safety days — Critical (<15), High (15-30), Moderate (30-60), Stable (60+)

---

## 2. USER GROWTH (`/admin/user-growth`)
*Track registration trends and retention over time*

| Element | What It Means |
|---------|--------------|
| **Daily Signups Chart** | Bar chart showing new user registrations per day over the last 30 days |
| **Weekly / Monthly Trend** | Aggregated signups by week and month to spot growth or decline trends |
| **Cumulative Users** | Running total of all users over time — your growth curve |
| **Retention Cohort** | For each weekly cohort of signups, what percentage are still active after 1 week, 2 weeks, 4 weeks etc. |

### Why It Matters
- Spot if signups are slowing down → time to boost marketing
- Measure the impact of campaigns or app store changes
- Retention cohort reveals if users stick around or leave after trying the app

---

## 3. USER INTELLIGENCE (`/admin/user-intelligence`)
*Deep-dive into individual user financial profiles*

| Element | What It Means |
|---------|--------------|
| **User Table** | Every user with: User ID (masked for privacy), Name, Income Band, Safety Days, Wealth%, Lifestyle%, EMI%, Health Score, Risk Level, Total Income, Total Spend, Total Assets |
| **Monetization Bucket** | Which premium product/service would help this specific user most |

### Why It Matters
- When a user reports an issue, look up their exact data here
- Identify power users (high engagement + good health score) for testimonials
- Find inactive users with good financial data for re-engagement campaigns

---

## 4. RISK RADAR (`/admin/risk-radar`)
*Identify financially vulnerable users before they churn*

| Element | What It Means |
|---------|--------------|
| **Risk Buckets** | Users grouped by severity |
| — **Critical** | <15 days runway — one missed paycheck away from financial trouble |
| — **High** | 15-30 days runway — financially stressed |
| — **Moderate** | 30-60 days runway — could improve |
| — **Stable** | 60+ days runway — financially healthy |
| **Risk Bucket %** | What percentage of total users fall in each risk category |
| **Risk Drivers** | The top reasons users are at risk |
| — *Low Wealth Allocation (<15%)* | These users invest less than 15% of income — not building long-term wealth |
| — *High EMI Burden (>35%)* | More than 35% of income goes to loan repayments — financially stressed |
| — *High Lifestyle Drift (>40%)* | Over 40% of income on non-essential spending — living beyond means |
| — *Low Income Band (<25K)* | Monthly income under Rs.25,000 — limited financial buffer |
| **At-Risk Users Table** | List of users in Critical/High risk with their detailed metrics |

### Why It Matters
- Proactively reach out to at-risk users with tips, challenges, or alerts
- Prevents users from silently churning because the app "didn't help"
- Data for building targeted financial wellness programs

---

## 5. ENGAGEMENT ANALYTICS (`/admin/engagement`)
*Understand how, when, and how often users interact with MoneySutra*

| Element | What It Means |
|---------|--------------|
| **Avg Session Today** | Average time (in seconds) users spent in the app today |
| **Avg Session 7D** | Average session duration over the last 7 days |
| **Avg Session 30D** | Average session duration over the last 30 days |
| **Total Sessions 30D** | Total number of app sessions in the last 30 days |
| **Events (30D)** | Total number of user actions (page views, button clicks, form submissions, etc.) tracked in 30 days |
| **This Week** | Number of events/actions recorded this week (Mon-Sun) |
| **Last Week** | Number of events/actions recorded last week |
| **Activity Change** | Percentage change in activity from last week to this week. "+25%" = 25% more active. "-30%" = activity dropped 30% |
| **Hourly Heatmap** | A 7-day x 24-hour grid showing when users are most active. Darker cells = more activity |
| **Day-of-Week Chart** | Which days users are most engaged. Shows average session duration and total sessions per day |
| **Peak Hours** | The top 3 hours when users are most active (e.g., "9:00-10:00, 20:00-21:00") |

### Why It Matters
- **Events** = every action a user takes (opening a page, clicking a button, submitting a form). More events = more engagement
- **Activity Change** tells you if your user base is becoming more or less engaged week-over-week
- **Heatmap** reveals the best times to send push notifications or in-app campaigns
- **Peak Hours** helps you schedule maintenance windows (avoid peak times)

---

## 6. FEATURE USAGE (`/admin/feature-usage`)
*Which app features do users actually use?*

| Element | What It Means |
|---------|--------------|
| **Page Name** | Each screen in the app (Dashboard, My Expenses, My Income, Investments, etc.) |
| **Total Visits** | How many times this page was visited in the last 30 days |
| **Unique Users** | How many different users visited this page |
| **User Coverage %** | What percentage of ALL users have visited this page. "Dashboard: 95%" = almost everyone. "Goals: 8%" = very few |
| **Avg Time Spent** | Average seconds spent on this page per visit |
| **Repeat Rate** | What percentage of users who visited came back to this page again — measures "stickiness" |
| **Funnel** | The user journey flow: which pages lead to which pages. Helps identify where users drop off |

### Why It Matters
- Invest development effort in features users actually use
- If Coverage is low but Time Spent is high, the feature is valuable but hard to discover → improve navigation
- If Coverage is high but Repeat Rate is low, users try it once but don't come back → the feature needs improvement

---

## 7. SEGMENTATION LAB (`/admin/segmentation`)
*Filter and group users by any combination of criteria*

| Element | What It Means |
|---------|--------------|
| **Filter: Age Range** | Filter users by age (min-max) |
| **Filter: Gender** | Filter by Male/Female/Other |
| **Filter: City** | Filter by city/location |
| **Filter: Occupation** | Filter by job type |
| **Filter: Income Range** | Filter by annual income (min-max) |
| **Filter: Safety Days** | Filter by emergency runway days (min-max) |
| **Filter: Risk Level** | Filter by Critical/High/Moderate/Stable |
| **Filter: Health Score** | Filter by financial health score (min-max) |
| **Filter: Wealth %** | Filter by wealth allocation percentage (min-max) |
| **Filter: EMI % Max** | Filter users whose EMI burden doesn't exceed this % |
| **Filter: Monetization Bucket** | Filter by product recommendation category |
| **Filtered Count** | How many users match your current filter combination |
| **Summary Stats** | Averages for the filtered group: Safety Days, Health Score, Wealth%, Income, Age |
| **Risk Distribution** | Risk breakdown for the filtered segment |
| **Gender Distribution** | Male/Female/Other split |
| **City Distribution** | Geographic distribution |
| **Users Table** | Detailed list of matching users with all metrics |

### Why It Matters
- Create targeted user segments for campaigns (e.g., "High-income users in Mumbai with low wealth allocation")
- Compare segments (e.g., "How do 25-35 year olds compare to 35-45 year olds?")
- Find your ideal user profile for marketing personas

---

## 8. BEHAVIORAL INSIGHTS (`/admin/behavioral-insights`)
*Spot churn risks and track financial improvement over time*

| Element | What It Means |
|---------|--------------|
| **Active Users** | Users with at least one event in the last 7 days |
| **Dormant Users** | Users with no activity for 14+ days — at risk of leaving forever |
| **Events (30D)** | Total actions by this specific user in the last 30 days |
| **This Week** | This user's actions this week |
| **Last Week** | This user's actions last week |
| **Activity Change** | % change in this user's week-over-week activity. Negative = they're losing interest |
| **Days Inactive** | How many days since this user last opened the app |
| **Score Trend** | Is this user's financial health **Improving**, **Stable**, or **Declining** (based on periodic snapshots) |
| **Score Change** | The numeric change in their financial health score |
| **Churn Score (0-100)** | Prediction of how likely this user is to stop using the app. Calculated from: days inactive + activity decline + declining financial score + low total events |
| **Churn Risk** | **High** (score 60+), **Medium** (30-59), **Low** (<30) |
| **Churn Distribution** | How many users are in High/Medium/Low churn risk |
| **Improving Users** | Users whose financial health is getting better — your success stories |
| **Declining Users** | Users whose financial health is getting worse — may need help |
| **High Churn Users** | Users most likely to leave — prioritize re-engagement |

### Why It Matters
- **Churn Score** is your early warning system — reach out to high-churn users BEFORE they leave
- **Improving Users** are your testimonial candidates and proof that the app works
- **Activity Change** week-over-week is the fastest indicator of engagement health

---

## 9. SUPPORT INTELLIGENCE (`/admin/support-intelligence`)
*Track what users search for, struggle with, and need help on*

| Element | What It Means |
|---------|--------------|
| **Search Queries** | What users typed in the search/help bar — reveals what they can't find in the UI |
| **FAQ Views** | Which FAQ/help articles are viewed most frequently |
| **Top Search Terms** | Most commonly searched terms — these might need dedicated features or better UI placement |
| **Unanswered Queries** | Searches that returned no results — gaps in your help content that need to be filled |

### Why It Matters
- If many users search for "how to add SIP", your SIP feature might be hard to find
- Unanswered queries = frustrated users = higher churn risk
- Guides your FAQ/help content creation priorities

---

## 10. CAMPAIGN MANAGER (`/admin/campaigns`)
*Create, manage, and measure in-app campaigns and announcements*

| Element | What It Means |
|---------|--------------|
| **Campaign Title** | Name of the campaign (e.g., "Complete Your Profile", "New Feature: Goals") |
| **Type** | How it appears to users: **Banner** (top strip on dashboard), **Notification** (bell icon alert), **Popup** (modal dialog) |
| **Status** | **Draft** (not visible to users), **Active** (live and visible), **Paused** (temporarily hidden), **Expired** (past end date) |
| **Targeting → Audience** | Who sees it: "all" (everyone), or filter by specific user segments |
| **Priority** | **Low**, **Normal**, **High**, **Urgent** — when multiple campaigns are active, higher priority shows first |
| **Start Date / End Date** | When the campaign goes live and when it automatically expires |
| **CTA Text** | The action button text shown to users (e.g., "Complete Now", "Learn More", "Try It") |
| **CTA URL** | Where clicking the button takes the user (e.g., "/onboarding", "/my-goals", "/my-investments") |
| **Impressions** | How many times the campaign was displayed to users |
| **Clicks** | How many users clicked the CTA button |
| **Dismissals** | How many users closed/dismissed the campaign without clicking |
| **Click Rate** | Clicks / Impressions × 100 — measures how compelling your campaign is |

### Why It Matters
- Run targeted campaigns without code changes (e.g., "Users who haven't set goals → show Goals promo")
- A/B test different messages by creating similar campaigns with different text
- Track ROI of each campaign through click rates

---

## 11. DATA EXPORT (`/admin/data-export`)
*Download platform data as CSV spreadsheets for external analysis*

| Element | What It Means |
|---------|--------------|
| **Export Users CSV** | Downloads all user accounts (email, name, signup date, last login, auth type) |
| **Export Analytics CSV** | Downloads platform-wide engagement and usage analytics |
| **Export Financials CSV** | Downloads detailed financial data for a specific user (all their income sources, expenses, assets, investments, loans) |

### Why It Matters
- Regulatory compliance and auditing requirements
- Import into Excel/Google Sheets for custom analysis and reporting
- Share with financial advisors or business partners

---

## 12. ONBOARDING STATS (`/admin/onboarding-stats`)
*Track the new user financial profile setup funnel*

| Element | What It Means |
|---------|--------------|
| **Funnel Steps** | How many users completed each onboarding step: Started → Income → Expenses → Assets → Liabilities → Investments → Completed |
| **Drop-off Rate** | Where users abandon the setup. If 80% finish Income but only 30% finish Assets, the Assets step needs simplification |
| **Completion Rate** | Percentage of users who finished ALL 5 steps of the financial profile setup |
| **Dismissed Count** | Users who closed the setup wizard without completing it |

### Why It Matters
- Identify which onboarding step causes the most drop-offs → simplify that step
- Low completion rate = users don't see enough value to finish → improve messaging
- High dismiss rate = the setup feels too long or intrusive → consider breaking it into smaller pieces

---

## Quick Glossary of Common Terms

| Term | Definition |
|------|-----------|
| **Event** | Any tracked user action: page view, button click, form submission, search query |
| **Session** | One continuous visit to the app (from login/open to close/timeout) |
| **Cohort** | A group of users who signed up during the same time period |
| **Churn** | When a user stops using the app permanently |
| **Retention** | The opposite of churn — users who keep coming back |
| **Funnel** | A sequence of steps users go through (e.g., Sign up → Add Income → Add Expenses → Complete Profile) |
| **Coverage** | What % of total users have used a particular feature |
| **Stickiness** | How often users return to a feature (measured by repeat rate) |
| **Runway** | Number of days a user can survive without income (same as Safety Days) |
| **PFSI** | Platform Financial Strength Index — overall financial health of your entire user base |
