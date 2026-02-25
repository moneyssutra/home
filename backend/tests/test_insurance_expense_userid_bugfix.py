"""
Test suite for Insurance Auto-Create Expense/Asset with userId bug fix.

Bug Fixes Tested:
1. POST /api/insurances with autoCreateExpense=true should create an expense WITH userId
2. The auto-created expense should appear in GET /api/expenses for the same user
3. The auto-created expense should have category='Insurance', expenseType='Fixed', and correct linkedInsuranceId
4. Auto-created asset should also have userId when maturityType triggers asset creation
"""
import pytest
import requests
import uuid
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestInsuranceAutoExpenseWithUserId:
    """Test that auto-created expense from insurance includes userId"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        self.session = requests.Session()
        login_resp = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test", "password": "test"}
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.user_data = login_resp.json()
        self.user_id = self.user_data.get('user_id')
        self.session_token = self.user_data.get('session_token')
        self.session.cookies.set('session_token', self.session_token)
        
        # Track created resources for cleanup
        self.created_insurance_id = None
        
        yield
        
        # Cleanup: Delete created insurance
        if self.created_insurance_id:
            try:
                del_resp = self.session.delete(f"{BASE_URL}/api/insurances/{self.created_insurance_id}")
                print(f"Cleanup: Deleted insurance {self.created_insurance_id}, status: {del_resp.status_code}")
            except Exception as e:
                print(f"Cleanup warning: {e}")
                
        # Also cleanup any orphaned expenses from this test
        try:
            expenses_resp = self.session.get(f"{BASE_URL}/api/expenses")
            if expenses_resp.status_code == 200:
                for exp in expenses_resp.json():
                    if exp.get('expenseName', '').startswith('TEST_Insurance_Bugfix'):
                        self.session.delete(f"{BASE_URL}/api/expenses/{exp['id']}")
                        print(f"Cleanup: Deleted test expense {exp['id']}")
        except Exception as e:
            print(f"Cleanup warning: {e}")
    
    def test_insurance_creates_expense_with_userid(self):
        """
        CRITICAL BUG FIX TEST: Creating insurance with autoCreateExpense=true
        should create an expense that has the correct userId.
        
        Before fix: expense_data dict was missing 'userId'
        After fix: expense_data includes 'userId': user.get('user_id')
        """
        # Create a Term Insurance with autoCreateExpense enabled
        unique_suffix = uuid.uuid4().hex[:8]
        insurance_payload = {
            "insuranceType": "Term Insurance",
            "policyName": f"TEST_Insurance_Bugfix_{unique_suffix}",
            "coverageAmount": 5000000,
            "premiumAmount": 15000,
            "premiumFrequency": "Yearly",
            "startDate": "2025-01-15",
            "endDate": "2045-01-15",
            "autoCreateExpense": True,
            "premiumEndDate": "2035-01-15",
            "premiumPaymentTerm": "10 Years"
        }
        
        # Create insurance
        create_resp = self.session.post(
            f"{BASE_URL}/api/insurances",
            json=insurance_payload
        )
        assert create_resp.status_code == 200, f"Failed to create insurance: {create_resp.text}"
        created_insurance = create_resp.json()
        self.created_insurance_id = created_insurance.get('id')
        print(f"Created insurance: {self.created_insurance_id}")
        
        # Verify insurance was created with correct data
        assert created_insurance.get('policyName') == insurance_payload['policyName']
        assert created_insurance.get('autoCreateExpense') == True
        
        # Now fetch expenses for this user
        expenses_resp = self.session.get(f"{BASE_URL}/api/expenses")
        assert expenses_resp.status_code == 200, f"Failed to fetch expenses: {expenses_resp.text}"
        expenses = expenses_resp.json()
        
        # Find the auto-created expense linked to this insurance
        linked_expense = None
        for exp in expenses:
            if exp.get('linkedInsuranceId') == self.created_insurance_id:
                linked_expense = exp
                break
        
        # CRITICAL ASSERTION: The expense should exist in the user's expense list
        assert linked_expense is not None, (
            f"BUG NOT FIXED: Auto-created expense from insurance not found in user's expense list! "
            f"This means the expense was either not created or created without userId. "
            f"Insurance ID: {self.created_insurance_id}"
        )
        
        print(f"Found auto-created expense: {linked_expense.get('id')}")
        print(f"Expense userId: {linked_expense.get('userId')}")
        
        # Verify expense has correct properties
        assert linked_expense.get('category') == 'Insurance', \
            f"Expected category='Insurance', got '{linked_expense.get('category')}'"
        
        assert linked_expense.get('expenseType') == 'Fixed', \
            f"Expected expenseType='Fixed', got '{linked_expense.get('expenseType')}'"
        
        assert linked_expense.get('expectedAmount') == 15000, \
            f"Expected amount=15000, got {linked_expense.get('expectedAmount')}"
        
        assert linked_expense.get('expenseName') == f"TEST_Insurance_Bugfix_{unique_suffix} Premium", \
            f"Expected expense name to include policy name, got '{linked_expense.get('expenseName')}'"
        
        # MOST IMPORTANT: Verify userId is set correctly
        assert linked_expense.get('userId') == self.user_id, (
            f"BUG: Expense userId mismatch! "
            f"Expected '{self.user_id}', got '{linked_expense.get('userId')}'"
        )
        
        print("SUCCESS: Auto-created expense has correct userId and appears in user's expense list!")
    
    def test_insurance_asset_auto_create_with_userid(self):
        """
        BUG FIX TEST: Creating insurance with maturityType='Market Linked' or 'Returns on Maturity'
        should create an asset WITH the correct userId.
        
        Before fix: asset_data dict was missing 'userId'
        After fix: asset_data includes 'userId': user.get('user_id')
        """
        unique_suffix = uuid.uuid4().hex[:8]
        insurance_payload = {
            "insuranceType": "Life Insurance",
            "policyName": f"TEST_Insurance_Asset_Bugfix_{unique_suffix}",
            "coverageAmount": 10000000,
            "premiumAmount": 50000,
            "premiumFrequency": "Yearly",
            "startDate": "2025-01-15",
            "endDate": "2045-01-15",
            "maturityType": "Returns on Maturity",  # This triggers asset creation
            "expectedMaturityAmount": 2500000,
            "autoCreateExpense": False  # Focus on asset creation
        }
        
        # Create insurance
        create_resp = self.session.post(
            f"{BASE_URL}/api/insurances",
            json=insurance_payload
        )
        assert create_resp.status_code == 200, f"Failed to create insurance: {create_resp.text}"
        created_insurance = create_resp.json()
        self.created_insurance_id = created_insurance.get('id')
        print(f"Created insurance with maturityType: {self.created_insurance_id}")
        
        # Fetch assets for this user
        assets_resp = self.session.get(f"{BASE_URL}/api/assets")
        assert assets_resp.status_code == 200, f"Failed to fetch assets: {assets_resp.text}"
        assets = assets_resp.json()
        
        # Find the auto-created asset linked to this insurance
        linked_asset = None
        for asset in assets:
            if asset.get('linkedInsuranceId') == self.created_insurance_id:
                linked_asset = asset
                break
        
        # CRITICAL ASSERTION: The asset should exist in the user's asset list
        assert linked_asset is not None, (
            f"BUG: Auto-created asset from insurance not found in user's asset list! "
            f"Insurance ID: {self.created_insurance_id}, maturityType: Returns on Maturity"
        )
        
        print(f"Found auto-created asset: {linked_asset.get('id')}")
        print(f"Asset userId: {linked_asset.get('userId')}")
        
        # Verify asset has correct properties
        assert linked_asset.get('assetType') == 'Insurance Asset'
        assert linked_asset.get('currentValue') == 2500000  # expectedMaturityAmount
        
        # MOST IMPORTANT: Verify userId is set correctly
        assert linked_asset.get('userId') == self.user_id, (
            f"BUG: Asset userId mismatch! "
            f"Expected '{self.user_id}', got '{linked_asset.get('userId')}'"
        )
        
        print("SUCCESS: Auto-created asset has correct userId!")
        
        # Cleanup: Delete the auto-created asset
        if linked_asset:
            del_resp = self.session.delete(f"{BASE_URL}/api/assets/{linked_asset['id']}")
            print(f"Cleanup: Deleted auto-created asset, status: {del_resp.status_code}")
    
    def test_expense_persists_with_correct_userid(self):
        """
        Verify that the expense created by insurance persists and can be 
        independently fetched with GET /api/expenses/{id}
        """
        unique_suffix = uuid.uuid4().hex[:8]
        insurance_payload = {
            "insuranceType": "Health Insurance",
            "policyName": f"TEST_Insurance_Bugfix_Persist_{unique_suffix}",
            "coverageAmount": 1000000,
            "premiumAmount": 25000,
            "premiumFrequency": "Yearly",
            "startDate": "2025-01-01",
            "autoCreateExpense": True
        }
        
        # Create insurance
        create_resp = self.session.post(
            f"{BASE_URL}/api/insurances",
            json=insurance_payload
        )
        assert create_resp.status_code == 200
        created_insurance = create_resp.json()
        self.created_insurance_id = created_insurance.get('id')
        
        # Get all expenses
        expenses_resp = self.session.get(f"{BASE_URL}/api/expenses")
        assert expenses_resp.status_code == 200
        expenses = expenses_resp.json()
        
        # Find linked expense
        linked_expense = None
        for exp in expenses:
            if exp.get('linkedInsuranceId') == self.created_insurance_id:
                linked_expense = exp
                break
        
        assert linked_expense is not None, "Auto-created expense not found"
        
        # Now fetch this specific expense by ID
        expense_id = linked_expense.get('id')
        single_expense_resp = self.session.get(f"{BASE_URL}/api/expenses/{expense_id}")
        
        # If endpoint exists and returns the expense
        if single_expense_resp.status_code == 200:
            fetched_expense = single_expense_resp.json()
            assert fetched_expense.get('userId') == self.user_id
            assert fetched_expense.get('linkedInsuranceId') == self.created_insurance_id
            print(f"SUCCESS: Single expense fetch confirmed userId={self.user_id}")
        else:
            # If single expense GET doesn't exist, at least verify from list
            print("Note: GET /api/expenses/{id} not available, verified from list")
            assert linked_expense.get('userId') == self.user_id
        
        # Cleanup expense
        del_resp = self.session.delete(f"{BASE_URL}/api/expenses/{expense_id}")
        print(f"Cleanup: Deleted expense {expense_id}, status: {del_resp.status_code}")


class TestExpenseFrequencyMapping:
    """Test that expense frequency is correctly mapped from insurance premium frequency"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_resp = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test", "password": "test"}
        )
        assert login_resp.status_code == 200
        self.user_data = login_resp.json()
        self.session.cookies.set('session_token', self.user_data.get('session_token'))
        self.created_insurance_ids = []
        
        yield
        
        # Cleanup
        for ins_id in self.created_insurance_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/insurances/{ins_id}")
            except:
                pass
    
    @pytest.mark.parametrize("premium_freq,expected_expense_freq", [
        ("Monthly", "Monthly"),
        ("Quarterly", "Quarterly"),
        ("Half-Yearly", "Half-Yearly"),
        ("Yearly", "Yearly"),
    ])
    def test_frequency_mapping(self, premium_freq, expected_expense_freq):
        """Test that premium frequency correctly maps to expense frequency"""
        unique_suffix = uuid.uuid4().hex[:8]
        insurance_payload = {
            "insuranceType": "Term Insurance",
            "policyName": f"TEST_Freq_{premium_freq}_{unique_suffix}",
            "coverageAmount": 5000000,
            "premiumAmount": 10000,
            "premiumFrequency": premium_freq,
            "startDate": "2025-01-15",
            "autoCreateExpense": True
        }
        
        create_resp = self.session.post(
            f"{BASE_URL}/api/insurances",
            json=insurance_payload
        )
        assert create_resp.status_code == 200
        created_insurance = create_resp.json()
        self.created_insurance_ids.append(created_insurance.get('id'))
        
        # Fetch expenses
        expenses_resp = self.session.get(f"{BASE_URL}/api/expenses")
        assert expenses_resp.status_code == 200
        
        # Find linked expense
        linked_expense = None
        for exp in expenses_resp.json():
            if exp.get('linkedInsuranceId') == created_insurance.get('id'):
                linked_expense = exp
                break
        
        assert linked_expense is not None, f"Expense not created for {premium_freq}"
        assert linked_expense.get('frequency') == expected_expense_freq, \
            f"Expected frequency={expected_expense_freq}, got {linked_expense.get('frequency')}"
        
        # Cleanup expense
        self.session.delete(f"{BASE_URL}/api/expenses/{linked_expense['id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
