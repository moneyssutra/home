"""
Test Profile Setup / Onboarding flow - iteration 145
Tests the new 5-category Profile Health Grid and Setup Wizard
Categories: Income, Expenses, Assets, Liabilities, Investments
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProfileSetupOnboarding:
    """Tests for the new Profile Setup (onboarding) flow with 5 categories"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create a fresh test user for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Register a new user with unique first name and last name
        # Use alphabetic names to avoid validation errors
        import random
        import string
        first_suffix = ''.join(random.choices(string.ascii_lowercase, k=6))
        last_suffix = ''.join(random.choices(string.ascii_lowercase, k=6))
        unique_id = str(uuid.uuid4())[:8]
        self.test_email = f"test_profile_{unique_id}@test.com"
        register_data = {
            "firstName": f"Test{first_suffix}",
            "lastName": f"User{last_suffix}",
            "email": self.test_email,
            "password": "Test123!",
            "sex": "Male",
            "dateOfBirth": "1990-01-15"
        }
        
        response = self.session.post(f"{BASE_URL}/api/auth/register", json=register_data)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        self.user_id = data.get("user_id")
        self.session_token = data.get("session_token")
        
        # Set the session cookie
        self.session.cookies.set("session_token", self.session_token)
        
        yield
        
        # Cleanup - no explicit cleanup needed, tests use unique users
    
    # ─── Profile Completion API Tests ───
    
    def test_profile_completion_initial_state(self):
        """New user should start at 0% completion with all categories false"""
        response = self.session.get(f"{BASE_URL}/api/onboarding/profile-completion")
        assert response.status_code == 200, f"Profile completion failed: {response.text}"
        
        data = response.json()
        assert data["profileCompletion"] == 0, "New user should have 0% completion"
        assert data["incomeAdded"] == False, "Income should not be added"
        assert data["expensesAdded"] == False, "Expenses should not be added"
        assert data["assetsAdded"] == False, "Assets should not be added"
        assert data["liabilitiesAdded"] == False, "Liabilities should not be added"
        assert data["investmentsAdded"] == False, "Investments should not be added"
        assert data["dismissed"] == False, "Should not be dismissed"
        assert "counts" in data, "Should include counts object"
        
        print(f"✓ Initial profile completion verified: {data['profileCompletion']}%")
    
    def test_profile_completion_shows_5_categories(self):
        """Profile completion API should return status for all 5 categories"""
        response = self.session.get(f"{BASE_URL}/api/onboarding/profile-completion")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check all 5 category flags exist
        required_fields = ["incomeAdded", "expensesAdded", "assetsAdded", "liabilitiesAdded", "investmentsAdded"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Check counts exist
        assert "counts" in data
        count_fields = ["income", "expenses", "accounts", "assets", "investments", "loans", "creditCards"]
        for field in count_fields:
            assert field in data["counts"], f"Missing count field: {field}"
        
        print("✓ All 5 category fields and counts present in response")
    
    # ─── Wizard Step 1: Income ───
    
    def test_save_step_1_income(self):
        """Step 1: Save income data"""
        step_data = {
            "step": 1,
            "data": {
                "items": [{
                    "name": "Monthly Salary",
                    "amount": "75000",
                    "type": "Salary",
                    "category": "salary",
                    "frequency": "Monthly"
                }]
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/onboarding/save-step", json=step_data)
        assert response.status_code == 200, f"Save step 1 failed: {response.text}"
        
        data = response.json()
        assert data["message"] == "Step 1 saved", f"Unexpected message: {data}"
        assert data.get("savedCount", 0) >= 1, "Should save at least 1 income item"
        
        # Verify completion updated
        completion = self.session.get(f"{BASE_URL}/api/onboarding/profile-completion").json()
        assert completion["incomeAdded"] == True, "Income should be marked as added"
        assert completion["profileCompletion"] == 20, "Completion should be 20% after income"
        
        print(f"✓ Step 1 (Income) saved, completion: {completion['profileCompletion']}%")
    
    def test_save_step_1_income_with_deep_details(self):
        """Step 1: Save income with deep details (name, frequency, account)"""
        step_data = {
            "step": 1,
            "data": {
                "items": [{
                    "name": "Tech Consulting",
                    "amount": "150000",
                    "type": "Business",
                    "category": "business",
                    "frequency": "Monthly",
                    "accountId": None  # Deep detail field
                }]
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/onboarding/save-step", json=step_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["savedCount"] >= 1
        
        print("✓ Income with deep details saved successfully")
    
    # ─── Wizard Step 2: Expenses ───
    
    def test_save_step_2_expenses(self):
        """Step 2: Save expense data"""
        # First save income
        self.session.post(f"{BASE_URL}/api/onboarding/save-step", json={
            "step": 1,
            "data": {"items": [{"name": "Salary", "amount": "100000", "type": "Salary", "category": "salary", "frequency": "Monthly"}]}
        })
        
        step_data = {
            "step": 2,
            "data": {
                "items": [
                    {"name": "Rent / Housing", "amount": "25000", "category": "Housing", "frequency": "Monthly"},
                    {"name": "Utilities", "amount": "5000", "category": "Utilities", "frequency": "Monthly"},
                    {"name": "Transport / Fuel", "amount": "8000", "category": "Transport", "frequency": "Monthly"}
                ]
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/onboarding/save-step", json=step_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == "Step 2 saved"
        assert data.get("savedCount", 0) >= 3, "Should save 3 expense items"
        
        # Verify completion
        completion = self.session.get(f"{BASE_URL}/api/onboarding/profile-completion").json()
        assert completion["expensesAdded"] == True
        assert completion["profileCompletion"] >= 40, "Should be at least 40% after income+expenses"
        
        print(f"✓ Step 2 (Expenses) saved, completion: {completion['profileCompletion']}%")
    
    def test_skip_step_2_expenses(self):
        """Skipping expenses should still count toward completion"""
        # Save income first
        self.session.post(f"{BASE_URL}/api/onboarding/save-step", json={
            "step": 1,
            "data": {"items": [{"name": "Salary", "amount": "100000", "type": "Salary", "category": "salary", "frequency": "Monthly"}]}
        })
        
        # Skip expenses
        response = self.session.post(f"{BASE_URL}/api/onboarding/save-step", json={
            "step": 2,
            "data": {},
            "skipped": True
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "skipped" in data["message"].lower(), f"Expected skip message: {data}"
        
        # Verify completion - skipped should count as completed
        completion = self.session.get(f"{BASE_URL}/api/onboarding/profile-completion").json()
        assert completion["expensesAdded"] == True, "Skipped expenses should still mark as completed"
        assert completion["profileCompletion"] >= 40, "Skipped step should count toward completion"
        
        print(f"✓ Step 2 (Expenses) skipped, completion: {completion['profileCompletion']}%")
    
    # ─── Wizard Step 3: Assets ───
    
    def test_save_step_3_assets_bank_balance(self):
        """Step 3: Save asset data - bank balance"""
        step_data = {
            "step": 3,
            "data": {
                "items": [{
                    "name": "HDFC Savings",
                    "amount": "500000",
                    "assetType": "bank_balance"
                }]
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/onboarding/save-step", json=step_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == "Step 3 saved"
        assert data.get("savedCount", 0) >= 1
        
        # Verify completion
        completion = self.session.get(f"{BASE_URL}/api/onboarding/profile-completion").json()
        assert completion["assetsAdded"] == True
        
        print(f"✓ Step 3 (Assets - bank balance) saved, completion: {completion['profileCompletion']}%")
    
    def test_save_step_3_assets_multiple_types(self):
        """Step 3: Save multiple asset types (Bank, Property, Gold, Vehicle)"""
        step_data = {
            "step": 3,
            "data": {
                "items": [
                    {"name": "ICICI Savings", "amount": "200000", "assetType": "bank_balance"},
                    {"name": "Apartment Mumbai", "amount": "8000000", "assetType": "property"},
                    {"name": "Gold Jewellery", "amount": "300000", "assetType": "gold"}
                ]
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/onboarding/save-step", json=step_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("savedCount", 0) >= 3, "Should save all 3 asset types"
        
        print("✓ Multiple asset types saved successfully")
    
    def test_skip_step_3_assets_no_assets(self):
        """Step 3: Skip assets (user has no assets)"""
        response = self.session.post(f"{BASE_URL}/api/onboarding/save-step", json={
            "step": 3,
            "data": {},
            "skipped": True
        })
        assert response.status_code == 200
        
        # Verify completion
        completion = self.session.get(f"{BASE_URL}/api/onboarding/profile-completion").json()
        assert completion["assetsAdded"] == True, "Skipped assets should mark as completed"
        
        print("✓ Step 3 (Assets) skipped, marked as completed")
    
    # ─── Wizard Step 4: Liabilities ───
    
    def test_save_step_4_liabilities(self):
        """Step 4: Save liability data (loan)"""
        step_data = {
            "step": 4,
            "data": {
                "items": [{
                    "name": "Home Loan",
                    "amount": "5000000",
                    "loanType": "Home",
                    "emi": "45000",
                    "rate": "8.5"
                }]
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/onboarding/save-step", json=step_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == "Step 4 saved"
        
        # Verify completion
        completion = self.session.get(f"{BASE_URL}/api/onboarding/profile-completion").json()
        assert completion["liabilitiesAdded"] == True
        
        print(f"✓ Step 4 (Liabilities) saved, completion: {completion['profileCompletion']}%")
    
    def test_save_step_4_liabilities_with_deep_details(self):
        """Step 4: Save liability with deep details (loan type, rate)"""
        step_data = {
            "step": 4,
            "data": {
                "items": [{
                    "name": "Car Loan",
                    "amount": "800000",
                    "loanType": "Car",  # Deep detail
                    "emi": "18000",
                    "rate": "9.5"       # Deep detail - interest rate
                }]
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/onboarding/save-step", json=step_data)
        assert response.status_code == 200
        
        print("✓ Liability with deep details saved successfully")
    
    def test_skip_step_4_no_debt(self):
        """Step 4: Skip liabilities - 'No debt' option"""
        response = self.session.post(f"{BASE_URL}/api/onboarding/save-step", json={
            "step": 4,
            "data": {},
            "skipped": True
        })
        assert response.status_code == 200
        
        # Verify completion
        completion = self.session.get(f"{BASE_URL}/api/onboarding/profile-completion").json()
        assert completion["liabilitiesAdded"] == True, "Skipped liabilities (no debt) should mark as completed"
        
        print("✓ Step 4 (Liabilities) skipped - 'No debt' option works")
    
    # ─── Wizard Step 5: Investments ───
    
    def test_save_step_5_investments(self):
        """Step 5: Save investment data"""
        step_data = {
            "step": 5,
            "data": {
                "items": [{
                    "name": "HDFC Flexi Cap",
                    "amount": "10000",
                    "investmentType": "mutual-fund",
                    "category": "Mutual Fund",
                    "frequency": "Monthly"
                }]
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/onboarding/save-step", json=step_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == "Step 5 saved"
        
        # Verify completion
        completion = self.session.get(f"{BASE_URL}/api/onboarding/profile-completion").json()
        assert completion["investmentsAdded"] == True
        
        print(f"✓ Step 5 (Investments) saved, completion: {completion['profileCompletion']}%")
    
    def test_save_step_5_investments_with_deep_details(self):
        """Step 5: Save investment with deep details (frequency)"""
        step_data = {
            "step": 5,
            "data": {
                "items": [{
                    "name": "Index Fund SIP",
                    "amount": "25000",
                    "investmentType": "mutual-fund",
                    "category": "Mutual Fund",
                    "frequency": "Monthly"  # Deep detail
                }]
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/onboarding/save-step", json=step_data)
        assert response.status_code == 200
        
        print("✓ Investment with deep details (frequency) saved")
    
    def test_skip_step_5_not_yet(self):
        """Step 5: Skip investments - 'Not yet' option"""
        response = self.session.post(f"{BASE_URL}/api/onboarding/save-step", json={
            "step": 5,
            "data": {},
            "skipped": True
        })
        assert response.status_code == 200
        
        # Verify completion
        completion = self.session.get(f"{BASE_URL}/api/onboarding/profile-completion").json()
        assert completion["investmentsAdded"] == True, "Skipped investments should mark as completed"
        
        print("✓ Step 5 (Investments) skipped - 'Not yet' option works")
    
    # ─── Complete Flow Tests ───
    
    def test_complete_all_5_steps_reaches_100_percent(self):
        """Completing all 5 steps should result in 100% profile completion"""
        # Step 1: Income
        self.session.post(f"{BASE_URL}/api/onboarding/save-step", json={
            "step": 1,
            "data": {"items": [{"name": "Salary", "amount": "100000", "type": "Salary", "category": "salary", "frequency": "Monthly"}]}
        })
        
        # Step 2: Expenses
        self.session.post(f"{BASE_URL}/api/onboarding/save-step", json={
            "step": 2,
            "data": {"items": [{"name": "Rent", "amount": "20000", "category": "Housing", "frequency": "Monthly"}]}
        })
        
        # Step 3: Assets
        self.session.post(f"{BASE_URL}/api/onboarding/save-step", json={
            "step": 3,
            "data": {"items": [{"name": "Savings", "amount": "500000", "assetType": "bank_balance"}]}
        })
        
        # Step 4: Liabilities
        self.session.post(f"{BASE_URL}/api/onboarding/save-step", json={
            "step": 4,
            "data": {"items": [{"name": "Home Loan", "amount": "3000000", "loanType": "Home", "emi": "30000"}]}
        })
        
        # Step 5: Investments
        self.session.post(f"{BASE_URL}/api/onboarding/save-step", json={
            "step": 5,
            "data": {"items": [{"name": "SIP", "amount": "10000", "investmentType": "mutual-fund", "category": "Mutual Fund", "frequency": "Monthly"}]}
        })
        
        # Complete onboarding
        complete_response = self.session.post(f"{BASE_URL}/api/onboarding/complete")
        assert complete_response.status_code == 200
        
        # Verify 100% completion
        completion = self.session.get(f"{BASE_URL}/api/onboarding/profile-completion").json()
        assert completion["profileCompletion"] == 100, f"Expected 100% but got {completion['profileCompletion']}%"
        assert completion["incomeAdded"] == True
        assert completion["expensesAdded"] == True
        assert completion["assetsAdded"] == True
        assert completion["liabilitiesAdded"] == True
        assert completion["investmentsAdded"] == True
        
        print("✓ All 5 steps completed, profile at 100%")
    
    def test_skipping_all_categories_still_reaches_100_percent(self):
        """Skipping all categories should still reach >=80% completion"""
        # Skip all 5 steps
        for step in range(1, 6):
            response = self.session.post(f"{BASE_URL}/api/onboarding/save-step", json={
                "step": step,
                "data": {},
                "skipped": True
            })
            assert response.status_code == 200
        
        # Complete onboarding
        self.session.post(f"{BASE_URL}/api/onboarding/complete")
        
        # Verify completion
        completion = self.session.get(f"{BASE_URL}/api/onboarding/profile-completion").json()
        assert completion["profileCompletion"] >= 80, f"Expected >=80% but got {completion['profileCompletion']}%"
        
        # All should be marked as completed (even though skipped)
        assert completion["incomeAdded"] == True
        assert completion["expensesAdded"] == True
        assert completion["assetsAdded"] == True
        assert completion["liabilitiesAdded"] == True
        assert completion["investmentsAdded"] == True
        
        print(f"✓ All steps skipped, completion: {completion['profileCompletion']}%")
    
    # ─── Dismiss Tests ───
    
    def test_dismiss_onboarding(self):
        """Dismissing onboarding should set dismissed flag"""
        response = self.session.post(f"{BASE_URL}/api/onboarding/dismiss")
        assert response.status_code == 200
        
        # Verify dismissed flag
        completion = self.session.get(f"{BASE_URL}/api/onboarding/profile-completion").json()
        assert completion["dismissed"] == True, "Dismissed flag should be true"
        
        print("✓ Onboarding dismissed successfully")
    
    # ─── Progress Tracking Tests ───
    
    def test_get_progress_initial(self):
        """Get onboarding progress for resume functionality"""
        response = self.session.get(f"{BASE_URL}/api/onboarding/progress")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("currentStep", 0) == 0, "New user should be at step 0"
        assert data.get("completed", False) == False, "Should not be completed"
        
        print("✓ Initial progress retrieved")
    
    def test_progress_tracks_current_step(self):
        """Progress should track current step"""
        # Complete steps 1 and 2
        self.session.post(f"{BASE_URL}/api/onboarding/save-step", json={
            "step": 1, "data": {"items": [{"name": "Salary", "amount": "50000", "type": "Salary", "category": "salary", "frequency": "Monthly"}]}
        })
        self.session.post(f"{BASE_URL}/api/onboarding/save-step", json={
            "step": 2, "data": {"items": [{"name": "Rent", "amount": "10000", "category": "Housing", "frequency": "Monthly"}]}
        })
        
        # Check progress
        progress = self.session.get(f"{BASE_URL}/api/onboarding/progress").json()
        assert progress.get("currentStep", 0) >= 2, f"Current step should be at least 2, got {progress}"
        
        print("✓ Progress tracks current step correctly")


class TestAuthenticationRequired:
    """Tests that require authentication checks"""
    
    def test_profile_completion_requires_auth(self):
        """Profile completion endpoint should require authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/onboarding/profile-completion")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Profile completion requires auth")
    
    def test_save_step_requires_auth(self):
        """Save step endpoint should require authentication"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/onboarding/save-step", json={"step": 1, "data": {}})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Save step requires auth")
    
    def test_complete_requires_auth(self):
        """Complete endpoint should require authentication"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/onboarding/complete")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Complete requires auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
