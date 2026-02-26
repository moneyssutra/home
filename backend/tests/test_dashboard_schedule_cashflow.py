"""
Test Dashboard Schedule-Based Cashflow API - iteration 79
Tests the schedule-based Monthly Cashflow: incomeReceived/Expected based on selectedDate,
expensesDone/Upcoming based on expense schedule dates.
Net Balance = incomeReceived - expensesDone (not expected-based)
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestDashboardScheduleBasedCashflow:
    """Test /api/dashboard/networth endpoint for schedule-based cashflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookie"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test@moneyssutra.com", "password": "test"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    
    def test_networth_endpoint_returns_200(self):
        """Test that networth endpoint is accessible"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        assert response.status_code == 200
        print("Networth endpoint accessible - PASS")
    
    # --- Schedule-based income received tests ---
    def test_income_received_field_exists_and_positive(self):
        """Test incomeReceived field is present and > 0 for test user"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        assert "incomeReceived" in data, "incomeReceived field missing"
        assert isinstance(data["incomeReceived"], (int, float)), "incomeReceived should be a number"
        # Since today is Feb 26, all income sources with selectedDate <= 26 should be received
        assert data["incomeReceived"] > 0, f"incomeReceived should be > 0, got {data['incomeReceived']}"
        print(f"incomeReceived = {data['incomeReceived']} - PASS")
    
    def test_income_received_list_exists(self):
        """Test incomeReceivedList array exists and has items"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        assert "incomeReceivedList" in data, "incomeReceivedList field missing"
        assert isinstance(data["incomeReceivedList"], list), "incomeReceivedList should be an array"
        # Should have multiple income sources received (since today is Feb 26)
        assert len(data["incomeReceivedList"]) > 0, "incomeReceivedList should not be empty"
        print(f"incomeReceivedList has {len(data['incomeReceivedList'])} items - PASS")
    
    def test_income_received_list_item_structure(self):
        """Test incomeReceivedList items have correct structure"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        if len(data.get("incomeReceivedList", [])) > 0:
            item = data["incomeReceivedList"][0]
            required_fields = ["name", "amount", "type", "scheduleDay", "frequency"]
            for field in required_fields:
                assert field in item, f"incomeReceivedList item missing '{field}'"
            assert isinstance(item["amount"], (int, float)), "amount should be numeric"
            assert isinstance(item["scheduleDay"], int), "scheduleDay should be an integer"
            print(f"incomeReceivedList item structure correct: {item['name']}, {item['amount']}, day {item['scheduleDay']} - PASS")
    
    # --- Schedule-based expected income tests ---
    def test_expected_income_field_exists(self):
        """Test expectedIncome field is present"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        assert "expectedIncome" in data, "expectedIncome field missing"
        assert isinstance(data["expectedIncome"], (int, float)), "expectedIncome should be a number"
        print(f"expectedIncome = {data['expectedIncome']} - PASS")
    
    def test_expected_income_list_exists(self):
        """Test incomeExpectedList array exists"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        assert "incomeExpectedList" in data, "incomeExpectedList field missing"
        assert isinstance(data["incomeExpectedList"], list), "incomeExpectedList should be an array"
        print(f"incomeExpectedList has {len(data['incomeExpectedList'])} items - PASS")
    
    # --- Schedule-based expenses done tests ---
    def test_expenses_done_field_exists_and_positive(self):
        """Test expensesDone field is present and > 0 for test user"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        assert "expensesDone" in data, "expensesDone field missing"
        assert isinstance(data["expensesDone"], (int, float)), "expensesDone should be a number"
        # Since today is Feb 26, most expenses with selectedDate <= 26 should be done
        assert data["expensesDone"] > 0, f"expensesDone should be > 0, got {data['expensesDone']}"
        print(f"expensesDone = {data['expensesDone']} - PASS")
    
    def test_expenses_done_list_exists(self):
        """Test expensesDoneList array exists and has items"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        assert "expensesDoneList" in data, "expensesDoneList field missing"
        assert isinstance(data["expensesDoneList"], list), "expensesDoneList should be an array"
        assert len(data["expensesDoneList"]) > 0, "expensesDoneList should not be empty"
        print(f"expensesDoneList has {len(data['expensesDoneList'])} items - PASS")
    
    def test_expenses_done_list_item_structure(self):
        """Test expensesDoneList items have correct structure"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        if len(data.get("expensesDoneList", [])) > 0:
            item = data["expensesDoneList"][0]
            required_fields = ["name", "amount", "type", "scheduleDay", "frequency"]
            for field in required_fields:
                assert field in item, f"expensesDoneList item missing '{field}'"
            assert isinstance(item["amount"], (int, float)), "amount should be numeric"
            print(f"expensesDoneList item structure correct: {item['name']}, {item['amount']}, day {item['scheduleDay']} - PASS")
    
    # --- Schedule-based upcoming expenses tests ---
    def test_upcoming_expenses_field_exists(self):
        """Test upcomingExpenses field is present"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        assert "upcomingExpenses" in data, "upcomingExpenses field missing"
        assert isinstance(data["upcomingExpenses"], (int, float)), "upcomingExpenses should be a number"
        print(f"upcomingExpenses = {data['upcomingExpenses']} - PASS")
    
    def test_upcoming_expenses_list_exists(self):
        """Test upcomingExpensesList array exists"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        assert "upcomingExpensesList" in data, "upcomingExpensesList field missing"
        assert isinstance(data["upcomingExpensesList"], list), "upcomingExpensesList should be an array"
        print(f"upcomingExpensesList has {len(data['upcomingExpensesList'])} items - PASS")
    
    # --- Net Balance verification (received - done) ---
    def test_net_balance_equals_received_minus_spent(self):
        """Test monthlySavings = incomeReceived - expensesDone (schedule-based)"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        expected_savings = data["incomeReceived"] - data["expensesDone"]
        # Allow small floating point difference
        assert abs(data["monthlySavings"] - expected_savings) < 1, \
            f"monthlySavings ({data['monthlySavings']}) should equal incomeReceived - expensesDone ({expected_savings})"
        print(f"Net Balance verified: {data['incomeReceived']} - {data['expensesDone']} = {data['monthlySavings']} - PASS")
    
    # --- Schedule date logic verification ---
    def test_received_income_schedule_dates_are_past(self):
        """Verify all incomeReceivedList items have scheduleDay <= today"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        today = datetime.now().day
        for item in data.get("incomeReceivedList", []):
            # For daily/weekly frequencies, this check might not apply strictly
            freq = item.get("frequency", "Monthly")
            if freq not in ["Daily", "Weekly"]:
                assert item["scheduleDay"] <= today, \
                    f"Received item '{item['name']}' has scheduleDay {item['scheduleDay']} > today ({today})"
        print(f"All received income scheduleDay <= {today} - PASS")
    
    def test_done_expenses_schedule_dates_are_past(self):
        """Verify all expensesDoneList items have scheduleDay <= today"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        today = datetime.now().day
        for item in data.get("expensesDoneList", []):
            freq = item.get("frequency", "Monthly")
            if freq not in ["Daily", "Weekly"]:
                assert item["scheduleDay"] <= today, \
                    f"Done expense '{item['name']}' has scheduleDay {item['scheduleDay']} > today ({today})"
        print(f"All done expenses scheduleDay <= {today} - PASS")
    
    # --- Total verification ---
    def test_received_amount_matches_list_sum(self):
        """Test incomeReceived equals sum of incomeReceivedList amounts"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        list_sum = sum(item["amount"] for item in data.get("incomeReceivedList", []))
        # Allow small floating point difference
        assert abs(data["incomeReceived"] - list_sum) < 1, \
            f"incomeReceived ({data['incomeReceived']}) should equal sum of incomeReceivedList ({list_sum})"
        print(f"incomeReceived {data['incomeReceived']} matches list sum {list_sum} - PASS")
    
    def test_done_amount_matches_list_sum(self):
        """Test expensesDone equals sum of expensesDoneList amounts"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        list_sum = sum(item["amount"] for item in data.get("expensesDoneList", []))
        # Allow small floating point difference
        assert abs(data["expensesDone"] - list_sum) < 1, \
            f"expensesDone ({data['expensesDone']}) should equal sum of expensesDoneList ({list_sum})"
        print(f"expensesDone {data['expensesDone']} matches list sum {list_sum} - PASS")
    
    # --- Backward compatibility ---
    def test_all_legacy_fields_still_present(self):
        """Test backward compatibility - all legacy fields are still present"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        
        required_fields = [
            "netWorth", "totalAssets", "totalInvestments", "liquidBalance",
            "totalLiabilities", "monthlyIncome", "monthlyExpenses", "monthlySavings",
            "assetCount", "investmentCount", "accountCount", "loanCount"
        ]
        
        for field in required_fields:
            assert field in data, f"Legacy field '{field}' missing from response"
        
        print("All legacy fields present - PASS")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
