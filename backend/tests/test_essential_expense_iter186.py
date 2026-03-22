"""
Test suite for isEssential expense feature - Iteration 186
Tests:
1. POST /api/expenses - SIP expense auto-sets isEssential=false
2. POST /api/expenses - Housing/Rent expense auto-sets isEssential=true
3. POST /api/expenses - Explicit isEssential=true respects user override
4. PATCH /api/expenses/{id}/essential - Toggle isEssential works
5. GET /api/expenses - Returns isEssential field in response
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "moneyssutra@gmail.com"
TEST_MPIN = "1234"


@pytest.fixture(scope="module")
def auth_session():
    """Authenticate and return session with cookies."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login using MPIN direct login
    login_resp = session.post(f"{BASE_URL}/api/auth/mpin-direct-login", json={
        "email": TEST_EMAIL,
        "mpin": TEST_MPIN
    })
    
    if login_resp.status_code != 200:
        pytest.skip(f"Authentication failed: {login_resp.status_code} - {login_resp.text}")
    
    return session


@pytest.fixture
def cleanup_expenses(auth_session):
    """Track created expenses for cleanup."""
    created_ids = []
    yield created_ids
    
    # Cleanup after test
    for expense_id in created_ids:
        try:
            auth_session.delete(f"{BASE_URL}/api/expenses/{expense_id}")
        except:
            pass


