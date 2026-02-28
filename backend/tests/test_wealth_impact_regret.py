"""
Test file for Wealth Impact Analysis and Regret Flag features
- Tests GET /api/expenses/wealth-impact endpoint
- Tests PATCH /api/expenses/{id}/regret endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestAuth:
    """Authentication tests to obtain session for subsequent requests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create a requests session with cookies"""
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_session(self, session):
        """Authenticate and return session with valid cookies"""
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@moneyssutra.com", "password": "test"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return session


class TestWealthImpactEndpoint(TestAuth):
    """Tests for GET /api/expenses/wealth-impact endpoint"""
    
    def test_wealth_impact_returns_200(self, auth_session):
        """Test that wealth-impact endpoint returns 200 OK"""
        response = auth_session.get(f"{BASE_URL}/api/expenses/wealth-impact")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"SUCCESS: wealth-impact endpoint returned 200")
    
    def test_wealth_impact_has_wealth_grade(self, auth_session):
        """Test that response includes wealthGrade with grade and color"""
        response = auth_session.get(f"{BASE_URL}/api/expenses/wealth-impact")
        assert response.status_code == 200
        data = response.json()
        
        assert "wealthGrade" in data, "Missing wealthGrade in response"
        assert "grade" in data["wealthGrade"], "Missing grade in wealthGrade"
        assert "color" in data["wealthGrade"], "Missing color in wealthGrade"
        
        # Validate grade is one of expected values
        valid_grades = ["A+", "A", "B+", "B", "C+", "C", "D", "F"]
        assert data["wealthGrade"]["grade"] in valid_grades, f"Invalid grade: {data['wealthGrade']['grade']}"
        
        print(f"SUCCESS: wealthGrade found - Grade: {data['wealthGrade']['grade']}, Color: {data['wealthGrade']['color']}")
    
    def test_wealth_impact_has_allocation_breakdown(self, auth_session):
        """Test that response includes allocation breakdown (essential/lifestyle/wealth)"""
        response = auth_session.get(f"{BASE_URL}/api/expenses/wealth-impact")
        assert response.status_code == 200
        data = response.json()
        
        assert "allocation" in data, "Missing allocation in response"
        allocation = data["allocation"]
        
        # Check all three categories exist
        for cat in ["essential", "lifestyle", "wealth"]:
            assert cat in allocation, f"Missing {cat} in allocation"
            assert "amount" in allocation[cat], f"Missing amount in allocation.{cat}"
            assert "pct" in allocation[cat], f"Missing pct in allocation.{cat}"
            assert "target" in allocation[cat], f"Missing target in allocation.{cat}"
        
        # Verify targets match 50/30/20 rule
        assert allocation["essential"]["target"] == 50, "Essential target should be 50"
        assert allocation["lifestyle"]["target"] == 30, "Lifestyle target should be 30"
        assert allocation["wealth"]["target"] == 20, "Wealth target should be 20"
        
        print(f"SUCCESS: Allocation breakdown - Essential: {allocation['essential']['pct']}%, Lifestyle: {allocation['lifestyle']['pct']}%, Wealth: {allocation['wealth']['pct']}%")
    
    def test_wealth_impact_has_lifestyle_over_5k(self, auth_session):
        """Test that response includes lifestyleOver5k array for regret check"""
        response = auth_session.get(f"{BASE_URL}/api/expenses/wealth-impact")
        assert response.status_code == 200
        data = response.json()
        
        assert "lifestyleOver5k" in data, "Missing lifestyleOver5k in response"
        assert isinstance(data["lifestyleOver5k"], list), "lifestyleOver5k should be a list"
        
        # If there are items, verify structure
        if len(data["lifestyleOver5k"]) > 0:
            item = data["lifestyleOver5k"][0]
            assert "id" in item, "Missing id in lifestyleOver5k item"
            assert "name" in item, "Missing name in lifestyleOver5k item"
            assert "amount" in item, "Missing amount in lifestyleOver5k item"
            assert "category" in item, "Missing category in lifestyleOver5k item"
            assert item["amount"] >= 5000, f"Amount should be >= 5000, got {item['amount']}"
            print(f"SUCCESS: Found {len(data['lifestyleOver5k'])} lifestyle expenses over ₹5,000")
        else:
            print("SUCCESS: lifestyleOver5k is empty (no lifestyle expenses over ₹5,000 this month)")
    
    def test_wealth_impact_has_opportunity_swaps(self, auth_session):
        """Test that response includes opportunitySwaps array"""
        response = auth_session.get(f"{BASE_URL}/api/expenses/wealth-impact")
        assert response.status_code == 200
        data = response.json()
        
        assert "opportunitySwaps" in data, "Missing opportunitySwaps in response"
        assert isinstance(data["opportunitySwaps"], list), "opportunitySwaps should be a list"
        
        # If there are swaps, verify structure
        if len(data["opportunitySwaps"]) > 0:
            swap = data["opportunitySwaps"][0]
            assert "icon" in swap, "Missing icon in opportunitySwaps item"
            assert "text" in swap, "Missing text in opportunitySwaps item"
            print(f"SUCCESS: Found {len(data['opportunitySwaps'])} opportunity swap suggestions")
        else:
            print("SUCCESS: opportunitySwaps is empty (no regret expenses marked)")
    
    def test_wealth_impact_has_regret_expenses(self, auth_session):
        """Test that response includes regretExpenses and totalRegret"""
        response = auth_session.get(f"{BASE_URL}/api/expenses/wealth-impact")
        assert response.status_code == 200
        data = response.json()
        
        assert "regretExpenses" in data, "Missing regretExpenses in response"
        assert "totalRegret" in data, "Missing totalRegret in response"
        assert isinstance(data["regretExpenses"], list), "regretExpenses should be a list"
        assert isinstance(data["totalRegret"], (int, float)), "totalRegret should be a number"
        
        print(f"SUCCESS: regretExpenses count: {len(data['regretExpenses'])}, totalRegret: ₹{data['totalRegret']}")


class TestRegretFlagEndpoint(TestAuth):
    """Tests for PATCH /api/expenses/{id}/regret endpoint"""
    
    def test_regret_flag_set_true(self, auth_session):
        """Test setting regret flag to true on an expense"""
        # First get an expense from wealth-impact
        response = auth_session.get(f"{BASE_URL}/api/expenses/wealth-impact")
        assert response.status_code == 200
        data = response.json()
        
        # Try to find a lifestyle expense over 5k to test
        if len(data["lifestyleOver5k"]) > 0:
            expense_id = data["lifestyleOver5k"][0]["id"]
            expense_name = data["lifestyleOver5k"][0]["name"]
            
            # Set regret to true
            response = auth_session.patch(
                f"{BASE_URL}/api/expenses/{expense_id}/regret",
                json={"regret": True}
            )
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            result = response.json()
            assert result["id"] == expense_id, "Response should contain the expense id"
            assert result["regret"] == True, "Response should confirm regret=true"
            print(f"SUCCESS: Set regret=true on expense '{expense_name}' (id: {expense_id})")
        else:
            # If no lifestyle expenses over 5k, get any expense
            expenses_response = auth_session.get(f"{BASE_URL}/api/expenses")
            if expenses_response.status_code == 200:
                expenses = expenses_response.json()
                if len(expenses) > 0:
                    expense_id = expenses[0].get("id")
                    response = auth_session.patch(
                        f"{BASE_URL}/api/expenses/{expense_id}/regret",
                        json={"regret": True}
                    )
                    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
                    print(f"SUCCESS: Set regret=true on expense id: {expense_id}")
                else:
                    pytest.skip("No expenses available to test regret flag")
            else:
                pytest.skip("Could not fetch expenses to test regret flag")
    
    def test_regret_flag_set_false(self, auth_session):
        """Test clearing regret flag (set to false)"""
        # Get wealth-impact to find a regret expense
        response = auth_session.get(f"{BASE_URL}/api/expenses/wealth-impact")
        assert response.status_code == 200
        data = response.json()
        
        # Try to find an expense to clear regret
        if len(data["lifestyleOver5k"]) > 0:
            expense_id = data["lifestyleOver5k"][0]["id"]
            
            # Set regret to false
            response = auth_session.patch(
                f"{BASE_URL}/api/expenses/{expense_id}/regret",
                json={"regret": False}
            )
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            result = response.json()
            assert result["regret"] == False, "Response should confirm regret=false"
            print(f"SUCCESS: Set regret=false on expense id: {expense_id}")
        else:
            pytest.skip("No lifestyle expenses over 5k to test regret clear")
    
    def test_regret_flag_invalid_expense_404(self, auth_session):
        """Test that invalid expense ID returns 404"""
        response = auth_session.patch(
            f"{BASE_URL}/api/expenses/invalid-id-12345/regret",
            json={"regret": True}
        )
        assert response.status_code == 404, f"Expected 404 for invalid expense, got {response.status_code}"
        print("SUCCESS: Invalid expense ID correctly returns 404")
    
    def test_regret_persists_after_set(self, auth_session):
        """Test that regret flag persists in wealth-impact after setting"""
        # Get initial state
        response = auth_session.get(f"{BASE_URL}/api/expenses/wealth-impact")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["lifestyleOver5k"]) > 0:
            expense_id = data["lifestyleOver5k"][0]["id"]
            
            # Set regret to true
            auth_session.patch(
                f"{BASE_URL}/api/expenses/{expense_id}/regret",
                json={"regret": True}
            )
            
            # Verify it appears in wealth-impact response
            response = auth_session.get(f"{BASE_URL}/api/expenses/wealth-impact")
            data = response.json()
            
            # Check if expense appears in lifestyleOver5k with regret=true
            expense_in_list = next((e for e in data["lifestyleOver5k"] if e["id"] == expense_id), None)
            if expense_in_list:
                assert expense_in_list.get("regret") == True, "Regret flag should persist as true"
                print(f"SUCCESS: Regret flag persisted for expense id: {expense_id}")
            
            # Also check regretExpenses list
            regret_in_list = next((e for e in data["regretExpenses"] if e["id"] == expense_id), None)
            if regret_in_list:
                print(f"SUCCESS: Expense appears in regretExpenses list")
            
            # Clean up - set regret back to false
            auth_session.patch(
                f"{BASE_URL}/api/expenses/{expense_id}/regret",
                json={"regret": False}
            )
        else:
            pytest.skip("No lifestyle expenses over 5k to test persistence")


class TestRegretFlagUnauthenticated:
    """Test that regret endpoints require authentication"""
    
    def test_wealth_impact_requires_auth(self):
        """Test that wealth-impact requires authentication"""
        response = requests.get(f"{BASE_URL}/api/expenses/wealth-impact")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: wealth-impact endpoint requires authentication")
    
    def test_regret_flag_requires_auth(self):
        """Test that regret flag endpoint requires authentication"""
        response = requests.patch(
            f"{BASE_URL}/api/expenses/some-id/regret",
            json={"regret": True}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: regret flag endpoint requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
