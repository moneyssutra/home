"""
Admin Authentication Tests - Token-based auth refactored from cookie-based
Tests admin login, logout, verify, and session persistence
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials from requirements
ADMIN_EMAIL = "admin@moneyssutra.com"
ADMIN_PASSWORD = "admin123"


class TestAdminLogin:
    """Admin login endpoint tests"""

    def test_admin_login_success(self):
        """Test successful admin login returns token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "email" in data, "Response should contain email"
        assert "success" in data, "Response should contain success"
        assert data["success"] is True
        assert data["email"] == ADMIN_EMAIL
        assert isinstance(data["token"], str)
        assert len(data["token"]) > 0, "Token should not be empty"
        print(f"Admin login successful, token length: {len(data['token'])}")

    def test_admin_login_invalid_password(self):
        """Test admin login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        print(f"Invalid password correctly rejected: {data['detail']}")

    def test_admin_login_invalid_email(self):
        """Test admin login with non-admin email"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "notadmin@example.com",
            "password": "admin123"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Non-admin email correctly rejected")

    def test_admin_login_empty_credentials(self):
        """Test admin login with empty credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "",
            "password": ""
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Empty credentials correctly rejected")


class TestAdminVerify:
    """Admin verify endpoint tests - checks Bearer token auth"""

    def test_admin_verify_with_valid_token(self):
        """Test verify endpoint with valid Bearer token"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Verify with Bearer token
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/verify",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert verify_response.status_code == 200, f"Expected 200, got {verify_response.status_code}"
        
        data = verify_response.json()
        assert data.get("admin") is True
        print("Admin verify with valid token successful")

    def test_admin_verify_without_token(self):
        """Test verify endpoint without token"""
        response = requests.get(f"{BASE_URL}/api/admin/verify")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Verify without token correctly rejected")

    def test_admin_verify_with_invalid_token(self):
        """Test verify endpoint with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/admin/verify",
            headers={"Authorization": "Bearer invalid-token-123"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Verify with invalid token correctly rejected")


class TestAdminLogout:
    """Admin logout endpoint tests"""

    def test_admin_logout_clears_session(self):
        """Test that logout invalidates the token"""
        # Login to get token
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Verify token works before logout
        verify_before = requests.get(
            f"{BASE_URL}/api/admin/verify",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert verify_before.status_code == 200, "Token should be valid before logout"
        
        # Logout
        logout_response = requests.post(
            f"{BASE_URL}/api/admin/logout",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert logout_response.status_code == 200, f"Expected 200, got {logout_response.status_code}"
        assert logout_response.json().get("success") is True
        
        # Verify token no longer works after logout
        verify_after = requests.get(
            f"{BASE_URL}/api/admin/verify",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert verify_after.status_code == 401, "Token should be invalid after logout"
        print("Admin logout successfully invalidated token")


class TestAdminSessionPersistence:
    """Test that admin session persists across multiple requests"""

    def test_multiple_api_calls_with_same_token(self):
        """Test that the same token works for multiple requests"""
        # Login
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Make multiple API calls with the same token
        endpoints = [
            "/api/admin/verify",
            "/api/admin/command-center",
            "/api/admin/user-growth",
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            assert response.status_code == 200, f"Failed at {endpoint}: {response.status_code}"
            print(f"  {endpoint}: OK")
        
        print("Session persistence across multiple API calls verified")


class TestAdminProtectedEndpoints:
    """Test that admin endpoints require authentication"""

    def test_command_center_requires_auth(self):
        """Test command-center requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/command-center")
        assert response.status_code == 401
        print("Command center requires auth: OK")

    def test_user_growth_requires_auth(self):
        """Test user-growth requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/user-growth")
        assert response.status_code == 401
        print("User growth requires auth: OK")

    def test_risk_radar_requires_auth(self):
        """Test risk-radar requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/risk-radar")
        assert response.status_code == 401
        print("Risk radar requires auth: OK")

    def test_engagement_requires_auth(self):
        """Test engagement requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/engagement")
        assert response.status_code == 401
        print("Engagement requires auth: OK")


class TestAdminDataEndpoints:
    """Test admin data endpoints return valid data with auth"""

    @pytest.fixture
    def admin_token(self):
        """Get admin token for tests"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]

    def test_command_center_returns_data(self, admin_token):
        """Test command-center returns valid data structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/command-center",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check expected fields
        assert "totalUsers" in data
        assert "active7d" in data
        assert "active30d" in data
        print(f"Command center data: {data.get('totalUsers')} total users")

    def test_user_growth_returns_data(self, admin_token):
        """Test user-growth returns valid data structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/user-growth",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check expected fields
        assert "totalUsers" in data
        assert "newToday" in data
        assert "dailyRegistrations" in data
        print(f"User growth data: {data.get('totalUsers')} total, {data.get('newToday')} new today")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
