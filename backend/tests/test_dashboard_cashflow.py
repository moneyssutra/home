"""
Test Dashboard Cashflow API - iteration 78
Tests the enhanced Monthly Cashflow fields: incomeReceived, expectedIncome, expensesDone, upcomingExpenses
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestDashboardNetworthCashflow:
    """Test /api/dashboard/networth endpoint for new cashflow fields"""
    
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
    
    def test_income_received_field_exists(self):
        """Test incomeReceived field is present"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        assert "incomeReceived" in data, "incomeReceived field missing"
        assert isinstance(data["incomeReceived"], (int, float)), "incomeReceived should be a number"
        print(f"incomeReceived = {data['incomeReceived']} - PASS")
    
    def test_expected_income_field_exists(self):
        """Test expectedIncome field is present"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        assert "expectedIncome" in data, "expectedIncome field missing"
        assert isinstance(data["expectedIncome"], (int, float)), "expectedIncome should be a number"
        print(f"expectedIncome = {data['expectedIncome']} - PASS")
    
    def test_expenses_done_field_exists(self):
        """Test expensesDone field is present"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        assert "expensesDone" in data, "expensesDone field missing"
        assert isinstance(data["expensesDone"], (int, float)), "expensesDone should be a number"
        print(f"expensesDone = {data['expensesDone']} - PASS")
    
    def test_upcoming_expenses_field_exists(self):
        """Test upcomingExpenses field is present"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        assert "upcomingExpenses" in data, "upcomingExpenses field missing"
        assert isinstance(data["upcomingExpenses"], (int, float)), "upcomingExpenses should be a number"
        print(f"upcomingExpenses = {data['upcomingExpenses']} - PASS")
    
    def test_cashflow_fields_consistency(self):
        """Test that cashflow values are consistent:
        - expectedIncome should equal monthlyIncome
        - upcomingExpenses = monthlyExpenses - expensesDone (when positive)
        """
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        data = response.json()
        
        # expectedIncome should match monthlyIncome
        assert data["expectedIncome"] == data["monthlyIncome"], \
            f"expectedIncome ({data['expectedIncome']}) should equal monthlyIncome ({data['monthlyIncome']})"
        
        # upcomingExpenses = max(0, monthlyExpenses - expensesDone)
        expected_upcoming = max(0, data["monthlyExpenses"] - data["expensesDone"])
        assert abs(data["upcomingExpenses"] - expected_upcoming) < 1, \
            f"upcomingExpenses ({data['upcomingExpenses']}) should equal max(0, monthlyExpenses-expensesDone) ({expected_upcoming})"
        
        print("Cashflow consistency checks - PASS")
    
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
