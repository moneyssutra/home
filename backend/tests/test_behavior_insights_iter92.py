"""
Iteration 92 Tests - Behavior Insights & Expense Views
Tests for:
- /api/expenses/behavior-insights endpoint (new)
- Monthly view with Behavior Connection section
- All 4 expense views: List, Daily, Weekly, Monthly
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_session():
    """Login and get authenticated session"""
    session = requests.Session()
    login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
        "username": "test@moneyssutra.com",
        "password": "test"
    })
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    data = login_resp.json()
    assert "session_token" in data, "No session_token in response"
    session.cookies.set("session_token", data["session_token"])
    return session


class TestBehaviorInsightsAPI:
    """Test the new /api/expenses/behavior-insights endpoint"""
    
    def test_behavior_insights_returns_200(self, auth_session):
        """Verify behavior-insights endpoint returns 200"""
        resp = auth_session.get(f"{BASE_URL}/api/expenses/behavior-insights")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
    def test_behavior_insights_structure(self, auth_session):
        """Verify response has insights array and summary object"""
        resp = auth_session.get(f"{BASE_URL}/api/expenses/behavior-insights")
        assert resp.status_code == 200
        data = resp.json()
        
        # Must have insights array
        assert "insights" in data, "Missing 'insights' key"
        assert isinstance(data["insights"], list), "insights should be a list"
        
        # Must have summary object
        assert "summary" in data, "Missing 'summary' key"
        assert isinstance(data["summary"], dict), "summary should be a dict"
        
        # Must have patternData array
        assert "patternData" in data, "Missing 'patternData' key"
        assert isinstance(data["patternData"], list), "patternData should be a list"
        
    def test_behavior_insights_summary_fields(self, auth_session):
        """Verify summary has weekdayPct, weekendPct, firstWeekPct, consistentCategories"""
        resp = auth_session.get(f"{BASE_URL}/api/expenses/behavior-insights")
        assert resp.status_code == 200
        summary = resp.json().get("summary", {})
        
        assert "weekdayPct" in summary, "Missing weekdayPct"
        assert "weekendPct" in summary, "Missing weekendPct"
        assert "firstWeekPct" in summary, "Missing firstWeekPct"
        assert "consistentCategories" in summary, "Missing consistentCategories"
        
        # Percentages should be valid numbers
        assert isinstance(summary["weekdayPct"], (int, float)), "weekdayPct should be number"
        assert isinstance(summary["weekendPct"], (int, float)), "weekendPct should be number"
        assert isinstance(summary["firstWeekPct"], (int, float)), "firstWeekPct should be number"
        
        # Categories should be list
        assert isinstance(summary["consistentCategories"], list), "consistentCategories should be list"
        
    def test_behavior_insights_insight_structure(self, auth_session):
        """Each insight should have type, icon, title, description, metric, trend"""
        resp = auth_session.get(f"{BASE_URL}/api/expenses/behavior-insights")
        assert resp.status_code == 200
        insights = resp.json().get("insights", [])
        
        if len(insights) > 0:
            insight = insights[0]
            required_fields = ["type", "icon", "title", "description", "metric", "trend"]
            for field in required_fields:
                assert field in insight, f"Insight missing '{field}' field"
                
            # Trend should be one of: warning, positive, neutral
            assert insight["trend"] in ["warning", "positive", "neutral"], \
                f"Invalid trend value: {insight['trend']}"
                
    def test_behavior_insights_pattern_data_structure(self, auth_session):
        """Each patternData entry should have month, firstWeek, midMonth, lastWeek, weekend, weekday"""
        resp = auth_session.get(f"{BASE_URL}/api/expenses/behavior-insights")
        assert resp.status_code == 200
        pattern_data = resp.json().get("patternData", [])
        
        assert len(pattern_data) > 0, "patternData should not be empty"
        
        for entry in pattern_data:
            assert "month" in entry, "Missing month in patternData entry"
            assert "firstWeek" in entry, "Missing firstWeek"
            assert "midMonth" in entry, "Missing midMonth"
            assert "lastWeek" in entry, "Missing lastWeek"
            assert "weekend" in entry, "Missing weekend"
            assert "weekday" in entry, "Missing weekday"


class TestExpenseViewsAPIs:
    """Test all expense view APIs: by-month, monthly-summary, weekly-summary"""
    
    def test_expenses_by_month_current(self, auth_session):
        """Test /api/expenses/by-month for current month"""
        resp = auth_session.get(f"{BASE_URL}/api/expenses/by-month?month=2026-02")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert isinstance(data, list), "Response should be a list"
        
    def test_expenses_by_month_has_display_status(self, auth_session):
        """Each expense should have _displayStatus field"""
        resp = auth_session.get(f"{BASE_URL}/api/expenses/by-month?month=2026-02")
        assert resp.status_code == 200
        expenses = resp.json()
        
        for exp in expenses:
            assert "_displayStatus" in exp, f"Missing _displayStatus in expense {exp.get('id')}"
            assert exp["_displayStatus"] in ["pending", "paid", "prepaid", "scheduled"], \
                f"Invalid _displayStatus: {exp['_displayStatus']}"
                
    def test_monthly_summary_6months(self, auth_session):
        """Test /api/expenses/monthly-summary returns 6 months of data"""
        resp = auth_session.get(f"{BASE_URL}/api/expenses/monthly-summary?last=6")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "months" in data, "Missing 'months' key"
        assert len(data["months"]) == 6, f"Expected 6 months, got {len(data['months'])}"
        
        # Check structure
        assert "insights" in data, "Missing 'insights' key"
        assert "avgMonthlySpend" in data, "Missing 'avgMonthlySpend'"
        assert "highestSpendMonth" in data, "Missing 'highestSpendMonth'"
        
    def test_monthly_summary_month_structure(self, auth_session):
        """Each month entry should have total, essential, lifestyle, wealth, topCategories"""
        resp = auth_session.get(f"{BASE_URL}/api/expenses/monthly-summary?last=6")
        assert resp.status_code == 200
        months = resp.json().get("months", [])
        
        for m in months:
            assert "month" in m, "Missing month"
            assert "total" in m, "Missing total"
            assert "essential" in m, "Missing essential"
            assert "lifestyle" in m, "Missing lifestyle"
            assert "wealth" in m, "Missing wealth"
            assert "percentOfIncome" in m, "Missing percentOfIncome"
            assert "topCategories" in m, "Missing topCategories"
            
    def test_weekly_summary_8weeks(self, auth_session):
        """Test /api/expenses/weekly-summary returns 8 weeks of data"""
        resp = auth_session.get(f"{BASE_URL}/api/expenses/weekly-summary?last=8")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "weeks" in data, "Missing 'weeks' key"
        assert len(data["weeks"]) == 8, f"Expected 8 weeks, got {len(data['weeks'])}"
        assert "insights" in data, "Missing 'insights' key"
        
    def test_weekly_summary_week_structure(self, auth_session):
        """Each week entry should have weekStart, weekEnd, label, total, byDay, weekdayTotal, weekendTotal"""
        resp = auth_session.get(f"{BASE_URL}/api/expenses/weekly-summary?last=8")
        assert resp.status_code == 200
        weeks = resp.json().get("weeks", [])
        
        for w in weeks:
            assert "weekStart" in w, "Missing weekStart"
            assert "weekEnd" in w, "Missing weekEnd"
            assert "label" in w, "Missing label"
            assert "total" in w, "Missing total"
            assert "byDay" in w, "Missing byDay"
            assert "weekdayTotal" in w, "Missing weekdayTotal"
            assert "weekendTotal" in w, "Missing weekendTotal"
            
            # byDay should have Mon-Sun
            by_day = w["byDay"]
            for day in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]:
                assert day in by_day, f"Missing {day} in byDay"


class TestExpenseListEndpoints:
    """Test expense list and CRUD endpoints"""
    
    def test_expenses_list(self, auth_session):
        """Test GET /api/expenses returns list"""
        resp = auth_session.get(f"{BASE_URL}/api/expenses")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list), "Response should be a list"
        
    def test_expenses_with_next_date(self, auth_session):
        """Test GET /api/expenses/with-next-date returns expenses with nextDeductionDate"""
        resp = auth_session.get(f"{BASE_URL}/api/expenses/with-next-date")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            # At least some should have nextDeductionDate
            has_next_date = any(exp.get("nextDeductionDate") for exp in data)
            assert has_next_date, "Expected some expenses to have nextDeductionDate"


class TestUnauthenticatedAccess:
    """Test that endpoints require authentication"""
    
    def test_behavior_insights_requires_auth(self):
        """behavior-insights should return 401 without auth"""
        resp = requests.get(f"{BASE_URL}/api/expenses/behavior-insights")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        
    def test_monthly_summary_requires_auth(self):
        """monthly-summary should return 401 without auth"""
        resp = requests.get(f"{BASE_URL}/api/expenses/monthly-summary")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        
    def test_weekly_summary_requires_auth(self):
        """weekly-summary should return 401 without auth"""
        resp = requests.get(f"{BASE_URL}/api/expenses/weekly-summary")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
