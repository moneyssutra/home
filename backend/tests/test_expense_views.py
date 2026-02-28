"""
Test Expense Views - Monthly Summary, Weekly Summary APIs
Tests the new 3-level expense intelligence: Daily, Weekly, Monthly views
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_EMAIL = "test@moneyssutra.com"
TEST_PASSWORD = "test"


@pytest.fixture(scope="module")
def session():
    """Create authenticated session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    
    # Login
    login_resp = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if login_resp.status_code != 200:
        pytest.skip(f"Authentication failed: {login_resp.text}")
    
    return s


class TestMonthlySummaryAPI:
    """Test /api/expenses/monthly-summary endpoint"""
    
    def test_monthly_summary_returns_200(self, session):
        """GET /api/expenses/monthly-summary should return 200"""
        resp = session.get(f"{BASE_URL}/api/expenses/monthly-summary?last=6")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("✓ Monthly summary API returns 200")
    
    def test_monthly_summary_structure(self, session):
        """Monthly summary should have months array with correct structure"""
        resp = session.get(f"{BASE_URL}/api/expenses/monthly-summary?last=6")
        assert resp.status_code == 200
        data = resp.json()
        
        # Check top-level structure
        assert "months" in data, "Response missing 'months' array"
        assert "insights" in data, "Response missing 'insights' array"
        assert "avgMonthlySpend" in data, "Response missing 'avgMonthlySpend'"
        assert "highestSpendMonth" in data, "Response missing 'highestSpendMonth'"
        
        print(f"✓ Monthly summary has correct top-level structure")
        print(f"  - {len(data['months'])} months returned")
        print(f"  - {len(data['insights'])} insights generated")
        print(f"  - Avg monthly spend: {data['avgMonthlySpend']}")
    
    def test_monthly_summary_month_structure(self, session):
        """Each month should have essential, lifestyle, wealth, percentOfIncome"""
        resp = session.get(f"{BASE_URL}/api/expenses/monthly-summary?last=6")
        assert resp.status_code == 200
        data = resp.json()
        
        if data['months']:
            month = data['months'][-1]  # Check latest month
            assert "month" in month, "Month missing 'month' key"
            assert "total" in month, "Month missing 'total'"
            assert "essential" in month, "Month missing 'essential'"
            assert "lifestyle" in month, "Month missing 'lifestyle'"
            assert "wealth" in month, "Month missing 'wealth'"
            assert "percentOfIncome" in month, "Month missing 'percentOfIncome'"
            assert "topCategories" in month, "Month missing 'topCategories'"
            
            print(f"✓ Month structure correct for {month['month']}")
            print(f"  - Total: {month['total']}")
            print(f"  - Essential: {month['essential']}, Lifestyle: {month['lifestyle']}, Wealth: {month['wealth']}")
            print(f"  - % of income: {month['percentOfIncome']}%")
    
    def test_monthly_summary_insights_max_3(self, session):
        """Insights should be max 3"""
        resp = session.get(f"{BASE_URL}/api/expenses/monthly-summary?last=6")
        assert resp.status_code == 200
        data = resp.json()
        
        assert len(data['insights']) <= 3, f"Expected max 3 insights, got {len(data['insights'])}"
        print(f"✓ Insights count within limit: {len(data['insights'])} insights")


