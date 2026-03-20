"""
Test onboarding deduplication logic - iteration 150
Tests that same name+amount combinations are rejected as duplicates
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOnboardingDedup:
    """Test deduplication in onboarding save-step endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login - uses username field
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "wizardtest@test.com", "password": "Test1234!"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        # Set session cookie
        cookies = login_response.cookies
        self.session.cookies.update(cookies)
        print(f"Logged in successfully")
    
    def test_income_dedup_same_name_amount(self):
        """Test that posting same income twice returns savedCount: 0 on second call"""
        # Create unique test data
        unique_suffix = str(uuid.uuid4())[:8]
        test_income = {
            "name": f"Test Income {unique_suffix}",
            "amount": "50000",
            "type": "Salary",
            "category": "salary",
            "frequency": "Monthly"
        }
        
        # First POST - should save
        response1 = self.session.post(
            f"{BASE_URL}/api/onboarding/save-step",
            json={
                "step": 1,
                "data": {"items": [test_income]},
                "skipped": False
            }
        )
        assert response1.status_code == 200, f"First save failed: {response1.text}"
        result1 = response1.json()
        print(f"First income save result: {result1}")
        assert result1.get("savedCount", 0) == 1, "First save should have savedCount: 1"
        
        # Second POST with same data - should deduplicate
        response2 = self.session.post(
            f"{BASE_URL}/api/onboarding/save-step",
            json={
                "step": 1,
                "data": {"items": [test_income]},
                "skipped": False
            }
        )
        assert response2.status_code == 200, f"Second save failed: {response2.text}"
        result2 = response2.json()
        print(f"Second income save result: {result2}")
        assert result2.get("savedCount", 0) == 0, "Second save should have savedCount: 0 (dedup)"
    
    def test_income_different_amount_not_dedup(self):
        """Test that different amounts are not deduplicated"""
        unique_suffix = str(uuid.uuid4())[:8]
        
        # First income
        test_income1 = {
            "name": f"Unique Income {unique_suffix}",
            "amount": "60000",
            "type": "Salary"
        }
        
        response1 = self.session.post(
            f"{BASE_URL}/api/onboarding/save-step",
            json={
                "step": 1,
                "data": {"items": [test_income1]},
                "skipped": False
            }
        )
        assert response1.status_code == 200
        result1 = response1.json()
        assert result1.get("savedCount", 0) == 1, "First save should work"
        
        # Second income with different amount
        test_income2 = {
            "name": f"Unique Income {unique_suffix}",
            "amount": "70000",  # Different amount
            "type": "Salary"
        }
        
        response2 = self.session.post(
            f"{BASE_URL}/api/onboarding/save-step",
            json={
                "step": 1,
                "data": {"items": [test_income2]},
                "skipped": False
            }
        )
        assert response2.status_code == 200
        result2 = response2.json()
        print(f"Different amount income result: {result2}")
        # Different amount should also be saved
        assert result2.get("savedCount", 0) == 1, "Different amount should be saved (not dedup)"
    
    def test_loan_dedup_same_name_amount(self):
        """Test that posting same loan twice returns savedCount: 0 on second call"""
        unique_suffix = str(uuid.uuid4())[:8]
        test_loan = {
            "name": f"Test Home Loan {unique_suffix}",
            "amount": "2000000",
            "loanType": "Home Loan",
            "emi": "25000"
        }
        
        # First POST
        response1 = self.session.post(
            f"{BASE_URL}/api/onboarding/save-step",
            json={
                "step": 4,
                "data": {"items": [test_loan]},
                "skipped": False
            }
        )
        assert response1.status_code == 200, f"First loan save failed: {response1.text}"
        result1 = response1.json()
        print(f"First loan save result: {result1}")
        assert result1.get("savedCount", 0) == 1, "First save should have savedCount: 1"
        
        # Second POST with same data
        response2 = self.session.post(
            f"{BASE_URL}/api/onboarding/save-step",
            json={
                "step": 4,
                "data": {"items": [test_loan]},
                "skipped": False
            }
        )
        assert response2.status_code == 200, f"Second loan save failed: {response2.text}"
        result2 = response2.json()
        print(f"Second loan save result: {result2}")
        assert result2.get("savedCount", 0) == 0, "Second save should have savedCount: 0 (dedup)"
    
    def test_asset_dedup_same_name_amount(self):
        """Test that posting same asset twice returns savedCount: 0 on second call"""
        unique_suffix = str(uuid.uuid4())[:8]
        test_asset = {
            "name": f"Test Gold {unique_suffix}",
            "amount": "500000",
            "assetType": "gold"
        }
        
        # First POST
        response1 = self.session.post(
            f"{BASE_URL}/api/onboarding/save-step",
            json={
                "step": 3,
                "data": {"items": [test_asset]},
                "skipped": False
            }
        )
        assert response1.status_code == 200, f"First asset save failed: {response1.text}"
        result1 = response1.json()
        print(f"First asset save result: {result1}")
        assert result1.get("savedCount", 0) == 1, "First save should have savedCount: 1"
        
        # Second POST with same data
        response2 = self.session.post(
            f"{BASE_URL}/api/onboarding/save-step",
            json={
                "step": 3,
                "data": {"items": [test_asset]},
                "skipped": False
            }
        )
        assert response2.status_code == 200, f"Second asset save failed: {response2.text}"
        result2 = response2.json()
        print(f"Second asset save result: {result2}")
        assert result2.get("savedCount", 0) == 0, "Second save should have savedCount: 0 (dedup)"
    
    def test_investment_dedup_same_name_amount(self):
        """Test that posting same investment twice returns savedCount: 0 on second call"""
        unique_suffix = str(uuid.uuid4())[:8]
        test_investment = {
            "name": f"Test Stocks {unique_suffix}",
            "amount": "100000",
            "investmentType": "stocks",
            "category": "Stocks",
            "frequency": "Monthly"
        }
        
        # First POST
        response1 = self.session.post(
            f"{BASE_URL}/api/onboarding/save-step",
            json={
                "step": 5,
                "data": {"items": [test_investment]},
                "skipped": False
            }
        )
        assert response1.status_code == 200, f"First investment save failed: {response1.text}"
        result1 = response1.json()
        print(f"First investment save result: {result1}")
        assert result1.get("savedCount", 0) == 1, "First save should have savedCount: 1"
        
        # Second POST with same data
        response2 = self.session.post(
            f"{BASE_URL}/api/onboarding/save-step",
            json={
                "step": 5,
                "data": {"items": [test_investment]},
                "skipped": False
            }
        )
        assert response2.status_code == 200, f"Second investment save failed: {response2.text}"
        result2 = response2.json()
        print(f"Second investment save result: {result2}")
        assert result2.get("savedCount", 0) == 0, "Second save should have savedCount: 0 (dedup)"
    
    def test_expense_dedup_same_name_amount(self):
        """Test that posting same expense twice returns savedCount: 0 on second call"""
        unique_suffix = str(uuid.uuid4())[:8]
        test_expense = {
            "name": f"Test Rent {unique_suffix}",
            "amount": "15000",
            "category": "Housing",
            "frequency": "Monthly"
        }
        
        # First POST
        response1 = self.session.post(
            f"{BASE_URL}/api/onboarding/save-step",
            json={
                "step": 2,
                "data": {"items": [test_expense]},
                "skipped": False
            }
        )
        assert response1.status_code == 200, f"First expense save failed: {response1.text}"
        result1 = response1.json()
        print(f"First expense save result: {result1}")
        assert result1.get("savedCount", 0) == 1, "First save should have savedCount: 1"
        
        # Second POST with same data
        response2 = self.session.post(
            f"{BASE_URL}/api/onboarding/save-step",
            json={
                "step": 2,
                "data": {"items": [test_expense]},
                "skipped": False
            }
        )
        assert response2.status_code == 200, f"Second expense save failed: {response2.text}"
        result2 = response2.json()
        print(f"Second expense save result: {result2}")
        assert result2.get("savedCount", 0) == 0, "Second save should have savedCount: 0 (dedup)"


class TestProfileHealthGrid:
    """Test Profile Health Grid UI elements via API calls"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login - uses username field
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "wizardtest@test.com", "password": "Test1234!"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.session.cookies.update(login_response.cookies)
    
    def test_profile_completion_endpoint(self):
        """Test profile completion endpoint returns correct structure"""
        response = self.session.get(f"{BASE_URL}/api/onboarding/profile-completion")
        assert response.status_code == 200, f"Profile completion failed: {response.text}"
        
        data = response.json()
        print(f"Profile completion data: {data}")
        
        # Check required fields
        assert "profileCompletion" in data
        assert "incomeAdded" in data
        assert "expensesAdded" in data
        assert "assetsAdded" in data
        assert "liabilitiesAdded" in data
        assert "investmentsAdded" in data
        assert "counts" in data
        
        # Check counts structure
        counts = data["counts"]
        assert "income" in counts
        assert "expenses" in counts
        assert "accounts" in counts
        assert "assets" in counts
        assert "investments" in counts
        assert "loans" in counts
        
        print("✓ Profile completion endpoint returns correct structure")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
