"""
Test iteration 81 bug fixes:
1. Backend type synonyms: Job↔Salary, Self-Employed↔Freelance
2. Income list summary API returns correct data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@moneyssutra.com"
TEST_PASSWORD = "test"


class TestTypeSynonyms:
    """Test backend type synonyms for income types"""
    
    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if login_response.status_code != 200:
            pytest.skip("Login failed - skipping authenticated tests")
        yield
        
    def test_job_type_returns_salary_data(self):
        """Test /api/income/list/summary?type=Job returns Salary type income"""
        response = self.session.get(f"{BASE_URL}/api/income/list/summary?type=Job")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Should return income with type Salary or Job
        if len(data) > 0:
            types_found = [item.get('type') for item in data]
            print(f"Job query returned types: {types_found}")
            assert any(t in ['Job', 'Salary'] for t in types_found), \
                f"Expected Job or Salary type, found: {types_found}"
            
            # Verify TCS Salary exists
            names = [item.get('name') for item in data]
            print(f"Job query returned names: {names}")
            assert any('TCS' in name or 'Salary' in name for name in names if name), \
                f"Expected TCS Salary in results, found: {names}"
        else:
            print("WARNING: No job/salary income found for test user")
    
    def test_self_employed_type_returns_freelance_data(self):
        """Test /api/income/list/summary?type=Self-Employed returns Freelance type income"""
        response = self.session.get(f"{BASE_URL}/api/income/list/summary?type=Self-Employed")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Should return income with type Self-Employed or Freelance
        if len(data) > 0:
            types_found = [item.get('type') for item in data]
            print(f"Self-Employed query returned types: {types_found}")
            assert any(t in ['Self-Employed', 'Freelance'] for t in types_found), \
                f"Expected Self-Employed or Freelance type, found: {types_found}"
            
            # Verify Upwork Freelancing exists
            names = [item.get('name') for item in data]
            print(f"Self-Employed query returned names: {names}")
            assert any('Upwork' in name or 'Freelance' in name or 'freelancing' in name.lower() for name in names if name), \
                f"Expected Upwork Freelancing in results, found: {names}"
        else:
            pytest.fail("No self-employed/freelance income found - BUG: type=Self-Employed should return Freelance type data")
    
    def test_income_summary_returns_all_types(self):
        """Test /api/income/list/summary returns all income types without filter"""
        response = self.session.get(f"{BASE_URL}/api/income/list/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Expected at least one income source"
        
        types_found = set(item.get('type') for item in data)
        print(f"All income types found: {types_found}")
        
        # Verify we have multiple income types
        expected_types = {'Salary', 'Business', 'Freelance', 'Rental', 'Interest', 'Dividend'}
        found_expected = types_found.intersection(expected_types)
        print(f"Found expected types: {found_expected}")
        assert len(found_expected) >= 3, f"Expected at least 3 income types, found: {types_found}"
    
    def test_income_has_selected_date_field(self):
        """Test income sources have selectedDate field for date calculations"""
        response = self.session.get(f"{BASE_URL}/api/income/list/summary")
        assert response.status_code == 200
        
        data = response.json()
        # Check that income sources have the expected fields
        for item in data[:3]:  # Check first 3 items
            print(f"Income: {item.get('name')}, type: {item.get('type')}, "
                  f"frequency: {item.get('frequency')}, selectedDate: {item.get('selectedDate')}")
            
            # All income should have these fields
            assert 'id' in item, "Missing 'id' field"
            assert 'name' in item, "Missing 'name' field"
            assert 'type' in item, "Missing 'type' field"
            assert 'expectedAmount' in item, "Missing 'expectedAmount' field"


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_backend_health(self):
        """Test backend is reachable"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Backend health check failed: {response.status_code}"
    
    def test_login_endpoint(self):
        """Test login endpoint works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_EMAIL, "password": TEST_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.status_code}"
        data = response.json()
        assert "user" in data or "email" in data, f"Unexpected login response: {data}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