class TestWeeklySummaryAPI:
    """Test /api/expenses/weekly-summary endpoint"""
    
    def test_weekly_summary_returns_200(self, session):
        """GET /api/expenses/weekly-summary should return 200"""
        resp = session.get(f"{BASE_URL}/api/expenses/weekly-summary?last=8")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("✓ Weekly summary API returns 200")
    
    def test_weekly_summary_structure(self, session):
        """Weekly summary should have weeks array with correct structure"""
        resp = session.get(f"{BASE_URL}/api/expenses/weekly-summary?last=8")
        assert resp.status_code == 200
        data = resp.json()
        
        # Check top-level structure
        assert "weeks" in data, "Response missing 'weeks' array"
        assert "insights" in data, "Response missing 'insights' array"
        
        print(f"✓ Weekly summary has correct top-level structure")
        print(f"  - {len(data['weeks'])} weeks returned")
        print(f"  - {len(data['insights'])} insights generated")
    
    def test_weekly_summary_week_structure(self, session):
        """Each week should have byDay, weekdayTotal, weekendTotal"""
        resp = session.get(f"{BASE_URL}/api/expenses/weekly-summary?last=8")
        assert resp.status_code == 200
        data = resp.json()
        
        if data['weeks']:
            week = data['weeks'][-1]  # Check latest week
            assert "weekStart" in week, "Week missing 'weekStart'"
            assert "weekEnd" in week, "Week missing 'weekEnd'"
            assert "label" in week, "Week missing 'label'"
            assert "total" in week, "Week missing 'total'"
            assert "byDay" in week, "Week missing 'byDay'"
            assert "weekdayTotal" in week, "Week missing 'weekdayTotal'"
            assert "weekendTotal" in week, "Week missing 'weekendTotal'"
            assert "topCategories" in week, "Week missing 'topCategories'"
            
            # Check byDay has all days
            days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            for day in days:
                assert day in week["byDay"], f"byDay missing '{day}'"
            
            print(f"✓ Week structure correct for {week['label']}")
            print(f"  - Total: {week['total']}")
            print(f"  - Weekday: {week['weekdayTotal']}, Weekend: {week['weekendTotal']}")
            print(f"  - By day: {week['byDay']}")
    
    def test_weekly_summary_8_weeks(self, session):
        """Should return up to 8 weeks when requested"""
        resp = session.get(f"{BASE_URL}/api/expenses/weekly-summary?last=8")
        assert resp.status_code == 200
        data = resp.json()
        
        assert len(data['weeks']) <= 8, f"Expected max 8 weeks, got {len(data['weeks'])}"
        print(f"✓ Weeks count within limit: {len(data['weeks'])} weeks")


class TestExpensesByMonthAPI:
    """Test /api/expenses/by-month endpoint - used by List and Daily views"""
    
    def test_by_month_returns_200(self, session):
        """GET /api/expenses/by-month should return 200"""
        resp = session.get(f"{BASE_URL}/api/expenses/by-month")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("✓ Expenses by month API returns 200")
    
    def test_by_month_with_month_param(self, session):
        """Should accept month parameter in YYYY-MM format"""
        resp = session.get(f"{BASE_URL}/api/expenses/by-month?month=2026-01")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Expenses by month with param works - {len(data)} expenses returned")
    
    def test_by_month_expense_structure(self, session):
        """Each expense should have _displayStatus field"""
        resp = session.get(f"{BASE_URL}/api/expenses/by-month")
        assert resp.status_code == 200
        data = resp.json()
        
        if data:
            expense = data[0]
            # Check required fields
            assert "id" in expense, "Expense missing 'id'"
            assert "expenseName" in expense, "Expense missing 'expenseName'"
            assert "expectedAmount" in expense, "Expense missing 'expectedAmount'"
            assert "category" in expense, "Expense missing 'category'"
            assert "_displayStatus" in expense, "Expense missing '_displayStatus'"
            
            valid_statuses = ["pending", "paid", "prepaid", "scheduled"]
            assert expense["_displayStatus"] in valid_statuses, f"Invalid status: {expense['_displayStatus']}"
            
            print(f"✓ Expense structure correct: {expense['expenseName']}")
            print(f"  - Status: {expense['_displayStatus']}")
            print(f"  - Amount: {expense['expectedAmount']}")


class TestAuthRequirement:
    """Test that APIs require authentication"""
    
    def test_monthly_summary_requires_auth(self):
        """Monthly summary should return 401 without auth"""
        resp = requests.get(f"{BASE_URL}/api/expenses/monthly-summary?last=6")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("✓ Monthly summary requires authentication")
    
    def test_weekly_summary_requires_auth(self):
        """Weekly summary should return 401 without auth"""
        resp = requests.get(f"{BASE_URL}/api/expenses/weekly-summary?last=8")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("✓ Weekly summary requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
