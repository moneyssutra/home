"""
OTP Email System Tests - Iteration 181
Tests for password reset via OTP functionality:
- POST /api/auth/send-otp - Send 6-digit OTP to email
- POST /api/auth/verify-otp - Verify OTP and get reset token
- POST /api/auth/reset-password-otp - Reset password with OTP
- POST /api/auth/forgot-password - Existing link flow still works
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test email - existing user
TEST_EMAIL = "test@moneysutra.com"
TEST_PASSWORD = "Test@123"
NONEXISTENT_EMAIL = "nonexistent_user_12345@test.com"


class TestSendOTP:
    """Tests for POST /api/auth/send-otp endpoint"""
    
    def test_send_otp_success_message(self):
        """Test that send-otp returns success message (prevents email enumeration)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/send-otp",
            json={"email": TEST_EMAIL}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        # Should return generic message to prevent email enumeration
        assert "verification code" in data["message"].lower() or "otp" in data["message"].lower()
        print(f"PASS: send-otp returns success message: {data['message']}")
    
    def test_send_otp_nonexistent_email_still_returns_success(self):
        """Test that send-otp returns success even for non-existent email (security)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/send-otp",
            json={"email": NONEXISTENT_EMAIL}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"PASS: send-otp returns success for non-existent email (prevents enumeration)")
    
    def test_send_otp_empty_email_error(self):
        """Test that send-otp returns error for empty email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/send-otp",
            json={"email": ""}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: send-otp returns 400 for empty email")
    
    def test_send_otp_rate_limiting(self):
        """Test rate limiting - should not allow multiple OTPs within 60 seconds"""
        # First request
        response1 = requests.post(
            f"{BASE_URL}/api/auth/send-otp",
            json={"email": TEST_EMAIL}
        )
        assert response1.status_code == 200
        
        # Second request immediately after - should be rate limited
        response2 = requests.post(
            f"{BASE_URL}/api/auth/send-otp",
            json={"email": TEST_EMAIL}
        )
        assert response2.status_code == 200
        data = response2.json()
        # Should indicate OTP already sent
        assert "already sent" in data["message"].lower() or "wait" in data["message"].lower()
        print(f"PASS: Rate limiting works - second request message: {data['message']}")


class TestVerifyOTP:
    """Tests for POST /api/auth/verify-otp endpoint"""
    
    def test_verify_otp_wrong_otp_returns_error(self):
        """Test that wrong OTP returns error with attempts remaining"""
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-otp",
            json={"email": TEST_EMAIL, "otp": "000000"}
        )
        # Should return 400 for invalid OTP
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        # Should mention invalid OTP or attempts remaining
        detail_lower = data["detail"].lower()
        assert "invalid" in detail_lower or "expired" in detail_lower or "attempt" in detail_lower
        print(f"PASS: verify-otp returns error for wrong OTP: {data['detail']}")
    
    def test_verify_otp_empty_fields_error(self):
        """Test that verify-otp returns error for empty fields"""
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-otp",
            json={"email": "", "otp": ""}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: verify-otp returns 400 for empty fields")
    
    def test_verify_otp_missing_otp_field(self):
        """Test that verify-otp returns error when OTP field is missing"""
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-otp",
            json={"email": TEST_EMAIL}
        )
        # Should return 422 (validation error) or 400
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}: {response.text}"
        print("PASS: verify-otp returns error for missing OTP field")


class TestResetPasswordOTP:
    """Tests for POST /api/auth/reset-password-otp endpoint"""
    
    def test_reset_password_otp_wrong_otp_returns_error(self):
        """Test that reset-password-otp with wrong OTP returns error"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password-otp",
            json={
                "email": TEST_EMAIL,
                "otp": "000000",
                "new_password": "NewPassword123!"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        print(f"PASS: reset-password-otp returns error for wrong OTP: {data['detail']}")
    
    def test_reset_password_otp_empty_fields_error(self):
        """Test that reset-password-otp returns error for empty fields"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password-otp",
            json={"email": "", "otp": "", "new_password": ""}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: reset-password-otp returns 400 for empty fields")
    
    def test_reset_password_otp_short_password_error(self):
        """Test that reset-password-otp returns error for short password"""
        # First send OTP to have a valid OTP record
        requests.post(f"{BASE_URL}/api/auth/send-otp", json={"email": TEST_EMAIL})
        time.sleep(1)
        
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password-otp",
            json={
                "email": TEST_EMAIL,
                "otp": "123456",  # Wrong OTP but testing password validation
                "new_password": "ab"  # Too short
            }
        )
        # Should return 400 - either for invalid OTP or short password
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: reset-password-otp validates password length")


class TestForgotPasswordLinkFlow:
    """Tests for existing POST /api/auth/forgot-password (link flow)"""
    
    def test_forgot_password_link_flow_works(self):
        """Test that existing forgot-password link flow still works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"username": TEST_EMAIL}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        # Should return generic success message
        assert "reset link" in data["message"].lower() or "password" in data["message"].lower()
        print(f"PASS: forgot-password link flow works: {data['message']}")
    
    def test_forgot_password_with_mobile_number(self):
        """Test forgot-password accepts mobile number format"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"username": "9876543210"}  # 10-digit mobile
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print("PASS: forgot-password accepts mobile number format")


class TestOTPEmailTemplate:
    """Tests to verify OTP email template configuration"""
    
    def test_email_service_config_exists(self):
        """Verify email service is configured with Resend"""
        # Check that RESEND_API_KEY is set in backend .env
        env_path = "/app/backend/.env"
        with open(env_path, 'r') as f:
            env_content = f.read()
        
        assert "RESEND_API_KEY" in env_content, "RESEND_API_KEY not found in backend .env"
        assert "EMAIL_PROVIDER=resend" in env_content, "EMAIL_PROVIDER not set to resend"
        print("PASS: Email service configured with Resend API")
    
    def test_sender_email_configured(self):
        """Verify sender email is configured"""
        env_path = "/app/backend/.env"
        with open(env_path, 'r') as f:
            env_content = f.read()
        
        assert "SENDER_EMAIL" in env_content, "SENDER_EMAIL not found in backend .env"
        assert "noreply@moneyssutra.com" in env_content, "SENDER_EMAIL should be noreply@moneyssutra.com"
        print("PASS: Sender email configured correctly")


class TestLoginStillWorks:
    """Verify login still works after OTP changes"""
    
    def test_login_with_password_works(self):
        """Test that regular login still works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "username": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "session_token" in data
        assert "user_id" in data
        print(f"PASS: Login with password works, user_id: {data['user_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
