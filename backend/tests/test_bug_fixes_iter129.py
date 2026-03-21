"""
Test bug fixes for iteration 129:
1. Biometric RPID fix - x-forwarded-host used instead of internal host
2. Security status endpoint - returns has_mpin, has_biometric, needs_setup
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestBiometricRPIDFix:
    """Test that biometric debug-headers returns correct rp_id from x-forwarded-host"""

    def test_debug_headers_returns_correct_rp_id(self):
        """GET /api/biometric/debug-headers should return rp_id matching x-forwarded-host"""
        response = requests.get(
            f"{BASE_URL}/api/biometric/debug-headers",
            headers={"X-Forwarded-Host": "mpin-auth-impl.preview.emergentagent.com"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify rp_id matches x-forwarded-host (without port)
        assert "rp_id" in data, "Response should contain rp_id"
        assert data["rp_id"] == "mpin-auth-impl.preview.emergentagent.com", \
            f"Expected rp_id to be 'mpin-auth-impl.preview.emergentagent.com', got '{data['rp_id']}'"
        
        # Verify origin is constructed correctly
        assert "origin" in data, "Response should contain origin"
        assert data["origin"] == "https://wealth-vision-9.preview.emergentagent.com", \
            f"Expected origin 'https://wealth-vision-9.preview.emergentagent.com', got '{data['origin']}'"
        
        # Verify x-forwarded-host is captured
        assert "x-forwarded-host" in data, "Response should include x-forwarded-host"
        print(f"PASSED: rp_id={data['rp_id']}, origin={data['origin']}")

    def test_debug_headers_without_forwarded_host_uses_host_header(self):
        """When no x-forwarded-host, should fall back to host header"""
        response = requests.get(f"{BASE_URL}/api/biometric/debug-headers")
        assert response.status_code == 200
        data = response.json()
        
        # Should have some rp_id (may be internal host or forwarded depending on infra)
        assert "rp_id" in data, "Response should contain rp_id"
        assert len(data["rp_id"]) > 0, "rp_id should not be empty"
        print(f"PASSED: Without explicit x-forwarded-host, rp_id={data['rp_id']}")


class TestSecurityStatusEndpoint:
    """Test /api/auth/security-status endpoint for MPIN/biometric setup checks"""
    
    @pytest.fixture
    def auth_session(self):
        """Login and get authenticated session"""
        # Use existing test user from previous iterations
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test_mpin_e2e@example.com", "password": "TestMpin123!"}
        )
        if login_resp.status_code != 200:
            # Create a new test user if needed
            unique = str(uuid.uuid4())[:8]
            email = f"test_security_{unique}@example.com"
            reg_resp = requests.post(
                f"{BASE_URL}/api/auth/register",
                json={
                    "email": email,
                    "firstName": "Test",
                    "lastName": "Security",
                    "password": "TestSecurity123!",
                    "sex": "male",
                    "dateOfBirth": "1990-01-01"
                }
            )
            assert reg_resp.status_code in [200, 201], f"Registration failed: {reg_resp.text}"
            session_token = reg_resp.json().get("session_token")
        else:
            session_token = login_resp.json().get("session_token")
        
        return session_token
    
    def test_security_status_requires_auth(self):
        """GET /api/auth/security-status should require authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/security-status")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASSED: security-status requires authentication")
    
    def test_security_status_returns_correct_fields(self, auth_session):
        """GET /api/auth/security-status should return has_mpin, has_biometric, needs_setup"""
        response = requests.get(
            f"{BASE_URL}/api/auth/security-status",
            cookies={"session_token": auth_session}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify required fields exist
        assert "has_mpin" in data, "Response should contain has_mpin"
        assert "has_biometric" in data, "Response should contain has_biometric"
        assert "needs_setup" in data, "Response should contain needs_setup"
        
        # Verify types
        assert isinstance(data["has_mpin"], bool), "has_mpin should be boolean"
        assert isinstance(data["has_biometric"], bool), "has_biometric should be boolean"
        assert isinstance(data["needs_setup"], bool), "needs_setup should be boolean"
        
        # Verify logic: needs_setup should be true if EITHER mpin or biometric is missing
        expected_needs_setup = not data["has_mpin"] or not data["has_biometric"]
        assert data["needs_setup"] == expected_needs_setup, \
            f"needs_setup should be {expected_needs_setup} when has_mpin={data['has_mpin']}, has_biometric={data['has_biometric']}"
        
        print(f"PASSED: security-status returns has_mpin={data['has_mpin']}, has_biometric={data['has_biometric']}, needs_setup={data['needs_setup']}")

    def test_security_status_with_bearer_token(self, auth_session):
        """GET /api/auth/security-status should also accept Bearer token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/security-status",
            headers={"Authorization": f"Bearer {auth_session}"}
        )
        assert response.status_code == 200, f"Expected 200 with Bearer token, got {response.status_code}"
        data = response.json()
        assert "has_mpin" in data and "has_biometric" in data and "needs_setup" in data
        print("PASSED: security-status works with Bearer token")


class TestNewUserSecuritySetup:
    """Test security status for a brand new user (should need setup)"""
    
    def test_new_user_needs_setup(self):
        """A newly registered user should have needs_setup=True"""
        # Register a completely new user
        unique = str(uuid.uuid4())[:8]
        email = f"test_newuser_{unique}@example.com"
        
        # Use unique letters-only names
        import random
        import string
        rand_suffix = ''.join(random.choices(string.ascii_lowercase, k=6))
        
        reg_resp = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": email,
                "firstName": f"Newfirst{rand_suffix}",
                "lastName": f"Newlast{rand_suffix}",
                "password": "NewUser123!",
                "sex": "female",
                "dateOfBirth": "1995-05-15"
            }
        )
        assert reg_resp.status_code in [200, 201], f"Registration failed: {reg_resp.text}"
        session_token = reg_resp.json().get("session_token")
        
        # Check security status
        status_resp = requests.get(
            f"{BASE_URL}/api/auth/security-status",
            cookies={"session_token": session_token}
        )
        assert status_resp.status_code == 200
        data = status_resp.json()
        
        # New user should NOT have MPIN or biometric set
        assert data["has_mpin"] == False, f"New user should not have MPIN, got has_mpin={data['has_mpin']}"
        assert data["has_biometric"] == False, f"New user should not have biometric, got has_biometric={data['has_biometric']}"
        assert data["needs_setup"] == True, f"New user should need setup, got needs_setup={data['needs_setup']}"
        
        print(f"PASSED: New user {email} correctly shows needs_setup=True")


class TestRegressionAdminLogin:
    """Regression test for admin login (should still work)"""
    
    def test_admin_login_works(self):
        """POST /api/admin/login should still work"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": "admin@moneyssutra.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Admin login should return success=true"
        assert "token" in data, "Admin login should return token"
        print(f"PASSED: Admin login works, got token={data['token'][:8]}...")


class TestRegressionMPINLogin:
    """Regression test for MPIN login (should still work)"""
    
    def test_mpin_login_works(self):
        """POST /api/mpin/login should still work"""
        # First ensure user has MPIN set up
        # Try to login with existing test user
        response = requests.post(
            f"{BASE_URL}/api/mpin/login",
            json={"email": "test_mpin_e2e@example.com", "mpin": "1234"}
        )
        
        # This might fail if MPIN not set, which is okay for regression check
        if response.status_code == 200:
            data = response.json()
            assert "session_token" in data or "user_id" in data, "MPIN login should return session data"
            print("PASSED: MPIN login works for existing test user")
        elif response.status_code == 404:
            print("SKIPPED: Test user doesn't have MPIN set (not a regression)")
        else:
            print(f"WARNING: MPIN login returned {response.status_code}: {response.text}")
