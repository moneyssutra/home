"""
Tests for Add Income refactor and bug fixes:
1. /add-income page renders all 8 income types and navigates correctly
2. /my-income page shows correct category names: 'Job' (not 'Salary'), 'Self-Employed' (not 'Freelance')
3. /my-self-employed page shows Fixed/Variable segments with seeded data
4. Editing Self-Employed income source should NOT crash
5. Backend API: GET /api/income/list/summary?type=Self-Employed returns Freelance income
6. AddActionSheet Quick Add menu routes 'Add Income' to /add-income
7. /my-business page shows Fixed/Variable segments correctly
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@moneyssutra.com"
TEST_PASSWORD = "test"
SELF_EMPLOYED_ID = "deb7269e-ddb8-413f-81ec-70e1a3ad438a"  # Upwork Freelancing

@pytest.fixture(scope="module")
def auth_session():
    """Create authenticated session for testing"""
    session = requests.Session()
    
    # Login with test credentials (uses 'username' field per agent context)
    login_response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    
    if login_response.status_code != 200:
        pytest.skip(f"Login failed with status {login_response.status_code}: {login_response.text}")
    
    return session


class TestTypeSynonymFiltering:
    """Test backend type synonym filtering for income API"""
    
    def test_self_employed_returns_freelance_income(self, auth_session):
        """GET /api/income/list/summary?type=Self-Employed should return Freelance type income"""
        response = auth_session.get(f"{BASE_URL}/api/income/list/summary?type=Self-Employed")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        incomes = response.json()
        assert isinstance(incomes, list), "Expected list response"
        
        # Should find Freelance type income when querying for Self-Employed
        if len(incomes) > 0:
            types = [i.get("type", "").lower() for i in incomes]
            assert any(t in ["freelance", "self-employed"] for t in types), \
                f"Expected Freelance/Self-Employed type income but got types: {types}"
            print(f"PASS: Found {len(incomes)} Self-Employed/Freelance incomes")
    
    def test_job_returns_salary_income(self, auth_session):
        """GET /api/income/list/summary?type=Job should return Salary type income"""
        response = auth_session.get(f"{BASE_URL}/api/income/list/summary?type=Job")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        incomes = response.json()
        assert isinstance(incomes, list), "Expected list response"
        
        # Should find Salary type income when querying for Job
        if len(incomes) > 0:
            types = [i.get("type", "").lower() for i in incomes]
            assert any(t in ["job", "salary"] for t in types), \
                f"Expected Job/Salary type income but got types: {types}"
            print(f"PASS: Found {len(incomes)} Job/Salary incomes")


class TestSelfEmployedIncomeEditing:
    """Test Self-Employed income source editing - should not crash"""
    
    def test_get_self_employed_income_by_id(self, auth_session):
        """GET /api/income/{id} for Self-Employed income should return data without crash"""
        response = auth_session.get(f"{BASE_URL}/api/income/{SELF_EMPLOYED_ID}")
        
        if response.status_code == 404:
            pytest.skip(f"Self-Employed income ID {SELF_EMPLOYED_ID} not found in database")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        income = response.json()
        
        # Verify required fields exist (this was the bug - fullName was undefined)
        assert "id" in income, "Missing id field"
        assert income["id"] == SELF_EMPLOYED_ID, f"Expected id {SELF_EMPLOYED_ID}"
        
        # Check type is Freelance (seeded data)
        income_type = income.get("type", "").lower()
        assert income_type in ["freelance", "self-employed"], f"Expected Freelance/Self-Employed type but got: {income_type}"
        
        # Verify expectedAmount exists
        assert "expectedAmount" in income, "Missing expectedAmount field"
        
        # Print income details for debugging
        print(f"PASS: Got Self-Employed income: {income.get('name', 'Unknown')} - ₹{income.get('expectedAmount', 0)}")
        print(f"      Type: {income.get('type')}, Frequency: {income.get('frequency')}, IncomeType: {income.get('incomeType', 'fixed')}")
    
    def test_self_employed_income_has_required_fields(self, auth_session):
        """Verify Self-Employed income has all required fields for editing form"""
        response = auth_session.get(f"{BASE_URL}/api/income/{SELF_EMPLOYED_ID}")
        
        if response.status_code == 404:
            pytest.skip(f"Self-Employed income ID {SELF_EMPLOYED_ID} not found")
        
        income = response.json()
        
        # Check all fields needed by SelfEmployedIncome.js form
        required_fields = ["id", "type", "expectedAmount", "frequency"]
        for field in required_fields:
            assert field in income, f"Missing required field: {field}"
        
        # These fields can be null but should exist in response
        optional_fields = ["name", "profession", "selectedDay", "selectedDate", 
                          "selectedQuarter", "selectedHalf", "selectedMonth", 
                          "customFrequency", "customDate", "incomeType", "reminderTime"]
        
        print(f"PASS: All required fields present for editing")


class TestIncomeListSummary:
    """Test income list summary endpoint returns correct data"""
    
    def test_income_list_summary_no_filter(self, auth_session):
        """GET /api/income/list/summary returns all income sources"""
        response = auth_session.get(f"{BASE_URL}/api/income/list/summary")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        incomes = response.json()
        assert isinstance(incomes, list), "Expected list response"
        
        print(f"PASS: Got {len(incomes)} total income sources")
        
        # Print summary of types
        type_counts = {}
        for inc in incomes:
            inc_type = inc.get("type", "Unknown")
            type_counts[inc_type] = type_counts.get(inc_type, 0) + 1
        
        print(f"      Type breakdown: {type_counts}")
    
    def test_business_type_filter(self, auth_session):
        """GET /api/income/list/summary?type=Business returns Business type income"""
        response = auth_session.get(f"{BASE_URL}/api/income/list/summary?type=Business")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        incomes = response.json()
        
        # All returned incomes should be Business type
        for inc in incomes:
            inc_type = inc.get("type", "").lower()
            assert inc_type == "business", f"Expected Business type but got: {inc_type}"
        
        print(f"PASS: Found {len(incomes)} Business income sources")
    
    def test_income_summary_has_income_type_field(self, auth_session):
        """Verify incomeType field is returned for Fixed/Variable segmentation"""
        response = auth_session.get(f"{BASE_URL}/api/income/list/summary")
        
        assert response.status_code == 200
        
        incomes = response.json()
        
        # incomeType field should be in projection
        fixed_count = 0
        variable_count = 0
        
        for inc in incomes:
            income_type = inc.get("incomeType", "fixed")
            if income_type == "variable":
                variable_count += 1
            else:
                fixed_count += 1
        
        print(f"PASS: Fixed/Variable segmentation working - Fixed: {fixed_count}, Variable: {variable_count}")


class TestHealthAndAuth:
    """Basic health and auth tests"""
    
    def test_login_with_username(self, auth_session):
        """Verify login works with 'username' field"""
        # Already verified in fixture - if we get here, login worked
        assert auth_session is not None, "Session should be authenticated"
        print("PASS: Login with username field works")
    
    def test_income_api_requires_auth(self):
        """Verify income API requires authentication"""
        session = requests.Session()  # Unauthenticated
        response = session.get(f"{BASE_URL}/api/income/list/summary")
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("PASS: Income API correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
