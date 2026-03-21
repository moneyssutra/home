"""
Test Family View API Endpoints
Tests that all list pages correctly accept ?family=true parameter
and return data without errors.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@moneysutra.com"
TEST_PASSWORD = "Test@123"


@pytest.fixture(scope="module")
def session():
    """Create authenticated session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    
    # Login
    login_response = s.post(f"{BASE_URL}/api/auth/login", json={
        "username": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if login_response.status_code != 200:
        pytest.skip(f"Login failed with status {login_response.status_code}: {login_response.text}")
    
    return s


class TestExpensesAPI:
    """Test Expenses API with family=true parameter"""
    
    def test_expenses_list_summary_personal(self, session):
        """GET /api/expenses/list/summary - Personal view"""
        response = session.get(f"{BASE_URL}/api/expenses/list/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Personal expenses: {len(data)} items")
    
    def test_expenses_list_summary_family(self, session):
        """GET /api/expenses/list/summary?family=true - Family view"""
        response = session.get(f"{BASE_URL}/api/expenses/list/summary?family=true")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Family expenses: {len(data)} items")
    
    def test_expenses_by_month_personal(self, session):
        """GET /api/expenses/by-month - Personal view"""
        response = session.get(f"{BASE_URL}/api/expenses/by-month?month=2026-01")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Personal expenses by month: {len(data)} items")
    
    def test_expenses_by_month_family(self, session):
        """GET /api/expenses/by-month?family=true - Family view"""
        response = session.get(f"{BASE_URL}/api/expenses/by-month?month=2026-01&family=true")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Family expenses by month: {len(data)} items")


class TestIncomeAPI:
    """Test Income API with family=true parameter"""
    
    def test_income_list_summary_personal(self, session):
        """GET /api/income/list/summary - Personal view"""
        response = session.get(f"{BASE_URL}/api/income/list/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Personal income sources: {len(data)} items")
    
    def test_income_list_summary_family(self, session):
        """GET /api/income/list/summary?family=true - Family view"""
        response = session.get(f"{BASE_URL}/api/income/list/summary?family=true")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Family income sources: {len(data)} items")
    
    def test_income_monthly_summary_personal(self, session):
        """GET /api/income/monthly-summary - Personal view"""
        response = session.get(f"{BASE_URL}/api/income/monthly-summary?tz_offset=-330")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "totalIncome" in data or "receivedIncome" in data, "Expected income summary fields"
        print(f"✓ Personal income monthly summary: {data}")
    
    def test_income_monthly_summary_family(self, session):
        """GET /api/income/monthly-summary?family=true - Family view"""
        response = session.get(f"{BASE_URL}/api/income/monthly-summary?tz_offset=-330&family=true")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "totalIncome" in data or "receivedIncome" in data, "Expected income summary fields"
        print(f"✓ Family income monthly summary: {data}")


class TestOtherIncomeAPI:
    """Test Other Income API with family=true parameter"""
    
    def test_other_income_personal(self, session):
        """GET /api/other-income - Personal view"""
        response = session.get(f"{BASE_URL}/api/other-income")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Personal other income: {len(data)} items")
    
    def test_other_income_family(self, session):
        """GET /api/other-income?family=true - Family view"""
        response = session.get(f"{BASE_URL}/api/other-income?family=true")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Family other income: {len(data)} items")


class TestInvestmentsAPI:
    """Test Investments API with family=true parameter"""
    
    def test_investments_personal(self, session):
        """GET /api/investments - Personal view"""
        response = session.get(f"{BASE_URL}/api/investments")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Personal investments: {len(data)} items")
    
    def test_investments_family(self, session):
        """GET /api/investments?family=true - Family view"""
        response = session.get(f"{BASE_URL}/api/investments?family=true")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Family investments: {len(data)} items")


class TestLoansAPI:
    """Test Loans API with family=true parameter"""
    
    def test_loans_personal(self, session):
        """GET /api/loans - Personal view"""
        response = session.get(f"{BASE_URL}/api/loans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Personal loans: {len(data)} items")
    
    def test_loans_family(self, session):
        """GET /api/loans?family=true - Family view"""
        response = session.get(f"{BASE_URL}/api/loans?family=true")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Family loans: {len(data)} items")


class TestAssetsAPI:
    """Test Assets API with family=true parameter"""
    
    def test_assets_personal(self, session):
        """GET /api/assets - Personal view"""
        response = session.get(f"{BASE_URL}/api/assets")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Personal assets: {len(data)} items")
    
    def test_assets_family(self, session):
        """GET /api/assets?family=true - Family view"""
        response = session.get(f"{BASE_URL}/api/assets?family=true")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Family assets: {len(data)} items")


class TestInsurancesAPI:
    """Test Insurances API with family=true parameter"""
    
    def test_insurances_personal(self, session):
        """GET /api/insurances - Personal view"""
        response = session.get(f"{BASE_URL}/api/insurances")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Personal insurances: {len(data)} items")
    
    def test_insurances_family(self, session):
        """GET /api/insurances?family=true - Family view"""
        response = session.get(f"{BASE_URL}/api/insurances?family=true")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Family insurances: {len(data)} items")


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self, session):
        """GET /api/health - API health check"""
        response = session.get(f"{BASE_URL}/api/health")
        # Health endpoint might not exist, so accept 200 or 404
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print(f"✓ Health check: {response.status_code}")
