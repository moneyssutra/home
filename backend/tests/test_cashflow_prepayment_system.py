"""
Test Cash Flow Engine - Prepayment System (Phase 2)
Tests: GET /api/expenses/by-month, POST /api/expenses/{id}/mark-paid, POST /api/expenses/{id}/prepay
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if BASE_URL:
    BASE_URL = BASE_URL.rstrip('/')


class TestCashFlowPrepaymentSystem:
    """Cash Flow Engine - Prepayment System API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session and login"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test@moneyssutra.com", "password": "test"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("session_token")
        self.session.cookies.set("session_token", token)
        
        yield
        
        # Cleanup: Delete any TEST_ prefixed expenses we created
        expenses_resp = self.session.get(f"{BASE_URL}/api/expenses")
        if expenses_resp.status_code == 200:
            for exp in expenses_resp.json():
                if exp.get("expenseName", "").startswith("TEST_"):
                    self.session.delete(f"{BASE_URL}/api/expenses/{exp['id']}")
    
    # ============ GET /api/expenses/by-month Tests ============
    
    def test_get_expenses_by_month_default_current_month(self):
        """GET /api/expenses/by-month without param returns current month's expenses"""
        response = self.session.get(f"{BASE_URL}/api/expenses/by-month")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All expenses should have _displayStatus field
        for exp in data:
            assert "_displayStatus" in exp, f"Missing _displayStatus for {exp.get('expenseName')}"
            assert exp["_displayStatus"] in ["paid", "pending", "prepaid", "scheduled"]
    
    def test_get_expenses_by_month_specific_month(self):
        """GET /api/expenses/by-month?month=YYYY-MM returns expenses for that month"""
        response = self.session.get(f"{BASE_URL}/api/expenses/by-month?month=2026-02")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify response contains expected fields
        if len(data) > 0:
            exp = data[0]
            assert "id" in exp
            assert "expenseName" in exp
            assert "expectedAmount" in exp
            assert "_displayStatus" in exp
    
    def test_get_expenses_by_month_invalid_format(self):
        """GET /api/expenses/by-month?month=invalid returns 400"""
        response = self.session.get(f"{BASE_URL}/api/expenses/by-month?month=invalid")
        
        assert response.status_code == 400
        assert "Invalid month format" in response.json().get("detail", "")
    
    def test_get_expenses_by_month_future_month(self):
        """GET /api/expenses/by-month for future month returns recurring expenses"""
        response = self.session.get(f"{BASE_URL}/api/expenses/by-month?month=2026-06")
        
        assert response.status_code == 200
        data = response.json()
        
        # Monthly recurring expenses should appear in future months
        monthly_expenses = [e for e in data if e.get("frequency") == "Monthly"]
        assert len(monthly_expenses) > 0, "Monthly expenses should appear in future months"
    
    # ============ GET /api/expenses/{expense_id} Tests ============
    
    def test_get_expense_by_id_no_route_conflict(self):
        """GET /api/expenses/{expense_id} works (no conflict with /by-month)"""
        # First get list of expenses
        list_response = self.session.get(f"{BASE_URL}/api/expenses/by-month")
        assert list_response.status_code == 200
        
        expenses = list_response.json()
        if len(expenses) == 0:
            pytest.skip("No expenses to test")
        
        expense_id = expenses[0]["id"]
        
        # Now get single expense by ID
        response = self.session.get(f"{BASE_URL}/api/expenses/{expense_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == expense_id
        assert "expenseName" in data
        assert "expectedAmount" in data
    
    def test_get_expense_by_id_not_found(self):
        """GET /api/expenses/{expense_id} returns 404 for non-existent ID"""
        fake_id = str(uuid.uuid4())
        response = self.session.get(f"{BASE_URL}/api/expenses/{fake_id}")
        
        assert response.status_code == 404
    
    # ============ POST /api/expenses/{id}/mark-paid Tests ============
    
    def test_mark_expense_paid(self):
        """POST /api/expenses/{id}/mark-paid marks expense as paid"""
        # Create a test expense
        create_response = self.session.post(f"{BASE_URL}/api/expenses", json={
            "expenseName": f"TEST_MarkPaid_{uuid.uuid4().hex[:6]}",
            "expenseType": "Variable",
            "category": "Food",
            "expectedAmount": 500,
            "frequency": "Monthly",
            "selectedDate": "15"
        })
        assert create_response.status_code == 200
        expense_id = create_response.json()["id"]
        
        # Mark as paid
        response = self.session.post(f"{BASE_URL}/api/expenses/{expense_id}/mark-paid")
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Expense marked as paid"
        assert data["id"] == expense_id
        assert "paidDate" in data
        
        # Verify expense is now marked as paid
        get_response = self.session.get(f"{BASE_URL}/api/expenses/{expense_id}")
        assert get_response.status_code == 200
        assert get_response.json()["isPaid"] == True
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/expenses/{expense_id}")
    
    def test_mark_paid_nonexistent_expense(self):
        """POST /api/expenses/{id}/mark-paid returns 404 for non-existent expense"""
        fake_id = str(uuid.uuid4())
        response = self.session.post(f"{BASE_URL}/api/expenses/{fake_id}/mark-paid")
        
        assert response.status_code == 404
    
    # ============ POST /api/expenses/{id}/prepay Tests ============
    
    def test_prepay_expense_for_next_month(self):
        """POST /api/expenses/{id}/prepay creates prepaid record for next month"""
        # Create a test expense
        create_response = self.session.post(f"{BASE_URL}/api/expenses", json={
            "expenseName": f"TEST_Prepay_{uuid.uuid4().hex[:6]}",
            "expenseType": "Fixed",
            "category": "Utilities",
            "expectedAmount": 1000,
            "frequency": "Monthly",
            "selectedDate": "10"
        })
        assert create_response.status_code == 200
        expense_id = create_response.json()["id"]
        expense_name = create_response.json()["expenseName"]
        
        # Prepay for next month
        response = self.session.post(f"{BASE_URL}/api/expenses/{expense_id}/prepay")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "message" in data
        assert "prepaidId" in data
        assert "expenseMonth" in data
        assert "amount" in data
        assert "paidDate" in data
        
        # Verify next month
        now = datetime.now()
        if now.month == 12:
            expected_month = f"{now.year + 1}-01"
        else:
            expected_month = f"{now.year}-{now.month + 1:02d}"
        assert data["expenseMonth"] == expected_month
        assert data["amount"] == 1000
        
        # Cleanup - delete the test expense and prepaid record
        self.session.delete(f"{BASE_URL}/api/expenses/{expense_id}")
        self.session.delete(f"{BASE_URL}/api/expenses/{data['prepaidId']}")
    
    def test_prepay_duplicate_returns_400(self):
        """POST /api/expenses/{id}/prepay returns 400 if already prepaid for next month"""
        # Create a test expense
        create_response = self.session.post(f"{BASE_URL}/api/expenses", json={
            "expenseName": f"TEST_DoublePrepay_{uuid.uuid4().hex[:6]}",
            "expenseType": "Fixed",
            "category": "Housing",
            "expectedAmount": 2000,
            "frequency": "Monthly",
            "selectedDate": "5"
        })
        assert create_response.status_code == 200
        expense_id = create_response.json()["id"]
        
        # First prepay - should succeed
        first_response = self.session.post(f"{BASE_URL}/api/expenses/{expense_id}/prepay")
        assert first_response.status_code == 200
        prepaid_id = first_response.json()["prepaidId"]
        
        # Second prepay - should return 400
        second_response = self.session.post(f"{BASE_URL}/api/expenses/{expense_id}/prepay")
        
        assert second_response.status_code == 400
        assert "Already prepaid" in second_response.json().get("detail", "")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/expenses/{expense_id}")
        self.session.delete(f"{BASE_URL}/api/expenses/{prepaid_id}")
    
    def test_prepay_nonexistent_expense(self):
        """POST /api/expenses/{id}/prepay returns 404 for non-existent expense"""
        fake_id = str(uuid.uuid4())
        response = self.session.post(f"{BASE_URL}/api/expenses/{fake_id}/prepay")
        
        assert response.status_code == 404
    
    # ============ Display Status Tests ============
    
    def test_display_status_paid(self):
        """Paid expenses show _displayStatus='paid' in current month"""
        # Get current month
        now = datetime.now()
        current_month = f"{now.year}-{now.month:02d}"
        
        # Create and mark as paid
        create_response = self.session.post(f"{BASE_URL}/api/expenses", json={
            "expenseName": f"TEST_StatusPaid_{uuid.uuid4().hex[:6]}",
            "expenseType": "Fixed",
            "category": "Utilities",
            "expectedAmount": 300,
            "frequency": "Monthly",
            "selectedDate": "1"
        })
        assert create_response.status_code == 200
        expense_id = create_response.json()["id"]
        
        # Mark as paid
        self.session.post(f"{BASE_URL}/api/expenses/{expense_id}/mark-paid")
        
        # Get by-month and verify status
        response = self.session.get(f"{BASE_URL}/api/expenses/by-month?month={current_month}")
        assert response.status_code == 200
        
        expenses = response.json()
        test_expense = next((e for e in expenses if e["id"] == expense_id), None)
        
        if test_expense:
            assert test_expense["_displayStatus"] == "paid"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/expenses/{expense_id}")
    
    def test_display_status_prepaid_next_month(self):
        """Prepaid expenses show _displayStatus='prepaid' in target month"""
        # Create expense
        create_response = self.session.post(f"{BASE_URL}/api/expenses", json={
            "expenseName": f"TEST_StatusPrepaid_{uuid.uuid4().hex[:6]}",
            "expenseType": "Fixed",
            "category": "Housing",
            "expectedAmount": 1500,
            "frequency": "Monthly",
            "selectedDate": "10"
        })
        assert create_response.status_code == 200
        expense_id = create_response.json()["id"]
        
        # Prepay for next month
        prepay_response = self.session.post(f"{BASE_URL}/api/expenses/{expense_id}/prepay")
        assert prepay_response.status_code == 200
        next_month = prepay_response.json()["expenseMonth"]
        prepaid_id = prepay_response.json()["prepaidId"]
        
        # Get next month's expenses and verify status
        response = self.session.get(f"{BASE_URL}/api/expenses/by-month?month={next_month}")
        assert response.status_code == 200
        
        expenses = response.json()
        test_expense = next((e for e in expenses if e["id"] == expense_id), None)
        
        if test_expense:
            assert test_expense["_displayStatus"] == "prepaid", f"Expected 'prepaid', got '{test_expense['_displayStatus']}'"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/expenses/{expense_id}")
        self.session.delete(f"{BASE_URL}/api/expenses/{prepaid_id}")


# Run pytest with: pytest -v /app/backend/tests/test_cashflow_prepayment_system.py
