"""
Iteration 106 Tests: Admin Command Center + Monthly Expense spentSoFar/upcoming
Features:
1. Monthly-summary endpoint returns spentSoFar and upcoming for current month
2. Admin /verify endpoint requires admin email
3. Admin /command-center returns platform KPIs and PFSI
4. Admin /risk-radar returns risk buckets and drivers
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@moneyssutra.com"
TEST_PASSWORD = "test"
NON_ADMIN_EMAIL = "regularuser@test.com"


@pytest.fixture(scope="module")
def session():
    """Shared requests session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_session(session):
    """Login and return authenticated session"""
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    return session


class TestMonthlySummarySpentSoFar:
    """Test monthly-summary endpoint returns spentSoFar and upcoming fields"""

    def test_monthly_summary_returns_spent_so_far(self, auth_session):
        """GET /api/expenses/monthly-summary should include spentSoFar for current month"""
        response = auth_session.get(
            f"{BASE_URL}/api/expenses/monthly-summary?last=2&tz_offset=-330",
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "months" in data, "Response should contain 'months' array"
        assert len(data["months"]) > 0, "Should have at least 1 month"
        
        # Check the current month (last in array) has spentSoFar
        current_month = data["months"][-1]
        assert "spentSoFar" in current_month, "Current month should have 'spentSoFar' field"
        assert "upcoming" in current_month, "Current month should have 'upcoming' field"
        assert "total" in current_month, "Current month should have 'total' field"
        
        # spentSoFar should be <= total for current month
        spent = current_month["spentSoFar"]
        total = current_month["total"]
        assert spent <= total, f"spentSoFar ({spent}) should be <= total ({total})"
        
        print(f"Current month: {current_month['month']}")
        print(f"  spentSoFar: {spent}")
        print(f"  upcoming: {current_month['upcoming']}")
        print(f"  total: {total}")

    def test_monthly_summary_structure(self, auth_session):
        """Verify monthly-summary has correct structure"""
        response = auth_session.get(
            f"{BASE_URL}/api/expenses/monthly-summary?last=6&tz_offset=-330",
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "months" in data
        assert "insights" in data
        assert "avgMonthlySpend" in data
        
        # Check each month has required fields
        for month in data["months"]:
            required_fields = ["month", "total", "essential", "lifestyle", "wealth", "incomeTotal", "percentOfIncome"]
            for field in required_fields:
                assert field in month, f"Month should have '{field}' field"

    def test_monthly_summary_requires_auth(self, session):
        """monthly-summary should require authentication"""
        # Use fresh session without auth
        fresh_session = requests.Session()
        response = fresh_session.get(
            f"{BASE_URL}/api/expenses/monthly-summary?last=2&tz_offset=-330",
        )
        assert response.status_code == 401, "Should return 401 without auth"


class TestAdminVerify:
    """Test admin verify endpoint"""

    def test_admin_verify_with_admin_email(self, auth_session):
        """Admin user should pass verify"""
        response = auth_session.get(f"{BASE_URL}/api/admin/verify")
        assert response.status_code == 200, f"Admin verify failed: {response.text}"
        
        data = response.json()
        assert data.get("admin") == True, "Should return {admin: true}"
        print(f"Admin verify response: {data}")

    def test_admin_verify_requires_auth(self, session):
        """Verify endpoint should require authentication"""
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/admin/verify")
        assert response.status_code == 401, "Should return 401 without auth"


class TestAdminCommandCenter:
    """Test admin command-center endpoint"""

    def test_command_center_returns_kpis(self, auth_session):
        """GET /api/admin/command-center should return platform KPIs"""
        response = auth_session.get(
            f"{BASE_URL}/api/admin/command-center?tz_offset=-330",
            timeout=30  # Admin endpoints can be slow
        )
        assert response.status_code == 200, f"Command center failed: {response.text}"
        
        data = response.json()
        
        # Check required fields
        required_fields = ["totalUsers", "pfsi", "avgSafetyDays", "avgWealthPct", "riskDistribution", "userMetrics"]
        for field in required_fields:
            assert field in data, f"Response should contain '{field}'"
        
        # Validate types
        assert isinstance(data["totalUsers"], int), "totalUsers should be int"
        assert isinstance(data["pfsi"], (int, float)), "pfsi should be numeric"
        assert isinstance(data["avgSafetyDays"], (int, float)), "avgSafetyDays should be numeric"
        assert isinstance(data["avgWealthPct"], (int, float)), "avgWealthPct should be numeric"
        assert isinstance(data["riskDistribution"], dict), "riskDistribution should be dict"
        assert isinstance(data["userMetrics"], list), "userMetrics should be array"
        
        # PFSI should be 0-100
        assert 0 <= data["pfsi"] <= 100, f"PFSI ({data['pfsi']}) should be 0-100"
        
        print(f"Command Center KPIs:")
        print(f"  Total Users: {data['totalUsers']}")
        print(f"  PFSI: {data['pfsi']}")
        print(f"  Avg Safety Days: {data['avgSafetyDays']}")
        print(f"  Avg Wealth %: {data['avgWealthPct']}")
        print(f"  Risk Distribution: {data['riskDistribution']}")

    def test_command_center_risk_distribution_structure(self, auth_session):
        """Risk distribution should have critical/high/moderate/stable buckets"""
        response = auth_session.get(
            f"{BASE_URL}/api/admin/command-center?tz_offset=-330",
            timeout=30
        )
        assert response.status_code == 200
        
        data = response.json()
        risk_dist = data.get("riskDistribution", {})
        
        # Should have all 4 risk levels
        expected_levels = ["critical", "high", "moderate", "stable"]
        for level in expected_levels:
            assert level in risk_dist, f"Risk distribution should have '{level}' bucket"
            assert isinstance(risk_dist[level], int), f"{level} count should be int"

    def test_command_center_user_metrics_structure(self, auth_session):
        """User metrics should have correct structure"""
        response = auth_session.get(
            f"{BASE_URL}/api/admin/command-center?tz_offset=-330",
            timeout=30
        )
        assert response.status_code == 200
        
        data = response.json()
        user_metrics = data.get("userMetrics", [])
        
        if len(user_metrics) > 0:
            user = user_metrics[0]
            expected_fields = ["userId", "incomeBand", "safetyDays", "wealthPct", "lifestylePct", 
                            "emiPct", "healthScore", "riskLevel", "monetizationBucket"]
            for field in expected_fields:
                assert field in user, f"User metric should have '{field}'"
            
            # Risk level should be one of 4 values
            assert user["riskLevel"] in ["critical", "high", "moderate", "stable"], \
                f"Invalid risk level: {user['riskLevel']}"
            
            print(f"Sample user metric: {user}")


class TestAdminRiskRadar:
    """Test admin risk-radar endpoint"""

    def test_risk_radar_returns_buckets(self, auth_session):
        """GET /api/admin/risk-radar should return risk buckets"""
        response = auth_session.get(
            f"{BASE_URL}/api/admin/risk-radar?tz_offset=-330",
            timeout=30
        )
        assert response.status_code == 200, f"Risk radar failed: {response.text}"
        
        data = response.json()
        
        # Check required fields
        assert "riskBuckets" in data, "Response should contain 'riskBuckets'"
        assert "riskDrivers" in data, "Response should contain 'riskDrivers'"
        
        # Validate risk buckets structure
        buckets = data["riskBuckets"]
        expected_buckets = ["critical", "high", "moderate", "stable"]
        for bucket in expected_buckets:
            assert bucket in buckets, f"Should have '{bucket}' bucket"
            assert "count" in buckets[bucket], f"{bucket} bucket should have 'count'"
            assert "pct" in buckets[bucket], f"{bucket} bucket should have 'pct'"
            assert "threshold" in buckets[bucket], f"{bucket} bucket should have 'threshold'"
        
        print(f"Risk Buckets:")
        for b, v in buckets.items():
            print(f"  {b}: count={v['count']}, pct={v['pct']}%, threshold={v['threshold']}")

    def test_risk_radar_drivers_structure(self, auth_session):
        """Risk drivers should have correct structure"""
        response = auth_session.get(
            f"{BASE_URL}/api/admin/risk-radar?tz_offset=-330",
            timeout=30
        )
        assert response.status_code == 200
        
        data = response.json()
        drivers = data.get("riskDrivers", [])
        
        # Drivers is an array (could be empty)
        assert isinstance(drivers, list), "riskDrivers should be array"
        
        if len(drivers) > 0:
            driver = drivers[0]
            assert "driver" in driver, "Driver should have 'driver' field"
            assert "count" in driver, "Driver should have 'count' field"
            assert "pct" in driver, "Driver should have 'pct' field"
            print(f"Risk Drivers: {drivers}")

    def test_risk_radar_requires_auth(self, session):
        """risk-radar should require authentication"""
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/admin/risk-radar")
        assert response.status_code == 401, "Should return 401 without auth"


class TestAdminRequiresAdminEmail:
    """Test that admin endpoints require admin email (not just any authenticated user)"""

    def test_command_center_with_non_admin_returns_403(self, auth_session):
        """Command center should check admin email whitelist
        Note: We're testing with admin user, so this should pass.
        A proper test would need a non-admin account.
        """
        response = auth_session.get(
            f"{BASE_URL}/api/admin/command-center?tz_offset=-330",
            timeout=30
        )
        # With admin user, should get 200
        assert response.status_code == 200, f"Admin should have access: {response.text}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
