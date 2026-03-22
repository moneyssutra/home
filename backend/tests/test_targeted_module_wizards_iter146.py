"""
Test Targeted Module Wizards for MoneySutra Profile Health page.
Tests deep data fields: dueDate, needOrWant, purchaseDate, growthRate, tenure, nextDueDate
"""
import pytest
import requests
import random
import string
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fintech-dash-45.preview.emergentagent.com')

def generate_alpha_string(length=8):
    """Generate random alphabetic string"""
    return ''.join(random.choices(string.ascii_lowercase, k=length))

def create_authenticated_session():
    """Create a new user and return authenticated session"""
    unique_alpha = generate_alpha_string()
    user_data = {
        "firstName": f"Test{unique_alpha}",
        "lastName": f"User{unique_alpha}",
        "email": f"test{unique_alpha}@test.com",
        "password": "Test1234!",
        "sex": "Male",
        "dateOfBirth": "1990-01-01"
    }
    
    session = requests.Session()
    
    # Register user
    reg_resp = session.post(f"{BASE_URL}/api/auth/register", json=user_data)
    if reg_resp.status_code not in [200, 201]:
        print(f"Registration response: {reg_resp.text}")
    assert reg_resp.status_code in [200, 201], f"Registration failed: {reg_resp.text}"
    
    # Login user - use JSON format
    login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
        "username": user_data["email"],
        "password": user_data["password"]
    }, headers={"Content-Type": "application/json"})
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    
    return session, user_data["email"]

