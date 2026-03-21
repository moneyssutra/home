"""
Test Pydantic field_validators for negative financial values.
Backend Refactoring Phase 2 - Validation Testing

Tests that all financial endpoints reject negative values with 422 validation errors.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestNegativeValueValidation:
    """Test that negative financial values are rejected with 422 errors."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookie for authenticated requests."""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test@moneysutra.com", "password": "Test@123"}
        )
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
        yield
        self.session.close()

    # ============ EXPENSE VALIDATION ============
    def test_expense_negative_expected_amount_rejected(self):
        """POST /api/expenses - should reject negative expectedAmount with 422"""
        response = self.session.post(
            f"{BASE_URL}/api/expenses",
            json={
                "expenseName": "TEST_Negative_Expense",
                "category": "Housing",
                "expenseType": "Fixed",
                "expectedAmount": -100,  # NEGATIVE - should be rejected
                "frequency": "Monthly"
            }
        )
        print(f"Expense negative amount response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 422, f"Expected 422 for negative expectedAmount, got {response.status_code}"
        # Verify error message mentions the field
        error_detail = response.json()
        assert "detail" in error_detail, "Expected 'detail' in validation error response"

    def test_expense_zero_amount_allowed(self):
        """POST /api/expenses - zero amount should be allowed (edge case)"""
        response = self.session.post(
            f"{BASE_URL}/api/expenses",
            json={
                "expenseName": "TEST_Zero_Expense",
                "category": "Housing",
                "expenseType": "Fixed",
                "expectedAmount": 0,  # Zero - should be allowed
                "frequency": "Monthly"
            }
        )
        print(f"Expense zero amount response: {response.status_code}")
        # Zero might be allowed or rejected depending on business logic
        # Just document the behavior
        if response.status_code == 200:
            print("Zero amount is ALLOWED for expenses")
        elif response.status_code == 422:
            print("Zero amount is REJECTED for expenses")

    # ============ INCOME VALIDATION ============
    def test_income_negative_expected_amount_rejected(self):
        """POST /api/income/sources - should reject negative expectedAmount with 422"""
        response = self.session.post(
            f"{BASE_URL}/api/income/sources",
            json={
                "type": "Salary",
                "name": "TEST_Negative_Income",
                "expectedAmount": -500,  # NEGATIVE - should be rejected
                "frequency": "Monthly"
            }
        )
        print(f"Income negative amount response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 422, f"Expected 422 for negative expectedAmount, got {response.status_code}"

    # ============ ASSET VALIDATION ============
    def test_asset_negative_current_value_rejected(self):
        """POST /api/assets - should reject negative currentValue with 422"""
        response = self.session.post(
            f"{BASE_URL}/api/assets",
            json={
                "assetType": "Residential Property",
                "assetName": "TEST_Negative_Asset",
                "currentValue": -1000  # NEGATIVE - should be rejected
            }
        )
        print(f"Asset negative currentValue response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 422, f"Expected 422 for negative currentValue, got {response.status_code}"

    def test_asset_negative_purchase_value_rejected(self):
        """POST /api/assets - should reject negative purchaseValue with 422"""
        response = self.session.post(
            f"{BASE_URL}/api/assets",
            json={
                "assetType": "Residential Property",
                "assetName": "TEST_Negative_Purchase_Asset",
                "currentValue": 1000000,
                "purchaseValue": -500000  # NEGATIVE - should be rejected
            }
        )
        print(f"Asset negative purchaseValue response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 422, f"Expected 422 for negative purchaseValue, got {response.status_code}"

    # ============ INSURANCE VALIDATION ============
    def test_insurance_negative_coverage_amount_rejected(self):
        """POST /api/insurance - should reject negative coverageAmount with 422"""
        response = self.session.post(
            f"{BASE_URL}/api/insurance",
            json={
                "insuranceType": "Health Insurance",
                "policyName": "TEST_Negative_Insurance",
                "coverageAmount": -5000,  # NEGATIVE - should be rejected
                "premiumAmount": 1000,
                "premiumFrequency": "Monthly",
                "startDate": "2025-01-01"
            }
        )
        print(f"Insurance negative coverageAmount response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 422, f"Expected 422 for negative coverageAmount, got {response.status_code}"

    def test_insurance_negative_premium_amount_rejected(self):
        """POST /api/insurance - should reject negative premiumAmount with 422"""
        response = self.session.post(
            f"{BASE_URL}/api/insurance",
            json={
                "insuranceType": "Health Insurance",
                "policyName": "TEST_Negative_Premium_Insurance",
                "coverageAmount": 500000,
                "premiumAmount": -1000,  # NEGATIVE - should be rejected
                "premiumFrequency": "Monthly",
                "startDate": "2025-01-01"
            }
        )
        print(f"Insurance negative premiumAmount response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 422, f"Expected 422 for negative premiumAmount, got {response.status_code}"

    # ============ ACCOUNT VALIDATION ============
    def test_account_negative_credit_limit_rejected(self):
        """POST /api/accounts - should reject negative creditLimit with 422"""
        response = self.session.post(
            f"{BASE_URL}/api/accounts",
            json={
                "accountName": "TEST_Negative_Credit_Account",
                "accountType": "Credit Card",
                "currentBalance": 0,
                "creditLimit": -100  # NEGATIVE - should be rejected
            }
        )
        print(f"Account negative creditLimit response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 422, f"Expected 422 for negative creditLimit, got {response.status_code}"

    # ============ CREDIT CARD VALIDATION ============
    def test_credit_card_negative_credit_limit_rejected(self):
        """POST /api/credit-cards - should reject negative creditLimit with 422"""
        response = self.session.post(
            f"{BASE_URL}/api/credit-cards",
            json={
                "cardName": "TEST_Negative_CC",
                "bankName": "Test Bank",
                "creditLimit": -100  # NEGATIVE - should be rejected
            }
        )
        print(f"Credit card negative creditLimit response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 422, f"Expected 422 for negative creditLimit, got {response.status_code}"

    def test_credit_card_negative_outstanding_rejected(self):
        """POST /api/credit-cards - should reject negative outstandingAmount with 422"""
        response = self.session.post(
            f"{BASE_URL}/api/credit-cards",
            json={
                "cardName": "TEST_Negative_Outstanding_CC",
                "bankName": "Test Bank",
                "creditLimit": 100000,
                "outstandingAmount": -5000  # NEGATIVE - should be rejected
            }
        )
        print(f"Credit card negative outstandingAmount response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 422, f"Expected 422 for negative outstandingAmount, got {response.status_code}"

    # ============ LOAN VALIDATION ============
    def test_loan_negative_principal_rejected(self):
        """POST /api/loans - should reject negative principalAmount with 422"""
        response = self.session.post(
            f"{BASE_URL}/api/loans",
            json={
                "loanType": "Personal Loan",
                "loanName": "TEST_Negative_Loan",
                "principalAmount": -100,  # NEGATIVE - should be rejected
                "outstandingAmount": 100,
                "interestRate": 10,
                "emiAmount": 1000,
                "startDate": "2025-01-01"
            }
        )
        print(f"Loan negative principalAmount response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 422, f"Expected 422 for negative principalAmount, got {response.status_code}"

    def test_loan_negative_emi_rejected(self):
        """POST /api/loans - should reject negative emiAmount with 422"""
        response = self.session.post(
            f"{BASE_URL}/api/loans",
            json={
                "loanType": "Personal Loan",
                "loanName": "TEST_Negative_EMI_Loan",
                "principalAmount": 100000,
                "outstandingAmount": 100000,
                "interestRate": 10,
                "emiAmount": -1000,  # NEGATIVE - should be rejected
                "startDate": "2025-01-01"
            }
        )
        print(f"Loan negative emiAmount response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 422, f"Expected 422 for negative emiAmount, got {response.status_code}"

    # ============ INVESTMENT VALIDATION ============
    def test_investment_negative_principal_rejected(self):
        """POST /api/investments - should reject negative principal with 422"""
        response = self.session.post(
            f"{BASE_URL}/api/investments",
            json={
                "investmentCategory": "Mutual Fund",
                "investmentMode": "SIP",
                "name": "TEST_Negative_Investment",
                "principal": -100,  # NEGATIVE - should be rejected
                "currentValue": 100,
                "startDate": "2025-01-01"
            }
        )
        print(f"Investment negative principal response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 422, f"Expected 422 for negative principal, got {response.status_code}"

    def test_investment_negative_current_value_rejected(self):
        """POST /api/investments - should reject negative currentValue with 422"""
        response = self.session.post(
            f"{BASE_URL}/api/investments",
            json={
                "investmentCategory": "Mutual Fund",
                "investmentMode": "Lump Sum",
                "name": "TEST_Negative_CurrentValue_Investment",
                "principal": 10000,
                "currentValue": -5000,  # NEGATIVE - should be rejected
                "startDate": "2025-01-01"
            }
        )
        print(f"Investment negative currentValue response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 422, f"Expected 422 for negative currentValue, got {response.status_code}"


class TestN1QueryFixes:
    """Test that N+1 query fixes are working correctly."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookie for authenticated requests."""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test@moneysutra.com", "password": "Test@123"}
        )
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
        yield
        self.session.close()

    def test_expenses_with_next_date_returns_linked_names(self):
        """GET /api/expenses/with-next-date - should return linkedLoanName and linkedInsuranceName"""
        response = self.session.get(f"{BASE_URL}/api/expenses/with-next-date")
        print(f"Expenses with-next-date response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"Total expenses returned: {len(data)}")
        
        # Check if any expenses have linked loan/insurance names populated
        linked_loan_count = sum(1 for e in data if e.get('linkedLoanName'))
        linked_insurance_count = sum(1 for e in data if e.get('linkedInsuranceName'))
        print(f"Expenses with linkedLoanName: {linked_loan_count}")
        print(f"Expenses with linkedInsuranceName: {linked_insurance_count}")
        
        # Verify structure - expenses with linkedLoanId should have linkedLoanName
        for expense in data:
            if expense.get('linkedLoanId'):
                # If there's a linked loan ID, the name should be populated (if loan exists)
                print(f"Expense '{expense.get('expenseName')}' has linkedLoanId: {expense.get('linkedLoanId')}, linkedLoanName: {expense.get('linkedLoanName')}")
            if expense.get('linkedInsuranceId'):
                print(f"Expense '{expense.get('expenseName')}' has linkedInsuranceId: {expense.get('linkedInsuranceId')}, linkedInsuranceName: {expense.get('linkedInsuranceName')}")

    def test_investments_list_returns_correctly(self):
        """GET /api/investments - should return list correctly after bulk query refactor"""
        response = self.session.get(f"{BASE_URL}/api/investments")
        print(f"Investments list response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"Total investments returned: {len(data)}")
        
        # Verify each investment has required fields
        for inv in data[:5]:  # Check first 5
            assert 'id' in inv, "Investment missing 'id'"
            assert 'name' in inv, "Investment missing 'name'"
            assert 'investmentCategory' in inv, "Investment missing 'investmentCategory'"
            print(f"Investment: {inv.get('name')} - Category: {inv.get('investmentCategory')}")


class TestPositiveValueCreation:
    """Test that positive values work correctly (sanity check)."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookie for authenticated requests."""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test@moneysutra.com", "password": "Test@123"}
        )
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
        yield
        self.session.close()

    def test_expense_positive_amount_accepted(self):
        """POST /api/expenses - positive amount should be accepted"""
        response = self.session.post(
            f"{BASE_URL}/api/expenses",
            json={
                "expenseName": "TEST_Positive_Expense",
                "category": "Housing",
                "expenseType": "Fixed",
                "expectedAmount": 5000,  # POSITIVE - should be accepted
                "frequency": "Monthly"
            }
        )
        print(f"Expense positive amount response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200 for positive amount, got {response.status_code}"
        
        # Cleanup - delete the test expense
        if response.status_code == 200:
            expense_id = response.json().get('id')
            if expense_id:
                self.session.delete(f"{BASE_URL}/api/expenses/{expense_id}")

    def test_income_positive_amount_accepted(self):
        """POST /api/income/sources - positive amount should be accepted"""
        response = self.session.post(
            f"{BASE_URL}/api/income/sources",
            json={
                "type": "Salary",
                "name": "TEST_Positive_Income",
                "expectedAmount": 50000,  # POSITIVE - should be accepted
                "frequency": "Monthly"
            }
        )
        print(f"Income positive amount response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200 for positive amount, got {response.status_code}"
        
        # Cleanup
        if response.status_code == 200:
            income_id = response.json().get('id')
            if income_id:
                self.session.delete(f"{BASE_URL}/api/income/sources/{income_id}")
