"""Routes package - API endpoint modules."""
from routes.auth import router as auth_router
from routes.workspace import router as workspace_router
from routes.income import router as income_router
from routes.loans import router as loans_router
from routes.assets import router as assets_router
from routes.accounts import router as accounts_router
from routes.investments import router as investments_router
from routes.credit_cards import router as credit_cards_router

# Re-export commonly used functions
from routes.auth import get_current_user
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
    'loans_router',
    'assets_router',
    'accounts_router',
    'investments_router',
    'credit_cards_router',
    # Functions
    'get_current_user',
    'get_user_workspace',
    'ensure_user_has_workspace',
    'get_user_filter',
    'check_permission',
    'convert_datetime_fields',
    'ROLE_PERMISSIONS',
]
