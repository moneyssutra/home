"""
Test cases for:
1. Loan auto-create EMI expense when autoCreateExpense=true
2. Insurance auto-create premium expense when autoCreateExpense=true
3. GET /api/expenses/with-next-date endpoint with linked names
4. Next deduction date calculation
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestLoanAutoCreateExpense:
    """Test loan creation with auto expense creation"""
    
    def test_create_loan_with_auto_expense_enabled(self):
        """When autoCreateExpense=true, an EMI expense should be auto-created"""
        # Create a loan with autoCreateExpense=true
        loan_payload = {
            "loanName": "TEST_AutoExpense_HomeLoan",
            "loanType": "Home Loan",
            "lenderName": "HDFC Bank",
            "principalAmount": 5000000,
            "outstandingAmount": 4500000,
            "interestRate": 8.5,
            "emiAmount": 45000,
            "emiFrequency": "Monthly",
            "tenureMonths": 240,
            "startDate": "2024-01-15",
            "autoCreateExpense": True
        }
        
        # Create loan
        loan_response = requests.post(f"{BASE_URL}/api/loans", json=loan_payload)
        assert loan_response.status_code == 200, f"Loan creation failed: {loan_response.text}"
        
        loan_data = loan_response.json()
        loan_id = loan_data.get('id')
        assert loan_id, "Loan ID not returned"
        
        # Verify expense was auto-created by checking expenses
        expenses_response = requests.get(f"{BASE_URL}/api/expenses")
        assert expenses_response.status_code == 200
        
        expenses = expenses_response.json()
        emi_expense = None
        for exp in expenses:
            if exp.get('linkedLoanId') == loan_id:
                emi_expense = exp
                break
        
        assert emi_expense is not None, "EMI expense was not auto-created for the loan"
        assert emi_expense['expenseName'] == f"{loan_payload['loanName']} EMI"
        assert emi_expense['expenseType'] == "Fixed"
        assert emi_expense['category'] == "EMI"
        assert emi_expense['expectedAmount'] == loan_payload['emiAmount']
        assert emi_expense['frequency'] == "Monthly"
        assert emi_expense['linkedLoanId'] == loan_id
        # selectedDate should be from startDate day (15th)
        assert emi_expense['selectedDate'] == "15"
        
        # Cleanup - delete expense and loan
        requests.delete(f"{BASE_URL}/api/expenses/{emi_expense['id']}")
        requests.delete(f"{BASE_URL}/api/loans/{loan_id}")
        print("✓ Loan auto-create expense test PASSED")
    
    def test_create_loan_with_auto_expense_disabled(self):
        """When autoCreateExpense=false, no expense should be created"""
        loan_payload = {
            "loanName": "TEST_NoAutoExpense_CarLoan",
            "loanType": "Car Loan",
            "lenderName": "SBI",
            "principalAmount": 800000,
            "outstandingAmount": 700000,
            "interestRate": 9.0,
            "emiAmount": 18000,
            "emiFrequency": "Monthly",
            "tenureMonths": 60,
            "startDate": "2024-02-10",
            "autoCreateExpense": False
        }
        
        loan_response = requests.post(f"{BASE_URL}/api/loans", json=loan_payload)
        assert loan_response.status_code == 200
        
        loan_id = loan_response.json().get('id')
        
        # Check no expense was created for this loan
        expenses_response = requests.get(f"{BASE_URL}/api/expenses")
        expenses = expenses_response.json()
        
        linked_expense = next((e for e in expenses if e.get('linkedLoanId') == loan_id), None)
        assert linked_expense is None, "Expense should NOT be auto-created when autoCreateExpense=false"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/loans/{loan_id}")
        print("✓ Loan without auto expense test PASSED")


class TestInsuranceAutoCreateExpense:
    """Test insurance creation with auto expense creation"""
    
    def test_create_insurance_with_auto_expense_enabled(self):
        """When autoCreateExpense=true, a premium expense should be auto-created"""
        insurance_payload = {
            "insuranceType": "Life Insurance",
            "policyName": "TEST_AutoExpense_TermPlan",
            "coverageAmount": 10000000,
            "premiumAmount": 15000,
            "premiumFrequency": "Yearly",
            "startDate": "2024-03-20",
            "autoCreateExpense": True
        }
        
        insurance_response = requests.post(f"{BASE_URL}/api/insurances", json=insurance_payload)
        assert insurance_response.status_code == 200, f"Insurance creation failed: {insurance_response.text}"
        
        insurance_data = insurance_response.json()
        insurance_id = insurance_data.get('id')
        assert insurance_id, "Insurance ID not returned"
        
        # Verify expense was auto-created
        expenses_response = requests.get(f"{BASE_URL}/api/expenses")
        assert expenses_response.status_code == 200
        
        expenses = expenses_response.json()
        premium_expense = None
        for exp in expenses:
            if exp.get('linkedInsuranceId') == insurance_id:
                premium_expense = exp
                break
        
        assert premium_expense is not None, "Premium expense was not auto-created for the insurance"
        assert premium_expense['expenseName'] == f"{insurance_payload['policyName']} Premium"
        assert premium_expense['expenseType'] == "Fixed"
        assert premium_expense['category'] == "Insurance"
        assert premium_expense['expectedAmount'] == insurance_payload['premiumAmount']
        assert premium_expense['frequency'] == "Yearly"
        assert premium_expense['linkedInsuranceId'] == insurance_id
        # selectedDate should be from startDate day (20th)
        assert premium_expense['selectedDate'] == "20"
        # selectedMonth should be March for yearly
        assert premium_expense['selectedMonth'] == "March"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/expenses/{premium_expense['id']}")
        requests.delete(f"{BASE_URL}/api/insurances/{insurance_id}")
        print("✓ Insurance auto-create expense test PASSED")
    
    def test_create_insurance_with_monthly_premium(self):
        """Insurance with monthly premium should create monthly expense"""
        insurance_payload = {
            "insuranceType": "Health Insurance",
            "policyName": "TEST_MonthlyPremium_HealthPlan",
            "coverageAmount": 500000,
            "premiumAmount": 2000,
            "premiumFrequency": "Monthly",
            "startDate": "2024-05-05",
            "autoCreateExpense": True
        }
        
        insurance_response = requests.post(f"{BASE_URL}/api/insurances", json=insurance_payload)
        assert insurance_response.status_code == 200
        
        insurance_id = insurance_response.json().get('id')
        
        # Get expenses
        expenses_response = requests.get(f"{BASE_URL}/api/expenses")
        expenses = expenses_response.json()
        
        premium_expense = next((e for e in expenses if e.get('linkedInsuranceId') == insurance_id), None)
        
        assert premium_expense is not None
        assert premium_expense['frequency'] == "Monthly"
        assert premium_expense['selectedDate'] == "5"
        assert premium_expense['selectedMonth'] is None  # Monthly doesn't need month
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/expenses/{premium_expense['id']}")
        requests.delete(f"{BASE_URL}/api/insurances/{insurance_id}")
        print("✓ Insurance monthly premium expense test PASSED")
    
    def test_create_insurance_with_auto_expense_disabled(self):
        """When autoCreateExpense=false, no expense should be created"""
        insurance_payload = {
            "insuranceType": "Vehicle Insurance",
            "policyName": "TEST_NoAutoExpense_CarInsurance",
            "coverageAmount": 50000,
            "premiumAmount": 8000,
            "premiumFrequency": "Yearly",
            "startDate": "2024-06-01",
            "autoCreateExpense": False
        }
        
        insurance_response = requests.post(f"{BASE_URL}/api/insurances", json=insurance_payload)
        assert insurance_response.status_code == 200
        
        insurance_id = insurance_response.json().get('id')
        
        # Check no expense was created
        expenses_response = requests.get(f"{BASE_URL}/api/expenses")
        expenses = expenses_response.json()
        
        linked_expense = next((e for e in expenses if e.get('linkedInsuranceId') == insurance_id), None)
        assert linked_expense is None, "Expense should NOT be auto-created when autoCreateExpense=false"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/insurances/{insurance_id}")
        print("✓ Insurance without auto expense test PASSED")


class TestExpensesWithNextDate:
    """Test GET /api/expenses/with-next-date endpoint"""
    
    def test_get_expenses_with_next_date_endpoint_exists(self):
        """Verify the endpoint exists and returns data"""
        response = requests.get(f"{BASE_URL}/api/expenses/with-next-date")
        assert response.status_code == 200, f"Endpoint failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print("✓ Expenses with-next-date endpoint exists and returns list")
    
    def test_expenses_include_next_deduction_date(self):
        """Expenses should include nextDeductionDate field"""
        # Create a monthly expense
        expense_payload = {
            "expenseName": "TEST_NextDate_Rent",
            "expenseType": "Fixed",
            "category": "Housing",
            "expectedAmount": 25000,
            "frequency": "Monthly",
            "selectedDate": "10"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/expenses", json=expense_payload)
        assert create_response.status_code == 200
        
        expense_id = create_response.json().get('id')
        
        # Get expenses with next date
        response = requests.get(f"{BASE_URL}/api/expenses/with-next-date")
        assert response.status_code == 200
        
        expenses = response.json()
        test_expense = next((e for e in expenses if e.get('id') == expense_id), None)
        
        assert test_expense is not None
        assert 'nextDeductionDate' in test_expense, "nextDeductionDate field missing"
        
        # Verify it's a valid date format (YYYY-MM-DD)
        next_date = test_expense['nextDeductionDate']
        if next_date:
            try:
                datetime.fromisoformat(next_date)
            except ValueError:
                pytest.fail(f"Invalid date format for nextDeductionDate: {next_date}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/expenses/{expense_id}")
        print("✓ Expenses include nextDeductionDate field")
    
    def test_linked_loan_name_populated(self):
        """Expenses linked to loans should have linkedLoanName populated"""
        # Create a loan
        loan_payload = {
            "loanName": "TEST_LinkedName_PersonalLoan",
            "loanType": "Personal Loan",
            "lenderName": "ICICI",
            "principalAmount": 300000,
            "outstandingAmount": 250000,
            "interestRate": 12,
            "emiAmount": 10000,
            "startDate": "2024-07-01",
            "autoCreateExpense": True
        }
        
        loan_response = requests.post(f"{BASE_URL}/api/loans", json=loan_payload)
        assert loan_response.status_code == 200
        
        loan_id = loan_response.json().get('id')
        
        # Get expenses with next date
        response = requests.get(f"{BASE_URL}/api/expenses/with-next-date")
        expenses = response.json()
        
        linked_expense = next((e for e in expenses if e.get('linkedLoanId') == loan_id), None)
        
        assert linked_expense is not None, "Linked expense should exist"
        assert 'linkedLoanName' in linked_expense, "linkedLoanName field missing"
        assert linked_expense['linkedLoanName'] == loan_payload['loanName'], \
            f"Expected '{loan_payload['loanName']}', got '{linked_expense.get('linkedLoanName')}'"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/expenses/{linked_expense['id']}")
        requests.delete(f"{BASE_URL}/api/loans/{loan_id}")
        print("✓ linkedLoanName is populated correctly")
    
    def test_linked_insurance_name_populated(self):
        """Expenses linked to insurance should have linkedInsuranceName populated"""
        # Create an insurance
        insurance_payload = {
            "insuranceType": "Life Insurance",
            "policyName": "TEST_LinkedName_LifePlan",
            "coverageAmount": 5000000,
            "premiumAmount": 20000,
            "premiumFrequency": "Yearly",
            "startDate": "2024-08-15",
            "autoCreateExpense": True
        }
        
        insurance_response = requests.post(f"{BASE_URL}/api/insurances", json=insurance_payload)
        assert insurance_response.status_code == 200
        
        insurance_id = insurance_response.json().get('id')
        
        # Get expenses with next date
        response = requests.get(f"{BASE_URL}/api/expenses/with-next-date")
        expenses = response.json()
        
        linked_expense = next((e for e in expenses if e.get('linkedInsuranceId') == insurance_id), None)
        
        assert linked_expense is not None, "Linked expense should exist"
        assert 'linkedInsuranceName' in linked_expense, "linkedInsuranceName field missing"
        assert linked_expense['linkedInsuranceName'] == insurance_payload['policyName'], \
            f"Expected '{insurance_payload['policyName']}', got '{linked_expense.get('linkedInsuranceName')}'"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/expenses/{linked_expense['id']}")
        requests.delete(f"{BASE_URL}/api/insurances/{insurance_id}")
        print("✓ linkedInsuranceName is populated correctly")


class TestNextDeductionDateCalculation:
    """Test different frequency calculation for next deduction date"""
    
    def test_daily_expense_next_date(self):
        """Daily expense should return today's date"""
        expense_payload = {
            "expenseName": "TEST_Daily_Coffee",
            "expenseType": "Variable",
            "category": "Food",
            "expectedAmount": 100,
            "frequency": "Daily"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/expenses", json=expense_payload)
        expense_id = create_response.json().get('id')
        
        response = requests.get(f"{BASE_URL}/api/expenses/with-next-date")
        expenses = response.json()
        
        test_expense = next((e for e in expenses if e.get('id') == expense_id), None)
        assert test_expense is not None
        assert test_expense['nextDeductionDate'] == datetime.now().strftime('%Y-%m-%d')
        
        requests.delete(f"{BASE_URL}/api/expenses/{expense_id}")
        print("✓ Daily expense next date calculation correct")
    
    def test_weekly_expense_next_date(self):
        """Weekly expense should calculate next occurrence of selected day"""
        expense_payload = {
            "expenseName": "TEST_Weekly_Grocery",
            "expenseType": "Variable",
            "category": "Food",
            "expectedAmount": 2000,
            "frequency": "Weekly",
            "selectedDay": "Monday"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/expenses", json=expense_payload)
        expense_id = create_response.json().get('id')
        
        response = requests.get(f"{BASE_URL}/api/expenses/with-next-date")
        expenses = response.json()
        
        test_expense = next((e for e in expenses if e.get('id') == expense_id), None)
        assert test_expense is not None
        next_date = test_expense['nextDeductionDate']
        assert next_date is not None
        
        # Verify it's a Monday
        next_date_obj = datetime.fromisoformat(next_date)
        assert next_date_obj.weekday() == 0, f"Expected Monday (0), got {next_date_obj.weekday()}"
        
        requests.delete(f"{BASE_URL}/api/expenses/{expense_id}")
        print("✓ Weekly expense next date calculation correct")
    
    def test_monthly_expense_next_date(self):
        """Monthly expense should calculate next occurrence of selected date"""
        expense_payload = {
            "expenseName": "TEST_Monthly_Electricity",
            "expenseType": "Fixed",
            "category": "Utilities",
            "expectedAmount": 3000,
            "frequency": "Monthly",
            "selectedDate": "15"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/expenses", json=expense_payload)
        expense_id = create_response.json().get('id')
        
        response = requests.get(f"{BASE_URL}/api/expenses/with-next-date")
        expenses = response.json()
        
        test_expense = next((e for e in expenses if e.get('id') == expense_id), None)
        assert test_expense is not None
        next_date = test_expense['nextDeductionDate']
        assert next_date is not None
        
        # Verify it's on the 15th
        next_date_obj = datetime.fromisoformat(next_date)
        assert next_date_obj.day == 15, f"Expected day 15, got {next_date_obj.day}"
        
        requests.delete(f"{BASE_URL}/api/expenses/{expense_id}")
        print("✓ Monthly expense next date calculation correct")
    
    def test_yearly_expense_next_date(self):
        """Yearly expense should calculate next occurrence of selected month and date"""
        expense_payload = {
            "expenseName": "TEST_Yearly_PropertyTax",
            "expenseType": "Fixed",
            "category": "Housing",
            "expectedAmount": 50000,
            "frequency": "Yearly",
            "selectedMonth": "April",
            "selectedDate": "10"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/expenses", json=expense_payload)
        expense_id = create_response.json().get('id')
        
        response = requests.get(f"{BASE_URL}/api/expenses/with-next-date")
        expenses = response.json()
        
        test_expense = next((e for e in expenses if e.get('id') == expense_id), None)
        assert test_expense is not None
        next_date = test_expense['nextDeductionDate']
        assert next_date is not None
        
        # Verify month and day
        next_date_obj = datetime.fromisoformat(next_date)
        assert next_date_obj.month == 4, f"Expected April (4), got {next_date_obj.month}"
        assert next_date_obj.day == 10, f"Expected day 10, got {next_date_obj.day}"
        
        requests.delete(f"{BASE_URL}/api/expenses/{expense_id}")
        print("✓ Yearly expense next date calculation correct")


class TestCleanup:
    """Cleanup any leftover test data"""
    
    def test_cleanup_test_expenses(self):
        """Remove any TEST_ prefixed expenses"""
        response = requests.get(f"{BASE_URL}/api/expenses")
        expenses = response.json()
        
        for exp in expenses:
            if exp.get('expenseName', '').startswith('TEST_'):
                requests.delete(f"{BASE_URL}/api/expenses/{exp['id']}")
        
        print("✓ Test expenses cleaned up")
    
    def test_cleanup_test_loans(self):
        """Remove any TEST_ prefixed loans"""
        response = requests.get(f"{BASE_URL}/api/loans")
        loans = response.json()
        
        for loan in loans:
            if loan.get('loanName', '').startswith('TEST_'):
                requests.delete(f"{BASE_URL}/api/loans/{loan['id']}")
        
        print("✓ Test loans cleaned up")
    
    def test_cleanup_test_insurances(self):
        """Remove any TEST_ prefixed insurances"""
        response = requests.get(f"{BASE_URL}/api/insurances")
        insurances = response.json()
        
        for ins in insurances:
            if ins.get('policyName', '').startswith('TEST_'):
                requests.delete(f"{BASE_URL}/api/insurances/{ins['id']}")
        
        print("✓ Test insurances cleaned up")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
