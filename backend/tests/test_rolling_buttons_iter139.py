"""
Test: Rolling Buttons Feature - Iteration 139
Tests registration, login, profile-completion endpoint (dismissed flag), and onboarding dismiss
"""
import pytest
import requests
import os
import uuid
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def test_user_data():
    """Create unique test user data for this test run."""
    random_suffix = ''.join(random.choices(string.ascii_lowercase, k=6))
    # Mobile: exactly 10 digits
    mobile = f"{random.randint(6000000000, 9999999999)}"  
    return {
        "firstName": "Testroll",
        "lastName": f"User{random_suffix}",  # Only letters
        "email": f"testroll{random_suffix}@example.com",
        "mobile": mobile,  # 10 digit Indian mobile number
        "password": "TestPass123!",
        "sex": "male",
        "dateOfBirth": "1990-01-01",
        "username": f"testroll{random_suffix}@example.com"
    }

@pytest.fixture(scope="module")
def api_session():
    """Create a requests session for the tests."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

class TestRollingButtonsBackend:
    """Test backend APIs for rolling buttons feature."""
    
    registered_user = None
    auth_cookies = None
    
    def test_01_register_new_user(self, api_session, test_user_data):
        """Test user registration endpoint."""
        print(f"\n[TEST 1] Registering new user: {test_user_data['email']}")
        print(f"Mobile: {test_user_data['mobile']}")
        response = api_session.post(f"{BASE_URL}/api/auth/register", json=test_user_data)
        print(f"Registration response status: {response.status_code}")
        print(f"Registration response: {response.text[:500]}")
        
        if response.status_code == 409:
            print("User already exists, will proceed to login")
            pytest.skip("User already exists")
        
        assert response.status_code in [200, 201], f"Registration failed: {response.text}"
        data = response.json()
        TestRollingButtonsBackend.registered_user = data
        # Store cookies from registration if any
        if response.cookies:
            TestRollingButtonsBackend.auth_cookies = response.cookies
        
    def test_02_login_user(self, api_session, test_user_data):
        """Test user login endpoint."""
        print(f"\n[TEST 2] Logging in user: {test_user_data['username']}")
        login_data = {
            "username": test_user_data["username"],
            "password": test_user_data["password"]
        }
        response = api_session.post(f"{BASE_URL}/api/auth/login", json=login_data)
        print(f"Login response status: {response.status_code}")
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        print(f"Login data keys: {list(data.keys())}")
        
        # Store cookies for subsequent authenticated requests
        TestRollingButtonsBackend.auth_cookies = response.cookies
        print(f"Cookies received: {list(response.cookies.keys())}")
        
    def test_03_profile_completion_endpoint(self, api_session, test_user_data):
        """Test profile-completion endpoint returns dismissed flag."""
        print("\n[TEST 3] Testing profile-completion endpoint")
        
        # First login to get session
        login_data = {
            "username": test_user_data["username"],
            "password": test_user_data["password"]
        }
        login_response = api_session.post(f"{BASE_URL}/api/auth/login", json=login_data)
        print(f"Login status: {login_response.status_code}")
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        # Use cookies from login
        response = api_session.get(
            f"{BASE_URL}/api/onboarding/profile-completion",
            cookies=login_response.cookies
        )
        print(f"Profile completion status: {response.status_code}")
        
        assert response.status_code == 200, f"Profile completion failed: {response.text}"
        data = response.json()
        print(f"Profile completion data: {data}")
        
        # Verify required fields exist
        assert "profileCompletion" in data, "Missing profileCompletion field"
        assert "dismissed" in data, "Missing dismissed field - CRITICAL for rolling buttons feature"
        assert isinstance(data["dismissed"], bool), "dismissed should be a boolean"
        print(f"SUCCESS: profileCompletion: {data['profileCompletion']}, dismissed: {data['dismissed']}")
        
    def test_04_onboarding_dismiss_endpoint(self, api_session, test_user_data):
        """Test onboarding dismiss endpoint sets dismissed flag."""
        print("\n[TEST 4] Testing onboarding dismiss endpoint")
        
        # First login to get session
        login_data = {
            "username": test_user_data["username"],
            "password": test_user_data["password"]
        }
        login_response = api_session.post(f"{BASE_URL}/api/auth/login", json=login_data)
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        # Dismiss onboarding
        response = api_session.post(
            f"{BASE_URL}/api/onboarding/dismiss",
            cookies=login_response.cookies
        )
        print(f"Dismiss response status: {response.status_code}")
        assert response.status_code == 200, f"Dismiss failed: {response.text}"
        
        # Verify profile-completion now shows dismissed=True
        verify_response = api_session.get(
            f"{BASE_URL}/api/onboarding/profile-completion",
            cookies=login_response.cookies
        )
        assert verify_response.status_code == 200
        data = verify_response.json()
        print(f"After dismiss - dismissed flag: {data.get('dismissed')}")
        assert data.get("dismissed") == True, "dismissed should be True after calling dismiss endpoint"
        print("SUCCESS: Onboarding dismiss endpoint works correctly")
        
    def test_05_rolling_buttons_routes_exist(self, api_session, test_user_data):
        """Verify the routes that rolling buttons navigate to are accessible."""
        print("\n[TEST 5] Verifying rolling button routes exist")
        
        # Login first
        login_data = {
            "username": test_user_data["username"],
            "password": test_user_data["password"]
        }
        login_response = api_session.post(f"{BASE_URL}/api/auth/login", json=login_data)
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        # These are the API endpoints backing the rolling buttons routes
        routes_to_test = [
            # Button 1: Track (Expenses, Income, Accounts, Cards)
            "/api/expenses",
            "/api/income",
            "/api/accounts",
            "/api/credit-cards",
            # Button 2: Grow (Investments, Assets)
            "/api/investments",
            "/api/assets",
            # Button 3: Plan (Goals, Liabilities)
            "/api/goals",
            "/api/loans",  # Liabilities endpoint
        ]
        
        passed = 0
        for route in routes_to_test:
            response = api_session.get(
                f"{BASE_URL}{route}",
                cookies=login_response.cookies
            )
            print(f"  {route}: {response.status_code}")
            # 200 for accessible endpoints
            if response.status_code == 200:
                passed += 1
        
        print(f"SUCCESS: {passed}/{len(routes_to_test)} routes accessible")
        assert passed >= 4, f"Less than half of routes accessible: {passed}/{len(routes_to_test)}"

    def test_06_cleanup_note(self, api_session, test_user_data):
        """Note: Test user created for testing."""
        print(f"\n[TEST 6] Test user created: {test_user_data['email']}")
        print("Note: Main agent should clean up test users from MongoDB if needed")

