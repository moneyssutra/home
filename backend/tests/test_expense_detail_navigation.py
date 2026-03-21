"""
Test expense detail endpoint and payment status features.
Tests the bug fixes:
1. Navigation from ExpensesDone/UpcomingExpenses to /wealth/expenses/{id} (detail page)
2. Expense detail page shows paymentStatus, schedule, metrics
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://wealth-vision-9.preview.emergentagent.com')
SESSION_TOKEN = "425f27a1-242e-4119-b67d-5bfd50d3f579"
TEST_EXPENSE_ID = "b2a34ccc-1158-4437-be91-574e348169e7"


class TestExpenseDetailAPI:
    """Tests for expense detail endpoint with payment status and schedule"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.cookies.set("session_token", SESSION_TOKEN)
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_expense_detail_endpoint_returns_200(self, setup):
        """Test that expense detail endpoint returns 200"""
        response = self.session.get(f"{BASE_URL}/api/expenses/{TEST_EXPENSE_ID}/detail")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("SUCCESS: Expense detail endpoint returns 200")
    
    def test_expense_detail_has_payment_status(self, setup):
        """Test that expense detail includes paymentStatus object"""
        response = self.session.get(f"{BASE_URL}/api/expenses/{TEST_EXPENSE_ID}/detail")
        assert response.status_code == 200
        data = response.json()
        
        assert "paymentStatus" in data, "Missing paymentStatus in response"
        ps = data["paymentStatus"]
        
        # Verify paymentStatus fields
        assert "isPaid" in ps, "Missing isPaid in paymentStatus"
        assert "dueDay" in ps, "Missing dueDay in paymentStatus"
        assert "nextDueDate" in ps, "Missing nextDueDate in paymentStatus"
        assert "currentMonth" in ps, "Missing currentMonth in paymentStatus"
        
        print(f"SUCCESS: paymentStatus present - isPaid={ps['isPaid']}, dueDay={ps['dueDay']}, nextDueDate={ps['nextDueDate']}")
    
    def test_expense_detail_has_schedule(self, setup):
        """Test that expense detail includes schedule array"""
        response = self.session.get(f"{BASE_URL}/api/expenses/{TEST_EXPENSE_ID}/detail")
        assert response.status_code == 200
        data = response.json()
        
        assert "schedule" in data, "Missing schedule in response"
        assert isinstance(data["schedule"], list), "schedule should be a list"
        assert len(data["schedule"]) > 0, "schedule should not be empty"
        
        # Verify schedule item structure
        first_item = data["schedule"][0]
        assert "dueDate" in first_item, "Missing dueDate in schedule item"
        assert "amount" in first_item, "Missing amount in schedule item"
        assert "status" in first_item, "Missing status in schedule item"
        assert first_item["status"] in ["paid", "pending", "upcoming"], f"Invalid status: {first_item['status']}"
        
        print(f"SUCCESS: schedule present with {len(data['schedule'])} items")
    
    def test_expense_detail_has_metrics(self, setup):
        """Test that expense detail includes metrics object"""
        response = self.session.get(f"{BASE_URL}/api/expenses/{TEST_EXPENSE_ID}/detail")
        assert response.status_code == 200
        data = response.json()
        
        assert "metrics" in data, "Missing metrics in response"
        m = data["metrics"]
        
        assert "monthlyEquivalent" in m, "Missing monthlyEquivalent in metrics"
        assert "yearlyEquivalent" in m, "Missing yearlyEquivalent in metrics"
        assert "expenseToIncomePercent" in m, "Missing expenseToIncomePercent in metrics"
        
        print(f"SUCCESS: metrics present - monthly={m['monthlyEquivalent']}, yearly={m['yearlyEquivalent']}")
    
    def test_expense_detail_has_expense_data(self, setup):
        """Test that expense detail includes basic expense data"""
        response = self.session.get(f"{BASE_URL}/api/expenses/{TEST_EXPENSE_ID}/detail")
        assert response.status_code == 200
        data = response.json()
        
        # Verify basic expense fields
        assert "id" in data, "Missing id"
        assert "expenseName" in data, "Missing expenseName"
        assert "expectedAmount" in data, "Missing expectedAmount"
        assert "frequency" in data, "Missing frequency"
        assert "category" in data, "Missing category"
        assert "expenseType" in data, "Missing expenseType"
        
        print(f"SUCCESS: Basic expense data - name={data['expenseName']}, amount={data['expectedAmount']}")
    
    def test_expense_not_found_returns_404(self, setup):
        """Test that invalid expense ID returns 404"""
        response = self.session.get(f"{BASE_URL}/api/expenses/invalid-id-12345/detail")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("SUCCESS: Invalid expense ID returns 404")
    
    def test_unauthenticated_returns_401(self):
        """Test that unauthenticated request returns 401"""
        session = requests.Session()  # No auth cookie
        response = session.get(f"{BASE_URL}/api/expenses/{TEST_EXPENSE_ID}/detail")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Unauthenticated request returns 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
