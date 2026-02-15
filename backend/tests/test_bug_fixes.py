"""
Test cases for P0/P1 bug fixes:
- Fixed Expense Type Toggle 
- Variable Expense Type Toggle
- Investment US Stocks category
- Investment Daily frequency
- Investment frequency hidden for SGB/SWP
- Monthly Cash Flow API
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMonthlyNetWorthAPI:
    """Test the Monthly Cash Flow calculations in /api/dashboard/networth"""
    
    def test_networth_api_returns_monthly_income(self):
        """P1: Verify monthlyIncome field exists and is calculated"""
        response = requests.get(f"{BASE_URL}/api/dashboard/networth")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "monthlyIncome" in data, "monthlyIncome field missing from response"
        assert isinstance(data["monthlyIncome"], (int, float)), "monthlyIncome should be numeric"
        print(f"Monthly Income: {data['monthlyIncome']}")
    
    def test_networth_api_returns_monthly_expenses(self):
        """P1: Verify monthlyExpenses field exists and is calculated"""
        response = requests.get(f"{BASE_URL}/api/dashboard/networth")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "monthlyExpenses" in data, "monthlyExpenses field missing from response"
        assert isinstance(data["monthlyExpenses"], (int, float)), "monthlyExpenses should be numeric"
        print(f"Monthly Expenses: {data['monthlyExpenses']}")
    
    def test_networth_api_returns_monthly_savings(self):
        """P1: Verify monthlySavings field exists and equals income - expenses"""
        response = requests.get(f"{BASE_URL}/api/dashboard/networth")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "monthlySavings" in data, "monthlySavings field missing from response"
        assert isinstance(data["monthlySavings"], (int, float)), "monthlySavings should be numeric"
        
        # Verify calculation: savings = income - expenses
        expected_savings = data["monthlyIncome"] - data["monthlyExpenses"]
        assert abs(data["monthlySavings"] - expected_savings) < 0.01, \
            f"monthlySavings ({data['monthlySavings']}) != income ({data['monthlyIncome']}) - expenses ({data['monthlyExpenses']})"
        print(f"Monthly Savings: {data['monthlySavings']} (Income: {data['monthlyIncome']} - Expenses: {data['monthlyExpenses']})")
    
    def test_networth_api_full_response_structure(self):
        """Verify all required fields are present in networth response"""
        response = requests.get(f"{BASE_URL}/api/dashboard/networth")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = [
            "netWorth", "totalAssets", "totalInvestments", "liquidBalance",
            "totalLiabilities", "creditOutstanding", "creditCardOutstanding",
            "creditCardLimit", "creditCardUtilization", "monthlyIncome",
            "monthlyExpenses", "monthlySavings", "assetCount", "investmentCount",
            "accountCount", "loanCount", "creditCardCount", "incomeCount", "expenseCount"
        ]
        
        for field in required_fields:
            assert field in data, f"Required field '{field}' missing from response"
        
        print(f"All {len(required_fields)} required fields present in response")


class TestExpenseAPI:
    """Test expense CRUD operations"""
    
    def test_create_fixed_expense(self):
        """Test creating a Fixed type expense"""
        payload = {
            "expenseName": "TEST_Fixed_Expense",
            "expenseType": "Fixed",
            "category": "Housing",
            "expectedAmount": 1000.0,
            "frequency": "Monthly",
            "selectedDate": "15"
        }
        response = requests.post(f"{BASE_URL}/api/expenses", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["expenseType"] == "Fixed", "Expense type should be Fixed"
        assert data["expenseName"] == "TEST_Fixed_Expense"
        
        # Cleanup
        expense_id = data["id"]
        requests.delete(f"{BASE_URL}/api/expenses/{expense_id}")
        print(f"Created and deleted Fixed expense: {expense_id}")
    
    def test_create_variable_expense(self):
        """Test creating a Variable type expense"""
        payload = {
            "expenseName": "TEST_Variable_Expense",
            "expenseType": "Variable",
            "category": "Shopping",
            "expectedAmount": 500.0,
            "frequency": "One-Time",
            "oneTimeDate": "2026-02-20"
        }
        response = requests.post(f"{BASE_URL}/api/expenses", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["expenseType"] == "Variable", "Expense type should be Variable"
        assert data["expenseName"] == "TEST_Variable_Expense"
        
        # Cleanup
        expense_id = data["id"]
        requests.delete(f"{BASE_URL}/api/expenses/{expense_id}")
        print(f"Created and deleted Variable expense: {expense_id}")


class TestInvestmentAPI:
    """Test investment CRUD operations for new features"""
    
    def test_create_us_stocks_investment(self):
        """P1: Test creating investment with US Stocks category"""
        payload = {
            "investmentCategory": "US Stocks",
            "investmentMode": "Growth Only",
            "name": "TEST_Apple_Stock",
            "principal": 10000.0,
            "currentValue": 10500.0,
            "startDate": "2026-01-01",
            "investmentFrequency": "Monthly",
            "sipAmount": 1000.0
        }
        response = requests.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["investmentCategory"] == "US Stocks", "Category should be US Stocks"
        assert data["name"] == "TEST_Apple_Stock"
        
        # Cleanup
        investment_id = data["id"]
        requests.delete(f"{BASE_URL}/api/investments/{investment_id}")
        print(f"Created and deleted US Stocks investment: {investment_id}")
    
    def test_create_investment_with_daily_frequency(self):
        """P1: Test creating investment with Daily frequency"""
        payload = {
            "investmentCategory": "Mutual Fund",
            "investmentMode": "Growth Only",
            "name": "TEST_Daily_SIP",
            "principal": 5000.0,
            "currentValue": 5000.0,
            "startDate": "2026-01-01",
            "investmentFrequency": "Daily",
            "sipAmount": 100.0
        }
        response = requests.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["investmentFrequency"] == "Daily", "Frequency should be Daily"
        assert data["sipAmount"] == 100.0, "SIP Amount should be 100"
        
        # Cleanup
        investment_id = data["id"]
        requests.delete(f"{BASE_URL}/api/investments/{investment_id}")
        print(f"Created and deleted Daily frequency investment: {investment_id}")
    
    def test_create_sgb_investment_without_frequency(self):
        """P1: Test creating SGB investment (frequency should be null/ignored)"""
        payload = {
            "investmentCategory": "Sovereign Gold Bond (SGB)",
            "investmentMode": "Income Generating",
            "name": "TEST_SGB_2026",
            "principal": 50000.0,
            "currentValue": 52000.0,
            "startDate": "2026-01-01",
            "returnRate": 2.5,
            # Not sending investmentFrequency - it should be null for SGB
        }
        response = requests.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["investmentCategory"] == "Sovereign Gold Bond (SGB)"
        # investmentFrequency should be null or not set for SGB
        assert data.get("investmentFrequency") is None, "SGB should not have investmentFrequency"
        
        # Cleanup
        investment_id = data["id"]
        requests.delete(f"{BASE_URL}/api/investments/{investment_id}")
        print(f"Created and deleted SGB investment: {investment_id}")
    
    def test_create_swp_investment_without_frequency(self):
        """P1: Test creating SWP investment (frequency should be null/ignored)"""
        payload = {
            "investmentCategory": "SWP",
            "investmentMode": "Income Generating",
            "name": "TEST_SWP_Plan",
            "principal": 100000.0,
            "currentValue": 98000.0,
            "startDate": "2026-01-01",
            # Not sending investmentFrequency - it should be null for SWP
        }
        response = requests.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["investmentCategory"] == "SWP"
        # investmentFrequency should be null or not set for SWP
        assert data.get("investmentFrequency") is None, "SWP should not have investmentFrequency"
        
        # Cleanup
        investment_id = data["id"]
        requests.delete(f"{BASE_URL}/api/investments/{investment_id}")
        print(f"Created and deleted SWP investment: {investment_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
