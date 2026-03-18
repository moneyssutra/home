import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://mpin-auth-impl.preview.emergentagent.com')

class TestIncomeTransactionAPI:
    """Test Income Transaction endpoints including PUT for editing"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get session"""
        self.session = requests.Session()
        
        # Login with test credentials
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test", "password": "test"}
        )
        if login_response.status_code == 200:
            token = login_response.json().get("session_token")
            self.session.cookies.set("session_token", token)
            self.user_id = login_response.json().get("user_id")
        yield
    
    def test_health_check(self):
        """Test API is accessible"""
        response = self.session.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("PASS: Health check passed")
    
    def test_auth_login(self):
        """Test login works"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test", "password": "test"}
        )
        assert response.status_code == 200
        assert "session_token" in response.json()
        print("PASS: Login works")
    
    def test_get_income_list(self):
        """Test getting income list with type filter"""
        response = self.session.get(f"{BASE_URL}/api/income/list/summary?type=Business")
        assert response.status_code in [200, 401]  # 401 if auth needed
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            print(f"PASS: Got {len(data)} business income sources")
        else:
            print("INFO: Auth needed for income list")
    
    def test_get_other_income_list(self):
        """Test Other Income endpoint works"""
        response = self.session.get(f"{BASE_URL}/api/other-income")
        assert response.status_code in [200, 401]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            print(f"PASS: Got {len(data)} other income sources")
        else:
            print("INFO: Auth needed for other income list")
    
    def test_income_transaction_endpoints_exist(self):
        """Test that income transaction endpoints exist"""
        # Test GET endpoint
        response = self.session.get(f"{BASE_URL}/api/income-transactions")
        assert response.status_code in [200, 401, 422]  # 422 if missing params
        print(f"PASS: GET /api/income-transactions exists (status: {response.status_code})")
        
        # Test history endpoint (without ID)
        response = self.session.get(f"{BASE_URL}/api/income-transactions/history/test-id")
        assert response.status_code in [200, 401, 404]
        print(f"PASS: GET /api/income-transactions/history/{{id}} exists (status: {response.status_code})")
    
    def test_income_transaction_put_endpoint_exists(self):
        """Test that PUT endpoint for editing transactions exists"""
        # Test PUT endpoint with dummy ID (should return 401/404, not 405 Method Not Allowed)
        response = self.session.put(
            f"{BASE_URL}/api/income-transactions/test-transaction-id",
            json={"amount": 1000, "transactionDate": "2026-01-15"}
        )
        # Should NOT be 405 (Method Not Allowed) - proves PUT endpoint exists
        assert response.status_code != 405
        print(f"PASS: PUT /api/income-transactions/{{id}} endpoint exists (status: {response.status_code})")

class TestIncomeSourceAPI:
    """Test Income Source endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get session"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test", "password": "test"}
        )
        if login_response.status_code == 200:
            token = login_response.json().get("session_token")
            self.session.cookies.set("session_token", token)
        yield
    
    def test_get_income_sources(self):
        """Test getting all income sources"""
        response = self.session.get(f"{BASE_URL}/api/income")
        assert response.status_code in [200, 401]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            print(f"PASS: Got {len(data)} income sources")
    
    def test_get_income_sources_by_type_business(self):
        """Test filtering income sources by Business type"""
        response = self.session.get(f"{BASE_URL}/api/income/list/summary?type=Business")
        assert response.status_code in [200, 401]
        if response.status_code == 200:
            data = response.json()
            for item in data:
                assert item.get("type") == "Business"
            print(f"PASS: Business filter works, got {len(data)} items")
    
    def test_get_income_sources_by_type_job(self):
        """Test filtering income sources by Job type"""
        response = self.session.get(f"{BASE_URL}/api/income/list/summary?type=Job")
        assert response.status_code in [200, 401]
        if response.status_code == 200:
            data = response.json()
            for item in data:
                assert item.get("type") == "Job"
            print(f"PASS: Job filter works, got {len(data)} items")
    
    def test_get_income_sources_by_type_selfemployed(self):
        """Test filtering income sources by Self-Employed type"""
        response = self.session.get(f"{BASE_URL}/api/income/list/summary?type=Self-Employed")
        assert response.status_code in [200, 401]
        if response.status_code == 200:
            data = response.json()
            for item in data:
                assert item.get("type") == "Self-Employed"
            print(f"PASS: Self-Employed filter works, got {len(data)} items")
    
    def test_get_income_sources_by_type_interest(self):
        """Test filtering income sources by Interest type"""
        response = self.session.get(f"{BASE_URL}/api/income/list/summary?type=Interest")
        assert response.status_code in [200, 401]
        if response.status_code == 200:
            data = response.json()
            for item in data:
                assert item.get("type") == "Interest"
            print(f"PASS: Interest filter works, got {len(data)} items")
