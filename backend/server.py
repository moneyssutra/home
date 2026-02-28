"""MoneySsutra API - Main application entry point."""
from fastapi import FastAPI, APIRouter, HTTPException, Request
from starlette.middleware.cors import CORSMiddleware
from typing import List, Optional
from datetime import datetime, timezone
import os
import logging
import asyncio
import uuid

from database import db, client
from server_models import StatusCheck, StatusCheckCreate, EntityUniquenessRequest
from scheduler import check_and_send_reminders, stop_scheduler

from routes.auth import router as auth_router, get_current_user
from routes.workspace import router as workspace_router
from routes.income import router as income_router
from routes.other_income import router as other_income_router
from routes.loans import router as loans_router
from routes.assets import router as assets_router
from routes.accounts import router as accounts_router
from routes.expenses import router as expenses_router
from routes.investments import router as investments_router
from routes.credit_cards import router as credit_cards_router
from routes.insurance import router as insurance_router
from routes.goals import router as goals_router
from routes.dashboard import router as dashboard_router
from routes.profile import router as profile_router
from routes.ai_insights import router as ai_insights_router
from routes.analytics import router as analytics_router
from routes.financial_health import router as financial_health_router
from routes.reports import router as reports_router
from routes.settings import router as settings_router
from routes.security import router as security_router
from routes.data_import import router as data_import_router
from routes.admin import router as admin_router
from routes.notifications import router as notifications_router
from routes.push import router as push_router
from routes.transactions import router as transactions_router
from routes.cron import router as cron_router
from routes.intelligence import router as intelligence_router
from routes.gamification import router as gamification_router
from routes.utils import get_user_filter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI()

# Create a router with /api prefix for misc endpoints
api_router = APIRouter(prefix="/api")


# ============ MISC ENDPOINTS ============

@api_router.get("/")
async def root():
    return {"message": "MoneySsutra API is running"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    status_result = status_obj.model_dump()
    await db.status_checks.insert_one(status_result)
    return status_result


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    checks = await db.status_checks.find({}, {"_id": 0}).to_list(100)
    return [StatusCheck(**check) for check in checks]


@api_router.post("/check-entity-uniqueness")
async def check_entity_uniqueness(request_data: EntityUniquenessRequest, request: Request):
    """Check if an entity name is unique for the current user."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get('user_id')
    collection_name = request_data.collection
    field_name = request_data.field
    value = request_data.value.strip()

    allowed_collections = [
        "income_sources", "expenses", "assets", "loans",
        "credit_cards", "insurances", "accounts", "investments", "goals"
    ]
    if collection_name not in allowed_collections:
        raise HTTPException(status_code=400, detail="Invalid collection name")

    query = {
        "userId": user_id,
        field_name: {"$regex": f"^{value}$", "$options": "i"}
    }

    if request_data.type_filter:
        query["type"] = request_data.type_filter

    if request_data.exclude_id:
        query["id"] = {"$ne": request_data.exclude_id}

    collection = db[collection_name]
    existing = await collection.find_one(query, {"_id": 0, "id": 1, field_name: 1})

    if existing:
        return {
            "available": False,
            "message": "An entry with this name already exists. Please use a unique name.",
            "existing_id": existing.get("id")
        }

    return {"available": True, "message": "Name is available"}


@api_router.put("/basic-profile")
async def update_basic_profile(request: Request):
    """Update basic profile for current authenticated user."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get('user_id')
    body = await request.json()

    update_data = {
        "userId": user_id,
        "name": body.get('name', ''),
        "mobile": body.get('mobile', ''),
        "accountType": body.get('accountType', 'Individual'),
        "dateOfBirth": body.get('dateOfBirth'),
        "maritalStatus": body.get('maritalStatus', ''),
        "dependents": body.get('dependents', 0),
        "employmentType": body.get('employmentType', ''),
        "monthlyIncomeRange": body.get('monthlyIncomeRange', ''),
        "riskAppetite": body.get('riskAppetite', 'Moderate'),
        "retirementAge": body.get('retirementAge', 60),
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }

    await db.profiles.update_one(
        {"userId": user_id},
        {"$set": update_data},
        upsert=True
    )

    if body.get('name'):
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": body.get('name')}}
        )

    return {"message": "Profile updated successfully"}


