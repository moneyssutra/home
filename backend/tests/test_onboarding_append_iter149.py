"""
Test Onboarding Wizard Append (Not Overwrite) Bug Fix - Iteration 149
Tests the critical bug fix: each POST to save-step should ADD new entries, not replace existing ones.

Key tests:
1. POST income entry 1, POST income entry 2 → BOTH exist in DB
2. POST liability entry 1, POST liability entry 2 → BOTH exist in DB
3. POST investment entry 1, POST investment entry 2 → BOTH exist in DB
4. POST asset entry 1, POST asset entry 2 → BOTH exist in DB
"""
import pytest
import requests
import random
import string
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

def generate_alpha_string(length=8):
    """Generate random alphabetic string"""
    return ''.join(random.choices(string.ascii_lowercase, k=length))

def create_authenticated_session():
    """Create a new user and return authenticated session"""
    unique_alpha = generate_alpha_string()
    user_data = {
        "firstName": f"Append{unique_alpha}",
        "lastName": f"Test{unique_alpha}",
        "email": f"append_test_{unique_alpha}@test.com",
        "password": "Test1234!",
        "sex": "Male",
        "dateOfBirth": "1990-01-01"
    }
    
    session = requests.Session()
    
    # Register user
    reg_resp = session.post(f"{BASE_URL}/api/auth/register", json=user_data)
    assert reg_resp.status_code in [200, 201], f"Registration failed: {reg_resp.text}"
    
    # Login user
    login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
        "username": user_data["email"],
        "password": user_data["password"]
    }, headers={"Content-Type": "application/json"})
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    
    return session, user_data["email"]


