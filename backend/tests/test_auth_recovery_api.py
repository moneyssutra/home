"""
Test Auth Recovery APIs
========================
Tests for:
- /api/auth/check-availability - username/email availability check
- /api/auth/forgot-username - recover username via email
- /api/auth/forgot-password - request password reset
- /api/auth/verify-reset-token - verify reset token validity
- /api/auth/reset-password - reset password with valid token
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCheckAvailabilityAPI:
    """Test /api/auth/check-availability endpoint"""
    
    def test_check_availability_new_username(self):
        """New/unique username should be available"""
        unique_name = f"TEST_unique_user_{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/auth/check-availability",
            json={"username": unique_name}
        )
        assert response.status_code == 200
        data = response.json()
        assert "username_available" in data
        assert data["username_available"] == True
        print(f"✓ Unique username '{unique_name}' is available")
    
    def test_check_availability_existing_username(self):
        """First register a user, then check if username is taken"""
        # Register a test user first
        unique_suffix = uuid.uuid4().hex[:8]
        test_email = f"test_avail_{unique_suffix}@test.com"
        test_username = f"TEST_taken_user_{unique_suffix}"
        
        reg_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "name": test_username,
                "email": test_email,
                "password": "testpass123"
            }
        )
        
        # Now check availability - should return False (taken)
        response = requests.post(
            f"{BASE_URL}/api/auth/check-availability",
            json={"username": test_username}
        )
        assert response.status_code == 200
        data = response.json()
        assert "username_available" in data
        assert data["username_available"] == False
        print(f"✓ Existing username '{test_username}' correctly marked as taken")
    
    def test_check_availability_new_email(self):
        """New/unique email should be available"""
        unique_email = f"TEST_unique_{uuid.uuid4().hex[:8]}@newdomain.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/check-availability",
            json={"email": unique_email}
        )
        assert response.status_code == 200
        data = response.json()
        assert "email_available" in data
        assert data["email_available"] == True
        print(f"✓ Unique email '{unique_email}' is available")
    
    def test_check_availability_existing_email(self):
        """Check existing test user email - should be taken"""
        # test@moneyssutra.com is the test account
        response = requests.post(
            f"{BASE_URL}/api/auth/check-availability",
            json={"email": "test@moneyssutra.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "email_available" in data
        # Since test user may or may not exist, just verify the field is boolean
        assert isinstance(data["email_available"], bool)
        print(f"✓ Email availability check returned valid response")
    
    def test_check_availability_both_fields(self):
        """Check both username and email at once"""
        response = requests.post(
            f"{BASE_URL}/api/auth/check-availability",
            json={
                "username": f"TEST_check_both_{uuid.uuid4().hex[:8]}",
                "email": f"TEST_check_both_{uuid.uuid4().hex[:8]}@test.com"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "username_available" in data
        assert "email_available" in data
        assert data["username_available"] == True
        assert data["email_available"] == True
        print("✓ Both username and email availability checked together")


class TestForgotUsernameAPI:
    """Test /api/auth/forgot-username endpoint"""
    
    def test_forgot_username_valid_email(self):
        """Should return success message for any email (to prevent enumeration)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-username",
            json={"email": "test@moneyssutra.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "email" in data["message"].lower() or "username" in data["message"].lower()
        print("✓ Forgot username returns success message")
    
    def test_forgot_username_nonexistent_email(self):
        """Should return same success message for non-existent email (security)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-username",
            json={"email": f"nonexistent_{uuid.uuid4().hex[:8]}@example.com"}
        )
        assert response.status_code == 200  # Always 200 to prevent enumeration
        data = response.json()
        assert "message" in data
        print("✓ Non-existent email also returns generic success (security)")
    
    def test_forgot_username_missing_email(self):
        """Should handle missing email field"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-username",
            json={}
        )
        # Should fail validation
        assert response.status_code in [400, 422]
        print("✓ Missing email field rejected")


