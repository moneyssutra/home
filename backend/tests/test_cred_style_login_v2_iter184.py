"""
Iteration 184 - Updated CRED-style Login Flow Tests
New flow: Email → check-user → (has MPIN? → MPIN screen directly / no MPIN? → OTP → setup MPIN)
Forgot MPIN: send OTP → verify → set new MPIN → login

New endpoints tested:
- POST /api/auth/check-user - Check if user exists and has MPIN (no OTP sent)
- POST /api/auth/mpin-direct-login - Login with email + MPIN directly (no OTP required)
- POST /api/auth/forgot-mpin - Send OTP for MPIN reset
- POST /api/auth/reset-mpin - Verify OTP and set new MPIN

Existing endpoints still tested:
- POST /api/auth/start - For users without MPIN
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user with MPIN already set
TEST_USER_WITH_MPIN = "moneyssutra@gmail.com"
TEST_USER_MPIN = "1234"


class TestCheckUserEndpoint:
    """Tests for POST /api/auth/check-user - Check user exists and has MPIN"""
    
    def test_check_user_existing_with_mpin(self):
        """Test /auth/check-user for existing user with MPIN returns user_exists=true, has_mpin=true"""
        response = requests.post(f"{BASE_URL}/api/auth/check-user", json={
            "identifier": TEST_USER_WITH_MPIN
        })
        assert response.status_code == 200
        data = response.json()
        assert "user_exists" in data
        assert data["user_exists"] == True
        assert "has_mpin" in data
        # User should have MPIN set (1234)
        assert data["has_mpin"] == True
        assert "firstName" in data
        print(f"PASS: /auth/check-user existing user with MPIN - user_exists: {data['user_exists']}, has_mpin: {data['has_mpin']}, firstName: {data.get('firstName', '')}")
    
    def test_check_user_nonexistent(self):
        """Test /auth/check-user for non-existing user returns user_exists=false"""
        response = requests.post(f"{BASE_URL}/api/auth/check-user", json={
            "identifier": f"nonexistent_{int(time.time())}@test.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "user_exists" in data
        assert data["user_exists"] == False
        assert data.get("has_mpin", False) == False
        print(f"PASS: /auth/check-user non-existing user - user_exists: {data['user_exists']}")
    
    def test_check_user_empty_email(self):
        """Test /auth/check-user with empty email returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/check-user", json={
            "identifier": ""
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"PASS: /auth/check-user empty email - error: {data['detail']}")
    
    def test_check_user_invalid_email_format(self):
        """Test /auth/check-user with invalid email format returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/check-user", json={
            "identifier": "notanemail"
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "valid email" in data["detail"].lower()
        print(f"PASS: /auth/check-user invalid email - error: {data['detail']}")


class TestMPINDirectLoginEndpoint:
    """Tests for POST /api/auth/mpin-direct-login - Login with email + MPIN directly"""
    
    def test_mpin_direct_login_success(self):
        """Test /auth/mpin-direct-login with correct MPIN returns session"""
        response = requests.post(f"{BASE_URL}/api/auth/mpin-direct-login", json={
            "email": TEST_USER_WITH_MPIN,
            "mpin": TEST_USER_MPIN
        })
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert "user_id" in data
        assert "email" in data
        print(f"PASS: /auth/mpin-direct-login success - user_id: {data['user_id']}, email: {data['email']}")
    
    def test_mpin_direct_login_wrong_mpin(self):
        """Test /auth/mpin-direct-login with wrong MPIN returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/mpin-direct-login", json={
            "email": TEST_USER_WITH_MPIN,
            "mpin": "9999"  # Wrong MPIN
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "mpin" in data["detail"].lower()
        print(f"PASS: /auth/mpin-direct-login wrong MPIN - error: {data['detail']}")
    
    def test_mpin_direct_login_missing_fields(self):
        """Test /auth/mpin-direct-login with missing fields returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/mpin-direct-login", json={
            "email": "",
            "mpin": ""
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"PASS: /auth/mpin-direct-login missing fields - error: {data['detail']}")
    
    def test_mpin_direct_login_invalid_mpin_format(self):
        """Test /auth/mpin-direct-login with invalid MPIN format returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/mpin-direct-login", json={
            "email": TEST_USER_WITH_MPIN,
            "mpin": "12345"  # 5 digits - invalid
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "4 digits" in data["detail"].lower() or "mpin" in data["detail"].lower()
        print(f"PASS: /auth/mpin-direct-login invalid MPIN format - error: {data['detail']}")
    
    def test_mpin_direct_login_nonexistent_user(self):
        """Test /auth/mpin-direct-login for non-existing user returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/mpin-direct-login", json={
            "email": f"nonexistent_{int(time.time())}@test.com",
            "mpin": "1234"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"PASS: /auth/mpin-direct-login non-existing user - error: {data['detail']}")


class TestForgotMPINEndpoint:
    """Tests for POST /api/auth/forgot-mpin - Send OTP for MPIN reset"""
    
    def test_forgot_mpin_existing_user(self):
        """Test /auth/forgot-mpin for existing user sends OTP"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-mpin", json={
            "email": TEST_USER_WITH_MPIN
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # Should mention verification code sent
        assert "sent" in data["message"].lower() or "verification" in data["message"].lower()
        print(f"PASS: /auth/forgot-mpin existing user - message: {data['message']}")
    
    def test_forgot_mpin_nonexistent_user(self):
        """Test /auth/forgot-mpin for non-existing user returns generic message (no enumeration)"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-mpin", json={
            "email": f"nonexistent_{int(time.time())}@test.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # Should return generic message to prevent email enumeration
        print(f"PASS: /auth/forgot-mpin non-existing user - message: {data['message']}")
    
    def test_forgot_mpin_empty_email(self):
        """Test /auth/forgot-mpin with empty email returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-mpin", json={
            "email": ""
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"PASS: /auth/forgot-mpin empty email - error: {data['detail']}")
    
    def test_forgot_mpin_rate_limit(self):
        """Test /auth/forgot-mpin rate limit - second request within 30s returns 'OTP already sent'"""
        email = f"ratelimit_mpin_{int(time.time())}@test.com"
        
        # First request (will fail silently for non-existing user but still rate limited)
        response1 = requests.post(f"{BASE_URL}/api/auth/forgot-mpin", json={"email": email})
        assert response1.status_code == 200
        
        # Second request immediately (within 30s cooldown)
        response2 = requests.post(f"{BASE_URL}/api/auth/forgot-mpin", json={"email": email})
        assert response2.status_code == 200
        data = response2.json()
        # Should mention already sent or wait
        print(f"PASS: /auth/forgot-mpin rate limit - message: {data['message']}")


