"""
Test Investment Module - SIP Expense Auto Creation Feature
Tests:
1. Investment categories include PPF and NPS
2. Investment creation with autoCreateExpense=true creates linked expense
3. Linked expense has correct name format 'SIP - {name}'
4. Linked expense has category 'Investments' and correct frequency
5. sipSelectedDay and sipSelectedDate fields work correctly
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

class TestInvestmentSIPExpense:
    """Test Investment SIP Auto Expense Creation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - authenticate and get session token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test",
            "remember_me": False
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        login_data = login_response.json()
        self.session_token = login_data.get("session_token")
        self.session.cookies.set("session_token", self.session_token)
        
        # Store created IDs for cleanup
        self.created_investment_ids = []
        self.created_expense_ids = []
        
        yield
        
        # Cleanup created test data
        for inv_id in self.created_investment_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/investments/{inv_id}")
            except:
                pass
        for exp_id in self.created_expense_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/expenses/{exp_id}")
            except:
                pass
    
    # ============ API Health Tests ============
    def test_api_health(self):
        """Test API is accessible"""
        response = self.session.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("✓ API health check passed")
    
    def test_investments_endpoint_accessible(self):
        """Test investments endpoint is accessible"""
        response = self.session.get(f"{BASE_URL}/api/investments")
        assert response.status_code == 200
        print("✓ Investments endpoint accessible")
    
    def test_expenses_endpoint_accessible(self):
        """Test expenses endpoint is accessible"""
        response = self.session.get(f"{BASE_URL}/api/expenses")
        assert response.status_code == 200
        print("✓ Expenses endpoint accessible")
    
    # ============ Investment Category Tests ============
    def test_create_ppf_investment(self):
        """Test PPF investment can be created"""
        test_name = f"TEST_PPF_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "PPF",
            "investmentMode": "Growth with Maturity",
            "name": test_name,
            "principal": 150000,
            "currentValue": 165000,
            "startDate": "2024-01-01",
            "returnRate": 7.1,
            "lockInPeriod": 15
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["investmentCategory"] == "PPF"
        assert data["name"] == test_name
        self.created_investment_ids.append(data["id"])
        print(f"✓ PPF investment created: {data['id']}")
    
    def test_create_nps_investment(self):
        """Test NPS investment can be created"""
        test_name = f"TEST_NPS_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "NPS",
            "investmentMode": "Growth with Maturity",
            "name": test_name,
            "principal": 200000,
            "currentValue": 220000,
            "startDate": "2024-01-01",
            "returnRate": 9.5,
            "investmentFrequency": "Monthly",
            "sipAmount": 5000
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["investmentCategory"] == "NPS"
        assert data["name"] == test_name
        self.created_investment_ids.append(data["id"])
        print(f"✓ NPS investment created: {data['id']}")
    
    # ============ SIP Auto Expense Creation Tests ============
    def test_create_investment_with_auto_expense_monthly(self):
        """Test creating investment with autoCreateExpense=true and Monthly frequency"""
        test_name = f"TEST_SIP_Monthly_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Mutual Fund",
            "investmentMode": "Growth Only",
            "name": test_name,
            "principal": 50000,
            "currentValue": 52000,
            "startDate": "2024-01-01",
            "investmentFrequency": "Monthly",
            "sipAmount": 5000,
            "sipSelectedDate": "15",
            "autoCreateExpense": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        investment = response.json()
        self.created_investment_ids.append(investment["id"])
        
        # Verify investment has linkedExpenseId
        assert investment.get("linkedExpenseId") is not None, "linkedExpenseId should be set"
        linked_expense_id = investment["linkedExpenseId"]
        self.created_expense_ids.append(linked_expense_id)
        
        # Verify linked expense was created
        expense_response = self.session.get(f"{BASE_URL}/api/expenses/{linked_expense_id}")
        assert expense_response.status_code == 200, f"Linked expense not found: {expense_response.text}"
        
        expense = expense_response.json()
        
        # Verify expense properties
        expected_name = f"SIP - {test_name}"
        assert expense["expenseName"] == expected_name, f"Expected name '{expected_name}', got '{expense['expenseName']}'"
        assert expense["category"] == "Investments", f"Expected category 'Investments', got '{expense['category']}'"
        assert expense["frequency"] == "Monthly", f"Expected frequency 'Monthly', got '{expense['frequency']}'"
        assert expense["expectedAmount"] == 5000, f"Expected amount 5000, got {expense['expectedAmount']}"
        assert expense["selectedDate"] == "15", f"Expected selectedDate '15', got '{expense.get('selectedDate')}'"
        assert expense["linkedInvestmentId"] == investment["id"], "Expense should be linked back to investment"
        
        print(f"✓ Monthly SIP with auto-expense created: Investment={investment['id']}, Expense={linked_expense_id}")
        print(f"  - Expense name: {expense['expenseName']}")
        print(f"  - Expense category: {expense['category']}")
        print(f"  - Expense frequency: {expense['frequency']}")
        print(f"  - Expense selectedDate: {expense.get('selectedDate')}")
    
    def test_create_investment_with_auto_expense_weekly(self):
        """Test creating investment with autoCreateExpense=true and Weekly frequency"""
        test_name = f"TEST_SIP_Weekly_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Mutual Fund",
            "investmentMode": "Growth Only",
            "name": test_name,
            "principal": 10000,
            "currentValue": 10500,
            "startDate": "2024-01-01",
            "investmentFrequency": "Weekly",
            "sipAmount": 1000,
            "sipSelectedDay": "Mon",
            "autoCreateExpense": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        investment = response.json()
        self.created_investment_ids.append(investment["id"])
        
        # Verify linkedExpenseId
        assert investment.get("linkedExpenseId") is not None, "linkedExpenseId should be set"
        linked_expense_id = investment["linkedExpenseId"]
        self.created_expense_ids.append(linked_expense_id)
        
        # Verify expense
        expense_response = self.session.get(f"{BASE_URL}/api/expenses/{linked_expense_id}")
        assert expense_response.status_code == 200
        
        expense = expense_response.json()
        assert expense["expenseName"] == f"SIP - {test_name}"
        assert expense["category"] == "Investments"
        assert expense["frequency"] == "Weekly"
        assert expense["selectedDay"] == "Mon", f"Expected selectedDay 'Mon', got '{expense.get('selectedDay')}'"
        assert expense["expectedAmount"] == 1000
        
        print(f"✓ Weekly SIP with auto-expense created: Investment={investment['id']}")
        print(f"  - Expense selectedDay: {expense.get('selectedDay')}")
    
    def test_create_investment_with_auto_expense_quarterly(self):
        """Test creating investment with autoCreateExpense=true and Quarterly frequency"""
        test_name = f"TEST_SIP_Quarterly_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "ETF",
            "investmentMode": "Growth Only",
            "name": test_name,
            "principal": 100000,
            "currentValue": 105000,
            "startDate": "2024-01-01",
            "investmentFrequency": "Quarterly",
            "sipAmount": 25000,
            "sipSelectedDate": "5",
            "autoCreateExpense": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        investment = response.json()
        self.created_investment_ids.append(investment["id"])
        
        assert investment.get("linkedExpenseId") is not None
        linked_expense_id = investment["linkedExpenseId"]
        self.created_expense_ids.append(linked_expense_id)
        
        expense_response = self.session.get(f"{BASE_URL}/api/expenses/{linked_expense_id}")
        expense = expense_response.json()
        
        assert expense["frequency"] == "Quarterly"
        assert expense["selectedDate"] == "5"
        
        print(f"✓ Quarterly SIP with auto-expense created")
    
    def test_create_investment_without_auto_expense(self):
        """Test creating investment without autoCreateExpense does NOT create expense"""
        test_name = f"TEST_NoExpense_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Mutual Fund",
            "investmentMode": "Growth Only",
            "name": test_name,
            "principal": 50000,
            "currentValue": 52000,
            "startDate": "2024-01-01",
            "investmentFrequency": "Monthly",
            "sipAmount": 5000,
            "sipSelectedDate": "10",
            "autoCreateExpense": False  # Explicitly disabled
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        investment = response.json()
        self.created_investment_ids.append(investment["id"])
        
        # Verify NO linkedExpenseId
        assert investment.get("linkedExpenseId") is None, "linkedExpenseId should be None when autoCreateExpense=false"
        
        print(f"✓ Investment without auto-expense correctly has no linked expense")
    
    def test_create_investment_auto_expense_without_frequency_no_expense(self):
        """Test that autoCreateExpense=true without frequency doesn't create expense"""
        test_name = f"TEST_NoFreq_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Stocks",
            "investmentMode": "Growth Only",
            "name": test_name,
            "principal": 50000,
            "currentValue": 52000,
            "startDate": "2024-01-01",
            "autoCreateExpense": True,  # Enabled but no frequency/sipAmount
            "sipAmount": 0  # Zero amount
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        investment = response.json()
        self.created_investment_ids.append(investment["id"])
        
        # No expense should be created without frequency and sipAmount
        assert investment.get("linkedExpenseId") is None, "No expense should be created without frequency and sipAmount"
        
        print(f"✓ Investment with autoCreateExpense but no frequency/sipAmount has no linked expense")
    
    # ============ SIP Field Validation Tests ============
    def test_sip_selected_day_options(self):
        """Test all valid day options for weekly SIP"""
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        
        for day in days:
            test_name = f"TEST_Day_{day}_{uuid.uuid4().hex[:8]}"
            payload = {
                "investmentCategory": "Mutual Fund",
                "investmentMode": "Growth Only",
                "name": test_name,
                "principal": 10000,
                "currentValue": 10000,
                "startDate": "2024-01-01",
                "investmentFrequency": "Weekly",
                "sipAmount": 500,
                "sipSelectedDay": day,
                "autoCreateExpense": True
            }
            
            response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
            assert response.status_code == 200, f"Failed for day {day}: {response.text}"
            
            investment = response.json()
            self.created_investment_ids.append(investment["id"])
            if investment.get("linkedExpenseId"):
                self.created_expense_ids.append(investment["linkedExpenseId"])
            
            assert investment.get("sipSelectedDay") == day, f"sipSelectedDay should be {day}"
        
        print(f"✓ All day options tested: {days}")
    
    def test_sip_selected_date_range(self):
        """Test sipSelectedDate accepts values 1-28"""
        for date in ["1", "15", "28"]:
            test_name = f"TEST_Date_{date}_{uuid.uuid4().hex[:8]}"
            payload = {
                "investmentCategory": "Mutual Fund",
                "investmentMode": "Growth Only",
                "name": test_name,
                "principal": 10000,
                "currentValue": 10000,
                "startDate": "2024-01-01",
                "investmentFrequency": "Monthly",
                "sipAmount": 500,
                "sipSelectedDate": date,
                "autoCreateExpense": True
            }
            
            response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
            assert response.status_code == 200, f"Failed for date {date}: {response.text}"
            
            investment = response.json()
            self.created_investment_ids.append(investment["id"])
            if investment.get("linkedExpenseId"):
                self.created_expense_ids.append(investment["linkedExpenseId"])
            
            assert investment.get("sipSelectedDate") == date, f"sipSelectedDate should be {date}"
        
        print(f"✓ Date range 1-28 tested successfully")
    
    # ============ Investment Frequency Options Tests ============
    def test_yearly_frequency_sip(self):
        """Test Yearly frequency SIP"""
        test_name = f"TEST_Yearly_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "PPF",
            "investmentMode": "Growth with Maturity",
            "name": test_name,
            "principal": 150000,
            "currentValue": 150000,
            "startDate": "2024-01-01",
            "investmentFrequency": "Yearly",
            "sipAmount": 150000,
            "sipSelectedDate": "1",
            "autoCreateExpense": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200
        
        investment = response.json()
        self.created_investment_ids.append(investment["id"])
        
        assert investment.get("linkedExpenseId") is not None
        linked_expense_id = investment["linkedExpenseId"]
        self.created_expense_ids.append(linked_expense_id)
        
        expense_response = self.session.get(f"{BASE_URL}/api/expenses/{linked_expense_id}")
        expense = expense_response.json()
        
        assert expense["frequency"] == "Yearly"
        print(f"✓ Yearly SIP with auto-expense created")
    
    def test_half_yearly_frequency_sip(self):
        """Test Half-Yearly frequency SIP"""
        test_name = f"TEST_HalfYearly_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "NPS",
            "investmentMode": "Growth with Maturity",
            "name": test_name,
            "principal": 50000,
            "currentValue": 50000,
            "startDate": "2024-01-01",
            "investmentFrequency": "Half-Yearly",
            "sipAmount": 25000,
            "sipSelectedDate": "10",
            "autoCreateExpense": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200
        
        investment = response.json()
        self.created_investment_ids.append(investment["id"])
        
        if investment.get("linkedExpenseId"):
            self.created_expense_ids.append(investment["linkedExpenseId"])
            expense_response = self.session.get(f"{BASE_URL}/api/expenses/{investment['linkedExpenseId']}")
            expense = expense_response.json()
            assert expense["frequency"] == "Half-Yearly"
        
        print(f"✓ Half-Yearly SIP created")


