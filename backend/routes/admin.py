"""Admin Command Center — Internal analytics and intelligence routes."""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, HTTPException, Response
import logging
import uuid

from database import db
from routes.utils import get_user_filter, get_user_now
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

ADMIN_CREDENTIALS = {
    "admin@moneyssutra.com": "admin123",
}
ADMIN_EMAILS = {"test@moneyssutra.com", "admin@moneyssutra.com"}

# In-memory admin sessions (simple approach)
admin_sessions = {}


@router.post("/login")
async def admin_login(request: Request, response: Response):
    """Admin-specific login endpoint."""
    body = await request.json()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if email not in ADMIN_CREDENTIALS or ADMIN_CREDENTIALS[email] != password:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    token = str(uuid.uuid4())
    admin_sessions[token] = {"email": email, "created": datetime.now(timezone.utc).isoformat()}
    response.set_cookie("admin_token", token, httponly=True, samesite="none", secure=True, max_age=86400)
    return {"success": True, "email": email}


@router.get("/verify")
async def verify_admin(request: Request):
    """Lightweight admin verification."""
    await _require_admin(request)
    return {"admin": True}


async def _require_admin(request: Request):
    # Check admin_token cookie first (standalone admin login)
    admin_token = request.cookies.get("admin_token")
    if admin_token and admin_token in admin_sessions:
        return admin_sessions[admin_token]

    # Fallback: check main app session
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    email = user.get("email", "").lower()
    if email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ── Helpers ──

ESSENTIAL_CATS = {"Housing", "Utilities", "Food", "Medical", "Education", "Insurance", "EMI"}
LIFESTYLE_CATS = {"Travel", "Shopping", "Subscriptions", "Business Expense", "Salary Paid"}
WEALTH_CATS = {"Investments", "Savings"}

def _classify(cat):
    if cat in ESSENTIAL_CATS: return "essential"
    if cat in LIFESTYLE_CATS: return "lifestyle"
    if cat in WEALTH_CATS: return "wealth"
    return "lifestyle"


async def _compute_user_metrics(user_id: str, now: datetime):
    """Compute financial metrics for a single user."""
    import asyncio
    # Parallel DB queries
    exp_q, inc_q, goal_q, asset_q, loan_q, liquid_q = await asyncio.gather(
        db.expenses.find({"userId": user_id}, {"_id": 0, "expectedAmount": 1, "category": 1, "frequency": 1}).to_list(5000),
        db.income_sources.find({"userId": user_id}, {"_id": 0, "expectedAmount": 1}).to_list(500),
        db.goals.find({"userId": user_id}, {"_id": 0, "targetAmount": 1, "currentAmount": 1}).to_list(100),
        db.assets.find({"userId": user_id}, {"_id": 0, "value": 1}).to_list(500),
        db.liquid_assets.find({"userId": user_id, "type": {"$regex": "Loan", "$options": "i"}}, {"_id": 0, "emiAmount": 1}).to_list(100),
        db.liquid_assets.find({"userId": user_id, "type": {"$nin": ["Personal Loan", "Home Loan", "Car Loan", "Education Loan", "Other Loan"]}}, {"_id": 0, "balance": 1, "amount": 1}).to_list(100),
    )
    total_income = sum(float(i.get("expectedAmount", 0)) for i in inc_q)
    total_emi = sum(float(l.get("emiAmount", 0)) for l in loan_q)
    total_assets_val = sum(float(a.get("value", 0)) for a in asset_q)

    # Current month spend by group
    essential = lifestyle = wealth = 0
    for exp in exp_q:
        amt = float(exp.get("expectedAmount", 0))
        cat = exp.get("category", "Other")
        g = _classify(cat)
        if g == "essential": essential += amt
        elif g == "lifestyle": lifestyle += amt
        elif g == "wealth": wealth += amt

    total_spend = essential + lifestyle + wealth
    base = total_income if total_income > 0 else max(total_spend, 1)

    # Safety days
    daily_essential = essential / 30 if essential > 0 else 1
    liquid_balance = sum(float(a.get("balance", a.get("amount", 0))) for a in liquid_q)
    safety_days = round(liquid_balance / daily_essential) if daily_essential > 0 else 0

    # Percentages
    essential_pct = round(essential / base * 100, 1) if base > 0 else 0
    lifestyle_pct = round(lifestyle / base * 100, 1) if base > 0 else 0
    wealth_pct = round(wealth / base * 100, 1) if base > 0 else 0
    emi_pct = round(total_emi / base * 100, 1) if base > 0 else 0

    # Health score (0-100)
    health_score = max(0, min(100,
        (min(safety_days, 90) / 90 * 40) +  # Safety component (40%)
        (min(wealth_pct, 30) / 30 * 30) +    # Wealth component (30%)
        (max(0, 50 - essential_pct) / 50 * 30)  # Efficiency component (30%)
    ))

    # Risk level
    if safety_days < 15: risk = "critical"
    elif safety_days < 30: risk = "high"
    elif safety_days < 60: risk = "moderate"
    else: risk = "stable"

    # Income band
    if total_income >= 200000: band = "200K+"
    elif total_income >= 100000: band = "100K-200K"
    elif total_income >= 50000: band = "50K-100K"
    elif total_income >= 25000: band = "25K-50K"
    else: band = "<25K"

    # Monetization bucket
    bucket = "None"
    if safety_days < 30 and total_income > 0 and lifestyle_pct > 25:
        bucket = "Safety Boost"
    elif total_income >= 75000 and wealth_pct < 15:
        bucket = "Wealth Optimization"
    elif emi_pct > 35 and safety_days < 45:
        bucket = "Debt Optimization"

    return {
        "userId": user_id[:8] + "****",
        "incomeBand": band,
        "safetyDays": safety_days,
        "wealthPct": wealth_pct,
        "lifestylePct": lifestyle_pct,
        "emiPct": emi_pct,
        "healthScore": round(health_score, 1),
        "riskLevel": risk,
        "monetizationBucket": bucket,
        "essentialPct": essential_pct,
        "totalIncome": round(total_income),
        "totalSpend": round(total_spend),
        "totalAssets": round(total_assets_val),
    }