@api_router.get("/basic-profile")
async def get_basic_profile_alt(request: Request):
    """Get basic profile for current authenticated user."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get('user_id')
    profile = await db.profiles.find_one({"userId": user_id}, {"_id": 0})

    if not profile:
        return {
            "name": user.get('name', ''),
            "email": user.get('email', ''),
            "mobile": '',
            "accountType": "Individual",
            "dateOfBirth": None,
            "maritalStatus": '',
            "dependents": 0,
            "employmentType": '',
            "monthlyIncomeRange": '',
            "riskAppetite": "Moderate",
            "retirementAge": 60
        }

    return profile


# ============ CORS MIDDLEWARE ============

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ INCLUDE ROUTERS ============

# Misc endpoints (root, status, entity-uniqueness, basic-profile)
app.include_router(api_router)

# Domain routers
app.include_router(auth_router, prefix="/api")
app.include_router(workspace_router, prefix="/api")
app.include_router(income_router, prefix="/api")
app.include_router(other_income_router, prefix="/api")
app.include_router(loans_router, prefix="/api")
app.include_router(assets_router, prefix="/api")
app.include_router(accounts_router, prefix="/api")
app.include_router(expenses_router, prefix="/api")
app.include_router(investments_router, prefix="/api")
app.include_router(credit_cards_router, prefix="/api")
app.include_router(insurance_router, prefix="/api")
app.include_router(goals_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(ai_insights_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(financial_health_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(security_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(push_router, prefix="/api")
app.include_router(transactions_router, prefix="/api")
app.include_router(cron_router, prefix="/api")
app.include_router(intelligence_router, prefix="/api")
app.include_router(gamification_router, prefix="/api")
app.include_router(data_import_router, prefix="/api")
app.include_router(family_router, prefix="/api")


# ============ LIFECYCLE EVENTS ============

@app.on_event("startup")
async def startup_db_client():
    """Create database indexes and start background scheduler."""
    try:
        await db.assets.create_index("userId")
        await db.assets.create_index([("userId", 1), ("name", 1)])
        await db.investments.create_index("userId")
        await db.investments.create_index([("userId", 1), ("name", 1)])
        await db.loans.create_index("userId")
        await db.loans.create_index([("userId", 1), ("loanName", 1)])
        await db.accounts.create_index("userId")
        await db.accounts.create_index([("userId", 1), ("accountName", 1)])
        await db.credit_cards.create_index("userId")
        await db.income_sources.create_index("userId")
        await db.income_sources.create_index([("userId", 1), ("name", 1)])
        await db.income_sources.create_index([("userId", 1), ("type", 1)])
        await db.other_income.create_index("userId")
        await db.other_income.create_index([("userId", 1), ("incomeName", 1)])
        await db.expenses.create_index("userId")
        await db.expenses.create_index([("userId", 1), ("expenseName", 1)])
        await db.expenses.create_index([("userId", 1), ("category", 1)])
        await db.goals.create_index("userId")
        await db.insurances.create_index("userId")
        await db.insurances.create_index([("userId", 1), ("policyName", 1)])
        await db.insurances.create_index([("userId", 1), ("insuranceType", 1)])
        await db.user_sessions.create_index("session_token")
        await db.users.create_index("user_id")
        await db.users.create_index("email")
        await db.notifications.create_index([("userId", 1), ("createdAt", -1)])
        await db.notifications.create_index([("userId", 1), ("relatedIncomeId", 1)])
        await db.income_transactions.create_index([("userId", 1), ("transactionDate", -1)])
        await db.income_transactions.create_index([("entityId", 1)])
        await db.income_transactions.create_index([("entityId", 1), ("transactionDate", -1)])
        await db.expense_transactions.create_index([("userId", 1), ("transactionDate", -1)])
        await db.expense_transactions.create_index([("entityId", 1)])
        await db.expense_transactions.create_index([("entityId", 1), ("transactionDate", -1)])
        logger.info("Database indexes created successfully")

        asyncio.create_task(check_and_send_reminders())
        logger.info("Background reminder scheduler task created")

    except Exception as e:
        logger.warning(f"Startup warning: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    """Stop scheduler and close database connection."""
    stop_scheduler()
    client.close()
