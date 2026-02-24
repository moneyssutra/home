"""
Backend Modular Routes Test Suite
Tests all API endpoints from the refactored modular backend.
Covers: auth, dashboard, income, expenses, goals, profile, analytics, 
        financial_health, notifications, settings, security, workspace, transactions
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAuthEndpoints:
    """Authentication routes - login, logout, me"""
    
    session_token = None
    
    def test_root_health_check(self):
        """GET /api/ - root health check"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "MoneySsutra" in data["message"] or "running" in data["message"].lower()
        print(f"[PASS] Root health check: {data}")
    
    def test_login_success(self):
        """POST /api/auth/login - JWT login with test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data or "user_id" in data
        assert data.get("email") == "test@moneyssutra.com" or "user_id" in data
        TestAuthEndpoints.session_token = data.get("session_token")
        print(f"[PASS] Login success: user_id={data.get('user_id')}")
    
    def test_get_current_user(self):
        """GET /api/auth/me - get current user with session cookie"""
        assert TestAuthEndpoints.session_token, "Login first"
        cookies = {"session_token": TestAuthEndpoints.session_token}
        response = requests.get(f"{BASE_URL}/api/auth/me", cookies=cookies)
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        print(f"[PASS] Get current user: {data.get('email')}")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login - invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "invalid_user_xxx",
            "password": "wrong_password"
        })
        assert response.status_code == 401
        print(f"[PASS] Invalid login correctly rejected")


class TestDashboardEndpoints:
    """Dashboard routes - networth and breakdown"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.cookies = {"session_token": TestAuthEndpoints.session_token}
    
    def test_get_networth_summary(self):
        """GET /api/dashboard/networth - net worth summary"""
        response = requests.get(f"{BASE_URL}/api/dashboard/networth", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        # Verify response structure
        assert "netWorth" in data
        assert "totalAssets" in data
        assert "totalInvestments" in data
        assert "totalLiabilities" in data
        assert "liquidBalance" in data
        assert "monthlyIncome" in data
        assert "monthlyExpenses" in data
        print(f"[PASS] Net worth: {data.get('netWorth')}, Assets: {data.get('totalAssets')}")
    
    def test_get_breakdown(self):
        """GET /api/dashboard/breakdown - asset/liability breakdown"""
        response = requests.get(f"{BASE_URL}/api/dashboard/breakdown", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        # Verify response structure
        assert "assetBreakdown" in data
        assert "investmentBreakdown" in data
        assert "loanBreakdown" in data
        assert "incomeBreakdown" in data
        assert "expenseBreakdown" in data
        print(f"[PASS] Breakdown: {len(data.get('assetBreakdown', {}))} asset types")


class TestIncomeEndpoints:
    """Income routes - CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.cookies = {"session_token": TestAuthEndpoints.session_token}
    
    def test_list_income_sources(self):
        """GET /api/income - list income sources"""
        response = requests.get(f"{BASE_URL}/api/income", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"[PASS] Income sources: {len(data)} found")
    
    def test_create_income_source(self):
        """POST /api/income - create income source"""
        payload = {
            "name": f"TEST_Income_{datetime.now().timestamp()}",
            "type": "Job",
            "expectedAmount": 50000,
            "frequency": "Monthly"
        }
        response = requests.post(f"{BASE_URL}/api/income", json=payload, cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert data.get("name") == payload["name"]
        assert data.get("expectedAmount") == payload["expectedAmount"]
        print(f"[PASS] Created income source: {data.get('id')}")


class TestExpenseEndpoints:
    """Expense routes - CRUD and summary"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.cookies = {"session_token": TestAuthEndpoints.session_token}
    
    def test_list_expenses(self):
        """GET /api/expenses - list expenses"""
        response = requests.get(f"{BASE_URL}/api/expenses", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"[PASS] Expenses: {len(data)} found")
    
    def test_get_expense_list_summary(self):
        """GET /api/expenses/list/summary - expense summary"""
        response = requests.get(f"{BASE_URL}/api/expenses/list/summary", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"[PASS] Expense summary: {len(data)} entries")


class TestGoalsEndpoints:
    """Goals routes - CRUD, allocation, achievements"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.cookies = {"session_token": TestAuthEndpoints.session_token}
    
    def test_list_goals(self):
        """GET /api/goals - list goals"""
        response = requests.get(f"{BASE_URL}/api/goals", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"[PASS] Goals: {len(data)} found")
    
    def test_get_allocation_status(self):
        """GET /api/goals/allocation-status - goal allocation status"""
        response = requests.get(f"{BASE_URL}/api/goals/allocation-status", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert "investments" in data
        assert "accounts" in data
        print(f"[PASS] Allocation status: {len(data.get('investments', []))} investments, {len(data.get('accounts', []))} accounts")
    
    def test_get_achievements(self):
        """GET /api/goals/achievements - goal achievements"""
        response = requests.get(f"{BASE_URL}/api/goals/achievements", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert "totalCompleted" in data
        assert "achievements" in data
        print(f"[PASS] Achievements: {data.get('totalCompleted')} completed goals")


class TestProfileEndpoints:
    """Profile routes - basic and extended profile"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.cookies = {"session_token": TestAuthEndpoints.session_token}
    
    def test_get_basic_profile(self):
        """GET /api/profile/basic - basic profile"""
        response = requests.get(f"{BASE_URL}/api/profile/basic", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        # Should return profile or defaults
        assert "name" in data or "email" in data or "riskAppetite" in data
        print(f"[PASS] Basic profile retrieved")
    
    def test_get_basic_profile_alt(self):
        """GET /api/basic-profile - alternate basic profile route"""
        response = requests.get(f"{BASE_URL}/api/basic-profile", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert "name" in data or "email" in data or "riskAppetite" in data
        print(f"[PASS] Alternate basic profile route works")
    
    def test_get_profile_completion(self):
        """GET /api/profile/completion - profile completion"""
        response = requests.get(f"{BASE_URL}/api/profile/completion", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert "completion" in data
        assert "hasBasicProfile" in data
        print(f"[PASS] Profile completion: {data.get('completion')}%")


class TestAnalyticsEndpoints:
    """Analytics routes - snapshots and investment performance"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.cookies = {"session_token": TestAuthEndpoints.session_token}
    
    def test_get_analytics_snapshots(self):
        """GET /api/analytics/snapshots - analytics snapshots"""
        response = requests.get(f"{BASE_URL}/api/analytics/snapshots", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"[PASS] Analytics snapshots: {len(data)} found")
    
    def test_get_investment_performance(self):
        """GET /api/analytics/investment-performance - investment performance"""
        response = requests.get(f"{BASE_URL}/api/analytics/investment-performance", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert "totalInvested" in data
        assert "currentValue" in data
        assert "totalGains" in data
        print(f"[PASS] Investment performance: invested={data.get('totalInvested')}, current={data.get('currentValue')}")


class TestFinancialHealthEndpoints:
    """Financial health routes - comprehensive health score"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.cookies = {"session_token": TestAuthEndpoints.session_token}
    
    def test_get_financial_health(self):
        """GET /api/financial-health - financial health score"""
        response = requests.get(f"{BASE_URL}/api/financial-health", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert "overallScore" in data
        assert "emergencyFund" in data
        assert "savingsRate" in data
        assert "loanBurden" in data
        print(f"[PASS] Financial health score: {data.get('overallScore')}")


class TestNotificationEndpoints:
    """Notification routes - list and unread count"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.cookies = {"session_token": TestAuthEndpoints.session_token}
    
    def test_list_notifications(self):
        """GET /api/notifications - list notifications"""
        response = requests.get(f"{BASE_URL}/api/notifications", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"[PASS] Notifications: {len(data)} found")
    
    def test_get_unread_count(self):
        """GET /api/notifications/unread-count - unread notification count"""
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        print(f"[PASS] Unread notifications: {data.get('count')}")


class TestSettingsEndpoints:
    """Settings routes - notification settings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.cookies = {"session_token": TestAuthEndpoints.session_token}
    
    def test_get_notification_settings(self):
        """GET /api/settings/notifications - notification settings"""
        response = requests.get(f"{BASE_URL}/api/settings/notifications", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        # Should return settings or defaults
        assert "email_notifications" in data or "push_notifications" in data or "bill_reminders" in data
        print(f"[PASS] Notification settings retrieved")


class TestSecurityEndpoints:
    """Security routes - sessions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.cookies = {"session_token": TestAuthEndpoints.session_token}
    
    def test_get_active_sessions(self):
        """GET /api/auth/sessions - list active sessions"""
        response = requests.get(f"{BASE_URL}/api/auth/sessions", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert "sessions" in data
        assert isinstance(data["sessions"], list)
        print(f"[PASS] Active sessions: {len(data.get('sessions', []))} found")


class TestWorkspaceEndpoints:
    """Workspace routes - list workspaces"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.cookies = {"session_token": TestAuthEndpoints.session_token}
    
    def test_list_workspaces(self):
        """GET /api/workspaces - list workspaces"""
        response = requests.get(f"{BASE_URL}/api/workspaces", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"[PASS] Workspaces: {len(data)} found")


class TestTransactionEndpoints:
    """Transaction routes - income and expense transactions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.cookies = {"session_token": TestAuthEndpoints.session_token}
    
    def test_get_income_transactions(self):
        """GET /api/income-transactions - income transactions"""
        response = requests.get(f"{BASE_URL}/api/income-transactions", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"[PASS] Income transactions: {len(data)} found")
    
    def test_get_expense_transactions(self):
        """GET /api/expense-transactions - expense transactions"""
        response = requests.get(f"{BASE_URL}/api/expense-transactions", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"[PASS] Expense transactions: {len(data)} found")


class TestEntityUniquenessEndpoint:
    """Entity uniqueness check endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.cookies = {"session_token": TestAuthEndpoints.session_token}
    
    def test_check_entity_uniqueness(self):
        """POST /api/check-entity-uniqueness - entity name uniqueness check"""
        payload = {
            "collection": "income_sources",
            "field": "name",
            "value": "TestUniqueName123456"
        }
        response = requests.post(f"{BASE_URL}/api/check-entity-uniqueness", json=payload, cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert "available" in data
        assert "message" in data
        print(f"[PASS] Entity uniqueness check: available={data.get('available')}")


class TestAIInsightsEndpoint:
    """AI Insights endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.cookies = {"session_token": TestAuthEndpoints.session_token}
    
    def test_get_ai_insights(self):
        """GET /api/ai/insights - AI insights"""
        response = requests.get(f"{BASE_URL}/api/ai/insights", cookies=self.cookies, timeout=30)
        assert response.status_code == 200
        data = response.json()
        assert "insights" in data
        assert isinstance(data["insights"], list)
        print(f"[PASS] AI insights: {len(data.get('insights', []))} generated")


class TestOtherResourceEndpoints:
    """Other resource endpoints - loans, assets, accounts, investments, credit cards, insurances, other income"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.cookies = {"session_token": TestAuthEndpoints.session_token}
    
    def test_list_loans(self):
        """GET /api/loans - list loans"""
        response = requests.get(f"{BASE_URL}/api/loans", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"[PASS] Loans: {len(data)} found")
    
    def test_list_assets(self):
        """GET /api/assets - list assets"""
        response = requests.get(f"{BASE_URL}/api/assets", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"[PASS] Assets: {len(data)} found")
    
    def test_list_accounts(self):
        """GET /api/accounts - list accounts"""
        response = requests.get(f"{BASE_URL}/api/accounts", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"[PASS] Accounts: {len(data)} found")
    
    def test_list_investments(self):
        """GET /api/investments - list investments"""
        response = requests.get(f"{BASE_URL}/api/investments", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"[PASS] Investments: {len(data)} found")
    
    def test_list_credit_cards(self):
        """GET /api/credit-cards - list credit cards"""
        response = requests.get(f"{BASE_URL}/api/credit-cards", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"[PASS] Credit cards: {len(data)} found")
    
    def test_list_insurances(self):
        """GET /api/insurances - list insurances"""
        response = requests.get(f"{BASE_URL}/api/insurances", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"[PASS] Insurances: {len(data)} found")
    
    def test_list_other_income(self):
        """GET /api/other-income - list other income"""
        response = requests.get(f"{BASE_URL}/api/other-income", cookies=self.cookies)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"[PASS] Other income: {len(data)} found")


class TestLogout:
    """Logout test - run last"""
    
    def test_logout(self):
        """POST /api/auth/logout - logout"""
        cookies = {"session_token": TestAuthEndpoints.session_token}
        response = requests.post(f"{BASE_URL}/api/auth/logout", cookies=cookies)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"[PASS] Logout successful")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