# ────────────────────────────────────────────
# USER GROWTH — Registration trends + Cohort
# ────────────────────────────────────────────

@router.get("/user-growth")
async def user_growth(request: Request):
    await _require_admin(request)
    now = get_user_now(request)

    all_users = await db.users.find({}, {"_id": 0, "user_id": 1, "createdAt": 1, "lastLogin": 1}).to_list(10000)
    total_users = len(all_users)

    today_str = now.strftime("%Y-%m-%d")
    week_ago = (now - timedelta(days=7))
    month_ago = (now - timedelta(days=30))

    new_today = 0
    new_this_week = 0
    new_this_month = 0

    # Parse createdAt and bucket registrations
    daily_buckets = {}  # last 30 days
    weekly_buckets = {}  # last 12 weeks
    monthly_buckets = {}  # last 12 months

    for u in all_users:
        ca = u.get("createdAt", "")
        if not ca:
            continue
        try:
            if isinstance(ca, str):
                created = datetime.fromisoformat(ca.replace("Z", "+00:00"))
            else:
                created = ca
            created_date = created.date() if hasattr(created, 'date') else created
        except (ValueError, TypeError):
            continue

        now_date = now.date() if hasattr(now, 'date') else now

        # Daily count
        day_key = str(created_date)
        daily_buckets[day_key] = daily_buckets.get(day_key, 0) + 1

        # Check new today/week/month
        days_diff = (now_date - created_date).days if hasattr(created_date, 'year') else 999
        if days_diff == 0:
            new_today += 1
        if days_diff <= 7:
            new_this_week += 1
        if days_diff <= 30:
            new_this_month += 1

        # Weekly bucket (ISO week)
        if hasattr(created_date, 'isocalendar'):
            iso = created_date.isocalendar()
            wk_key = f"{iso[0]}-W{iso[1]:02d}"
            weekly_buckets[wk_key] = weekly_buckets.get(wk_key, 0) + 1

        # Monthly bucket
        if hasattr(created_date, 'strftime'):
            mo_key = created_date.strftime("%Y-%m")
            monthly_buckets[mo_key] = monthly_buckets.get(mo_key, 0) + 1

    # Build daily registrations (last 30 days)
    daily_regs = []
    cumulative = 0
    for i in range(29, -1, -1):
        d = (now - timedelta(days=i))
        d_str = d.strftime("%Y-%m-%d")
        count = daily_buckets.get(d_str, 0)
        cumulative += count
        prev = daily_regs[-1]["count"] if daily_regs else 0
        growth = round((count - prev) / max(prev, 1) * 100, 1) if daily_regs else 0
        daily_regs.append({"label": d.strftime("%d %b"), "count": count, "cumulative": cumulative, "growthPct": growth})

    # Build weekly registrations (last 12 weeks)
    weekly_regs = []
    for i in range(11, -1, -1):
        d = (now - timedelta(weeks=i))
        iso = d.isocalendar()
        wk_key = f"{iso[0]}-W{iso[1]:02d}"
        count = weekly_buckets.get(wk_key, 0)
        prev = weekly_regs[-1]["count"] if weekly_regs else 0
        growth = round((count - prev) / max(prev, 1) * 100, 1) if weekly_regs else 0
        weekly_regs.append({"label": f"W{iso[1]}", "count": count, "growthPct": growth})

    # Build monthly registrations (last 12 months)
    monthly_regs = []
    for i in range(11, -1, -1):
        d = now - timedelta(days=i * 30)
        mo_key = d.strftime("%Y-%m")
        count = monthly_buckets.get(mo_key, 0)
        prev = monthly_regs[-1]["count"] if monthly_regs else 0
        growth = round((count - prev) / max(prev, 1) * 100, 1) if monthly_regs else 0
        monthly_regs.append({"label": d.strftime("%b %y"), "count": count, "growthPct": growth})

    # DAU/WAU/MAU from sessions
    dau = await db.sessions.count_documents({"created_at": {"$gte": today_str}})
    wau_str = week_ago.strftime("%Y-%m-%d")
    mau_str = month_ago.strftime("%Y-%m-%d")
    wau = await db.sessions.count_documents({"created_at": {"$gte": wau_str}})
    mau = await db.sessions.count_documents({"created_at": {"$gte": mau_str}})

    # Growth percentages
    prev_week_start = (now - timedelta(days=14)).strftime("%Y-%m-%d")
    prev_week_new = sum(1 for u in all_users if _user_created_between(u, prev_week_start, wau_str))
    weekly_growth = round(((new_this_week - prev_week_new) / max(prev_week_new, 1)) * 100, 1)

    prev_month_start = (now - timedelta(days=60)).strftime("%Y-%m-%d")
    prev_month_new = sum(1 for u in all_users if _user_created_between(u, prev_month_start, mau_str))
    monthly_growth = round(((new_this_month - prev_month_new) / max(prev_month_new, 1)) * 100, 1)

    # Cohort retention (simplified - based on registration weeks)
    cohort_retention = []
    for i in range(3, -1, -1):
        cohort_start = now - timedelta(weeks=i + 1)
        cohort_end = now - timedelta(weeks=i)
        cohort_label = cohort_start.strftime("%d %b")
        cohort_users = [u for u in all_users if _user_created_between(u, cohort_start.strftime("%Y-%m-%d"), cohort_end.strftime("%Y-%m-%d"))]
        cu_count = len(cohort_users)
        if cu_count == 0:
            continue
        # Check last login for retention
        day1 = sum(1 for u in cohort_users if _last_login_after(u, cohort_start + timedelta(days=1)))
        day7 = sum(1 for u in cohort_users if _last_login_after(u, cohort_start + timedelta(days=7)))
        day30 = sum(1 for u in cohort_users if _last_login_after(u, cohort_start + timedelta(days=30)))
        cohort_retention.append({
            "cohort": f"Week of {cohort_label}",
            "users": cu_count,
            "day1": round(day1 / cu_count * 100),
            "day7": round(day7 / cu_count * 100),
            "day30": round(day30 / cu_count * 100),
        })

    return {
        "totalUsers": total_users,
        "newToday": new_today,
        "newThisWeek": new_this_week,
        "newThisMonth": new_this_month,
        "dailyGrowthPct": 0,
        "weeklyGrowthPct": weekly_growth,
        "monthlyGrowthPct": monthly_growth,
        "dauCount": min(dau, total_users),
        "wauCount": min(wau, total_users),
        "mauCount": min(mau, total_users),
        "avgSessionDuration": "—",
        "dailyRegistrations": daily_regs,
        "weeklyRegistrations": weekly_regs,
        "monthlyRegistrations": monthly_regs,
        "cohortRetention": cohort_retention,
    }


