"""
Test Signup OTP Email Verification - Iteration 182
Tests the new signup OTP verification flow:
1. POST /api/auth/send-signup-otp - Send OTP to new email
2. POST /api/auth/verify-signup-otp - Verify OTP and get verification token
3. POST /api/auth/register - Now requires emailVerificationToken
Also tests forgot password OTP flow for completeness.
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSignupOTPVerification:
    """Tests for signup email OTP verification endpoints"""
    
    # Generate unique test email for each test run
    test_email = f"test_signup_otp_{uuid.uuid4().hex[:8]}@test.com"
    
    def test_send_signup_otp_new_email_success(self):
        """POST /api/auth/send-signup-otp with new email returns success"""
        response = requests.post(f"{BASE_URL}/api/auth/send-signup-otp", json={
            "email": self.test_email
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "verification" in data["message"].lower() or "sent" in data["message"].lower()
        print(f"PASS: send-signup-otp returns success for new email: {data['message']}")
    
    def test_send_signup_otp_existing_email_returns_400(self):
        """POST /api/auth/send-signup-otp with existing email returns 400 'Email already registered'"""
        # Use the known existing email
        response = requests.post(f"{BASE_URL}/api/auth/send-signup-otp", json={
            "email": "moneyssutra@gmail.com"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        assert "already registered" in data["detail"].lower()
        print(f"PASS: send-signup-otp returns 400 for existing email: {data['detail']}")
    
    def test_send_signup_otp_rate_limit(self):
        """POST /api/auth/send-signup-otp rate limit (1 per 60 seconds)"""
        unique_email = f"test_rate_limit_{uuid.uuid4().hex[:8]}@test.com"
        
        # First request should succeed
        response1 = requests.post(f"{BASE_URL}/api/auth/send-signup-otp", json={
            "email": unique_email
        })
        assert response1.status_code == 200, f"First request failed: {response1.text}"
        
        # Second request immediately should be rate limited
        response2 = requests.post(f"{BASE_URL}/api/auth/send-signup-otp", json={
            "email": unique_email
        })
        assert response2.status_code == 200, f"Expected 200 with rate limit message, got {response2.status_code}"
        data = response2.json()
        assert "already sent" in data["message"].lower() or "wait" in data["message"].lower()
        print(f"PASS: send-signup-otp rate limit works: {data['message']}")
    
    def test_verify_signup_otp_wrong_otp_returns_error(self):
        """POST /api/auth/verify-signup-otp with wrong OTP returns error with attempts remaining"""
        unique_email = f"test_wrong_otp_{uuid.uuid4().hex[:8]}@test.com"
        
        # First send OTP
        send_response = requests.post(f"{BASE_URL}/api/auth/send-signup-otp", json={
            "email": unique_email
        })
        assert send_response.status_code == 200, f"Failed to send OTP: {send_response.text}"
        
        # Try to verify with wrong OTP
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify-signup-otp", json={
            "email": unique_email,
            "otp": "000000"  # Wrong OTP
        })
        assert verify_response.status_code == 400, f"Expected 400, got {verify_response.status_code}: {verify_response.text}"
        data = verify_response.json()
        assert "detail" in data
        # Should mention invalid OTP or attempts remaining
        assert "invalid" in data["detail"].lower() or "attempt" in data["detail"].lower()
        print(f"PASS: verify-signup-otp returns error for wrong OTP: {data['detail']}")
    
    def test_verify_signup_otp_empty_fields_returns_400(self):
        """POST /api/auth/verify-signup-otp with empty fields returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/verify-signup-otp", json={
            "email": "",
            "otp": ""
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"PASS: verify-signup-otp returns 400 for empty fields")


class TestForgotPasswordOTP:
    """Tests for forgot password OTP endpoints (from iteration 181)"""
    
    def test_send_otp_forgot_password_success(self):
        """POST /api/auth/send-otp (forgot password OTP) returns success"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "email": "test@moneysutra.com"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"PASS: send-otp (forgot password) returns success: {data['message']}")
    
    def test_verify_otp_wrong_otp_returns_error(self):
        """POST /api/auth/verify-otp with wrong OTP returns error"""
        # First send OTP
        send_response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "email": "test@moneysutra.com"
        })
        # Note: May be rate limited, but we still test verify
        
        # Try to verify with wrong OTP
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "email": "test@moneysutra.com",
            "otp": "000000"  # Wrong OTP
        })
        assert verify_response.status_code == 400, f"Expected 400, got {verify_response.status_code}: {verify_response.text}"
        data = verify_response.json()
        assert "detail" in data
        print(f"PASS: verify-otp returns error for wrong OTP: {data['detail']}")
    
    def test_reset_password_otp_wrong_otp_returns_error(self):
        """POST /api/auth/reset-password-otp with wrong OTP returns error"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password-otp", json={
            "email": "test@moneysutra.com",
            "otp": "000000",
            "new_password": "NewPassword123!"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        print(f"PASS: reset-password-otp returns error for wrong OTP: {data['detail']}")


class TestRegisterWithEmailVerification:
    """Tests for registration requiring email verification token"""
    
    def test_register_without_email_verification_token_returns_400(self):
        """POST /api/auth/register without emailVerificationToken returns 400"""
        unique_email = f"test_no_token_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Test",
            "lastName": "User",
            "email": unique_email,
            "sex": "male",
            "dateOfBirth": "1990-01-01",
            "password": "Test@123"
            # Note: No emailVerificationToken
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        assert "verification" in data["detail"].lower() or "verify" in data["detail"].lower()
        print(f"PASS: register without emailVerificationToken returns 400: {data['detail']}")
    
    def test_register_with_invalid_verification_token_returns_400(self):
        """POST /api/auth/register with invalid emailVerificationToken returns 400"""
        unique_email = f"test_invalid_token_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Test",
            "lastName": "User",
            "email": unique_email,
            "sex": "male",
            "dateOfBirth": "1990-01-01",
            "password": "Test@123",
            "emailVerificationToken": "invalid_token_12345"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        print(f"PASS: register with invalid token returns 400: {data['detail']}")


class TestEmailAvailabilityCheck:
    """Tests for email availability check endpoint"""
    
    def test_check_availability_new_email(self):
        """POST /api/auth/check-availability with new email returns available"""
        unique_email = f"test_avail_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/check-availability", json={
            "email": unique_email
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("email_available") == True
        print(f"PASS: check-availability returns available for new email")
    
    def test_check_availability_existing_email(self):
        """POST /api/auth/check-availability with existing email returns not available"""
        response = requests.post(f"{BASE_URL}/api/auth/check-availability", json={
            "email": "moneyssutra@gmail.com"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("email_available") == False
        print(f"PASS: check-availability returns not available for existing email")


class TestLoginStillWorks:
    """Verify existing login functionality still works"""
    
    def test_login_with_valid_credentials(self):
        """POST /api/auth/login with valid credentials returns success"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test@moneysutra.com",
            "password": "Test@123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "session_token" in data
        assert "user_id" in data
        print(f"PASS: login with valid credentials works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