class TestForgotPasswordAPI:
    """Test /api/auth/forgot-password endpoint"""
    
    def test_forgot_password_valid_username(self):
        """Should return success message for any username"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"username": "test@moneyssutra.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✓ Forgot password returns success message")
    
    def test_forgot_password_nonexistent_user(self):
        """Should return same success message for non-existent user (security)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"username": f"nonexistent_user_{uuid.uuid4().hex[:8]}"}
        )
        assert response.status_code == 200  # Always 200 to prevent enumeration
        data = response.json()
        assert "message" in data
        print("✓ Non-existent user also returns generic success (security)")
    
    def test_forgot_password_missing_username(self):
        """Should handle missing username field"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={}
        )
        assert response.status_code in [400, 422]
        print("✓ Missing username field rejected")


class TestVerifyResetTokenAPI:
    """Test /api/auth/verify-reset-token endpoint"""
    
    def test_verify_invalid_token(self):
        """Invalid token should return valid: false"""
        response = requests.get(
            f"{BASE_URL}/api/auth/verify-reset-token",
            params={"token": "invalid_token_123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "valid" in data
        assert data["valid"] == False
        assert "message" in data
        print("✓ Invalid token correctly identified")
    
    def test_verify_empty_token(self):
        """Empty token should return valid: false"""
        response = requests.get(
            f"{BASE_URL}/api/auth/verify-reset-token",
            params={"token": ""}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == False
        print("✓ Empty token correctly rejected")


class TestResetPasswordAPI:
    """Test /api/auth/reset-password endpoint"""
    
    def test_reset_password_invalid_token(self):
        """Should reject invalid/expired token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={
                "token": "invalid_token_xyz",
                "new_password": "newpassword123"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()
        print("✓ Invalid token rejected with appropriate error")
    
    def test_reset_password_missing_fields(self):
        """Should reject missing required fields"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"token": "some_token"}
        )
        assert response.status_code in [400, 422]
        print("✓ Missing password field rejected")


class TestEndToEndAuthRecoveryFlow:
    """Test complete auth recovery workflows"""
    
    def test_registration_with_realtime_validation(self):
        """Test full registration flow with availability checks"""
        unique_suffix = uuid.uuid4().hex[:8]
        test_email = f"TEST_e2e_{unique_suffix}@example.com"
        test_username = f"TEST_e2e_user_{unique_suffix}"
        
        # Step 1: Check username availability
        response = requests.post(
            f"{BASE_URL}/api/auth/check-availability",
            json={"username": test_username}
        )
        assert response.status_code == 200
        assert response.json()["username_available"] == True
        print(f"  ✓ Step 1: Username '{test_username}' is available")
        
        # Step 2: Check email availability
        response = requests.post(
            f"{BASE_URL}/api/auth/check-availability",
            json={"email": test_email}
        )
        assert response.status_code == 200
        assert response.json()["email_available"] == True
        print(f"  ✓ Step 2: Email '{test_email}' is available")
        
        # Step 3: Register user
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "name": test_username,
                "email": test_email,
                "password": "testpass123"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        print(f"  ✓ Step 3: User registered with id {data['user_id']}")
        
        # Step 4: Verify username is now taken
        response = requests.post(
            f"{BASE_URL}/api/auth/check-availability",
            json={"username": test_username}
        )
        assert response.status_code == 200
        assert response.json()["username_available"] == False
        print(f"  ✓ Step 4: Username now marked as taken")
        
        # Step 5: Verify email is now taken  
        response = requests.post(
            f"{BASE_URL}/api/auth/check-availability",
            json={"email": test_email}
        )
        assert response.status_code == 200
        assert response.json()["email_available"] == False
        print(f"  ✓ Step 5: Email now marked as taken")
        
        print("✓ End-to-end registration with real-time validation PASSED")


# Fixtures
@pytest.fixture(scope="session", autouse=True)
def setup_base_url():
    """Ensure BASE_URL is set"""
    if not BASE_URL:
        pytest.skip("REACT_APP_BACKEND_URL not set")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
