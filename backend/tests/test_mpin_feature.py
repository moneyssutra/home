"""
MPIN Feature Tests - Backend API Testing
Tests for MPIN (4-digit PIN) authentication feature:
- POST /api/mpin/set (set MPIN for authenticated user)
- GET /api/mpin/status (check if user has MPIN)
- POST /api/mpin/verify (verify MPIN for authenticated user)
- POST /api/mpin/login (login with email + MPIN)
- DELETE /api/mpin/remove (remove MPIN)
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user for MPIN testing
TEST_EMAIL = f"test_mpin_{uuid.uuid4().hex[:8]}@example.com"
TEST_PASSWORD = "TestMpin123!"
TEST_MPIN = "1234"
TEST_MPIN_ALT = "5678"


class TestMPINFeature:
    """Complete MPIN feature testing"""
    
    session = None
    session_token = None
    
    @classmethod
    def setup_class(cls):
        """Register a test user before running tests"""
        cls.session = requests.Session()
        cls.session.headers.update({"Content-Type": "application/json"})
        
        # Register test user - sex must be "Male" or "Female"
        reg_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "fullName": "MPIN Test User",
            "firstName": "MPIN",
            "lastName": "Test",
            "sex": "Male",
            "dateOfBirth": "1990-01-01"
        }
        response = cls.session.post(f"{BASE_URL}/api/auth/register", json=reg_data)
        print(f"Registration response: {response.status_code} - {response.text[:200]}")
        if response.status_code in [200, 201]:
            data = response.json()
            cls.session_token = data.get('session_token')
            # Set cookie for subsequent requests
            if cls.session_token:
                cls.session.cookies.set('session_token', cls.session_token)
            print(f"User registered successfully: {TEST_EMAIL}")
        else:
            # Try login if user exists
            login_resp = cls.session.post(f"{BASE_URL}/api/auth/login", json={
                "username": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            if login_resp.status_code == 200:
                data = login_resp.json()
                cls.session_token = data.get('session_token')
                if cls.session_token:
                    cls.session.cookies.set('session_token', cls.session_token)
                print(f"User already existed, logged in: {TEST_EMAIL}")
    
    @classmethod
    def teardown_class(cls):
        """Cleanup - remove MPIN if set"""
        try:
            cls.session.delete(f"{BASE_URL}/api/mpin/remove")
        except:
            pass
    
    # ============ MPIN STATUS TESTS ============
    
    def test_01_mpin_status_initial(self):
        """Test MPIN status before setting - should be False"""
        response = self.session.get(f"{BASE_URL}/api/mpin/status")
        print(f"MPIN status (initial): {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "has_mpin" in data, "Response should contain 'has_mpin' field"
        # Initially user should not have MPIN
        assert data["has_mpin"] == False, "New user should not have MPIN set"
    
    def test_02_mpin_status_requires_auth(self):
        """Test MPIN status without auth returns 401"""
        unauthenticated = requests.Session()
        unauthenticated.headers.update({"Content-Type": "application/json"})
        response = unauthenticated.get(f"{BASE_URL}/api/mpin/status")
        print(f"MPIN status (no auth): {response.status_code}")
        assert response.status_code == 401, "Should return 401 without auth"
    
    # ============ SET MPIN TESTS ============
    
    def test_03_set_mpin_validation_empty(self):
        """Test setting empty MPIN fails with 400"""
        response = self.session.post(f"{BASE_URL}/api/mpin/set", json={"mpin": ""})
        print(f"Set MPIN (empty): {response.status_code} - {response.text}")
        assert response.status_code == 400, "Empty MPIN should return 400"
    
    def test_04_set_mpin_validation_too_short(self):
        """Test setting MPIN less than 4 digits fails"""
        response = self.session.post(f"{BASE_URL}/api/mpin/set", json={"mpin": "123"})
        print(f"Set MPIN (3 digits): {response.status_code} - {response.text}")
        assert response.status_code == 400, "3-digit MPIN should return 400"
    
    def test_05_set_mpin_validation_too_long(self):
        """Test setting MPIN more than 4 digits fails"""
        response = self.session.post(f"{BASE_URL}/api/mpin/set", json={"mpin": "12345"})
        print(f"Set MPIN (5 digits): {response.status_code} - {response.text}")
        assert response.status_code == 400, "5-digit MPIN should return 400"
    
    def test_06_set_mpin_validation_non_numeric(self):
        """Test setting non-numeric MPIN fails"""
        response = self.session.post(f"{BASE_URL}/api/mpin/set", json={"mpin": "abcd"})
        print(f"Set MPIN (letters): {response.status_code} - {response.text}")
        assert response.status_code == 400, "Non-numeric MPIN should return 400"
    
    def test_07_set_mpin_success(self):
        """Test setting valid 4-digit MPIN succeeds"""
        response = self.session.post(f"{BASE_URL}/api/mpin/set", json={"mpin": TEST_MPIN})
        print(f"Set MPIN (valid): {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "message" in data, "Response should have message"
    
    def test_08_mpin_status_after_set(self):
        """Test MPIN status after setting - should be True"""
        response = self.session.get(f"{BASE_URL}/api/mpin/status")
        print(f"MPIN status (after set): {response.status_code} - {response.text}")
        assert response.status_code == 200
        data = response.json()
        assert data["has_mpin"] == True, "User should have MPIN after setting"
    
    def test_09_set_mpin_requires_auth(self):
        """Test setting MPIN without auth returns 401"""
        unauthenticated = requests.Session()
        unauthenticated.headers.update({"Content-Type": "application/json"})
        response = unauthenticated.post(f"{BASE_URL}/api/mpin/set", json={"mpin": "0000"})
        print(f"Set MPIN (no auth): {response.status_code}")
        assert response.status_code == 401, "Should return 401 without auth"
    
    # ============ VERIFY MPIN TESTS ============
    
    def test_10_verify_mpin_success(self):
        """Test verifying correct MPIN succeeds"""
        response = self.session.post(f"{BASE_URL}/api/mpin/verify", json={"mpin": TEST_MPIN})
        print(f"Verify MPIN (correct): {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("verified") == True
    
    def test_11_verify_mpin_wrong(self):
        """Test verifying wrong MPIN returns 401"""
        response = self.session.post(f"{BASE_URL}/api/mpin/verify", json={"mpin": "9999"})
        print(f"Verify MPIN (wrong): {response.status_code} - {response.text}")
        assert response.status_code == 401, "Wrong MPIN should return 401"
    
    def test_12_verify_mpin_requires_auth(self):
        """Test verifying MPIN without auth returns 401"""
        unauthenticated = requests.Session()
        unauthenticated.headers.update({"Content-Type": "application/json"})
        response = unauthenticated.post(f"{BASE_URL}/api/mpin/verify", json={"mpin": TEST_MPIN})
        print(f"Verify MPIN (no auth): {response.status_code}")
        assert response.status_code == 401, "Should return 401 without auth"
    
    # ============ LOGIN WITH MPIN TESTS ============
    
    def test_13_mpin_login_success(self):
        """Test MPIN login with correct email and MPIN"""
        # Use new session without cookies to simulate fresh login
        fresh_session = requests.Session()
        fresh_session.headers.update({"Content-Type": "application/json"})
        
        response = fresh_session.post(f"{BASE_URL}/api/mpin/login", json={
            "email": TEST_EMAIL,
            "mpin": TEST_MPIN
        })
        print(f"MPIN login (correct): {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "user_id" in data, "Response should contain user_id"
        assert "email" in data, "Response should contain email"
        assert data["email"] == TEST_EMAIL, "Email should match"
        # Session cookie should be set
        assert "session_token" in response.cookies or "session_token" in data
    
    def test_14_mpin_login_wrong_mpin(self):
        """Test MPIN login with wrong MPIN returns 401"""
        fresh_session = requests.Session()
        fresh_session.headers.update({"Content-Type": "application/json"})
        
        response = fresh_session.post(f"{BASE_URL}/api/mpin/login", json={
            "email": TEST_EMAIL,
            "mpin": "0000"
        })
        print(f"MPIN login (wrong MPIN): {response.status_code} - {response.text}")
        assert response.status_code == 401, "Wrong MPIN should return 401"
    
    def test_15_mpin_login_wrong_email(self):
        """Test MPIN login with non-existent email returns 401"""
        fresh_session = requests.Session()
        fresh_session.headers.update({"Content-Type": "application/json"})
        
        response = fresh_session.post(f"{BASE_URL}/api/mpin/login", json={
            "email": "nonexistent_user_xyz@example.com",
            "mpin": TEST_MPIN
        })
        print(f"MPIN login (wrong email): {response.status_code} - {response.text}")
        assert response.status_code == 401, "Wrong email should return 401"
    
    def test_16_mpin_login_missing_email(self):
        """Test MPIN login without email returns 400"""
        fresh_session = requests.Session()
        fresh_session.headers.update({"Content-Type": "application/json"})
        
        response = fresh_session.post(f"{BASE_URL}/api/mpin/login", json={
            "mpin": TEST_MPIN
        })
        print(f"MPIN login (no email): {response.status_code} - {response.text}")
        assert response.status_code == 400, "Missing email should return 400"
    
    def test_17_mpin_login_missing_mpin(self):
        """Test MPIN login without MPIN returns 400"""
        fresh_session = requests.Session()
        fresh_session.headers.update({"Content-Type": "application/json"})
        
        response = fresh_session.post(f"{BASE_URL}/api/mpin/login", json={
            "email": TEST_EMAIL
        })
        print(f"MPIN login (no MPIN): {response.status_code} - {response.text}")
        assert response.status_code == 400, "Missing MPIN should return 400"
    
    def test_18_mpin_login_no_auth_required(self):
        """Test MPIN login doesn't require prior authentication"""
        # This endpoint should work without being logged in
        fresh_session = requests.Session()
        fresh_session.headers.update({"Content-Type": "application/json"})
        
        response = fresh_session.post(f"{BASE_URL}/api/mpin/login", json={
            "email": TEST_EMAIL,
            "mpin": TEST_MPIN
        })
        print(f"MPIN login (no prior auth): {response.status_code}")
        assert response.status_code == 200, "MPIN login should work without prior auth"
    
    # ============ UPDATE MPIN TESTS ============
    
    def test_19_update_mpin(self):
        """Test updating MPIN to new value"""
        response = self.session.post(f"{BASE_URL}/api/mpin/set", json={"mpin": TEST_MPIN_ALT})
        print(f"Update MPIN: {response.status_code} - {response.text}")
        assert response.status_code == 200, "Updating MPIN should succeed"
        
        # Verify new MPIN works
        verify_resp = self.session.post(f"{BASE_URL}/api/mpin/verify", json={"mpin": TEST_MPIN_ALT})
        assert verify_resp.status_code == 200, "New MPIN should verify"
        
        # Verify old MPIN no longer works
        verify_old = self.session.post(f"{BASE_URL}/api/mpin/verify", json={"mpin": TEST_MPIN})
        assert verify_old.status_code == 401, "Old MPIN should not verify"
    
    # ============ REMOVE MPIN TESTS ============
    
    def test_20_remove_mpin_success(self):
        """Test removing MPIN"""
        response = self.session.delete(f"{BASE_URL}/api/mpin/remove")
        print(f"Remove MPIN: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") == True
    
    def test_21_mpin_status_after_remove(self):
        """Test MPIN status after removing - should be False"""
        response = self.session.get(f"{BASE_URL}/api/mpin/status")
        print(f"MPIN status (after remove): {response.status_code} - {response.text}")
        assert response.status_code == 200
        data = response.json()
        assert data["has_mpin"] == False, "User should not have MPIN after removal"
    
    def test_22_mpin_login_after_remove_fails(self):
        """Test MPIN login fails after MPIN is removed"""
        fresh_session = requests.Session()
        fresh_session.headers.update({"Content-Type": "application/json"})
        
        response = fresh_session.post(f"{BASE_URL}/api/mpin/login", json={
            "email": TEST_EMAIL,
            "mpin": TEST_MPIN_ALT
        })
        print(f"MPIN login (after remove): {response.status_code}")
        assert response.status_code == 401, "MPIN login should fail after removal"
    
    def test_23_verify_mpin_no_mpin_set(self):
        """Test verify MPIN when no MPIN is set returns 400"""
        response = self.session.post(f"{BASE_URL}/api/mpin/verify", json={"mpin": "1234"})
        print(f"Verify MPIN (none set): {response.status_code} - {response.text}")
        assert response.status_code == 400, "Verify should return 400 when no MPIN set"
    
    def test_24_remove_mpin_requires_auth(self):
        """Test removing MPIN without auth returns 401"""
        unauthenticated = requests.Session()
        unauthenticated.headers.update({"Content-Type": "application/json"})
        response = unauthenticated.delete(f"{BASE_URL}/api/mpin/remove")
        print(f"Remove MPIN (no auth): {response.status_code}")
        assert response.status_code == 401, "Should return 401 without auth"


# Run tests in order
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