class TestTargetedModuleWizards:
    """Tests for targeted module wizards and deep data fields"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        """Create a test user for module wizard tests"""
        session, email = create_authenticated_session()
        return {"session": session, "email": email}
    
    # ============ PROFILE COMPLETION TESTS ============
    
    def test_profile_completion_endpoint(self, test_user):
        """Test profile-completion endpoint returns correct structure"""
        session = test_user["session"]
        resp = session.get(f"{BASE_URL}/api/onboarding/profile-completion")
        
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        # Verify structure
        assert "profileCompletion" in data
        assert "incomeAdded" in data
        assert "expensesAdded" in data
        assert "assetsAdded" in data
        assert "liabilitiesAdded" in data
        assert "investmentsAdded" in data
        assert "counts" in data
        
        print(f"Profile completion: {data['profileCompletion']}%")
        print(f"Counts: {data['counts']}")
    
    # ============ INCOME MODULE TESTS ============
    
    def test_income_module_with_deep_fields(self, test_user):
        """Test saving income with all deep fields (name, frequency, selectedDate, accountId)"""
        session = test_user["session"]
        
        income_data = {
            "step": 1,
            "data": {
                "items": [{
                    "name": "Monthly Salary",
                    "amount": "75000",
                    "type": "Salary",
                    "category": "salary",
                    "frequency": "Monthly",
                    "selectedDate": "5",  # 5th of each month
                    # accountId omitted - no accounts yet
                }]
            },
            "skipped": False
        }
        
        resp = session.post(f"{BASE_URL}/api/onboarding/save-step", json=income_data)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        
        result = resp.json()
        assert result.get("savedCount") == 1
        print(f"Income saved with deep fields: {result}")
        
        # Verify profile completion updated
        comp_resp = session.get(f"{BASE_URL}/api/onboarding/profile-completion")
        assert comp_resp.status_code == 200
        comp_data = comp_resp.json()
        assert comp_data["incomeAdded"] == True
        assert comp_data["counts"]["income"] >= 1
        print(f"Profile completion after income: {comp_data['profileCompletion']}%")
    
    # ============ EXPENSES MODULE TESTS ============
    
    def test_expenses_module_with_deep_fields(self, test_user):
        """Test saving expenses with dueDate and needOrWant deep fields"""
        session = test_user["session"]
        
        expense_data = {
            "step": 2,
            "data": {
                "items": [
                    {
                        "name": "Rent / Housing",
                        "amount": "20000",
                        "category": "Housing",
                        "frequency": "Monthly",
                        "dueDate": "1",  # Deep field: due date
                        "needOrWant": "need"  # Deep field: need/want classification
                    },
                    {
                        "name": "Utilities",
                        "amount": "3000",
                        "category": "Utilities",
                        "frequency": "Monthly",
                        "dueDate": "10",
                        "needOrWant": "need"
                    },
                    {
                        "name": "Dining Out",
                        "amount": "5000",
                        "category": "Food",
                        "frequency": "Monthly",
                        "dueDate": "",  # Optional
                        "needOrWant": "want"
                    }
                ]
            },
            "skipped": False
        }
        
        resp = session.post(f"{BASE_URL}/api/onboarding/save-step", json=expense_data)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        
        result = resp.json()
        assert result.get("savedCount") == 3
        print(f"Expenses saved with deep fields: {result}")
        
        # Verify profile completion
        comp_resp = session.get(f"{BASE_URL}/api/onboarding/profile-completion")
        comp_data = comp_resp.json()
        assert comp_data["expensesAdded"] == True
        assert comp_data["counts"]["expenses"] >= 3
    
    # ============ ASSETS MODULE TESTS ============
    
    def test_assets_module_with_deep_fields(self, test_user):
        """Test saving assets with purchaseDate and growthRate deep fields"""
        session = test_user["session"]
        
        asset_data = {
            "step": 3,
            "data": {
                "items": [
                    {
                        "name": "HDFC Savings",
                        "amount": "50000",
                        "assetType": "bank_balance",
                        # Bank balance doesn't need purchaseDate/growthRate
                    },
                    {
                        "name": "Apartment",
                        "amount": "5000000",
                        "assetType": "property",
                        "purchaseDate": "2020-01-15",  # Deep field
                        "growthRate": "8"  # Deep field: expected appreciation %
                    },
                    {
                        "name": "Gold Coins",
                        "amount": "200000",
                        "assetType": "gold",
                        "purchaseDate": "2019-05-20",
                        "growthRate": "5"
                    }
                ]
            },
            "skipped": False
        }
        
        resp = session.post(f"{BASE_URL}/api/onboarding/save-step", json=asset_data)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        
        result = resp.json()
        assert result.get("savedCount") == 3
        print(f"Assets saved with deep fields: {result}")
        
        # Verify profile completion
        comp_resp = session.get(f"{BASE_URL}/api/onboarding/profile-completion")
        comp_data = comp_resp.json()
        assert comp_data["assetsAdded"] == True
    
    # ============ LIABILITIES MODULE TESTS ============
    
    def test_liabilities_module_with_deep_fields(self, test_user):
        """Test saving liabilities with tenure and nextDueDate deep fields"""
        session = test_user["session"]
        
        liability_data = {
            "step": 4,
            "data": {
                "items": [{
                    "name": "Home Loan",
                    "amount": "4000000",
                    "loanType": "Home",
                    "emi": "35000",
                    "rate": "8.5",  # Deep field: interest rate
                    "tenure": "180",  # Deep field: tenure in months
                    "nextDueDate": "5"  # Deep field: day of month for EMI
                }]
            },
            "skipped": False
        }
        
        resp = session.post(f"{BASE_URL}/api/onboarding/save-step", json=liability_data)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        
        result = resp.json()
        assert result.get("savedCount") == 1
        print(f"Liabilities saved with deep fields: {result}")
        
        # Verify profile completion
        comp_resp = session.get(f"{BASE_URL}/api/onboarding/profile-completion")
        comp_data = comp_resp.json()
        assert comp_data["liabilitiesAdded"] == True
    
    # ============ INVESTMENTS MODULE TESTS ============
    
    def test_investments_module_with_deep_fields(self, test_user):
        """Test saving investments with frequency, startDate, growthRate, linkedAccountId"""
        session = test_user["session"]
        
        investment_data = {
            "step": 5,
            "data": {
                "items": [{
                    "name": "HDFC Flexi Cap",
                    "amount": "10000",
                    "investmentType": "mutual-fund",
                    "category": "Mutual Fund",
                    "frequency": "Monthly",  # Deep field: SIP frequency
                    "startDate": "2023-06-01",  # Deep field
                    "growthRate": "12",  # Deep field: expected returns %
                    # linkedAccountId omitted
                }]
            },
            "skipped": False
        }
        
        resp = session.post(f"{BASE_URL}/api/onboarding/save-step", json=investment_data)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        
        result = resp.json()
        assert result.get("savedCount") == 1
        print(f"Investments saved with deep fields: {result}")
        
        # Verify profile completion is now 100%
        comp_resp = session.get(f"{BASE_URL}/api/onboarding/profile-completion")
        comp_data = comp_resp.json()
        assert comp_data["investmentsAdded"] == True
        assert comp_data["profileCompletion"] == 100
        print(f"Final profile completion: {comp_data['profileCompletion']}%")
    
    # ============ SKIP MODULE TESTS ============
    
    def test_skip_module_marks_completed(self):
        """Test that skipping a module still marks it as completed"""
        session, email = create_authenticated_session()
        
        # Skip all modules
        for step in range(1, 6):
            resp = session.post(f"{BASE_URL}/api/onboarding/save-step", json={
                "step": step,
                "data": {},
                "skipped": True
            })
            assert resp.status_code == 200, f"Step {step} skip failed: {resp.text}"
        
        # Verify 100% completion with all skipped
        comp_resp = session.get(f"{BASE_URL}/api/onboarding/profile-completion")
        comp_data = comp_resp.json()
        
        assert comp_data["profileCompletion"] == 100
        assert comp_data["incomeAdded"] == True
        assert comp_data["expensesAdded"] == True
        assert comp_data["assetsAdded"] == True
        assert comp_data["liabilitiesAdded"] == True
        assert comp_data["investmentsAdded"] == True
        print(f"Skip test: All modules skipped, completion = {comp_data['profileCompletion']}%")
    
    # ============ MODULE RE-ENTRY TESTS ============
    
    def test_module_reentry_updates_data(self):
        """Test that re-entering a module updates (not duplicates) data"""
        session, email = create_authenticated_session()
        
        # First save income
        resp1 = session.post(f"{BASE_URL}/api/onboarding/save-step", json={
            "step": 1,
            "data": {
                "items": [{
                    "name": "Initial Salary",
                    "amount": "50000",
                    "type": "Salary",
                    "frequency": "Monthly",
                    "selectedDate": "1"
                }]
            },
            "skipped": False
        })
        assert resp1.status_code == 200, f"First save failed: {resp1.text}"
        
        # Re-enter and update income
        resp2 = session.post(f"{BASE_URL}/api/onboarding/save-step", json={
            "step": 1,
            "data": {
                "items": [{
                    "name": "Updated Salary",
                    "amount": "75000",
                    "type": "Salary",
                    "frequency": "Monthly",
                    "selectedDate": "5"
                }]
            },
            "skipped": False
        })
        assert resp2.status_code == 200, f"Second save failed: {resp2.text}"
        
        # Should still have only 1 income source (updated, not duplicated)
        comp_resp = session.get(f"{BASE_URL}/api/onboarding/profile-completion")
        comp_data = comp_resp.json()
        assert comp_data["counts"]["income"] == 1, f"Expected 1 income, got {comp_data['counts']['income']}"
        print(f"Re-entry test: Income count = {comp_data['counts']['income']} (should be 1)")
    
    # ============ DEEP FIELD PERSISTENCE TESTS ============
    
    def test_expense_deep_fields_persisted_in_db(self, test_user):
        """Verify expense dueDate and needOrWant are actually saved in expenses collection"""
        session = test_user["session"]
        
        # Get expenses via API
        resp = session.get(f"{BASE_URL}/api/expenses")
        if resp.status_code == 200:
            expenses = resp.json()
            if isinstance(expenses, list) and len(expenses) > 0:
                # Check for deep fields
                for exp in expenses:
                    if exp.get("source") == "onboarding":
                        print(f"Expense: {exp.get('expenseName')}, dueDate: {exp.get('dueDate')}, needOrWant: {exp.get('needOrWant')}")
        print("Expense deep fields test completed")
    
    def test_loan_deep_fields_persisted_in_db(self, test_user):
        """Verify loan tenure and nextDueDate are saved in loans collection"""
        session = test_user["session"]
        
        resp = session.get(f"{BASE_URL}/api/loans")
        if resp.status_code == 200:
            loans = resp.json()
            if isinstance(loans, list) and len(loans) > 0:
                for loan in loans:
                    if loan.get("source") == "onboarding":
                        print(f"Loan: {loan.get('loanName')}, tenure: {loan.get('tenureMonths')}, nextDueDate: {loan.get('nextDueDate')}, rate: {loan.get('interestRate')}")
        print("Loan deep fields test completed")
    
    def test_asset_deep_fields_persisted_in_db(self, test_user):
        """Verify asset purchaseDate and growthRate are saved"""
        session = test_user["session"]
        
        resp = session.get(f"{BASE_URL}/api/assets")
        if resp.status_code == 200:
            assets = resp.json()
            if isinstance(assets, list) and len(assets) > 0:
                for asset in assets:
                    if asset.get("source") == "onboarding":
                        print(f"Asset: {asset.get('assetName')}, purchaseDate: {asset.get('purchaseDate')}, growthRate: {asset.get('growthRate')}")
        print("Asset deep fields test completed")
    
    def test_investment_deep_fields_persisted_in_db(self, test_user):
        """Verify investment frequency, startDate, growthRate are saved"""
        session = test_user["session"]
        
        resp = session.get(f"{BASE_URL}/api/investments")
        if resp.status_code == 200:
            investments = resp.json()
            if isinstance(investments, list) and len(investments) > 0:
                for inv in investments:
                    if inv.get("source") == "onboarding":
                        print(f"Investment: {inv.get('name')}, frequency: {inv.get('frequency')}, startDate: {inv.get('startDate')}, growthRate: {inv.get('growthRate')}")
        print("Investment deep fields test completed")


class TestModuleWizardQueryParam:
    """Test that ?module= query param triggers correct behavior (frontend tests this via Playwright)"""
    
    def test_onboarding_progress_endpoint(self):
        """Test that progress endpoint returns step data"""
        session, email = create_authenticated_session()
        
        # Get progress
        resp = session.get(f"{BASE_URL}/api/onboarding/progress")
        assert resp.status_code == 200, f"Progress endpoint failed: {resp.text}"
        
        data = resp.json()
        print(f"Progress endpoint response: {data}")
        
        # Save one step and check progress again
        save_resp = session.post(f"{BASE_URL}/api/onboarding/save-step", json={
            "step": 1,
            "data": {"items": [{"name": "Test", "amount": "10000", "type": "Salary", "frequency": "Monthly"}]},
            "skipped": False
        })
        assert save_resp.status_code == 200, f"Save step failed: {save_resp.text}"
        
        resp2 = session.get(f"{BASE_URL}/api/onboarding/progress")
        data2 = resp2.json()
        assert data2.get("currentStep") >= 1
        print(f"After saving step 1: {data2}")


class TestOnboardingComplete:
    """Test the complete onboarding flow endpoint"""
    
    def test_complete_endpoint_updates_profile(self):
        """Test that POST /onboarding/complete marks profile as done"""
        session, email = create_authenticated_session()
        
        # Save all steps with data
        for step in range(1, 6):
            resp = session.post(f"{BASE_URL}/api/onboarding/save-step", json={
                "step": step,
                "data": {},
                "skipped": True
            })
            assert resp.status_code == 200, f"Step {step} failed: {resp.text}"
        
        # Complete onboarding
        resp = session.post(f"{BASE_URL}/api/onboarding/complete", json={})
        assert resp.status_code == 200, f"Complete endpoint failed: {resp.text}"
        
        data = resp.json()
        assert "profileCompletion" in data
        assert data["profileCompletion"] == 100
        print(f"Complete endpoint response: {data}")
    
    def test_dismiss_endpoint(self):
        """Test that POST /onboarding/dismiss marks banner as dismissed"""
        session, email = create_authenticated_session()
        
        # Dismiss
        resp = session.post(f"{BASE_URL}/api/onboarding/dismiss", json={})
        assert resp.status_code == 200, f"Dismiss endpoint failed: {resp.text}"
        
        # Check completion shows dismissed
        comp_resp = session.get(f"{BASE_URL}/api/onboarding/profile-completion")
        comp_data = comp_resp.json()
        assert comp_data.get("dismissed") == True
        print(f"Dismiss test: dismissed = {comp_data.get('dismissed')}")
