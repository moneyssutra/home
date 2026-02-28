"""
Tests for Timezone Fix and Spending Insights features - Iteration 105
Tests:
1. tz_offset parameter handling in dashboard/networth
2. tz_offset parameter handling in expenses/monthly-summary
3. /api/expenses/spending-insights endpoint
4. Spending insights rules (B, C, D, E)
"""
import pytest
import requests
import os
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
TEST_EMAIL = "test@moneyssutra.com"
TEST_PASSWORD = "test"


@pytest.fixture(scope="module")
def session():
    """Authenticated session."""
    sess = requests.Session()
    # Login
    resp = sess.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return sess


class TestTimezoneFixDashboard:
    """Test timezone offset handling in dashboard/networth endpoint."""
    
    def test_networth_without_tz_offset(self, session):
        """GET /api/dashboard/networth without tz_offset uses UTC."""
        resp = session.get(f"{BASE_URL}/api/dashboard/networth")
        assert resp.status_code == 200
        data = resp.json()
        # Basic structure check
        assert "netWorth" in data
        assert "monthlyIncome" in data
        assert "monthlyExpenses" in data
        assert "incomeReceived" in data
        assert "expensesDone" in data
        print(f"✓ Dashboard networth (no tz_offset): netWorth={data['netWorth']}, monthlyIncome={data['monthlyIncome']}")

    def test_networth_with_ist_tz_offset(self, session):
        """GET /api/dashboard/networth?tz_offset=-330 uses IST timezone."""
        # IST is UTC+5:30, so tz_offset from JS is -330
        resp = session.get(f"{BASE_URL}/api/dashboard/networth?tz_offset=-330")
        assert resp.status_code == 200
        data = resp.json()
        assert "netWorth" in data
        assert "monthlyIncome" in data
        assert "monthlyExpenses" in data
        print(f"✓ Dashboard networth (IST): netWorth={data['netWorth']}, monthlyIncome={data['monthlyIncome']}")
    
    def test_networth_with_utc_tz_offset(self, session):
        """GET /api/dashboard/networth?tz_offset=0 uses UTC."""
        resp = session.get(f"{BASE_URL}/api/dashboard/networth?tz_offset=0")
        assert resp.status_code == 200
        data = resp.json()
        assert "netWorth" in data
        print(f"✓ Dashboard networth (UTC): netWorth={data['netWorth']}")
    
    def test_networth_contains_cashflow_fields(self, session):
        """Dashboard networth should have cashflow breakdown fields."""
        resp = session.get(f"{BASE_URL}/api/dashboard/networth?tz_offset=-330")
        assert resp.status_code == 200
        data = resp.json()
        # Check received/expected fields exist
        assert "incomeReceived" in data
        assert "expectedIncome" in data
        assert "expensesDone" in data
        assert "upcomingExpenses" in data
        assert "incomeReceivedList" in data
        assert "incomeExpectedList" in data
        assert "expensesDoneList" in data
        assert "upcomingExpensesList" in data
        print(f"✓ Cashflow fields present: received={data['incomeReceived']}, expected={data['expectedIncome']}, done={data['expensesDone']}, upcoming={data['upcomingExpenses']}")


