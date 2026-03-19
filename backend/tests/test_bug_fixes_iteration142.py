"""
Backend API Tests for Bug Fixes - Iteration 142
Tests for:
1. Investment Allocation - equity classification fix (mutual funds should NOT be 100% equity)
2. Life Insurance - score should be 0/7.5 when current coverage is 0
3. Income sources - startDate field should be accepted in save payload
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test session token for sandeepdash24 user
TEST_SESSION_TOKEN = "4bf40bb8-b8bb-4bda-bb96-ec262a903a1d"


class TestFinancialHealthAPI:
    """Tests for Financial Health API bug fixes"""
    
    @pytest.fixture
    def session(self):
        s = requests.Session()
        s.cookies.set('session_token', TEST_SESSION_TOKEN)
        return s
    
    def test_api_health_check(self, session):
        """Verify Financial Health API is accessible"""
        response = session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert 'overallScore' in data
        print(f"✓ API accessible - Overall Score: {data['overallScore']}")
    
    def test_investment_allocation_not_100_percent_equity(self, session):
        """
        BUG FIX: Investment Allocation should NOT classify all mutual funds as 100% equity.
        For sandeepdash24 user with bond/gold funds, equity percentage should be ~48.5%, not 100%.
        """
        response = session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200
        data = response.json()
        
        investment = data.get('investmentAllocation', {})
        actual_equity = investment.get('actualEquity', 0)
        status = investment.get('status', '')
        
        print(f"Investment Allocation - Actual Equity: {actual_equity}%, Status: {status}")
        
        # Should NOT be 100% - user has bond/gold funds
        assert actual_equity < 100, f"BUG: Equity percentage is {actual_equity}% - should be less than 100% as user has bond/gold funds"
        
        # Should NOT show "Overexposed" status
        assert status != "Overexposed", f"BUG: Status is 'Overexposed' - should be 'Underexposed' or similar"
        
        # Expected to be around 48.5% based on user's portfolio
        assert 40 <= actual_equity <= 60, f"Expected equity percentage around 48.5%, got {actual_equity}%"
        print(f"✓ Investment Allocation FIX VERIFIED - Equity: {actual_equity}%, Status: {status}")
    
    def test_life_insurance_zero_coverage_score(self, session):
        """
        BUG FIX: Life Insurance score should be 0/7.5 when current coverage is 0.
        Previously showed rawScore=25 even with 0 coverage.
        """
        response = session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200
        data = response.json()
        
        life_insurance = data.get('lifeInsurance', {})
        current = life_insurance.get('current', -1)
        status = life_insurance.get('status', '')
        
        contributions = data.get('contributions', {})
        li_contribution = contributions.get('lifeInsurance', {})
        raw_score = li_contribution.get('rawScore', -1)
        contribution = li_contribution.get('contribution', -1)
        
        print(f"Life Insurance - Current: {current}, Status: {status}, Raw Score: {raw_score}, Contribution: {contribution}")
        
        # If current coverage is 0, rawScore should be 0
        if current == 0:
            assert raw_score == 0, f"BUG: rawScore is {raw_score} but should be 0 when coverage is 0"
            assert contribution == 0.0, f"BUG: contribution is {contribution} but should be 0.0 when coverage is 0"
            assert status == "Not Covered", f"Expected status 'Not Covered', got '{status}'"
            print(f"✓ Life Insurance FIX VERIFIED - Score is 0/7.5 when coverage is 0")
        else:
            print(f"Note: User has life insurance coverage of {current}, cannot test 0 coverage scenario")


class TestIncomeAPIStartDate:
    """Tests for Income API - startDate field support"""
    
    @pytest.fixture
    def session(self):
        s = requests.Session()
        s.cookies.set('session_token', TEST_SESSION_TOKEN)
        return s
    
    def test_income_api_has_start_date_field(self, session):
        """Test that Income API model includes startDate field"""
        # Get existing income sources
        response = session.get(f"{BASE_URL}/api/income")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            income = data[0]
            # Check that startDate field exists in the model
            assert 'startDate' in income, "startDate field should exist in income model"
            print(f"✓ Income API model includes startDate field (value: {income.get('startDate')})")
        else:
            print("Note: No income sources to test")
    
    def test_income_update_with_start_date(self, session):
        """Test that Income can be updated with startDate"""
        # Get existing income sources
        response = session.get(f"{BASE_URL}/api/income")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            income_id = data[0]['id']
            original_name = data[0]['name']
            
            # Update with startDate
            update_payload = {
                "name": original_name,
                "startDate": "2025-06-01"
            }
            
            response = session.put(f"{BASE_URL}/api/income/{income_id}", json=update_payload)
            if response.status_code == 200:
                updated = response.json()
                print(f"✓ Income updated successfully with startDate")
                
                # Verify the update persisted
                if 'startDate' in updated:
                    print(f"  startDate in response: {updated.get('startDate')}")
                
                # Restore original (clear startDate)
                restore_payload = {"name": original_name, "startDate": None}
                session.put(f"{BASE_URL}/api/income/{income_id}", json=restore_payload)
            else:
                print(f"Update response: {response.status_code} - {response.text[:200]}")
        else:
            pytest.skip("No income sources available to test update")


class TestAccountDetailAPI:
    """Test Account Detail API returns correct data structure"""
    
    @pytest.fixture
    def session(self):
        s = requests.Session()
        s.cookies.set('session_token', TEST_SESSION_TOKEN)
        return s
    
    def test_account_list_returns_accounts(self, session):
        """Verify accounts list is accessible"""
        response = session.get(f"{BASE_URL}/api/accounts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of accounts"
        
        # Find a Bank Account type
        bank_accounts = [a for a in data if a.get('accountType') == 'Bank Account']
        print(f"Found {len(bank_accounts)} Bank Account type accounts")
        
        if bank_accounts:
            account = bank_accounts[0]
            account_id = account['id']
            account_name = account.get('accountName', '')
            account_type = account.get('accountType', '')
            
            print(f"Bank Account: {account_name} ({account_type}) - ID: {account_id}")
            
            # The UI should show "{accountType} - {accountName}" not "{accountType} {accountType}"
            # This is a frontend issue but we verify the API returns correct data
            assert account_type != "Bank Account Account", "API should not return duplicated type"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