def _user_created_between(user, start_str, end_str):
    ca = user.get("createdAt", "")
    if not ca:
        return False
    try:
        if isinstance(ca, str):
            ca_str = ca[:10]
        else:
            ca_str = ca.strftime("%Y-%m-%d")
        return start_str <= ca_str < end_str
    except (ValueError, TypeError):
        return False


def _last_login_after(user, after_dt):
    ll = user.get("lastLogin", "")
    if not ll:
        return False
    try:
        if isinstance(ll, str):
            login_dt = datetime.fromisoformat(ll.replace("Z", "+00:00"))
        else:
            login_dt = ll
        return login_dt >= after_dt
    except (ValueError, TypeError):
        return False


# ────────────────────────────────────────────
# COMMAND CENTER — Platform KPIs + PFSI
# ────────────────────────────────────────────

@router.get("/command-center")
async def command_center(request: Request):
    await _require_admin(request)
    now = get_user_now(request)

    all_users = await db.users.find({}, {"_id": 0, "user_id": 1, "email": 1, "createdAt": 1, "lastLogin": 1}).to_list(10000)
    total_users = len(all_users)

    # Active users (7d / 30d) from sessions
    week_ago = (now - timedelta(days=7)).isoformat()
    month_ago = (now - timedelta(days=30)).isoformat()
    active_7d = await db.sessions.count_documents({"created_at": {"$gte": week_ago}})
    active_30d = await db.sessions.count_documents({"created_at": {"$gte": month_ago}})

    # Compute metrics for all users
    user_metrics = []
    for u in all_users:
        uid = u.get("user_id", "")
        if not uid:
            continue
        try:
            m = await _compute_user_metrics(uid, now)
            user_metrics.append(m)
        except Exception as e:
            logger.warning(f"Skipping user {uid}: {e}")

    if not user_metrics:
        return {"totalUsers": total_users, "active7d": active_7d, "active30d": active_30d, "pfsi": 0, "avgSafetyDays": 0, "avgWealthPct": 0, "avgHealthScore": 0, "riskDistribution": {}, "userMetrics": []}

    avg_safety = round(sum(m["safetyDays"] for m in user_metrics) / len(user_metrics), 1)
    avg_wealth = round(sum(m["wealthPct"] for m in user_metrics) / len(user_metrics), 1)
    avg_health = round(sum(m["healthScore"] for m in user_metrics) / len(user_metrics), 1)
    pct_low_safety = round(sum(1 for m in user_metrics if m["safetyDays"] < 30) / len(user_metrics) * 100, 1)

    # PFSI (Platform Financial Strength Index)
    safety_score = min(avg_safety, 90) / 90 * 100
    wealth_score = min(avg_wealth, 30) / 30 * 100
    health_component = avg_health
    pfsi = round(safety_score * 0.4 + wealth_score * 0.3 + health_component * 0.3, 1)

    # Risk distribution
    risk_dist = {"critical": 0, "high": 0, "moderate": 0, "stable": 0}
    for m in user_metrics:
        risk_dist[m["riskLevel"]] = risk_dist.get(m["riskLevel"], 0) + 1

    # Monetization buckets
    buckets = {}
    for m in user_metrics:
        b = m["monetizationBucket"]
        if b != "None":
            buckets[b] = buckets.get(b, 0) + 1

    return {
        "totalUsers": total_users,
        "active7d": min(active_7d, total_users),
        "active30d": min(active_30d, total_users),
        "pfsi": pfsi,
        "avgSafetyDays": avg_safety,
        "avgWealthPct": avg_wealth,
        "avgHealthScore": avg_health,
        "pctLowSafety": pct_low_safety,
        "riskDistribution": risk_dist,
        "monetizationBuckets": buckets,
        "userMetrics": user_metrics,
    }