class TestInvestmentVerifyLinkedExpense:
    """Verify linked expense details match investment"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - authenticate"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test",
            "remember_me": False
        })
        assert login_response.status_code == 200
        
        login_data = login_response.json()
        self.session_token = login_data.get("session_token")
        self.session.cookies.set("session_token", self.session_token)
        
        self.created_investment_ids = []
        self.created_expense_ids = []
        
        yield
        
        # Cleanup
        for inv_id in self.created_investment_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/investments/{inv_id}")
            except:
                pass
        for exp_id in self.created_expense_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/expenses/{exp_id}")
            except:
                pass
    
    def test_linked_expense_bidirectional_link(self):
        """Test that investment and expense are bidirectionally linked"""
        test_name = f"TEST_BiLink_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Mutual Fund",
            "investmentMode": "Growth Only",
            "name": test_name,
            "principal": 100000,
            "currentValue": 100000,
            "startDate": "2024-01-01",
            "investmentFrequency": "Monthly",
            "sipAmount": 10000,
            "sipSelectedDate": "20",
            "autoCreateExpense": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200
        
        investment = response.json()
        investment_id = investment["id"]
        self.created_investment_ids.append(investment_id)
        
        linked_expense_id = investment.get("linkedExpenseId")
        assert linked_expense_id is not None
        self.created_expense_ids.append(linked_expense_id)
        
        # Verify expense has linkedInvestmentId pointing back
        expense_response = self.session.get(f"{BASE_URL}/api/expenses/{linked_expense_id}")
        expense = expense_response.json()
        
        assert expense.get("linkedInvestmentId") == investment_id, \
            f"Expense linkedInvestmentId should be {investment_id}, got {expense.get('linkedInvestmentId')}"
        
        print(f"✓ Bidirectional link verified:")
        print(f"  - Investment {investment_id} → Expense {linked_expense_id}")
        print(f"  - Expense {linked_expense_id} → Investment {investment_id}")
    
    def test_linked_expense_fixed_type(self):
        """Test that auto-created expense has expenseType='Fixed'"""
        test_name = f"TEST_ExpType_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "ETF",
            "investmentMode": "Growth Only",
            "name": test_name,
            "principal": 50000,
            "currentValue": 50000,
            "startDate": "2024-01-01",
            "investmentFrequency": "Monthly",
            "sipAmount": 5000,
            "autoCreateExpense": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        investment = response.json()
        self.created_investment_ids.append(investment["id"])
        
        if investment.get("linkedExpenseId"):
            self.created_expense_ids.append(investment["linkedExpenseId"])
            expense_response = self.session.get(f"{BASE_URL}/api/expenses/{investment['linkedExpenseId']}")
            expense = expense_response.json()
            
            assert expense.get("expenseType") == "Fixed", \
                f"Expense type should be 'Fixed', got '{expense.get('expenseType')}'"
            
            print(f"✓ Linked expense type is 'Fixed'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
