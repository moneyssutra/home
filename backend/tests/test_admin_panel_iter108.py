"""
Admin Panel Backend API Tests - Iteration 108
Tests for admin login, verify, command-center, user-growth, and risk-radar endpoints.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestAdminLogin:
    """Admin login endpoint tests"""

    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": "admin@moneyssutra.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        assert data.get("email") == "admin@moneyssutra.com"
        # Verify cookie is set
        assert "admin_token" in response.cookies or "admin_token" in str(response.headers.get("set-cookie", "")).lower()
        print(f"Admin login success: {data}")

    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": "admin@moneyssutra.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Admin login with invalid credentials correctly returned 401")

    def test_admin_login_invalid_email(self):
        """Test admin login with non-admin email returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": "user@example.com", "password": "admin123"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Admin login with non-admin email correctly returned 401")

    def test_admin_login_empty_credentials(self):
        """Test admin login with empty credentials returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": "", "password": ""}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Admin login with empty credentials correctly returned 401")


class TestAdminVerify:
    """Admin verify endpoint tests"""

    @pytest.fixture
    def admin_session(self):
        """Get authenticated admin session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": "admin@moneyssutra.com", "password": "admin123"}
        )
        assert response.status_code == 200, "Admin login failed in fixture"
        return session

    def test_admin_verify_with_session(self, admin_session):
        """Test admin verify endpoint with valid session"""
        response = admin_session.get(f"{BASE_URL}/api/admin/verify")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("admin") is True
        print(f"Admin verify success: {data}")

    def test_admin_verify_without_session(self):
        """Test admin verify endpoint without session returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/verify")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Admin verify without session correctly returned 401")


class TestAdminCommandCenter:
    """Command Center KPIs endpoint tests"""

    @pytest.fixture
    def admin_session(self):
        """Get authenticated admin session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": "admin@moneyssutra.com", "password": "admin123"}
        )
        assert response.status_code == 200, "Admin login failed in fixture"
        return session

    def test_command_center_returns_kpis(self, admin_session):
        """Test command-center endpoint returns expected KPI fields"""
        response = admin_session.get(f"{BASE_URL}/api/admin/command-center")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check required KPI fields
        required_fields = ["totalUsers", "pfsi", "avgSafetyDays", "avgWealthPct", "avgHealthScore", "riskDistribution"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Check data types
        assert isinstance(data["totalUsers"], int)
        assert isinstance(data["pfsi"], (int, float))
        assert isinstance(data["avgSafetyDays"], (int, float))
        assert isinstance(data["avgWealthPct"], (int, float))
        assert isinstance(data["riskDistribution"], dict)
        
        print(f"Command center KPIs: totalUsers={data['totalUsers']}, pfsi={data['pfsi']}, avgSafetyDays={data['avgSafetyDays']}, avgWealthPct={data['avgWealthPct']}")

    def test_command_center_with_timezone(self, admin_session):
        """Test command-center endpoint with timezone offset"""
        response = admin_session.get(f"{BASE_URL}/api/admin/command-center?tz_offset=-330")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "totalUsers" in data
        print(f"Command center with timezone: totalUsers={data['totalUsers']}")

    def test_command_center_without_auth(self):
        """Test command-center endpoint without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/command-center")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Command center without auth correctly returned 401")


class TestAdminUserGrowth:
    """User Growth Analytics endpoint tests"""

    @pytest.fixture
    def admin_session(self):
        """Get authenticated admin session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": "admin@moneyssutra.com", "password": "admin123"}
        )
        assert response.status_code == 200, "Admin login failed in fixture"
        return session

    def test_user_growth_returns_registrations(self, admin_session):
        """Test user-growth endpoint returns registration data"""
        response = admin_session.get(f"{BASE_URL}/api/admin/user-growth")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check required fields
        required_fields = ["totalUsers", "dailyRegistrations", "weeklyRegistrations", "monthlyRegistrations", "cohortRetention"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Check array types
        assert isinstance(data["dailyRegistrations"], list)
        assert isinstance(data["weeklyRegistrations"], list)
        assert isinstance(data["monthlyRegistrations"], list)
        assert isinstance(data["cohortRetention"], list)
        
        # Check daily registrations structure (should have 30 entries)
        if len(data["dailyRegistrations"]) > 0:
            daily_entry = data["dailyRegistrations"][0]
            assert "label" in daily_entry
            assert "count" in daily_entry
        
        print(f"User growth: totalUsers={data['totalUsers']}, newToday={data.get('newToday', 0)}, newThisWeek={data.get('newThisWeek', 0)}, newThisMonth={data.get('newThisMonth', 0)}")

    def test_user_growth_cohort_retention_structure(self, admin_session):
        """Test cohort retention data structure"""
        response = admin_session.get(f"{BASE_URL}/api/admin/user-growth")
        assert response.status_code == 200
        data = response.json()
        
        cohort_data = data.get("cohortRetention", [])
        if len(cohort_data) > 0:
            cohort = cohort_data[0]
            expected_keys = ["cohort", "users", "day1", "day7", "day30"]
            for key in expected_keys:
                assert key in cohort, f"Missing cohort key: {key}"
            print(f"Cohort retention sample: {cohort}")
        else:
            print("No cohort retention data (expected in test environment with few users)")

    def test_user_growth_without_auth(self):
        """Test user-growth endpoint without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/user-growth")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("User growth without auth correctly returned 401")


class TestAdminRiskRadar:
    """Risk Radar Intelligence endpoint tests"""

    @pytest.fixture
    def admin_session(self):
        """Get authenticated admin session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": "admin@moneyssutra.com", "password": "admin123"}
        )
        assert response.status_code == 200, "Admin login failed in fixture"
        return session

    def test_risk_radar_returns_buckets(self, admin_session):
        """Test risk-radar endpoint returns risk bucket data"""
        response = admin_session.get(f"{BASE_URL}/api/admin/risk-radar")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check required fields
        assert "totalUsers" in data
        assert "riskBuckets" in data
        assert "riskDrivers" in data
        
        # Check risk buckets structure
        risk_buckets = data["riskBuckets"]
        expected_buckets = ["critical", "high", "moderate", "stable"]
        for bucket in expected_buckets:
            assert bucket in risk_buckets, f"Missing risk bucket: {bucket}"
            assert "count" in risk_buckets[bucket]
            assert "threshold" in risk_buckets[bucket]
        
        print(f"Risk radar: totalUsers={data['totalUsers']}, buckets={risk_buckets}")

    def test_risk_radar_drivers_structure(self, admin_session):
        """Test risk drivers data structure"""
        response = admin_session.get(f"{BASE_URL}/api/admin/risk-radar")
        assert response.status_code == 200
        data = response.json()
        
        drivers = data.get("riskDrivers", [])
        if len(drivers) > 0:
            driver = drivers[0]
            assert "driver" in driver
            assert "count" in driver
            assert "pct" in driver
            print(f"Risk drivers: {drivers}")
        else:
            print("No risk drivers (expected in test environment with stable users)")

    def test_risk_radar_without_auth(self):
        """Test risk-radar endpoint without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/risk-radar")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Risk radar without auth correctly returned 401")


class TestAdminEndToEnd:
    """End-to-end admin flow tests"""

    def test_full_admin_workflow(self):
        """Test complete admin workflow: login -> verify -> access all endpoints"""
        session = requests.Session()
        
        # Step 1: Login
        login_response = session.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": "admin@moneyssutra.com", "password": "admin123"}
        )
        assert login_response.status_code == 200, "Login failed"
        print("Step 1: Admin login successful")
        
        # Step 2: Verify
        verify_response = session.get(f"{BASE_URL}/api/admin/verify")
        assert verify_response.status_code == 200, "Verify failed"
        print("Step 2: Admin verify successful")
        
        # Step 3: Access command-center
        cc_response = session.get(f"{BASE_URL}/api/admin/command-center")
        assert cc_response.status_code == 200, "Command center access failed"
        print("Step 3: Command center access successful")
        
        # Step 4: Access user-growth
        ug_response = session.get(f"{BASE_URL}/api/admin/user-growth")
        assert ug_response.status_code == 200, "User growth access failed"
        print("Step 4: User growth access successful")
        
        # Step 5: Access risk-radar
        rr_response = session.get(f"{BASE_URL}/api/admin/risk-radar")
        assert rr_response.status_code == 200, "Risk radar access failed"
        print("Step 5: Risk radar access successful")
        
        print("Full admin workflow completed successfully!")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
