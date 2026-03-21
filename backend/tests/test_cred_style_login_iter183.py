"""
Iteration 183 - CRED-style Step-based Login Flow Tests
Tests for: /auth/start, /auth/verify-login-otp, /auth/mpin-login, /auth/mpin-setup-login
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthStartEndpoint:
    """Tests for POST /api/auth/start - Step 1: Enter email, send OTP"""
    
    def test_start_with_valid_email_existing_user(self):
        """Test /auth/start with valid email for existing user"""
        response = requests.post(f"{BASE_URL}/api/auth/start", json={
            "identifier": "moneyssutra@gmail.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "user_exists" in data
        # moneyssutra@gmail.com is an existing Google auth user
        assert data["user_exists"] == True
        print(f"PASS: /auth/start with existing user - message: {data['message']}, user_exists: {data['user_exists']}")
    
    def test_start_with_valid_email_new_user(self):
        """Test /auth/start with valid email for non-existing user"""
        response = requests.post(f"{BASE_URL}/api/auth/start", json={
            "identifier": f"newuser_{int(time.time())}@test.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "user_exists" in data
        assert data["user_exists"] == False
        print(f"PASS: /auth/start with new user - message: {data['message']}, user_exists: {data['user_exists']}")
    
    def test_start_with_empty_email(self):
        """Test /auth/start with empty email returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/start", json={
            "identifier": ""
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "required" in data["detail"].lower() or "email" in data["detail"].lower()
        print(f"PASS: /auth/start with empty email - error: {data['detail']}")
    
    def test_start_with_invalid_email_format(self):
        """Test /auth/start with invalid email format returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/start", json={
            "identifier": "notanemail"
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "valid email" in data["detail"].lower()
        print(f"PASS: /auth/start with invalid email - error: {data['detail']}")
    
    def test_start_rate_limit_cooldown(self):
        """Test /auth/start 30s cooldown - second request within 30s returns 'OTP already sent'"""
        email = f"ratelimit_{int(time.time())}@test.com"
        
        # First request
        response1 = requests.post(f"{BASE_URL}/api/auth/start", json={"identifier": email})
        assert response1.status_code == 200
        
        # Second request immediately (within 30s cooldown)
        response2 = requests.post(f"{BASE_URL}/api/auth/start", json={"identifier": email})
        assert response2.status_code == 200
        data = response2.json()
        assert "already sent" in data["message"].lower()
        print(f"PASS: /auth/start cooldown - message: {data['message']}")


class TestVerifyLoginOTPEndpoint:
    """Tests for POST /api/auth/verify-login-otp - Step 2: Verify OTP"""
    
    def test_verify_otp_missing_fields(self):
        """Test /auth/verify-login-otp with missing fields returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/verify-login-otp", json={
            "identifier": "",
            "otp": ""
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"PASS: /auth/verify-login-otp missing fields - error: {data['detail']}")
    
    def test_verify_otp_wrong_code(self):
        """Test /auth/verify-login-otp with wrong OTP returns error with attempts left"""
        # First send OTP
        email = f"wrongotp_{int(time.time())}@test.com"
        requests.post(f"{BASE_URL}/api/auth/start", json={"identifier": email})
        
        # Try wrong OTP
        response = requests.post(f"{BASE_URL}/api/auth/verify-login-otp", json={
            "identifier": email,
            "otp": "000000"
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        # Should mention attempts left or invalid code
        assert "invalid" in data["detail"].lower() or "left" in data["detail"].lower() or "try again" in data["detail"].lower()
        print(f"PASS: /auth/verify-login-otp wrong OTP - error: {data['detail']}")
    
    def test_verify_otp_no_otp_sent(self):
        """Test /auth/verify-login-otp without sending OTP first returns error"""
        response = requests.post(f"{BASE_URL}/api/auth/verify-login-otp", json={
            "identifier": f"nootp_{int(time.time())}@test.com",
            "otp": "123456"
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()
        print(f"PASS: /auth/verify-login-otp no OTP sent - error: {data['detail']}")


class TestMPINLoginEndpoint:
    """Tests for POST /api/auth/mpin-login - Step 3: Login with MPIN"""
    
    def test_mpin_login_missing_fields(self):
        """Test /auth/mpin-login with missing fields returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/mpin-login", json={
            "temp_token": "",
            "mpin": ""
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"PASS: /auth/mpin-login missing fields - error: {data['detail']}")
    
    def test_mpin_login_invalid_token(self):
        """Test /auth/mpin-login with invalid temp_token returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/mpin-login", json={
            "temp_token": "invalid_token_12345",
            "mpin": "1234"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "token" in data["detail"].lower()
        print(f"PASS: /auth/mpin-login invalid token - error: {data['detail']}")


class TestMPINSetupLoginEndpoint:
    """Tests for POST /api/auth/mpin-setup-login - Step 3 (first time): Set MPIN + Login"""
    
    def test_mpin_setup_missing_fields(self):
        """Test /auth/mpin-setup-login with missing fields returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/mpin-setup-login", json={
            "temp_token": "",
            "mpin": ""
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"PASS: /auth/mpin-setup-login missing fields - error: {data['detail']}")
    
    def test_mpin_setup_invalid_mpin_format(self):
        """Test /auth/mpin-setup-login with invalid MPIN format returns 400"""
        # MPIN must be exactly 4 digits
        response = requests.post(f"{BASE_URL}/api/auth/mpin-setup-login", json={
            "temp_token": "some_token",
            "mpin": "12345"  # 5 digits - invalid
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "4 digits" in data["detail"].lower() or "mpin" in data["detail"].lower()
        print(f"PASS: /auth/mpin-setup-login invalid MPIN format - error: {data['detail']}")
    
    def test_mpin_setup_invalid_token(self):
        """Test /auth/mpin-setup-login with invalid temp_token returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/mpin-setup-login", json={
            "temp_token": "invalid_token_12345",
            "mpin": "1234"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"PASS: /auth/mpin-setup-login invalid token - error: {data['detail']}")


class TestExistingPasswordLogin:
    """Tests for POST /api/auth/login - Existing password login still works"""
    
    def test_password_login_invalid_credentials(self):
        """Test /auth/login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "nonexistent@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"PASS: /auth/login invalid credentials - error: {data['detail']}")
    
    def test_password_login_google_user_no_password(self):
        """Test /auth/login for Google user without password returns appropriate error"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "moneyssutra@gmail.com",
            "password": "anypassword"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        # Should mention Google login or no password set
        assert "google" in data["detail"].lower() or "password" in data["detail"].lower()
        print(f"PASS: /auth/login Google user - error: {data['detail']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