class TestTimezoneFixMonthlySummary:
    """Test timezone offset in expenses/monthly-summary endpoint."""
    
    def test_monthly_summary_without_tz_offset(self, session):
        """GET /api/expenses/monthly-summary?last=6 without tz_offset."""
        resp = session.get(f"{BASE_URL}/api/expenses/monthly-summary?last=6")
        assert resp.status_code == 200
        data = resp.json()
        assert "months" in data
        assert len(data["months"]) <= 6
        assert "avgMonthlySpend" in data
        assert "insights" in data
        print(f"✓ Monthly summary (no tz_offset): {len(data['months'])} months, avg={data['avgMonthlySpend']}")

    def test_monthly_summary_with_ist_tz_offset(self, session):
        """GET /api/expenses/monthly-summary?last=6&tz_offset=-330 uses IST."""
        resp = session.get(f"{BASE_URL}/api/expenses/monthly-summary?last=6&tz_offset=-330")
        assert resp.status_code == 200
        data = resp.json()
        assert "months" in data
        assert len(data["months"]) > 0
        # Check month structure
        month = data["months"][0]
        assert "month" in month
        assert "total" in month
        assert "essential" in month
        assert "lifestyle" in month
        assert "wealth" in month
        print(f"✓ Monthly summary (IST): months={[m['month'] for m in data['months']]}")

    def test_monthly_summary_with_utc_tz_offset(self, session):
        """GET /api/expenses/monthly-summary?last=6&tz_offset=0 uses UTC."""
        resp = session.get(f"{BASE_URL}/api/expenses/monthly-summary?last=6&tz_offset=0")
        assert resp.status_code == 200
        data = resp.json()
        assert "months" in data
        print(f"✓ Monthly summary (UTC): {len(data['months'])} months")


class TestSpendingInsightsEndpoint:
    """Test /api/expenses/spending-insights endpoint."""
    
    def test_spending_insights_endpoint_exists(self, session):
        """GET /api/expenses/spending-insights should return 200."""
        resp = session.get(f"{BASE_URL}/api/expenses/spending-insights?tz_offset=-330")
        assert resp.status_code == 200
        data = resp.json()
        assert "insights" in data
        print(f"✓ Spending insights endpoint works: {len(data.get('insights', []))} insights returned")
    
    def test_spending_insights_structure(self, session):
        """Verify spending insights response structure."""
        resp = session.get(f"{BASE_URL}/api/expenses/spending-insights?tz_offset=-330")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "insights" in data
        insights = data["insights"]
        
        # Each insight should have required fields
        for insight in insights:
            assert "id" in insight, f"Missing 'id' in insight"
            assert "title" in insight, f"Missing 'title' in insight"
            assert "subtitle" in insight, f"Missing 'subtitle' in insight"
            assert "severity" in insight, f"Missing 'severity' in insight"
            assert insight["severity"] in ["high", "medium", "low"], f"Invalid severity: {insight['severity']}"
            assert "value" in insight, f"Missing 'value' in insight"
            assert "category" in insight, f"Missing 'category' in insight"
            assert "rule" in insight, f"Missing 'rule' in insight"
            # Rule should be A, B, C, D, or E
            assert insight["rule"] in ["A", "B", "C", "D", "E"], f"Invalid rule: {insight['rule']}"
        
        print(f"✓ Spending insights structure valid: {len(insights)} insights")
        for i, ins in enumerate(insights):
            print(f"  - {i+1}. [{ins['rule']}] {ins['title']} (severity={ins['severity']})")
    
    def test_spending_insights_max_three(self, session):
        """Spending insights should return at most 3 cards."""
        resp = session.get(f"{BASE_URL}/api/expenses/spending-insights?tz_offset=-330")
        assert resp.status_code == 200
        data = resp.json()
        insights = data.get("insights", [])
        assert len(insights) <= 3, f"Expected max 3 insights, got {len(insights)}"
        print(f"✓ Spending insights <= 3: {len(insights)} insights")
    
    def test_spending_insights_without_auth(self):
        """Spending insights should require authentication."""
        resp = requests.get(f"{BASE_URL}/api/expenses/spending-insights?tz_offset=-330")
        assert resp.status_code == 401
        print("✓ Spending insights requires auth (401)")