# ────────────────────────────────────────────
# RISK RADAR — Risk Intelligence
# ────────────────────────────────────────────

@router.get("/risk-radar")
async def risk_radar(request: Request):
    await _require_admin(request)
    now = get_user_now(request)

    all_users = await db.users.find({}, {"_id": 0, "user_id": 1}).to_list(10000)
    metrics = []
    for u in all_users:
        uid = u.get("user_id", "")
        if not uid:
            continue
        try:
            m = await _compute_user_metrics(uid, now)
            metrics.append(m)
        except:
            pass

    total = len(metrics) or 1
    risk_buckets = {
        "critical": {"count": 0, "users": [], "threshold": "<15 days"},
        "high": {"count": 0, "users": [], "threshold": "15-30 days"},
        "moderate": {"count": 0, "users": [], "threshold": "30-60 days"},
        "stable": {"count": 0, "users": [], "threshold": "60+ days"},
    }
    for m in metrics:
        r = m["riskLevel"]
        risk_buckets[r]["count"] += 1
        risk_buckets[r]["users"].append(m)
    for k in risk_buckets:
        risk_buckets[k]["pct"] = round(risk_buckets[k]["count"] / total * 100, 1)

    # Risk drivers
    drivers = []
    low_wealth = sum(1 for m in metrics if m["wealthPct"] < 15)
    high_emi = sum(1 for m in metrics if m["emiPct"] > 35)
    high_lifestyle = sum(1 for m in metrics if m["lifestylePct"] > 40)
    low_income = sum(1 for m in metrics if m["totalIncome"] < 25000)
    if low_wealth > 0:
        drivers.append({"driver": "Low Wealth Allocation (<15%)", "count": low_wealth, "pct": round(low_wealth / total * 100, 1)})
    if high_emi > 0:
        drivers.append({"driver": "High EMI Burden (>35%)", "count": high_emi, "pct": round(high_emi / total * 100, 1)})
    if high_lifestyle > 0:
        drivers.append({"driver": "High Lifestyle Drift (>40%)", "count": high_lifestyle, "pct": round(high_lifestyle / total * 100, 1)})
    if low_income > 0:
        drivers.append({"driver": "Low Income Band (<25K)", "count": low_income, "pct": round(low_income / total * 100, 1)})
    drivers.sort(key=lambda x: -x["count"])

    return {
        "totalUsers": len(metrics),
        "riskBuckets": risk_buckets,
        "riskDrivers": drivers,
    }



