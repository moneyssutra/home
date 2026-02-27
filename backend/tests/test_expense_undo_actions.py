"""
Test Expense Undo Actions - mark-paid, unmark-paid, prepay, undo-prepay
Iteration 86 testing for MoneySSutra app
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

class TestExpenseUndoActions:
    """Test expense payment undo functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login
        login_res = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test@moneyssutra.com", "password": "test"}
        )
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        self.token = login_res.json().get("session_token")
        self.session.cookies.set("session_token", self.token)
        
    def test_mark_paid_endpoint(self):
        """POST /api/expenses/{id}/mark-paid marks expense as paid"""
        # Get an expense first
        res = self.session.get(f"{BASE_URL}/api/expenses/by-month")
        assert res.status_code == 200
        expenses = res.json()
        assert len(expenses) > 0, "No expenses found for testing"
        
        # Find a pending expense
        pending = [e for e in expenses if e.get('_displayStatus') == 'pending']
        if not pending:
            pytest.skip("No pending expenses to test mark-paid")
        
        expense = pending[0]
        expense_id = expense['id']
        
        # Mark as paid
        mark_res = self.session.post(f"{BASE_URL}/api/expenses/{expense_id}/mark-paid")
        assert mark_res.status_code == 200, f"mark-paid failed: {mark_res.text}"
        
        data = mark_res.json()
        assert data['message'] == "Expense marked as paid"
        assert data['id'] == expense_id
        assert 'paidDate' in data
        
        # Verify in by-month response
        verify_res = self.session.get(f"{BASE_URL}/api/expenses/by-month")
        verify_expenses = verify_res.json()
        updated = next((e for e in verify_expenses if e['id'] == expense_id), None)
        assert updated is not None
        assert updated.get('isPaid') == True
        
    def test_unmark_paid_endpoint(self):
        """POST /api/expenses/{id}/unmark-paid resets payment status"""
        # Get expenses
        res = self.session.get(f"{BASE_URL}/api/expenses/by-month")
        expenses = res.json()
        
        # Find a paid expense
        paid = [e for e in expenses if e.get('_displayStatus') == 'paid']
        if not paid:
            pytest.skip("No paid expenses to test unmark-paid")
        
        expense = paid[0]
        expense_id = expense['id']
        
        # Unmark paid
        unmark_res = self.session.post(f"{BASE_URL}/api/expenses/{expense_id}/unmark-paid")
        assert unmark_res.status_code == 200, f"unmark-paid failed: {unmark_res.text}"
        
        data = unmark_res.json()
        assert data['message'] == "Payment undone"
        assert data['id'] == expense_id
        
        # Verify in by-month response - should now be pending
        verify_res = self.session.get(f"{BASE_URL}/api/expenses/by-month")
        verify_expenses = verify_res.json()
        updated = next((e for e in verify_expenses if e['id'] == expense_id), None)
        assert updated is not None
        assert updated.get('isPaid') == False or updated.get('_displayStatus') == 'pending'
        
    def test_prepay_endpoint(self):
        """POST /api/expenses/{id}/prepay creates prepaid record for next month"""
        res = self.session.get(f"{BASE_URL}/api/expenses/by-month")
        expenses = res.json()
        
        # Find a recurring pending expense
        pending_recurring = [e for e in expenses 
                           if e.get('_displayStatus') == 'pending' 
                           and e.get('frequency') != 'One-Time'
                           and not e.get('linkedPaymentId')]
        if not pending_recurring:
            pytest.skip("No recurring pending expenses to test prepay")
        
        expense = pending_recurring[0]
        expense_id = expense['id']
        
        # Prepay
        prepay_res = self.session.post(f"{BASE_URL}/api/expenses/{expense_id}/prepay")
        # Could be 200 (success) or 400 (already prepaid)
        assert prepay_res.status_code in [200, 400], f"prepay unexpected status: {prepay_res.status_code}"
        
        if prepay_res.status_code == 200:
            data = prepay_res.json()
            assert 'prepaidId' in data
            assert 'expenseMonth' in data
            assert data['message'].startswith("Prepaid")
            
    def test_undo_prepay_endpoint_success(self):
        """POST /api/expenses/{id}/undo-prepay deletes prepaid child record"""
        # First, find an expense and try to prepay it
        res = self.session.get(f"{BASE_URL}/api/expenses/by-month")
        expenses = res.json()
        
        pending_recurring = [e for e in expenses 
                           if e.get('_displayStatus') == 'pending' 
                           and e.get('frequency') != 'One-Time'
                           and not e.get('linkedPaymentId')]
        if not pending_recurring:
            pytest.skip("No recurring pending expenses to test undo-prepay")
        
        expense = pending_recurring[0]
        expense_id = expense['id']
        
        # Try prepay first
        prepay_res = self.session.post(f"{BASE_URL}/api/expenses/{expense_id}/prepay")
        if prepay_res.status_code != 200:
            pytest.skip("Could not prepay expense to test undo")
        
        # Now undo the prepay
        undo_res = self.session.post(f"{BASE_URL}/api/expenses/{expense_id}/undo-prepay")
        assert undo_res.status_code == 200, f"undo-prepay failed: {undo_res.text}"
        
        data = undo_res.json()
        assert "Prepayment undone" in data['message']
        assert data['id'] == expense_id
        
    def test_undo_prepay_no_record_404(self):
        """POST /api/expenses/{id}/undo-prepay returns 404 if no prepaid record exists"""
        res = self.session.get(f"{BASE_URL}/api/expenses/by-month")
        expenses = res.json()
        
        # Find a pending expense (not prepaid)
        pending = [e for e in expenses if e.get('_displayStatus') == 'pending']
        if not pending:
            pytest.skip("No pending expenses to test 404")
        
        expense = pending[0]
        expense_id = expense['id']
        
        # Try undo-prepay on a non-prepaid expense
        undo_res = self.session.post(f"{BASE_URL}/api/expenses/{expense_id}/undo-prepay")
        assert undo_res.status_code == 404, f"Expected 404, got {undo_res.status_code}"
        assert "No prepaid record" in undo_res.json().get('detail', '')
        
    def test_get_expenses_by_month_display_status(self):
        """GET /api/expenses/by-month returns _displayStatus field"""
        now = datetime.now()
        month_str = f"{now.year}-{now.month:02d}"
        
        res = self.session.get(f"{BASE_URL}/api/expenses/by-month?month={month_str}")
        assert res.status_code == 200
        
        expenses = res.json()
        for exp in expenses:
            assert '_displayStatus' in exp, f"Missing _displayStatus for expense {exp.get('id')}"
            assert exp['_displayStatus'] in ['pending', 'paid', 'prepaid', 'scheduled']
            
    def test_get_expenses_by_month_no_param_defaults_to_current(self):
        """GET /api/expenses/by-month without param returns current month"""
        res = self.session.get(f"{BASE_URL}/api/expenses/by-month")
        assert res.status_code == 200
        
        expenses = res.json()
        assert isinstance(expenses, list)
        
    def test_mark_paid_nonexistent_expense(self):
        """POST /api/expenses/{id}/mark-paid returns 404 for non-existent expense"""
        res = self.session.post(f"{BASE_URL}/api/expenses/nonexistent-id-12345/mark-paid")
        assert res.status_code == 404
        
    def test_unmark_paid_nonexistent_expense(self):
        """POST /api/expenses/{id}/unmark-paid returns 404 for non-existent expense"""
        res = self.session.post(f"{BASE_URL}/api/expenses/nonexistent-id-12345/unmark-paid")
        assert res.status_code == 404
        

class TestExpenseByMonthFiltering:
    """Test by-month expense filtering"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_res = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test@moneyssutra.com", "password": "test"}
        )
        assert login_res.status_code == 200
        self.token = login_res.json().get("session_token")
        self.session.cookies.set("session_token", self.token)
        
    def test_by_month_current_month(self):
        """Test fetching current month expenses"""
        now = datetime.now()
        month_str = f"{now.year}-{now.month:02d}"
        
        res = self.session.get(f"{BASE_URL}/api/expenses/by-month?month={month_str}")
        assert res.status_code == 200
        
    def test_by_month_next_month(self):
        """Test fetching next month expenses"""
        now = datetime.now()
        if now.month == 12:
            next_month = f"{now.year + 1}-01"
        else:
            next_month = f"{now.year}-{now.month + 1:02d}"
        
        res = self.session.get(f"{BASE_URL}/api/expenses/by-month?month={next_month}")
        assert res.status_code == 200
        
    def test_by_month_invalid_format(self):
        """Test invalid month format returns 400"""
        res = self.session.get(f"{BASE_URL}/api/expenses/by-month?month=invalid")
        assert res.status_code == 400
        assert "Invalid month format" in res.json().get('detail', '')
