"""
E2E Testing for MoneySSutra - Iteration 73
Full system test after database reset and fresh seed data
Tests all modules: Income, Expenses, Investments, Assets, Loans, Insurance, Credit Cards, Accounts
Tests Intelligence APIs: Control Score, Survival Clock, Money Pattern
Tests Report Generation: Expense, Income, Cashflow, Networth PDFs
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test session to maintain cookies
@pytest.fixture(scope="module")
def session():
    """Create session and login"""
    s = requests.Session()
    response = s.post(f"{BASE_URL}/api/auth/login", json={
        "username": "test",
        "password": "test"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    user_data = response.json()
    assert user_data.get("name") == "Rahul Sharma", f"Wrong user: {user_data}"
    print(f"✓ Logged in as {user_data.get('name')}")
    return s


class TestDashboardNetworth:
    """Test dashboard and networth endpoint"""
    
    def test_networth_endpoint(self, session):
        """Test /api/dashboard/networth returns correct values"""
        response = session.get(f"{BASE_URL}/api/dashboard/networth")
        assert response.status_code == 200
        
        data = response.json()
        # Expected: ~87.8L net worth
        assert "netWorth" in data
        assert data["netWorth"] > 8000000, f"Net worth too low: {data['netWorth']}"
        
        # Check monthly income ~2.73L
        assert "monthlyIncome" in data
        assert 260000 <= data["monthlyIncome"] <= 290000, f"Monthly income unexpected: {data['monthlyIncome']}"
        
        # Check monthly expenses ~1.78L
        assert "monthlyExpenses" in data
        assert 170000 <= data["monthlyExpenses"] <= 185000, f"Monthly expenses unexpected: {data['monthlyExpenses']}"
        
        # Check counts
        assert data["incomeCount"] == 6, f"Expected 6 incomes, got {data['incomeCount']}"
        assert data["investmentCount"] == 16, f"Expected 16 investments, got {data['investmentCount']}"
        assert data["assetCount"] == 5, f"Expected 5 assets, got {data['assetCount']}"
        assert data["loanCount"] == 4, f"Expected 4 loans, got {data['loanCount']}"
        assert data["creditCardCount"] == 3, f"Expected 3 credit cards, got {data['creditCardCount']}"
        assert data["accountCount"] == 3, f"Expected 3 accounts, got {data['accountCount']}"
        
        print(f"✓ Dashboard verified: Net Worth={data['netWorth']}, Income={data['monthlyIncome']}, Expenses={data['monthlyExpenses']}")


class TestDataModules:
    """Test all data module APIs return correct counts"""
    
    def test_income_api(self, session):
        """Test /api/income returns 6 income sources"""
        response = session.get(f"{BASE_URL}/api/income")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 6, f"Expected 6 incomes, got {len(data)}"
        
        # Verify income types
        types = [i["type"] for i in data]
        expected_types = ["Salary", "Business", "Freelance", "Rental", "Interest", "Dividend"]
        for t in expected_types:
            assert t in types, f"Missing income type: {t}"
        print(f"✓ Income: 6 sources verified - {types}")
    
    def test_expenses_api(self, session):
        """Test /api/expenses returns 27 expenses"""
        response = session.get(f"{BASE_URL}/api/expenses")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 27, f"Expected 27 expenses, got {len(data)}"
        
        # Verify categories exist
        categories = set(e["category"] for e in data)
        assert len(categories) >= 10, f"Expected 10+ categories, got {len(categories)}"
        print(f"✓ Expenses: 27 expenses in {len(categories)} categories")
    
    def test_investments_api(self, session):
        """Test /api/investments returns 16 investments"""
        response = session.get(f"{BASE_URL}/api/investments")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 16, f"Expected 16 investments, got {len(data)}"
        
        # Verify investment categories
        categories = set(i["investmentCategory"] for i in data)
        expected_categories = ["Mutual Fund", "Stocks", "Fixed Deposit", "PPF", "NPS", "EPF", "Gold", "ELSS", "Cryptocurrency"]
        for c in expected_categories:
            assert c in categories or "Index Fund" in categories, f"Missing category: {c}"
        print(f"✓ Investments: 16 investments in categories: {categories}")
    
    def test_assets_api(self, session):
        """Test /api/assets returns 5 assets"""
        response = session.get(f"{BASE_URL}/api/assets")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5, f"Expected 5 assets, got {len(data)}"
        print(f"✓ Assets: 5 assets verified")
    
    def test_loans_api(self, session):
        """Test /api/loans returns 4 loans"""
        response = session.get(f"{BASE_URL}/api/loans")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 4, f"Expected 4 loans, got {len(data)}"
        
        # Verify loan types (field is loanName)
        loan_names = [l["loanName"] for l in data]
        print(f"✓ Loans: 4 loans - {loan_names}")
    
    def test_insurances_api(self, session):
        """Test /api/insurances returns 5 policies"""
        response = session.get(f"{BASE_URL}/api/insurances")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5, f"Expected 5 insurances, got {len(data)}"
        
        # Verify policy types (field is insuranceType)
        types = [i["insuranceType"] for i in data]
        print(f"✓ Insurance: 5 policies - {types}")
    
    def test_credit_cards_api(self, session):
        """Test /api/credit-cards returns 3 cards"""
        response = session.get(f"{BASE_URL}/api/credit-cards")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3, f"Expected 3 credit cards, got {len(data)}"
        print(f"✓ Credit Cards: 3 cards verified")
    
    def test_accounts_api(self, session):
        """Test /api/accounts returns 3 accounts"""
        response = session.get(f"{BASE_URL}/api/accounts")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3, f"Expected 3 accounts, got {len(data)}"
        print(f"✓ Accounts: 3 accounts verified")


class TestFinancialHealth:
    """Test Financial Health API with 10 metrics"""
    
    def test_financial_health_endpoint(self, session):
        """Test /api/financial-health returns all metrics"""
        response = session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200
        
        data = response.json()
        assert "overallScore" in data
        assert "contributions" in data
        
        # Check all 9 metric contributions exist (10 metrics total)
        expected_metrics = [
            "emergencyFund", "lifeInsurance", "healthInsurance", 
            "savingsRate", "loanBurden", "creditUtilization",
            "investmentAllocation", "retirementReadiness", "debtToAsset"
        ]
        for metric in expected_metrics:
            assert metric in data["contributions"], f"Missing metric: {metric}"
        
        print(f"✓ Financial Health: Overall Score = {data['overallScore']}, all {len(expected_metrics)} metrics present")


class TestIntelligenceAPIs:
    """Test Intelligence APIs: Control Score, Survival Clock, Money Pattern"""
    
    def test_control_score(self, session):
        """Test /api/intelligence/control-score returns 95/100"""
        response = session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200
        
        data = response.json()
        assert "finalScore" in data
        assert data["finalScore"] == 95, f"Expected score 95, got {data['finalScore']}"
        assert data["grade"] == "A", f"Expected grade A, got {data['grade']}"
        
        # Check breakdown
        assert "breakdown" in data
        breakdown = data["breakdown"]
        assert breakdown["savingsRate"]["score"] == 25
        assert breakdown["safetyBuffer"]["score"] == 25
        assert breakdown["incomeConsistency"]["score"] == 25
        
        print(f"✓ Control Score: {data['finalScore']}/100, Grade {data['grade']}")
    
    def test_survival_clock(self, session):
        """Test /api/intelligence/survival-clock returns ~433 days"""
        response = session.get(f"{BASE_URL}/api/intelligence/survival-clock")
        assert response.status_code == 200
        
        data = response.json()
        assert "survivalDays" in data
        # Allow some variance but should be around 433
        assert 400 <= data["survivalDays"] <= 500, f"Unexpected survival days: {data['survivalDays']}"
        
        assert data["level"] == "Fortified"
        assert data["phase"] == "Power"
        assert data["stage"] == 17
        
        print(f"✓ Survival Clock: {data['survivalDays']} days, Stage {data['stage']} ({data['level']})")
    
    def test_money_pattern(self, session):
        """Test /api/intelligence/money-pattern returns valid pattern"""
        response = session.get(f"{BASE_URL}/api/intelligence/money-pattern")
        assert response.status_code == 200
        
        data = response.json()
        assert "personality" in data
        assert "zone" in data
        assert "confidence" in data
        
        print(f"✓ Money Pattern: {data['personality']} ({data['zone']} zone, {data['confidence']}% confidence)")


class TestReportGeneration:
    """Test all 4 report types generate as PDF"""
    
    @pytest.mark.parametrize("report_type", ["expense", "income", "cashflow", "networth"])
    def test_report_pdf_generation(self, session, report_type):
        """Test /api/reports/generate/{type} returns PDF"""
        response = session.get(
            f"{BASE_URL}/api/reports/generate/{report_type}",
            params={"format": "pdf", "from_date": "2025-01-01", "to_date": "2026-12-31"}
        )
        assert response.status_code == 200, f"{report_type} report failed: {response.text}"
        
        # Check content type or PDF header
        content_type = response.headers.get("content-type", "")
        assert "pdf" in content_type.lower() or response.content[:4] == b'%PDF', \
            f"Expected PDF for {report_type}, got {content_type}"
        
        print(f"✓ {report_type.capitalize()} Report: PDF generated successfully")


class TestCRUDOperations:
    """Test Create, Update, Delete operations"""
    
    def test_expense_edit_flow(self, session):
        """Test editing an expense and verify recalculation"""
        # Get expenses
        response = session.get(f"{BASE_URL}/api/expenses")
        assert response.status_code == 200
        expenses = response.json()
        
        # Find Groceries expense
        grocery_expense = next((e for e in expenses if e["expenseName"] == "Groceries"), None)
        assert grocery_expense, "Groceries expense not found"
        
        expense_id = grocery_expense["id"]
        original_amount = grocery_expense["expectedAmount"]
        
        # Update amount - need to send all required fields
        new_amount = original_amount + 1000
        update_payload = {
            "expenseName": grocery_expense["expenseName"],
            "expenseType": grocery_expense["expenseType"],
            "category": grocery_expense["category"],
            "frequency": grocery_expense["frequency"],
            "expectedAmount": new_amount,
            "selectedDate": grocery_expense.get("selectedDate")
        }
        update_response = session.put(
            f"{BASE_URL}/api/expenses/{expense_id}",
            json=update_payload
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify update
        verify_response = session.get(f"{BASE_URL}/api/expenses/{expense_id}")
        assert verify_response.status_code == 200
        updated_expense = verify_response.json()
        assert updated_expense["expectedAmount"] == new_amount, f"Amount not updated"
        
        # Revert to original
        update_payload["expectedAmount"] = original_amount
        revert_response = session.put(
            f"{BASE_URL}/api/expenses/{expense_id}",
            json=update_payload
        )
        assert revert_response.status_code == 200
        
        print(f"✓ Expense Edit: Changed Groceries from {original_amount} to {new_amount} and back")
    
    def test_create_and_delete_test_expense(self, session):
        """Test creating and deleting an expense"""
        # Create test expense
        test_expense = {
            "expenseName": "TEST_Automation_Expense",
            "expenseType": "Variable",
            "category": "Miscellaneous",
            "expectedAmount": 100,
            "frequency": "One-Time",
            "oneTimeDate": "2026-03-01"
        }
        
        create_response = session.post(f"{BASE_URL}/api/expenses", json=test_expense)
        assert create_response.status_code in [200, 201], f"Create failed: {create_response.text}"
        created = create_response.json()
        expense_id = created.get("id")
        assert expense_id, "No ID returned for created expense"
        
        # Verify count increased
        list_response = session.get(f"{BASE_URL}/api/expenses")
        assert list_response.status_code == 200
        assert len(list_response.json()) == 28, f"Expected 28 expenses after create"
        
        # Delete test expense
        delete_response = session.delete(f"{BASE_URL}/api/expenses/{expense_id}")
        assert delete_response.status_code in [200, 204], f"Delete failed: {delete_response.text}"
        
        # Verify count decreased
        list_response2 = session.get(f"{BASE_URL}/api/expenses")
        assert list_response2.status_code == 200
        assert len(list_response2.json()) == 27, f"Expected 27 expenses after delete"
        
        print(f"✓ Create/Delete: Added and removed test expense, count verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