# ────────────────────────────────────────────
# ENGAGEMENT ANALYTICS
# ────────────────────────────────────────────

@router.get("/engagement")
async def engagement_analytics(request: Request):
    """User engagement metrics: session times, hourly heatmap, day-of-week."""
    await _require_admin(request)
    now = get_user_now(request)
    today_str = now.strftime("%Y-%m-%d")
    week_ago_str = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    month_ago_str = (now - timedelta(days=30)).strftime("%Y-%m-%d")

    # --- Session Duration Averages ---
    all_sessions = await db.user_sessions.find(
        {"durationSec": {"$gt": 0}},
        {"_id": 0, "startedAt": 1, "durationSec": 1}
    ).to_list(10000)

    today_sessions = [s for s in all_sessions if s.get("startedAt", "")[:10] == today_str]
    week_sessions = [s for s in all_sessions if s.get("startedAt", "")[:10] >= week_ago_str]
    month_sessions = [s for s in all_sessions if s.get("startedAt", "")[:10] >= month_ago_str]

    def avg_dur(sessions):
        if not sessions:
            return 0
        total = sum(s.get("durationSec", 0) for s in sessions)
        return round(total / len(sessions))

    avg_today = avg_dur(today_sessions)
    avg_7d = avg_dur(week_sessions)
    avg_30d = avg_dur(month_sessions)

    # --- Hourly Heatmap (24 hours × 7 days) ---
    events_30d = await db.user_events.find(
        {"timestamp": {"$gte": month_ago_str}},
        {"_id": 0, "hour": 1, "dayOfWeek": 1}
    ).to_list(50000)

    heatmap = [[0] * 24 for _ in range(7)]
    for ev in events_30d:
        dow = ev.get("dayOfWeek", 0)
        hour = ev.get("hour", 0)
        if 0 <= dow < 7 and 0 <= hour < 24:
            heatmap[dow][hour] += 1

    # --- Day-of-Week Engagement (avg time per day) ---
    dow_totals = [0] * 7
    dow_counts = [0] * 7
    for s in month_sessions:
        try:
            dt = datetime.fromisoformat(s["startedAt"].replace("Z", "+00:00"))
            dow = dt.weekday()
            dow_totals[dow] += s.get("durationSec", 0)
            dow_counts[dow] += 1
        except (ValueError, TypeError):
            pass

    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    dow_chart = []
    for i in range(7):
        avg = round(dow_totals[i] / max(dow_counts[i], 1))
        dow_chart.append({"day": day_names[i], "avgDuration": avg, "sessions": dow_counts[i]})

    # --- Peak Hours ---
    hour_totals = [0] * 24
    for ev in events_30d:
        h = ev.get("hour", 0)
        if 0 <= h < 24:
            hour_totals[h] += 1
    peak_hours = sorted(range(24), key=lambda h: -hour_totals[h])[:3]
    peak_labels = [f"{h}:00-{h+1}:00" for h in peak_hours]

    return {
        "avgSessionToday": avg_today,
        "avgSession7d": avg_7d,
        "avgSession30d": avg_30d,
        "totalSessions30d": len(month_sessions),
        "totalEvents30d": len(events_30d),
        "heatmap": heatmap,
        "dayOfWeekChart": dow_chart,
        "peakHours": peak_labels,
    }