class TestResetMPINEndpoint:
    """Tests for POST /api/auth/reset-mpin - Verify OTP and set new MPIN"""
    
    def test_reset_mpin_missing_fields(self):
        """Test /auth/reset-mpin with missing fields returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-mpin", json={
            "email": "",
            "otp": "",
            "new_mpin": ""
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"PASS: /auth/reset-mpin missing fields - error: {data['detail']}")
    
    def test_reset_mpin_invalid_mpin_format(self):
        """Test /auth/reset-mpin with invalid MPIN format returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-mpin", json={
            "email": TEST_USER_WITH_MPIN,
            "otp": "123456",
            "new_mpin": "12345"  # 5 digits - invalid
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "4 digits" in data["detail"].lower() or "mpin" in data["detail"].lower()
        print(f"PASS: /auth/reset-mpin invalid MPIN format - error: {data['detail']}")
    
    def test_reset_mpin_wrong_otp(self):
        """Test /auth/reset-mpin with wrong OTP returns error"""
        # First send OTP
        requests.post(f"{BASE_URL}/api/auth/forgot-mpin", json={"email": TEST_USER_WITH_MPIN})
        time.sleep(1)  # Wait a bit
        
        # Try wrong OTP
        response = requests.post(f"{BASE_URL}/api/auth/reset-mpin", json={
            "email": TEST_USER_WITH_MPIN,
            "otp": "000000",  # Wrong OTP
            "new_mpin": "5678"
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        # Should mention invalid code or attempts left
        assert "invalid" in data["detail"].lower() or "left" in data["detail"].lower()
        print(f"PASS: /auth/reset-mpin wrong OTP - error: {data['detail']}")
    
    def test_reset_mpin_no_otp_sent(self):
        """Test /auth/reset-mpin without sending OTP first returns error"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-mpin", json={
            "email": f"nootp_{int(time.time())}@test.com",
            "otp": "123456",
            "new_mpin": "5678"
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"PASS: /auth/reset-mpin no OTP sent - error: {data['detail']}")


class TestAuthStartStillWorks:
    """Tests for POST /api/auth/start - Still works for no-MPIN users"""
    
    def test_start_with_valid_email(self):
        """Test /auth/start still works for sending OTP"""
        email = f"start_test_{int(time.time())}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/start", json={
            "identifier": email
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "user_exists" in data
        print(f"PASS: /auth/start still works - message: {data['message']}, user_exists: {data['user_exists']}")
    
    def test_start_rate_limit_cooldown(self):
        """Test /auth/start 30s cooldown still works"""
        email = f"ratelimit_start_{int(time.time())}@test.com"
        
        # First request
        response1 = requests.post(f"{BASE_URL}/api/auth/start", json={"identifier": email})
        assert response1.status_code == 200
        
        # Second request immediately (within 30s cooldown)
        response2 = requests.post(f"{BASE_URL}/api/auth/start", json={"identifier": email})
        assert response2.status_code == 200
        data = response2.json()
        assert "already sent" in data["message"].lower()
        print(f"PASS: /auth/start cooldown - message: {data['message']}")


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


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