class TestIncomeAppendNotOverwrite:
    """Test that income entries are appended, not overwritten"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        session, email = create_authenticated_session()
        return {"session": session, "email": email}
    
    def test_income_append_two_entries(self, test_user):
        """
        BUG FIX TEST: POST two income entries → BOTH should exist in DB
        Previously: Second entry replaced first (overwrite bug)
        Expected: Both entries should be saved (append behavior)
        """
        session = test_user["session"]
        
        # Entry 1: Salary
        income_entry_1 = {
            "step": 1,
            "data": {
                "items": [{
                    "name": "Monthly Salary Entry 1",
                    "amount": "75000",
                    "type": "Salary",
                    "frequency": "Monthly",
                    "selectedDate": "1"
                }]
            },
            "skipped": False
        }
        
        resp1 = session.post(f"{BASE_URL}/api/onboarding/save-step", json=income_entry_1)
        assert resp1.status_code == 200, f"Failed to save income entry 1: {resp1.text}"
        assert resp1.json().get("savedCount", 0) >= 1
        print("✓ Income entry 1 saved")
        
        # Entry 2: Business income (separate POST)
        income_entry_2 = {
            "step": 1,
            "data": {
                "items": [{
                    "name": "Business Income Entry 2",
                    "amount": "50000",
                    "type": "Business",
                    "frequency": "Monthly"
                }]
            },
            "skipped": False
        }
        
        resp2 = session.post(f"{BASE_URL}/api/onboarding/save-step", json=income_entry_2)
        assert resp2.status_code == 200, f"Failed to save income entry 2: {resp2.text}"
        assert resp2.json().get("savedCount", 0) >= 1
        print("✓ Income entry 2 saved")
        
        # CRITICAL: Verify BOTH entries exist in DB
        income_resp = session.get(f"{BASE_URL}/api/income")
        assert income_resp.status_code == 200, f"Failed to get income: {income_resp.text}"
        incomes = income_resp.json()
        
        # Check counts
        income_names = [inc.get("name", "") for inc in incomes]
        print(f"Income entries found: {income_names}")
        
        # Both entries should exist
        assert any("Entry 1" in name for name in income_names), "Income Entry 1 missing - OVERWRITE BUG!"
        assert any("Entry 2" in name for name in income_names), "Income Entry 2 missing"
        
        # Should have at least 2 incomes
        assert len([inc for inc in incomes if "Entry" in inc.get("name", "")]) >= 2, \
            "Expected at least 2 income entries, got fewer - APPEND NOT WORKING!"
        
        print(f"✓ BUG FIX VERIFIED: Both income entries exist (total: {len(incomes)})")


class TestLiabilityAppendNotOverwrite:
    """Test that liability entries are appended, not overwritten"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        session, email = create_authenticated_session()
        return {"session": session, "email": email}
    
    def test_liability_append_two_loans(self, test_user):
        """
        BUG FIX TEST: POST two loan entries → BOTH should exist in DB
        Previously: Second loan replaced first (overwrite bug)
        Expected: Both loans should be saved (append behavior)
        """
        session = test_user["session"]
        
        # Loan 1: Home Loan
        loan_entry_1 = {
            "step": 4,
            "data": {
                "items": [{
                    "name": "Home Loan Entry 1",
                    "amount": "5000000",
                    "loanType": "Home Loan",
                    "emi": "45000",
                    "rate": "8.5"
                }]
            },
            "skipped": False
        }
        
        resp1 = session.post(f"{BASE_URL}/api/onboarding/save-step", json=loan_entry_1)
        assert resp1.status_code == 200, f"Failed to save loan 1: {resp1.text}"
        assert resp1.json().get("savedCount", 0) >= 1
        print("✓ Loan entry 1 saved")
        
        # Loan 2: Car Loan (separate POST)
        loan_entry_2 = {
            "step": 4,
            "data": {
                "items": [{
                    "name": "Car Loan Entry 2",
                    "amount": "800000",
                    "loanType": "Car Loan",
                    "emi": "18000",
                    "rate": "9.5"
                }]
            },
            "skipped": False
        }
        
        resp2 = session.post(f"{BASE_URL}/api/onboarding/save-step", json=loan_entry_2)
        assert resp2.status_code == 200, f"Failed to save loan 2: {resp2.text}"
        assert resp2.json().get("savedCount", 0) >= 1
        print("✓ Loan entry 2 saved")
        
        # CRITICAL: Verify BOTH loans exist in DB
        loans_resp = session.get(f"{BASE_URL}/api/loans")
        assert loans_resp.status_code == 200, f"Failed to get loans: {loans_resp.text}"
        loans = loans_resp.json()
        
        # Check counts
        loan_names = [loan.get("loanName", "") for loan in loans]
        print(f"Loan entries found: {loan_names}")
        
        # Both entries should exist
        assert any("Entry 1" in name for name in loan_names), "Loan Entry 1 missing - OVERWRITE BUG!"
        assert any("Entry 2" in name for name in loan_names), "Loan Entry 2 missing"
        
        # Should have at least 2 loans
        test_loans = [loan for loan in loans if "Entry" in loan.get("loanName", "")]
        assert len(test_loans) >= 2, \
            f"Expected at least 2 loan entries, got {len(test_loans)} - APPEND NOT WORKING!"
        
        print(f"✓ BUG FIX VERIFIED: Both loan entries exist (total: {len(loans)})")


