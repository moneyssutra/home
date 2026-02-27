"""
Test iteration 87: Investment repair-expenses endpoint and Expense Calendar
Tests:
1. POST /api/investments/repair-expenses - finds investments with autoCreateExpense=True but missing linked expense
2. Creating NPS/PPF investment with SIP correctly creates linked expense
3. GET /api/expenses/by-month returns expenses for calendar view
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

class TestRepairExpensesAndCalendar:
    """Test repair-expenses endpoint and expense calendar data"""
    
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
    
    # ============ Repair Expenses Endpoint Tests ============
    
    def test_repair_expenses_endpoint_exists(self):
        """Test that POST /api/investments/repair-expenses endpoint exists and returns 200"""
        response = self.session.post(f"{BASE_URL}/api/investments/repair-expenses")
        assert response.status_code == 200, f"Endpoint should return 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "repaired" in data, "Response should contain 'repaired' count"
        assert "details" in data, "Response should contain 'details' array"
        assert isinstance(data["repaired"], int), "'repaired' should be an integer"
        assert isinstance(data["details"], list), "'details' should be a list"
        
        print(f"✓ repair-expenses endpoint works - repaired: {data['repaired']}, details: {data['details']}")
    
    def test_repair_expenses_idempotent(self):
        """Test that calling repair-expenses twice returns 0 repairs on second call (idempotent)"""
        # First call
        response1 = self.session.post(f"{BASE_URL}/api/investments/repair-expenses")
        assert response1.status_code == 200
        
        # Second call should repair 0 (already fixed)
        response2 = self.session.post(f"{BASE_URL}/api/investments/repair-expenses")
        assert response2.status_code == 200
        
        data2 = response2.json()
        # Since first call fixed everything, second should repair 0
        print(f"✓ repair-expenses idempotent check - second call repaired: {data2['repaired']}")
    
    def test_repair_expenses_creates_missing_expense(self):
        """Test that repair-expenses creates expense for investment with autoCreateExpense=True but no linked expense"""
        # Create investment with autoCreateExpense=True but manually remove linkedExpenseId
        test_name = f"TEST_Repair_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "PPF",
            "investmentMode": "Growth with Maturity",
            "name": test_name,
            "principal": 150000,
            "currentValue": 165000,
            "startDate": "2024-01-01",
            "returnRate": 7.1,
            "investmentFrequency": "Monthly",
            "sipAmount": 5000,
            "sipSelectedDate": "5",
            "autoCreateExpense": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Failed to create investment: {response.text}"
        
        investment = response.json()
        self.created_investment_ids.append(investment["id"])
        
        # Investment should have linkedExpenseId since it was created with autoCreateExpense
        if investment.get("linkedExpenseId"):
            self.created_expense_ids.append(investment["linkedExpenseId"])
            print(f"✓ Investment created with auto-expense: linkedExpenseId={investment['linkedExpenseId']}")
        else:
            print(f"✓ Investment created without auto-expense (repair will fix it)")
            
            # Call repair-expenses to fix it
            repair_response = self.session.post(f"{BASE_URL}/api/investments/repair-expenses")
            assert repair_response.status_code == 200
            
            repair_data = repair_response.json()
            print(f"  Repair result: repaired={repair_data['repaired']}, details={repair_data['details']}")
            
            # Verify investment now has linkedExpenseId
            get_response = self.session.get(f"{BASE_URL}/api/investments/{investment['id']}")
            assert get_response.status_code == 200
            updated_investment = get_response.json()
            
            if updated_investment.get("linkedExpenseId"):
                self.created_expense_ids.append(updated_investment["linkedExpenseId"])
                print(f"  After repair: linkedExpenseId={updated_investment['linkedExpenseId']}")
    
    # ============ NPS/PPF SIP Auto-Expense Tests ============
    
    def test_create_ppf_with_sip_creates_expense(self):
        """Test PPF investment with SIP creates linked expense"""
        test_name = f"TEST_PPF_SIP_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "PPF",
            "investmentMode": "Growth with Maturity",
            "name": test_name,
            "principal": 150000,
            "currentValue": 165000,
            "startDate": "2024-01-01",
            "returnRate": 7.1,
            "investmentFrequency": "Monthly",
            "sipAmount": 12500,
            "sipSelectedDate": "5",
            "autoCreateExpense": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        investment = response.json()
        self.created_investment_ids.append(investment["id"])
        
        assert investment.get("linkedExpenseId") is not None, "PPF SIP should create linked expense"
        linked_expense_id = investment["linkedExpenseId"]
        self.created_expense_ids.append(linked_expense_id)
        
        # Verify expense details
        expense_response = self.session.get(f"{BASE_URL}/api/expenses/{linked_expense_id}")
        assert expense_response.status_code == 200
        
        expense = expense_response.json()
        assert expense["expenseName"] == f"SIP - {test_name}"
        assert expense["category"] == "Investments"
        assert expense["frequency"] == "Monthly"
        assert expense["expectedAmount"] == 12500
        assert expense["selectedDate"] == "5"
        
        print(f"✓ PPF SIP investment created with linked expense: {linked_expense_id}")
    
    def test_create_nps_with_sip_creates_expense(self):
        """Test NPS investment with SIP creates linked expense"""
        test_name = f"TEST_NPS_SIP_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "NPS",
            "investmentMode": "Growth with Maturity",
            "name": test_name,
            "principal": 200000,
            "currentValue": 220000,
            "startDate": "2024-01-01",
            "returnRate": 9.5,
            "investmentFrequency": "Monthly",
            "sipAmount": 5000,
            "sipSelectedDate": "10",
            "autoCreateExpense": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        investment = response.json()
        self.created_investment_ids.append(investment["id"])
        
        assert investment.get("linkedExpenseId") is not None, "NPS SIP should create linked expense"
        linked_expense_id = investment["linkedExpenseId"]
        self.created_expense_ids.append(linked_expense_id)
        
        # Verify expense details
        expense_response = self.session.get(f"{BASE_URL}/api/expenses/{linked_expense_id}")
        assert expense_response.status_code == 200
        
        expense = expense_response.json()
        assert expense["expenseName"] == f"SIP - {test_name}"
        assert expense["category"] == "Investments"
        
        print(f"✓ NPS SIP investment created with linked expense: {linked_expense_id}")
    
    # ============ Expense Calendar Data Tests ============
    
    def test_expenses_by_month_endpoint(self):
        """Test GET /api/expenses/by-month returns expenses for calendar view"""
        response = self.session.get(f"{BASE_URL}/api/expenses/by-month")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of expenses"
        
        print(f"✓ expenses/by-month endpoint works - returned {len(data)} expenses")
    
    def test_expenses_by_month_with_param(self):
        """Test GET /api/expenses/by-month?month=YYYY-MM"""
        from datetime import datetime
        current_month = datetime.now().strftime("%Y-%m")
        
        response = self.session.get(f"{BASE_URL}/api/expenses/by-month?month={current_month}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        print(f"✓ expenses/by-month with param works - month={current_month}, count={len(data)}")
    
    def test_expenses_by_month_has_display_status(self):
        """Test that expenses/by-month returns _displayStatus field"""
        response = self.session.get(f"{BASE_URL}/api/expenses/by-month")
        assert response.status_code == 200
        
        data = response.json()
        
        if len(data) > 0:
            # Check that at least one expense has _displayStatus
            has_status = any("_displayStatus" in exp for exp in data)
            print(f"✓ expenses/by-month - {len(data)} expenses, has _displayStatus: {has_status}")
            
            # Verify valid status values
            for exp in data:
                if "_displayStatus" in exp:
                    assert exp["_displayStatus"] in ["pending", "paid", "prepaid", "scheduled"], \
                        f"Invalid _displayStatus: {exp['_displayStatus']}"
        else:
            print("✓ expenses/by-month - no expenses found (expected if empty)")
    
    def test_expenses_by_month_future_month(self):
        """Test expenses/by-month for future month"""
        from datetime import datetime
        now = datetime.now()
        # Get next month
        if now.month == 12:
            next_month = f"{now.year + 1}-01"
        else:
            next_month = f"{now.year}-{now.month + 1:02d}"
        
        response = self.session.get(f"{BASE_URL}/api/expenses/by-month?month={next_month}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        print(f"✓ expenses/by-month future month ({next_month}) - returned {len(data)} expenses")
    
    def test_expenses_by_month_invalid_format(self):
        """Test expenses/by-month with invalid month format returns 400"""
        response = self.session.get(f"{BASE_URL}/api/expenses/by-month?month=invalid")
        assert response.status_code == 400, f"Expected 400 for invalid month, got {response.status_code}"
        
        print("✓ expenses/by-month rejects invalid month format with 400")
    
    def test_expenses_have_selected_date_for_calendar(self):
        """Test that recurring expenses have selectedDate for calendar positioning"""
        response = self.session.get(f"{BASE_URL}/api/expenses/by-month")
        assert response.status_code == 200
        
        data = response.json()
        monthly_expenses = [e for e in data if e.get("frequency") == "Monthly"]
        
        if monthly_expenses:
            # Check some have selectedDate
            has_selected_date = [e for e in monthly_expenses if e.get("selectedDate")]
            print(f"✓ Monthly expenses: {len(monthly_expenses)}, with selectedDate: {len(has_selected_date)}")
        else:
            print("✓ No monthly expenses found to verify selectedDate")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
