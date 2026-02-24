"""Routes package - API endpoint modules."""
from routes.auth import router as auth_router
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

# Re-export commonly used functions
from routes.auth import get_current_user, hash_password, verify_password, validate_password_strength
from routes.workspace import (
    get_user_workspace, 
    ensure_user_has_workspace, 
    get_user_filter,
    check_permission,
    ROLE_PERMISSIONS
)
from routes.utils import convert_datetime_fields

__all__ = [
    # Routers
    'auth_router',
    'workspace_router', 
    'income_router',
    'other_income_router',
    'loans_router',
    'assets_router',
    'accounts_router',
    'expenses_router',
    'investments_router',
    'credit_cards_router',
    'insurance_router',
    'goals_router',
    'dashboard_router',
    'profile_router',
    'ai_insights_router',
    'analytics_router',
    'financial_health_router',
    'reports_router',
    'settings_router',
    'security_router',
    # Functions
    'get_current_user',
    'hash_password',
    'verify_password',
    'validate_password_strength',
    'get_user_workspace',
    'ensure_user_has_workspace',
    'get_user_filter',
    'check_permission',
    'convert_datetime_fields',
    'ROLE_PERMISSIONS',
]