# ────────────────────────────────────────────
# FEATURE / PAGE USAGE ANALYTICS
# ────────────────────────────────────────────

@router.get("/feature-usage")
async def feature_usage_analytics(request: Request):
    """Page-wise activity: time spent, user coverage, repeat visits, funnel."""
    await _require_admin(request)
    now = get_user_now(request)
    month_ago_str = (now - timedelta(days=30)).strftime("%Y-%m-%d")

    # Get all sessions with page data
    sessions_with_pages = await db.user_sessions.find(
        {"startedAt": {"$gte": month_ago_str}, "pages": {"$exists": True, "$ne": []}},
        {"_id": 0, "userId": 1, "pages": 1}
    ).to_list(10000)

    total_users_count = await db.users.count_documents({})
    total_users = max(total_users_count, 1)

    # Page metrics
    page_stats = {}
    user_pages = {}  # userId -> set of pages
    for s in sessions_with_pages:
        uid = s.get("userId", "")
        if uid not in user_pages:
            user_pages[uid] = set()
        for p in s.get("pages", []):
            name = p.get("page", "")
            dur = p.get("durationSec", 0)
            if not name:
                continue
            user_pages[uid].add(name)
            if name not in page_stats:
                page_stats[name] = {"totalTime": 0, "visits": 0, "uniqueUsers": set()}
            page_stats[name]["totalTime"] += dur
            page_stats[name]["visits"] += 1
            page_stats[name]["uniqueUsers"].add(uid)

    page_table = []
    for name, stats in page_stats.items():
        unique = len(stats["uniqueUsers"])
        visits = stats["visits"]
        avg_time = round(stats["totalTime"] / max(visits, 1))
        repeat = "High" if visits / max(unique, 1) > 3 else "Medium" if visits / max(unique, 1) > 1.5 else "Low"
        page_table.append({
            "page": name,
            "avgTimeSec": avg_time,
            "pctUsersVisited": round(unique / total_users * 100, 1),
            "totalVisits": visits,
            "uniqueUsers": unique,
            "repeatVisits": repeat,
        })
    page_table.sort(key=lambda x: -x["totalVisits"])

    # Activity Funnel
    funnel_stages = ["Home", "Wealth", "Health", "Goals", "Expenses"]
    funnel_data = []
    for stage in funnel_stages:
        users_at_stage = sum(1 for uid, pages in user_pages.items() if stage.lower() in {p.lower() for p in pages})
        funnel_data.append({"stage": stage, "users": users_at_stage, "pct": round(users_at_stage / total_users * 100, 1)})

    # Page events from user_events collection (fallback if sessions don't have page data)
    page_events = await db.user_events.find(
        {"timestamp": {"$gte": month_ago_str}, "eventType": "page_view"},
        {"_id": 0, "pageName": 1, "userId": 1}
    ).to_list(50000)

    if not page_table and page_events:
        ev_stats = {}
        for ev in page_events:
            name = ev.get("pageName", "")
            uid = ev.get("userId", "")
            if not name:
                continue
            if name not in ev_stats:
                ev_stats[name] = {"visits": 0, "uniqueUsers": set()}
            ev_stats[name]["visits"] += 1
            ev_stats[name]["uniqueUsers"].add(uid)
        for name, stats in ev_stats.items():
            unique = len(stats["uniqueUsers"])
            visits = stats["visits"]
            repeat = "High" if visits / max(unique, 1) > 3 else "Medium" if visits / max(unique, 1) > 1.5 else "Low"
            page_table.append({
                "page": name,
                "avgTimeSec": 0,
                "pctUsersVisited": round(unique / total_users * 100, 1),
                "totalVisits": visits,
                "uniqueUsers": unique,
                "repeatVisits": repeat,
            })
        page_table.sort(key=lambda x: -x["totalVisits"])

    return {
        "pageTable": page_table,
        "funnel": funnel_data,
        "totalTrackedUsers": len(user_pages),
        "totalSessions": len(sessions_with_pages),
    }
