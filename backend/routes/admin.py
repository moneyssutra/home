"""Admin Command Center — Internal analytics and intelligence routes."""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, HTTPException
import logging

from database import db
from routes.utils import get_user_filter, get_user_now
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

ADMIN_EMAILS = {"test@moneyssutra.com", "admin@moneyssutra.com"}

async def _require_admin(request: Request):
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
    current_month = f"{now.year}-{now.month:02d}"

    expenses = await db.expenses.find({"userId": user_id}, {"_id": 0}).to_list(5000)
    incomes = await db.income_sources.find({"userId": user_id}, {"_id": 0}).to_list(500)
    goals = await db.goals.find({"userId": user_id}, {"_id": 0}).to_list(100)
    assets = await db.assets.find({"userId": user_id}, {"_id": 0}).to_list(500)
    loans = await db.liquid_assets.find({"userId": user_id, "type": {"$regex": "Loan", "$options": "i"}}, {"_id": 0}).to_list(100)

    total_income = sum(float(i.get("expectedAmount", 0)) for i in incomes)
    total_emi = sum(float(l.get("emiAmount", 0)) for l in loans)
    total_assets_val = sum(float(a.get("value", 0)) for a in assets)

    # Current month spend by group
    essential = lifestyle = wealth = 0
    for exp in expenses:
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
    liquid_assets = await db.liquid_assets.find({"userId": user_id, "type": {"$nin": ["Personal Loan", "Home Loan", "Car Loan", "Education Loan", "Other Loan"]}}, {"_id": 0}).to_list(100)
    liquid_balance = sum(float(a.get("balance", a.get("amount", 0))) for a in liquid_assets)
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
