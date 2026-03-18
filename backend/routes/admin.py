"""Admin Command Center — Internal analytics and intelligence routes."""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, HTTPException
import logging
import uuid

from database import db
from routes.utils import get_user_filter, get_user_now

logger = logging.getLogger(__name__)
router = APIRouter()

ADMIN_CREDENTIALS = {
    "admin@moneyssutra.com": "admin123",
    "admin@moneysutra.com": "admin123",
    "admin@moneysstra.com": "admin123",
    "chandrashekhar.iter@gmail.com": "admin123",
}

# In-memory cache cleared periodically - use DB as source of truth
admin_sessions_cache = {}


@router.post("/login")
async def admin_login(request: Request):
    """Admin-specific login endpoint."""
    body = await request.json()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if email not in ADMIN_CREDENTIALS or ADMIN_CREDENTIALS[email] != password:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    token = str(uuid.uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    session_data = {"token": token, "email": email, "created": datetime.now(timezone.utc).isoformat(), "expires_at": expires_at}
    await db.admin_sessions.insert_one(session_data)
    admin_sessions_cache[token] = session_data
    return {"success": True, "email": email, "token": token}


@router.post("/logout")
async def admin_logout(request: Request):
    """Admin logout — invalidate session."""
    token = _extract_token(request)
    if token:
        admin_sessions_cache.pop(token, None)
        await db.admin_sessions.delete_one({"token": token})
    return {"success": True}


@router.get("/verify")
async def verify_admin(request: Request):
    """Lightweight admin verification."""
    await _require_admin(request)
    return {"admin": True}


def _extract_token(request: Request) -> str:
    """Extract admin token from Authorization header or cookie."""
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return request.cookies.get("admin_token", "")


async def _require_admin(request: Request):
    token = _extract_token(request)
    if token:
        # Check cache first, then DB
        if token in admin_sessions_cache:
            return admin_sessions_cache[token]
        session = await db.admin_sessions.find_one({"token": token}, {"_id": 0})
        if session:
            admin_sessions_cache[token] = session
            return session

    raise HTTPException(status_code=401, detail="Not authenticated")

# ── Helpers ──

ESSENTIAL_CATS = {"Housing", "Utilities", "Food", "Medical", "Education", "Insurance", "EMI"}
LIFESTYLE_CATS = {"Travel", "Shopping", "Subscriptions", "Business Expense", "Salary Paid"}
WEALTH_CATS = {"Investments", "Savings"}

def _classify(cat):
    if cat in ESSENTIAL_CATS: return "essential"
    if cat in LIFESTYLE_CATS: return "lifestyle"
    if cat in WEALTH_CATS: return "wealth"
    return "lifestyle"


async def _compute_user_metrics(user_id: str, now: datetime, user_name: str = ""):
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
        "userName": user_name,
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

    all_users = await db.users.find({}, {"_id": 0, "user_id": 1, "email": 1, "name": 1, "firstName": 1, "createdAt": 1, "lastLogin": 1}).to_list(10000)
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
            m = await _compute_user_metrics(uid, now, u.get("name", u.get("firstName", "")))
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
            m = await _compute_user_metrics(uid, now, u.get("name", u.get("firstName", "")))
        except:
            metrics.append(m)
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


# ────────────────────────────────────────────
# SEGMENTATION LAB — Advanced User Filtering
# ────────────────────────────────────────────

@router.get("/segmentation")
async def segmentation_lab(request: Request):
    """Advanced user segmentation with profile + financial filters."""
    await _require_admin(request)
    now = get_user_now(request)
    params = request.query_params

    # Parse filter params
    age_min = int(params.get("age_min", 0))
    age_max = int(params.get("age_max", 200))
    gender = params.get("gender", "")
    city = params.get("city", "")
    occupation = params.get("occupation", "")
    income_min = float(params.get("income_min", 0))
    income_max = float(params.get("income_max", 999999999))
    safety_min = int(params.get("safety_min", 0))
    safety_max = int(params.get("safety_max", 999999))
    risk_level = params.get("risk_level", "")
    health_min = float(params.get("health_min", 0))
    health_max = float(params.get("health_max", 100))
    wealth_min = float(params.get("wealth_min", 0))
    wealth_max = float(params.get("wealth_max", 100))
    emi_max = float(params.get("emi_max", 100))
    bucket = params.get("bucket", "")
    page = int(params.get("page", 1))
    page_size = int(params.get("page_size", 20))

    # Fetch all users + profiles
    all_users = await db.users.find({}, {"_id": 0, "user_id": 1, "email": 1, "createdAt": 1}).to_list(10000)
    all_profiles = await db.profiles.find({}, {"_id": 0}).to_list(10000)
    profile_map = {p["userId"]: p for p in all_profiles}

    # Compute financial metrics for all users
    user_data = []
    for u in all_users:
        uid = u.get("user_id", "")
        if not uid:
            continue
        try:
            metrics = await _compute_user_metrics(uid, now, u.get("name", u.get("firstName", "")))

        except Exception:
            continue

        profile = profile_map.get(uid, {})
        # Calculate age
        age = None
        dob_str = profile.get("dateOfBirth", "")
        if dob_str:
            try:
                dob = datetime.fromisoformat(dob_str)
                age = (now.date() - dob.date()).days // 365
            except (ValueError, TypeError):
                pass

        user_data.append({
            **metrics,
            "email": u.get("email", ""),
            "name": profile.get("name", ""),
            "age": age,
            "gender": profile.get("gender", ""),
            "city": profile.get("city", ""),
            "occupation": profile.get("occupation", ""),
            "annualIncome": float(profile.get("annualIncome", 0) or 0),
            "dependents": int(profile.get("dependents", 0) or 0),
            "createdAt": u.get("createdAt", ""),
        })

    # Apply filters
    filtered = []
    for u in user_data:
        if u["age"] is not None and (u["age"] < age_min or u["age"] > age_max):
            continue
        if gender and u["gender"].lower() != gender.lower():
            continue
        if city and city.lower() not in u["city"].lower():
            continue
        if occupation and occupation.lower() not in u["occupation"].lower():
            continue
        if u["annualIncome"] < income_min or u["annualIncome"] > income_max:
            continue
        if u["safetyDays"] < safety_min or u["safetyDays"] > safety_max:
            continue
        if risk_level and u["riskLevel"] != risk_level:
            continue
        if u["healthScore"] < health_min or u["healthScore"] > health_max:
            continue
        if u["wealthPct"] < wealth_min or u["wealthPct"] > wealth_max:
            continue
        if u["emiPct"] > emi_max:
            continue
        if bucket and u["monetizationBucket"] != bucket:
            continue
        filtered.append(u)

    total_filtered = len(filtered)

    # Aggregate summary metrics
    if filtered:
        avg_safety = round(sum(u["safetyDays"] for u in filtered) / total_filtered, 1)
        avg_health = round(sum(u["healthScore"] for u in filtered) / total_filtered, 1)
        avg_wealth = round(sum(u["wealthPct"] for u in filtered) / total_filtered, 1)
        avg_income = round(sum(u["annualIncome"] for u in filtered) / total_filtered)
        avg_age = round(sum(u["age"] for u in filtered if u["age"] is not None) / max(sum(1 for u in filtered if u["age"] is not None), 1), 1)
        risk_dist = {}
        for u in filtered:
            risk_dist[u["riskLevel"]] = risk_dist.get(u["riskLevel"], 0) + 1
        gender_dist = {}
        for u in filtered:
            g = u["gender"] or "Unknown"
            gender_dist[g] = gender_dist.get(g, 0) + 1
        city_dist = {}
        for u in filtered:
            c = u["city"] or "Unknown"
            city_dist[c] = city_dist.get(c, 0) + 1
    else:
        avg_safety = avg_health = avg_wealth = avg_income = avg_age = 0
        risk_dist = {}
        gender_dist = {}
        city_dist = {}

    # Pagination
    start = (page - 1) * page_size
    end = start + page_size
    paginated = filtered[start:end]

    # Collect unique values for filter dropdowns
    all_cities = sorted(set(u["city"] for u in user_data if u["city"]))
    all_occupations = sorted(set(u["occupation"] for u in user_data if u["occupation"]))
    all_genders = sorted(set(u["gender"] for u in user_data if u["gender"]))

    return {
        "totalUsers": len(user_data),
        "filteredCount": total_filtered,
        "page": page,
        "pageSize": page_size,
        "totalPages": max(1, -(-total_filtered // page_size)),
        "summary": {
            "avgSafetyDays": avg_safety,
            "avgHealthScore": avg_health,
            "avgWealthPct": avg_wealth,
            "avgAnnualIncome": avg_income,
            "avgAge": avg_age,
            "riskDistribution": risk_dist,
            "genderDistribution": gender_dist,
            "cityDistribution": city_dist,
        },
        "users": paginated,
        "filterOptions": {
            "cities": all_cities,
            "occupations": all_occupations,
            "genders": all_genders,
        },
    }



# ────────────────────────────────────────────
# PHASE 4 — SUPPORT INTELLIGENCE (FAQ & Search)
# ────────────────────────────────────────────

@router.get("/support-intelligence")
async def support_intelligence(request: Request):
    """Aggregate FAQ searches and in-app search queries from events."""
    await _require_admin(request)
    now = get_user_now(request)
    month_ago_str = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    week_ago_str = (now - timedelta(days=7)).strftime("%Y-%m-%d")

    # Get all search events
    search_events = await db.user_events.find(
        {"eventType": {"$in": ["search", "faq_search", "faq_view", "help_search"]}},
        {"_id": 0, "eventType": 1, "metadata": 1, "timestamp": 1, "userId": 1}
    ).to_list(50000)

    # Get page_view events for FAQ/Help pages
    faq_views = await db.user_events.find(
        {"eventType": "page_view", "pageName": {"$regex": "help|faq|support|search", "$options": "i"}},
        {"_id": 0, "pageName": 1, "timestamp": 1, "userId": 1}
    ).to_list(10000)

    # Aggregate search terms
    search_terms = {}
    for ev in search_events:
        term = (ev.get("metadata", {}).get("query", "") or
                ev.get("metadata", {}).get("term", "") or
                ev.get("metadata", {}).get("search_term", "")).strip().lower()
        if not term:
            continue
        ts = ev.get("timestamp", "")
        is_recent = ts >= week_ago_str if ts else False
        if term not in search_terms:
            search_terms[term] = {"count": 0, "users": set(), "lastSearched": "", "recentCount": 0}
        search_terms[term]["count"] += 1
        search_terms[term]["users"].add(ev.get("userId", ""))
        if ts > search_terms[term]["lastSearched"]:
            search_terms[term]["lastSearched"] = ts
        if is_recent:
            search_terms[term]["recentCount"] += 1

    top_searches = sorted(
        [{"term": t, "count": d["count"], "uniqueUsers": len(d["users"]), "lastSearched": d["lastSearched"], "trending": d["recentCount"] > d["count"] * 0.5} for t, d in search_terms.items()],
        key=lambda x: -x["count"]
    )[:50]

    # Aggregate FAQ page views
    faq_pages = {}
    for ev in faq_views:
        page = ev.get("pageName", "")
        if page not in faq_pages:
            faq_pages[page] = {"visits": 0, "users": set()}
        faq_pages[page]["visits"] += 1
        faq_pages[page]["users"].add(ev.get("userId", ""))

    top_faq_pages = sorted(
        [{"page": p, "visits": d["visits"], "uniqueUsers": len(d["users"])} for p, d in faq_pages.items()],
        key=lambda x: -x["visits"]
    )[:20]

    # Unanswered queries (searches with no subsequent page_view within same session)
    # Simplified: just count unique search terms
    total_searches = sum(d["count"] for d in search_terms.values())
    unique_searchers = len(set(ev.get("userId", "") for ev in search_events))

    return {
        "topSearches": top_searches,
        "topFaqPages": top_faq_pages,
        "totalSearches": total_searches,
        "uniqueSearchers": unique_searchers,
        "totalSearchTerms": len(search_terms),
        "searchEvents30d": len([e for e in search_events if e.get("timestamp", "") >= month_ago_str]),
        "searchEvents7d": len([e for e in search_events if e.get("timestamp", "") >= week_ago_str]),
    }


# ────────────────────────────────────────────
# PHASE 5 — CAMPAIGN MANAGER (Targeted Campaigns)
# ────────────────────────────────────────────

@router.get("/campaigns")
async def list_campaigns(request: Request):
    """List all campaigns."""
    await _require_admin(request)
    campaigns = await db.admin_campaigns.find({}, {"_id": 0}).sort("createdAt", -1).to_list(200)
    return {"campaigns": campaigns}


@router.post("/campaigns")
async def create_campaign(request: Request):
    """Create a new campaign/announcement."""
    await _require_admin(request)
    body = await request.json()
    now = datetime.now(timezone.utc).isoformat()
    campaign = {
        "id": str(uuid.uuid4()),
        "title": body.get("title", ""),
        "message": body.get("message", ""),
        "type": body.get("type", "banner"),  # banner, notification, popup
        "status": body.get("status", "draft"),  # draft, active, paused, expired
        "targeting": body.get("targeting", {"audience": "all"}),
        "startDate": body.get("startDate", now[:10]),
        "endDate": body.get("endDate", ""),
        "priority": body.get("priority", "normal"),  # low, normal, high, urgent
        "ctaText": body.get("ctaText", ""),
        "ctaUrl": body.get("ctaUrl", ""),
        "impressions": 0,
        "clicks": 0,
        "dismissals": 0,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.admin_campaigns.insert_one(campaign)
    campaign.pop("_id", None)
    return {"success": True, "campaign": campaign}


@router.put("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, request: Request):
    """Update an existing campaign."""
    await _require_admin(request)
    body = await request.json()
    now = datetime.now(timezone.utc).isoformat()
    update_fields = {}
    for key in ["title", "message", "type", "status", "targeting", "startDate", "endDate", "priority", "ctaText", "ctaUrl"]:
        if key in body:
            update_fields[key] = body[key]
    update_fields["updatedAt"] = now
    result = await db.admin_campaigns.update_one({"id": campaign_id}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    updated = await db.admin_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    return {"success": True, "campaign": updated}


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, request: Request):
    """Delete a campaign."""
    await _require_admin(request)
    result = await db.admin_campaigns.delete_one({"id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"success": True}


@router.post("/campaigns/{campaign_id}/toggle")
async def toggle_campaign(campaign_id: str, request: Request):
    """Toggle campaign status between active and paused."""
    await _require_admin(request)
    campaign = await db.admin_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    new_status = "paused" if campaign.get("status") == "active" else "active"
    await db.admin_campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"status": new_status, "updatedAt": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True, "status": new_status}


# ────────────────────────────────────────────
# PHASE 6 — BEHAVIORAL PATTERNS & CHURN
# ────────────────────────────────────────────

@router.get("/behavioral-insights")
async def behavioral_insights(request: Request):
    """Behavioral patterns, churn risk, and financial improvement tracking."""
    await _require_admin(request)
    now = get_user_now(request)

    all_users = await db.users.find({}, {"_id": 0, "user_id": 1, "email": 1, "name": 1, "firstName": 1, "createdAt": 1, "lastLogin": 1}).to_list(10000)
    all_profiles = await db.profiles.find({}, {"_id": 0}).to_list(10000)
    profile_map = {p["userId"]: p for p in all_profiles}

    week_ago_str = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    two_weeks_ago_str = (now - timedelta(days=14)).strftime("%Y-%m-%d")
    month_ago_str = (now - timedelta(days=30)).strftime("%Y-%m-%d")

    # Get recent events per user
    recent_events = await db.user_events.find(
        {"timestamp": {"$gte": month_ago_str}},
        {"_id": 0, "userId": 1, "timestamp": 1, "eventType": 1}
    ).to_list(100000)

    user_event_counts = {}
    user_recent_events = {}
    user_last_event = {}
    for ev in recent_events:
        uid = ev.get("userId", "")
        ts = ev.get("timestamp", "")
        if uid not in user_event_counts:
            user_event_counts[uid] = {"total": 0, "week1": 0, "week2": 0}
            user_recent_events[uid] = 0
            user_last_event[uid] = ""
        user_event_counts[uid]["total"] += 1
        if ts >= week_ago_str:
            user_event_counts[uid]["week1"] += 1
            user_recent_events[uid] += 1
        elif ts >= two_weeks_ago_str:
            user_event_counts[uid]["week2"] += 1
        if ts > user_last_event.get(uid, ""):
            user_last_event[uid] = ts

    # Get financial snapshots for improvement tracking
    snapshots = await db.user_financial_snapshots.find(
        {}, {"_id": 0, "user_id": 1, "control_score": 1, "survival_days": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(10000)

    user_snapshots = {}
    for s in snapshots:
        uid = s.get("user_id", "")
        if uid not in user_snapshots:
            user_snapshots[uid] = []
        if len(user_snapshots[uid]) < 4:
            user_snapshots[uid].append(s)

    # Build user behavior profiles
    user_behaviors = []
    churn_risk_users = []
    improving_users = []
    declining_users = []

    for u in all_users:
        uid = u.get("user_id", "")
        if not uid:
            continue
        profile = profile_map.get(uid, {})
        ec = user_event_counts.get(uid, {"total": 0, "week1": 0, "week2": 0})
        last_event = user_last_event.get(uid, "")

        # Activity decay: compare this week vs last week
        activity_this_week = ec["week1"]
        activity_last_week = ec["week2"]
        if activity_last_week > 0:
            activity_change = round((activity_this_week - activity_last_week) / activity_last_week * 100, 1)
        else:
            activity_change = 100 if activity_this_week > 0 else 0

        # Days since last activity
        days_inactive = 999
        if last_event:
            try:
                last_dt = datetime.fromisoformat(last_event.replace("Z", "+00:00"))
                days_inactive = (now - last_dt).days
            except (ValueError, TypeError):
                pass

        # Financial improvement from snapshots
        snaps = user_snapshots.get(uid, [])
        score_trend = "stable"
        score_change = 0
        if len(snaps) >= 2:
            latest_score = snaps[0].get("control_score", 0)
            prev_score = snaps[-1].get("control_score", 0)
            score_change = latest_score - prev_score
            if score_change > 5:
                score_trend = "improving"
            elif score_change < -5:
                score_trend = "declining"

        # Churn risk scoring (0-100, higher = more likely to churn)
        churn_score = 0
        if days_inactive >= 14:
            churn_score += 40
        elif days_inactive >= 7:
            churn_score += 20
        elif days_inactive >= 3:
            churn_score += 10
        if activity_change < -50:
            churn_score += 25
        elif activity_change < -20:
            churn_score += 10
        if score_trend == "declining":
            churn_score += 15
        if ec["total"] < 5:
            churn_score += 20
        churn_score = min(churn_score, 100)

        churn_risk = "high" if churn_score >= 60 else "medium" if churn_score >= 30 else "low"

        behavior = {
            "userId": uid[:8] + "****",
            "name": profile.get("name", ""),
            "email": u.get("email", ""),
            "totalEvents30d": ec["total"],
            "eventsThisWeek": activity_this_week,
            "eventsLastWeek": activity_last_week,
            "activityChange": activity_change,
            "daysInactive": days_inactive if days_inactive < 999 else None,
            "scoreTrend": score_trend,
            "scoreChange": score_change,
            "churnScore": churn_score,
            "churnRisk": churn_risk,
            "lastActive": last_event[:10] if last_event else None,
        }
        user_behaviors.append(behavior)

        if churn_risk in ("high", "medium"):
            churn_risk_users.append(behavior)
        if score_trend == "improving":
            improving_users.append(behavior)
        if score_trend == "declining":
            declining_users.append(behavior)

    # Sort by churn score descending
    user_behaviors.sort(key=lambda x: -x["churnScore"])
    churn_risk_users.sort(key=lambda x: -x["churnScore"])

    # Aggregate patterns
    total = len(user_behaviors) or 1
    high_churn = sum(1 for u in user_behaviors if u["churnRisk"] == "high")
    medium_churn = sum(1 for u in user_behaviors if u["churnRisk"] == "medium")
    low_churn = sum(1 for u in user_behaviors if u["churnRisk"] == "low")
    active_users = sum(1 for u in user_behaviors if (u["daysInactive"] or 999) <= 7)
    dormant_users = sum(1 for u in user_behaviors if (u["daysInactive"] or 999) > 14)

    return {
        "totalUsers": len(user_behaviors),
        "activeUsers": active_users,
        "dormantUsers": dormant_users,
        "churnDistribution": {"high": high_churn, "medium": medium_churn, "low": low_churn},
        "improvingCount": len(improving_users),
        "decliningCount": len(declining_users),
        "users": user_behaviors[:50],
        "highChurnUsers": churn_risk_users[:20],
        "improvingUsers": improving_users[:10],
        "decliningUsers": declining_users[:10],
    }