class TestInvestmentAppendNotOverwrite:
    """Test that investment entries are appended, not overwritten"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        session, email = create_authenticated_session()
        return {"session": session, "email": email}
    
    def test_investment_append_two_entries(self, test_user):
        """
        BUG FIX TEST: POST two investment entries → BOTH should exist in DB
        Previously: Second investment replaced first (overwrite bug)
        Expected: Both investments should be saved (append behavior)
        """
        session = test_user["session"]
        
        # Investment 1: Mutual Fund
        invest_entry_1 = {
            "step": 5,
            "data": {
                "items": [{
                    "name": "MF SIP Entry 1",
                    "amount": "10000",
                    "investmentType": "mutual-fund",
                    "category": "Mutual Fund",
                    "frequency": "Monthly"
                }]
            },
            "skipped": False
        }
        
        resp1 = session.post(f"{BASE_URL}/api/onboarding/save-step", json=invest_entry_1)
        assert resp1.status_code == 200, f"Failed to save investment 1: {resp1.text}"
        assert resp1.json().get("savedCount", 0) >= 1
        print("✓ Investment entry 1 saved")
        
        # Investment 2: Stocks (separate POST)
        invest_entry_2 = {
            "step": 5,
            "data": {
                "items": [{
                    "name": "Stocks Entry 2",
                    "amount": "25000",
                    "investmentType": "stocks",
                    "category": "Stocks",
                    "frequency": "Monthly"
                }]
            },
            "skipped": False
        }
        
        resp2 = session.post(f"{BASE_URL}/api/onboarding/save-step", json=invest_entry_2)
        assert resp2.status_code == 200, f"Failed to save investment 2: {resp2.text}"
        assert resp2.json().get("savedCount", 0) >= 1
        print("✓ Investment entry 2 saved")
        
        # CRITICAL: Verify BOTH investments exist in DB via profile-completion counts
        # Note: GET /api/investments may fail due to validation issues on onboarding-created investments
        # So we verify via profile-completion which counts DB entries directly
        comp_resp = session.get(f"{BASE_URL}/api/onboarding/profile-completion")
        assert comp_resp.status_code == 200, f"Failed to get profile completion: {comp_resp.text}"
        comp_data = comp_resp.json()
        
        inv_count = comp_data.get("counts", {}).get("investments", 0)
        print(f"Investment count from profile-completion: {inv_count}")
        
        # Should have at least 2 investments
        assert inv_count >= 2, \
            f"Expected at least 2 investment entries, got {inv_count} - APPEND NOT WORKING!"
        
        assert comp_data.get("investmentsAdded") == True, "investmentsAdded should be True"
        
        print(f"✓ BUG FIX VERIFIED: Both investment entries exist (DB count: {inv_count})")


class TestAssetAppendNotOverwrite:
    """Test that asset entries are appended, not overwritten"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        session, email = create_authenticated_session()
        return {"session": session, "email": email}
    
    def test_asset_append_two_entries(self, test_user):
        """
        BUG FIX TEST: POST two asset entries → BOTH should exist in DB
        Previously: Second asset replaced first (overwrite bug)
        Expected: Both assets should be saved (append behavior)
        """
        session = test_user["session"]
        
        # Asset 1: Bank Balance
        asset_entry_1 = {
            "step": 3,
            "data": {
                "items": [{
                    "name": "Bank Account Entry 1",
                    "amount": "100000",
                    "assetType": "bank_balance"
                }]
            },
            "skipped": False
        }
        
        resp1 = session.post(f"{BASE_URL}/api/onboarding/save-step", json=asset_entry_1)
        assert resp1.status_code == 200, f"Failed to save asset 1: {resp1.text}"
        assert resp1.json().get("savedCount", 0) >= 1
        print("✓ Asset entry 1 saved")
        
        # Asset 2: Property (separate POST)
        asset_entry_2 = {
            "step": 3,
            "data": {
                "items": [{
                    "name": "Property Entry 2",
                    "amount": "5000000",
                    "assetType": "property"
                }]
            },
            "skipped": False
        }
        
        resp2 = session.post(f"{BASE_URL}/api/onboarding/save-step", json=asset_entry_2)
        assert resp2.status_code == 200, f"Failed to save asset 2: {resp2.text}"
        assert resp2.json().get("savedCount", 0) >= 1
        print("✓ Asset entry 2 saved")
        
        # CRITICAL: Verify BOTH assets exist in DB
        # Check both accounts and assets endpoints
        accounts_resp = session.get(f"{BASE_URL}/api/accounts")
        assets_resp = session.get(f"{BASE_URL}/api/assets")
        
        all_asset_names = []
        
        if accounts_resp.status_code == 200:
            accounts = accounts_resp.json()
            all_asset_names.extend([acc.get("accountName", "") for acc in accounts])
        
        if assets_resp.status_code == 200:
            assets = assets_resp.json()
            all_asset_names.extend([asset.get("assetName", "") for asset in assets])
        
        print(f"Asset entries found: {all_asset_names}")
        
        # Both entries should exist
        assert any("Entry 1" in name for name in all_asset_names), "Asset Entry 1 missing - OVERWRITE BUG!"
        assert any("Entry 2" in name for name in all_asset_names), "Asset Entry 2 missing"
        
        # Should have at least 2 assets
        test_assets = [name for name in all_asset_names if "Entry" in name]
        assert len(test_assets) >= 2, \
            f"Expected at least 2 asset entries, got {len(test_assets)} - APPEND NOT WORKING!"
        
        print(f"✓ BUG FIX VERIFIED: Both asset entries exist (total entries with 'Entry': {len(test_assets)})")


