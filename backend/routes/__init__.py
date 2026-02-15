"""
API Routes module
"""
from fastapi import APIRouter

# Create the main API router
api_router = APIRouter(prefix="/api")

# Import and include all route modules
from .status import router as status_router
from .income import router as income_router
from .loans import router as loans_router
from .assets import router as assets_router
from .accounts import router as accounts_router
from .expenses import router as expenses_router
from .insurance import router as insurance_router
from .investments import router as investments_router
from .credit_cards import router as credit_cards_router
from .goals import router as goals_router
from .other_income import router as other_income_router
from .dashboard import router as dashboard_router
from .profile import router as profile_router

# Include all routers
api_router.include_router(status_router, tags=["status"])
api_router.include_router(income_router, tags=["income"])
api_router.include_router(loans_router, tags=["loans"])
api_router.include_router(assets_router, tags=["assets"])
api_router.include_router(accounts_router, tags=["accounts"])
api_router.include_router(expenses_router, tags=["expenses"])
api_router.include_router(insurance_router, tags=["insurance"])
api_router.include_router(investments_router, tags=["investments"])
api_router.include_router(credit_cards_router, tags=["credit_cards"])
api_router.include_router(goals_router, tags=["goals"])
api_router.include_router(other_income_router, tags=["other_income"])
api_router.include_router(dashboard_router, tags=["dashboard"])
api_router.include_router(profile_router, tags=["profile"])