class TestEssentialAutoDetection:
    """Test smart defaults for isEssential based on category and name patterns."""
    
    def test_sip_expense_auto_sets_non_essential(self, auth_session, cleanup_expenses):
        """SIP expense should auto-set isEssential=false due to name pattern."""
        unique_name = f"TEST_SIP_MF_{uuid.uuid4().hex[:6]}"
        
        payload = {
            "expenseName": unique_name,
            "expenseType": "Fixed",
            "category": "Investments",
            "expectedAmount": 5000,
            "frequency": "Monthly",
            "selectedDate": "5"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/expenses", json=payload)
        assert response.status_code == 200, f"Failed to create expense: {response.text}"
        
        data = response.json()
        cleanup_expenses.append(data.get("id"))
        
        # SIP pattern in name should auto-detect as non-essential
        assert "isEssential" in data, "isEssential field missing in response"
        assert data["isEssential"] == False, f"SIP expense should be non-essential, got {data['isEssential']}"
    
    def test_mutual_fund_expense_auto_sets_non_essential(self, auth_session, cleanup_expenses):
        """Mutual Fund expense should auto-set isEssential=false."""
        unique_name = f"TEST_Mutual Fund Investment_{uuid.uuid4().hex[:6]}"
        
        payload = {
            "expenseName": unique_name,
            "expenseType": "Fixed",
            "category": "Investments",
            "expectedAmount": 10000,
            "frequency": "Monthly",
            "selectedDate": "10"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/expenses", json=payload)
        assert response.status_code == 200, f"Failed to create expense: {response.text}"
        
        data = response.json()
        cleanup_expenses.append(data.get("id"))
        
        assert data["isEssential"] == False, f"Mutual Fund expense should be non-essential"
    
    def test_ppf_expense_auto_sets_non_essential(self, auth_session, cleanup_expenses):
        """PPF expense should auto-set isEssential=false."""
        unique_name = f"TEST_PPF Contribution_{uuid.uuid4().hex[:6]}"
        
        payload = {
            "expenseName": unique_name,
            "expenseType": "Fixed",
            "category": "Investments",
            "expectedAmount": 12500,
            "frequency": "Monthly",
            "selectedDate": "1"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/expenses", json=payload)
        assert response.status_code == 200, f"Failed to create expense: {response.text}"
        
        data = response.json()
        cleanup_expenses.append(data.get("id"))
        
        assert data["isEssential"] == False, f"PPF expense should be non-essential"
    
    def test_housing_expense_auto_sets_essential(self, auth_session, cleanup_expenses):
        """Housing category expense should auto-set isEssential=true."""
        unique_name = f"TEST_House Rent_{uuid.uuid4().hex[:6]}"
        
        payload = {
            "expenseName": unique_name,
            "expenseType": "Fixed",
            "category": "Housing",
            "expectedAmount": 25000,
            "frequency": "Monthly",
            "selectedDate": "1"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/expenses", json=payload)
        assert response.status_code == 200, f"Failed to create expense: {response.text}"
        
        data = response.json()
        cleanup_expenses.append(data.get("id"))
        
        assert data["isEssential"] == True, f"Housing expense should be essential"
    
    def test_rent_name_pattern_sets_essential(self, auth_session, cleanup_expenses):
        """Expense with 'rent' in name should auto-set isEssential=true."""
        unique_name = f"TEST_Office Rent_{uuid.uuid4().hex[:6]}"
        
        payload = {
            "expenseName": unique_name,
            "expenseType": "Fixed",
            "category": "Business Expense",  # Not in essential categories
            "expectedAmount": 15000,
            "frequency": "Monthly",
            "selectedDate": "5"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/expenses", json=payload)
        assert response.status_code == 200, f"Failed to create expense: {response.text}"
        
        data = response.json()
        cleanup_expenses.append(data.get("id"))
        
        # 'rent' pattern should override category
        assert data["isEssential"] == True, f"Rent expense should be essential due to name pattern"
    
    def test_utilities_category_sets_essential(self, auth_session, cleanup_expenses):
        """Utilities category should auto-set isEssential=true."""
        unique_name = f"TEST_Electricity Bill_{uuid.uuid4().hex[:6]}"
        
        payload = {
            "expenseName": unique_name,
            "expenseType": "Fixed",
            "category": "Utilities",
            "expectedAmount": 3000,
            "frequency": "Monthly",
            "selectedDate": "15"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/expenses", json=payload)
        assert response.status_code == 200, f"Failed to create expense: {response.text}"
        
        data = response.json()
        cleanup_expenses.append(data.get("id"))
        
        assert data["isEssential"] == True, f"Utilities expense should be essential"
    
    def test_emi_category_sets_essential(self, auth_session, cleanup_expenses):
        """EMI category should auto-set isEssential=true."""
        unique_name = f"TEST_Car EMI_{uuid.uuid4().hex[:6]}"
        
        payload = {
            "expenseName": unique_name,
            "expenseType": "Fixed",
            "category": "EMI",
            "expectedAmount": 15000,
            "frequency": "Monthly",
            "selectedDate": "5"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/expenses", json=payload)
        assert response.status_code == 200, f"Failed to create expense: {response.text}"
        
        data = response.json()
        cleanup_expenses.append(data.get("id"))
        
        assert data["isEssential"] == True, f"EMI expense should be essential"
    
    def test_medical_category_sets_essential(self, auth_session, cleanup_expenses):
        """Medical category should auto-set isEssential=true."""
        unique_name = f"TEST_Health Insurance Premium_{uuid.uuid4().hex[:6]}"
        
        payload = {
            "expenseName": unique_name,
            "expenseType": "Fixed",
            "category": "Medical",
            "expectedAmount": 2000,
            "frequency": "Monthly",
            "selectedDate": "10"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/expenses", json=payload)
        assert response.status_code == 200, f"Failed to create expense: {response.text}"
        
        data = response.json()
        cleanup_expenses.append(data.get("id"))
        
        assert data["isEssential"] == True, f"Medical expense should be essential"


class TestEssentialUserOverride:
    """Test that explicit isEssential value respects user override."""
    
    def test_explicit_essential_true_overrides_auto_detection(self, auth_session, cleanup_expenses):
        """User can explicitly set isEssential=true even for investment-type expense."""
        unique_name = f"TEST_SIP Override Essential_{uuid.uuid4().hex[:6]}"
        
        payload = {
            "expenseName": unique_name,
            "expenseType": "Fixed",
            "category": "Investments",
            "expectedAmount": 5000,
            "frequency": "Monthly",
            "selectedDate": "5",
            "isEssential": True  # Explicit override
        }
        
        response = auth_session.post(f"{BASE_URL}/api/expenses", json=payload)
        assert response.status_code == 200, f"Failed to create expense: {response.text}"
        
        data = response.json()
        cleanup_expenses.append(data.get("id"))
        
        # User override should be respected
        assert data["isEssential"] == True, f"Explicit isEssential=true should be respected"
    
    def test_explicit_essential_false_overrides_auto_detection(self, auth_session, cleanup_expenses):
        """User can explicitly set isEssential=false even for essential category."""
        unique_name = f"TEST_Housing Override NonEssential_{uuid.uuid4().hex[:6]}"
        
        payload = {
            "expenseName": unique_name,
            "expenseType": "Fixed",
            "category": "Housing",
            "expectedAmount": 10000,
            "frequency": "Monthly",
            "selectedDate": "1",
            "isEssential": False  # Explicit override
        }
        
        response = auth_session.post(f"{BASE_URL}/api/expenses", json=payload)
        assert response.status_code == 200, f"Failed to create expense: {response.text}"
        
        data = response.json()
        cleanup_expenses.append(data.get("id"))
        
        # User override should be respected
        assert data["isEssential"] == False, f"Explicit isEssential=false should be respected"


class TestToggleEssentialEndpoint:
    """Test PATCH /api/expenses/{id}/essential endpoint."""
    
    def test_toggle_essential_to_true(self, auth_session, cleanup_expenses):
        """Toggle isEssential from false to true."""
        # Create a non-essential expense first
        unique_name = f"TEST_SIP Toggle_{uuid.uuid4().hex[:6]}"
        
        create_payload = {
            "expenseName": unique_name,
            "expenseType": "Fixed",
            "category": "Investments",
            "expectedAmount": 5000,
            "frequency": "Monthly",
            "selectedDate": "5"
        }
        
        create_resp = auth_session.post(f"{BASE_URL}/api/expenses", json=create_payload)
        assert create_resp.status_code == 200
        
        expense_id = create_resp.json().get("id")
        cleanup_expenses.append(expense_id)
        
        # Verify it's non-essential initially
        assert create_resp.json()["isEssential"] == False
        
        # Toggle to essential
        toggle_resp = auth_session.patch(
            f"{BASE_URL}/api/expenses/{expense_id}/essential",
            json={"isEssential": True}
        )
        
        assert toggle_resp.status_code == 200, f"Toggle failed: {toggle_resp.text}"
        toggle_data = toggle_resp.json()
        assert toggle_data["success"] == True
        assert toggle_data["isEssential"] == True
        
        # Verify persistence via GET
        get_resp = auth_session.get(f"{BASE_URL}/api/expenses")
        assert get_resp.status_code == 200
        
        expenses = get_resp.json()
        updated_expense = next((e for e in expenses if e["id"] == expense_id), None)
        assert updated_expense is not None
        assert updated_expense["isEssential"] == True, "Toggle should persist"
    
    def test_toggle_essential_to_false(self, auth_session, cleanup_expenses):
        """Toggle isEssential from true to false."""
        # Create an essential expense first
        unique_name = f"TEST_Housing Toggle_{uuid.uuid4().hex[:6]}"
        
        create_payload = {
            "expenseName": unique_name,
            "expenseType": "Fixed",
            "category": "Housing",
            "expectedAmount": 20000,
            "frequency": "Monthly",
            "selectedDate": "1"
        }
        
        create_resp = auth_session.post(f"{BASE_URL}/api/expenses", json=create_payload)
        assert create_resp.status_code == 200
        
        expense_id = create_resp.json().get("id")
        cleanup_expenses.append(expense_id)
        
        # Verify it's essential initially
        assert create_resp.json()["isEssential"] == True
        
        # Toggle to non-essential
        toggle_resp = auth_session.patch(
            f"{BASE_URL}/api/expenses/{expense_id}/essential",
            json={"isEssential": False}
        )
        
        assert toggle_resp.status_code == 200, f"Toggle failed: {toggle_resp.text}"
        toggle_data = toggle_resp.json()
        assert toggle_data["success"] == True
        assert toggle_data["isEssential"] == False
    
    def test_toggle_essential_missing_field(self, auth_session, cleanup_expenses):
        """Toggle without isEssential field should return 400."""
        # Create an expense first
        unique_name = f"TEST_Toggle Missing_{uuid.uuid4().hex[:6]}"
        
        create_payload = {
            "expenseName": unique_name,
            "expenseType": "Fixed",
            "category": "Housing",
            "expectedAmount": 10000,
            "frequency": "Monthly",
            "selectedDate": "1"
        }
        
        create_resp = auth_session.post(f"{BASE_URL}/api/expenses", json=create_payload)
        assert create_resp.status_code == 200
        
        expense_id = create_resp.json().get("id")
        cleanup_expenses.append(expense_id)
        
        # Toggle without isEssential field
        toggle_resp = auth_session.patch(
            f"{BASE_URL}/api/expenses/{expense_id}/essential",
            json={}
        )
        
        assert toggle_resp.status_code == 400, f"Should return 400 for missing field"
        assert "isessential" in toggle_resp.text.lower()
    
    def test_toggle_essential_nonexistent_expense(self, auth_session):
        """Toggle on non-existent expense should return 404."""
        fake_id = f"nonexistent_{uuid.uuid4().hex[:8]}"
        
        toggle_resp = auth_session.patch(
            f"{BASE_URL}/api/expenses/{fake_id}/essential",
            json={"isEssential": True}
        )
        
        assert toggle_resp.status_code == 404


class TestGetExpensesReturnsEssential:
    """Test that GET /api/expenses returns isEssential field."""
    
    def test_get_expenses_includes_essential_field(self, auth_session, cleanup_expenses):
        """GET /api/expenses should return isEssential field for each expense."""
        # Create test expenses
        essential_name = f"TEST_Essential Expense_{uuid.uuid4().hex[:6]}"
        non_essential_name = f"TEST_SIP NonEssential_{uuid.uuid4().hex[:6]}"
        
        # Create essential expense
        resp1 = auth_session.post(f"{BASE_URL}/api/expenses", json={
            "expenseName": essential_name,
            "expenseType": "Fixed",
            "category": "Housing",
            "expectedAmount": 20000,
            "frequency": "Monthly",
            "selectedDate": "1"
        })
        assert resp1.status_code == 200
        cleanup_expenses.append(resp1.json().get("id"))
        
        # Create non-essential expense
        resp2 = auth_session.post(f"{BASE_URL}/api/expenses", json={
            "expenseName": non_essential_name,
            "expenseType": "Fixed",
            "category": "Investments",
            "expectedAmount": 5000,
            "frequency": "Monthly",
            "selectedDate": "5"
        })
        assert resp2.status_code == 200
        cleanup_expenses.append(resp2.json().get("id"))
        
        # Get all expenses
        get_resp = auth_session.get(f"{BASE_URL}/api/expenses")
        assert get_resp.status_code == 200
        
        expenses = get_resp.json()
        
        # Find our test expenses
        essential_exp = next((e for e in expenses if e["expenseName"] == essential_name), None)
        non_essential_exp = next((e for e in expenses if e["expenseName"] == non_essential_name), None)
        
        assert essential_exp is not None, "Essential expense not found"
        assert non_essential_exp is not None, "Non-essential expense not found"
        
        # Verify isEssential field is present and correct
        assert "isEssential" in essential_exp, "isEssential field missing"
        assert "isEssential" in non_essential_exp, "isEssential field missing"
        
        assert essential_exp["isEssential"] == True
        assert non_essential_exp["isEssential"] == False
    
    def test_expense_list_summary_includes_essential(self, auth_session, cleanup_expenses):
        """GET /api/expenses/list/summary should include isEssential field."""
        # Create a test expense
        unique_name = f"TEST_Summary Essential_{uuid.uuid4().hex[:6]}"
        
        resp = auth_session.post(f"{BASE_URL}/api/expenses", json={
            "expenseName": unique_name,
            "expenseType": "Fixed",
            "category": "Housing",
            "expectedAmount": 15000,
            "frequency": "Monthly",
            "selectedDate": "1"
        })
        assert resp.status_code == 200
        cleanup_expenses.append(resp.json().get("id"))
        
        # Get expense list summary
        summary_resp = auth_session.get(f"{BASE_URL}/api/expenses/list/summary")
        assert summary_resp.status_code == 200
        
        expenses = summary_resp.json()
        test_expense = next((e for e in expenses if e["expenseName"] == unique_name), None)
        
        assert test_expense is not None, "Test expense not found in summary"
        assert "isEssential" in test_expense, "isEssential field missing in summary"
        assert test_expense["isEssential"] == True


class TestNonEssentialNamePatterns:
    """Test all non-essential name patterns."""
    
    @pytest.mark.parametrize("pattern,name", [
        ("sip", "Monthly SIP Investment"),
        ("mutual fund", "Mutual Fund SIP"),
        ("mf ", "MF Contribution"),
        ("ppf", "PPF Yearly"),
        ("nps", "NPS Contribution"),
        ("elss", "ELSS Tax Saver"),
        ("etf", "ETF Investment"),
        ("gold saving", "Gold Saving Scheme"),
        ("investment", "Investment Plan"),
    ])
    def test_non_essential_patterns(self, auth_session, cleanup_expenses, pattern, name):
        """Test that various investment patterns are detected as non-essential."""
        unique_name = f"TEST_{name}_{uuid.uuid4().hex[:6]}"
        
        payload = {
            "expenseName": unique_name,
            "expenseType": "Fixed",
            "category": "Other",  # Neutral category
            "expectedAmount": 5000,
            "frequency": "Monthly",
            "selectedDate": "5"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/expenses", json=payload)
        assert response.status_code == 200, f"Failed for pattern '{pattern}': {response.text}"
        
        data = response.json()
        cleanup_expenses.append(data.get("id"))
        
        assert data["isEssential"] == False, f"Pattern '{pattern}' should be non-essential"


class TestEssentialNamePatterns:
    """Test essential name patterns that override category."""
    
    @pytest.mark.parametrize("pattern,name", [
        ("emi", "Home EMI Payment"),
        ("loan", "Personal Loan Repayment"),
        ("rent", "Office Rent"),
        ("insurance premium", "Life Insurance Premium"),
        ("premium", "Health Premium"),
        ("petrol", "Petrol Expense"),
        ("diesel", "Diesel Expense"),
        ("fuel", "Fuel Expense"),
        ("electricity", "Electricity Bill"),
        ("grocery", "Monthly Grocery"),
        ("medicine", "Medicine Expense"),
        ("school fee", "School Fee"),
        ("tuition", "Tuition Fee"),
    ])
    def test_essential_patterns(self, auth_session, cleanup_expenses, pattern, name):
        """Test that essential patterns are detected correctly."""
        unique_name = f"TEST_{name}_{uuid.uuid4().hex[:6]}"
        
        payload = {
            "expenseName": unique_name,
            "expenseType": "Fixed",
            "category": "Other",  # Neutral category - pattern should override
            "expectedAmount": 5000,
            "frequency": "Monthly",
            "selectedDate": "5"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/expenses", json=payload)
        assert response.status_code == 200, f"Failed for pattern '{pattern}': {response.text}"
        
        data = response.json()
        cleanup_expenses.append(data.get("id"))
        
        assert data["isEssential"] == True, f"Pattern '{pattern}' should be essential"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