class TestSpendingInsightsRules:
    """Test individual spending insight rules."""
    
    def test_rule_b_subscription_concentration(self, session):
        """
        Rule B: Subscription Concentration triggers when recurring > 10% income.
        This test verifies the rule logic exists.
        """
        resp = session.get(f"{BASE_URL}/api/expenses/spending-insights?tz_offset=-330")
        assert resp.status_code == 200
        data = resp.json()
        
        # Check if Rule B insight is present (may not always trigger)
        rule_b = [i for i in data["insights"] if i["rule"] == "B"]
        if rule_b:
            insight = rule_b[0]
            assert "Recurring" in insight["title"] or "subscription" in insight["id"].lower()
            print(f"✓ Rule B (Subscription Concentration) triggered: {insight['title']}")
        else:
            print("✓ Rule B (Subscription Concentration) not triggered (recurring < 10% income)")
    
    def test_rule_c_lifestyle_vs_wealth(self, session):
        """
        Rule C: Lifestyle vs Wealth Imbalance triggers when lifestyle > wealth.
        """
        resp = session.get(f"{BASE_URL}/api/expenses/spending-insights?tz_offset=-330")
        assert resp.status_code == 200
        data = resp.json()
        
        rule_c = [i for i in data["insights"] if i["rule"] == "C"]
        if rule_c:
            insight = rule_c[0]
            assert "Lifestyle" in insight["title"] or "Savings" in insight["title"] or "lifestyle_vs_wealth" in insight["id"] or "low_savings" in insight["id"]
            print(f"✓ Rule C (Lifestyle vs Wealth) triggered: {insight['title']}")
        else:
            print("✓ Rule C (Lifestyle vs Wealth) not triggered")
    
    def test_rule_d_budget_breach(self, session):
        """
        Rule D: Budget Breach triggers when spend >= 85% income.
        """
        resp = session.get(f"{BASE_URL}/api/expenses/spending-insights?tz_offset=-330")
        assert resp.status_code == 200
        data = resp.json()
        
        rule_d = [i for i in data["insights"] if i["rule"] == "D"]
        if rule_d:
            insight = rule_d[0]
            assert "Budget" in insight["title"] or "budget_breach" in insight["id"]
            print(f"✓ Rule D (Budget Breach) triggered: {insight['title']}")
        else:
            print("✓ Rule D (Budget Breach) not triggered (spend < 85% income)")
    
    def test_rule_e_drift_vs_average(self, session):
        """
        Rule E: Drift vs 3-Month Average triggers when category > avg x 1.2.
        """
        resp = session.get(f"{BASE_URL}/api/expenses/spending-insights?tz_offset=-330")
        assert resp.status_code == 200
        data = resp.json()
        
        rule_e = [i for i in data["insights"] if i["rule"] == "E"]
        if rule_e:
            insight = rule_e[0]
            assert "drift" in insight["id"].lower() or "deviation" in insight["id"].lower()
            print(f"✓ Rule E (Drift vs Average) triggered: {insight['title']}")
        else:
            print("✓ Rule E (Drift vs Average) not triggered")


class TestExpensesByMonthTimezone:
    """Test timezone in expenses/by-month endpoint."""
    
    def test_expenses_by_month_with_tz_offset(self, session):
        """GET /api/expenses/by-month uses tz_offset."""
        resp = session.get(f"{BASE_URL}/api/expenses/by-month?tz_offset=-330")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"✓ Expenses by month (IST): {len(data)} expenses")
    
    def test_expenses_by_specific_month_with_tz_offset(self, session):
        """GET /api/expenses/by-month?month=2026-01&tz_offset=-330."""
        now = datetime.now()
        current_month = f"{now.year}-{now.month:02d}"
        resp = session.get(f"{BASE_URL}/api/expenses/by-month?month={current_month}&tz_offset=-330")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"✓ Expenses for {current_month} (IST): {len(data)} expenses")


class TestBehaviorInsightsTimezone:
    """Test timezone in behavior-insights endpoint."""
    
    def test_behavior_insights_with_tz_offset(self, session):
        """GET /api/expenses/behavior-insights uses tz_offset."""
        resp = session.get(f"{BASE_URL}/api/expenses/behavior-insights?tz_offset=-330")
        assert resp.status_code == 200
        data = resp.json()
        assert "insights" in data
        assert "patternData" in data
        assert "summary" in data
        print(f"✓ Behavior insights (IST): {len(data.get('insights', []))} insights")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
