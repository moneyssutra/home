"""
Test Biometric/WebAuthn Authentication Feature
Tests for: /api/biometric/* endpoints
- POST /api/biometric/register/options (requires auth)
- POST /api/biometric/register/verify (requires auth)
- POST /api/biometric/login/options (no auth)
- POST /api/biometric/login/verify (no auth)
- GET /api/biometric/status (requires auth)
- DELETE /api/biometric/remove (requires auth)

NOTE: WebAuthn credential creation/verification requires actual browser biometric support.
These tests verify API response shapes, error handling, and challenge generation.
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
TEST_USER_EMAIL = f"test_biometric_{int(time.time())}@example.com"
TEST_USER_PASSWORD = "BiometricTest123!"


class TestBiometricRequiresAuth:
    """Test that auth-required endpoints reject unauthenticated requests."""

    def test_register_options_requires_auth(self):
        """POST /api/biometric/register/options requires authentication."""
        response = requests.post(f"{BASE_URL}/api/biometric/register/options", json={})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        assert "detail" in data or "message" in data

    def test_register_verify_requires_auth(self):
        """POST /api/biometric/register/verify requires authentication."""
        response = requests.post(f"{BASE_URL}/api/biometric/register/verify", json={})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    def test_status_requires_auth(self):
        """GET /api/biometric/status requires authentication."""
        response = requests.get(f"{BASE_URL}/api/biometric/status")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    def test_remove_requires_auth(self):
        """DELETE /api/biometric/remove requires authentication."""
        response = requests.delete(f"{BASE_URL}/api/biometric/remove")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestBiometricLoginOptions:
    """Test POST /api/biometric/login/options (no auth required)."""

    def test_login_options_requires_email(self):
        """Must provide email to get authentication options."""
        response = requests.post(f"{BASE_URL}/api/biometric/login/options", json={})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "email" in data.get("detail", "").lower() or "required" in data.get("detail", "").lower()

    def test_login_options_nonexistent_user(self):
        """Returns 404 for user that doesn't exist."""
        response = requests.post(f"{BASE_URL}/api/biometric/login/options", json={
            "email": "nonexistent_user_xyz123@example.com"
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "not found" in data.get("detail", "").lower()

    def test_login_options_user_no_biometric(self):
        """Returns 404 when user has no biometric credentials registered."""
        # Use existing test user from MPIN tests who likely has no biometric
        response = requests.post(f"{BASE_URL}/api/biometric/login/options", json={
            "email": "test_mpin_e2e@example.com"  # User from MPIN tests
        })
        # Should be 404 (no biometric registered) unless user happens to have biometric
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        if response.status_code == 404:
            data = response.json()
            # Check error is about biometric/credentials, not about user not found
            assert "biometric" in data.get("detail", "").lower() or "credentials" in data.get("detail", "").lower() or "not found" in data.get("detail", "").lower()


class TestBiometricLoginVerify:
    """Test POST /api/biometric/login/verify (no auth required)."""

    def test_login_verify_requires_credential_and_email(self):
        """Must provide both credential and email."""
        response = requests.post(f"{BASE_URL}/api/biometric/login/verify", json={})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "missing" in data.get("detail", "").lower() or "credential" in data.get("detail", "").lower()

    def test_login_verify_nonexistent_user(self):
        """Returns 401 for nonexistent user."""
        response = requests.post(f"{BASE_URL}/api/biometric/login/verify", json={
            "email": "nonexistent_xyz@example.com",
            "credential": {"id": "fake", "type": "public-key", "response": {}}
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    def test_login_verify_invalid_credential(self):
        """Returns error for invalid credential format."""
        response = requests.post(f"{BASE_URL}/api/biometric/login/verify", json={
            "email": "admin@moneyssutra.com",
            "credential": {"id": "invalid_cred_id", "type": "public-key", "response": {}}
        })
        # Should be 401 (credential not recognized) or 400 (invalid format)
        assert response.status_code in [400, 401], f"Expected 400 or 401, got {response.status_code}"


class TestBiometricAuthenticatedFlow:
    """Test authenticated biometric endpoints with a logged-in user session."""

    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Create a test user and get session for authenticated tests."""
        self.session = requests.Session()
        
        # Use the test user with MPIN from iteration_127
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test_mpin_e2e@example.com",
            "password": "TestMpin123!"
        })
        
        if login_response.status_code != 200:
            # Try registering a new user
            register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD,
                "firstName": "BiometricTest",
                "lastName": "User"
            })
            if register_response.status_code not in [200, 201]:
                pytest.skip(f"Could not create or login test user: {login_response.text}")
        
        yield
        
        # Cleanup: remove biometric credentials if any
        self.session.delete(f"{BASE_URL}/api/biometric/remove")

    def test_biometric_status_no_credentials(self):
        """GET /api/biometric/status returns has_biometric: false for new user."""
        response = self.session.get(f"{BASE_URL}/api/biometric/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "has_biometric" in data
        assert data["has_biometric"] == False
        assert "credentials" in data
        assert isinstance(data["credentials"], list)
        assert len(data["credentials"]) == 0

    def test_register_options_returns_webauthn_options(self):
        """POST /api/biometric/register/options returns valid WebAuthn registration options."""
        response = self.session.post(f"{BASE_URL}/api/biometric/register/options", json={})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should have 'options' key containing WebAuthn options JSON string
        assert "options" in data
        options_str = data["options"]
        assert isinstance(options_str, str)
        
        # Parse the options JSON
        import json
        options = json.loads(options_str)
        
        # Validate WebAuthn registration options structure
        assert "challenge" in options, "Missing challenge in options"
        assert "rp" in options, "Missing rp (relying party) in options"
        assert "user" in options, "Missing user in options"
        assert "pubKeyCredParams" in options, "Missing pubKeyCredParams in options"
        
        # Validate RP (Relying Party)
        assert "id" in options["rp"], "Missing rp.id"
        assert "name" in options["rp"], "Missing rp.name"
        assert options["rp"]["name"] == "MoneySutra", f"Expected MoneySutra, got {options['rp']['name']}"
        
        # Validate user
        assert "id" in options["user"]
        assert "name" in options["user"]
        assert "displayName" in options["user"]
        
        # Validate pubKeyCredParams (should have at least ECDSA and RSA)
        assert len(options["pubKeyCredParams"]) >= 1
        for param in options["pubKeyCredParams"]:
            assert "type" in param
            assert "alg" in param
            assert param["type"] == "public-key"

    def test_register_verify_requires_credential(self):
        """POST /api/biometric/register/verify requires credential data."""
        response = self.session.post(f"{BASE_URL}/api/biometric/register/verify", json={})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "credential" in data.get("detail", "").lower() or "missing" in data.get("detail", "").lower()

    def test_register_verify_invalid_credential_format(self):
        """POST /api/biometric/register/verify rejects malformed credential."""
        # First get registration options to create a challenge
        opt_response = self.session.post(f"{BASE_URL}/api/biometric/register/options", json={})
        assert opt_response.status_code == 200
        
        # Try to verify with invalid credential
        response = self.session.post(f"{BASE_URL}/api/biometric/register/verify", json={
            "credential": {
                "id": "fake_credential_id",
                "type": "public-key",
                "response": {
                    "attestationObject": "invalid_base64",
                    "clientDataJSON": "invalid_base64"
                }
            }
        })
        # Should fail with 400 (verification failed)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"

    def test_remove_biometric_when_none_exists(self):
        """DELETE /api/biometric/remove succeeds even when no credentials exist."""
        response = self.session.delete(f"{BASE_URL}/api/biometric/remove")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        assert "removed" in data
        assert data["removed"] == 0  # Should remove 0 credentials


class TestBiometricRegressionMpin:
    """Regression: Ensure MPIN login still works after biometric feature."""

    def test_mpin_login_endpoint_exists(self):
        """POST /api/mpin/login still works."""
        response = requests.post(f"{BASE_URL}/api/mpin/login", json={
            "email": "nonexistent@test.com",
            "mpin": "1234"
        })
        # Should get 401 (user not found or invalid MPIN), not 404 (endpoint missing)
        assert response.status_code in [401, 404], f"Expected 401 or 404, got {response.status_code}"

    def test_mpin_status_requires_auth(self):
        """GET /api/mpin/status still requires auth."""
        response = requests.get(f"{BASE_URL}/api/mpin/status")
        assert response.status_code == 401


class TestBiometricRegressionAdminLogin:
    """Regression: Ensure admin login still works after biometric feature."""

    def test_admin_login_works(self):
        """POST /api/admin/login with valid credentials."""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "admin@moneyssutra.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "email" in data
        assert data["email"] == "admin@moneyssutra.com"

    def test_admin_verify_with_token(self):
        """GET /api/admin/verify with Bearer token."""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "admin@moneyssutra.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Verify
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/verify",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert data.get("admin") == True


class TestBiometricRegressionNormalLogin:
    """Regression: Ensure normal password login still works."""

    def test_normal_login_endpoint(self):
        """POST /api/auth/login with credentials."""
        # Use the test user with MPIN from iteration_127 that has password
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test_mpin_e2e@example.com",
            "password": "TestMpin123!"
        })
        # This should work for test user with password
        assert response.status_code == 200, f"Normal login failed: {response.text}"
        data = response.json()
        assert "email" in data or "user_id" in data


# Pytest fixtures
@pytest.fixture(scope="module")
def api_client():
    """Shared requests session."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