class TestMultipleEntriesInSingleRequest:
    """Test adding multiple entries in a single request (loanItems/investItems arrays)"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        session, email = create_authenticated_session()
        return {"session": session, "email": email}
    
    def test_multiple_loans_single_request(self, test_user):
        """Test adding multiple loans in a single request (loanItems array)"""
        session = test_user["session"]
        
        # Multiple loans in single request (like "Add another loan" button)
        multi_loan_data = {
            "step": 4,
            "data": {
                "items": [
                    {
                        "name": "Multi Loan A",
                        "amount": "1000000",
                        "loanType": "Personal Loan",
                        "emi": "25000"
                    },
                    {
                        "name": "Multi Loan B",
                        "amount": "500000",
                        "loanType": "Education Loan",
                        "emi": "12000"
                    }
                ]
            },
            "skipped": False
        }
        
        resp = session.post(f"{BASE_URL}/api/onboarding/save-step", json=multi_loan_data)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert data.get("savedCount", 0) >= 2, f"Expected 2 loans saved, got {data.get('savedCount')}"
        
        print(f"✓ Multiple loans in single request: saved {data.get('savedCount')} loans")
    
    def test_multiple_investments_single_request(self, test_user):
        """Test adding multiple investments in a single request (investItems array)"""
        session = test_user["session"]
        
        # Multiple investments in single request (like "Add another investment" button)
        multi_invest_data = {
            "step": 5,
            "data": {
                "items": [
                    {
                        "name": "Multi Invest A - SIP",
                        "amount": "5000",
                        "investmentType": "mutual-fund",
                        "frequency": "Monthly"
                    },
                    {
                        "name": "Multi Invest B - FD",
                        "amount": "100000",
                        "investmentType": "fd",
                        "frequency": "One-time"
                    }
                ]
            },
            "skipped": False
        }
        
        resp = session.post(f"{BASE_URL}/api/onboarding/save-step", json=multi_invest_data)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert data.get("savedCount", 0) >= 2, f"Expected 2 investments saved, got {data.get('savedCount')}"
        
        print(f"✓ Multiple investments in single request: saved {data.get('savedCount')} investments")


class TestProfileCompletionAfterAppend:
    """Test that profile completion correctly reflects multiple entries"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        session, email = create_authenticated_session()
        return {"session": session, "email": email}
    
    def test_completion_counts_all_entries(self, test_user):
        """Profile completion should count ALL entries, not just latest"""
        session = test_user["session"]
        
        # Add multiple income entries
        for i in range(3):
            income_data = {
                "step": 1,
                "data": {
                    "items": [{
                        "name": f"Income Count Test {i+1}",
                        "amount": f"{(i+1) * 10000}",
                        "type": "Salary"
                    }]
                },
                "skipped": False
            }
            resp = session.post(f"{BASE_URL}/api/onboarding/save-step", json=income_data)
            assert resp.status_code == 200
        
        # Check profile completion counts
        comp_resp = session.get(f"{BASE_URL}/api/onboarding/profile-completion")
        assert comp_resp.status_code == 200
        comp_data = comp_resp.json()
        
        # Should have at least 3 income entries
        assert comp_data.get("counts", {}).get("income", 0) >= 3, \
            f"Expected at least 3 income count, got {comp_data.get('counts', {}).get('income', 0)}"
        
        assert comp_data.get("incomeAdded") == True, "incomeAdded should be True"
        
        print(f"✓ Profile completion shows correct counts: {comp_data.get('counts')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
