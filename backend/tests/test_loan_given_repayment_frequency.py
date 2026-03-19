"""
Test suite for Loan Given repaymentFrequency field (iteration 133)
Tests:
- InvestmentCreate model accepts repaymentFrequency field
- POST /api/investments with repaymentFrequency saves correctly
- GET /api/investments/{id}/loan-detail returns repaymentFrequency
- repaymentFrequency is only included when repaymentType=fixed
"""
import pytest
import requests
import os
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
import sys

# Add backend path for database access
sys.path.insert(0, '/app/backend')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://mobile-layout-debug-3.preview.emergentagent.com').rstrip('/')


def create_test_session():
    """Create a test user and session in MongoDB via Python driver"""
    os.environ['REACT_APP_BACKEND_URL'] = BASE_URL
    from database import db
    
    user_id = 'test_user_' + str(uuid.uuid4())[:12]
    session_token = 'test_session_' + str(uuid.uuid4())[:12]
    
    async def _create():
        # Insert user
        await db.users.insert_one({
            'user_id': user_id,
            'email': f'{user_id}@test.com',
            'name': 'Test User For RepaymentFrequency',
            'auth_type': 'test',
            'created_at': datetime.now(timezone.utc).isoformat()
        })
        
        # Insert session
        await db.user_sessions.insert_one({
            'session_id': 'session_' + str(uuid.uuid4())[:12],
            'user_id': user_id,
            'session_token': session_token,
            'expires_at': (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            'created_at': datetime.now(timezone.utc).isoformat()
        })
        
        return session_token, user_id
    
    return asyncio.get_event_loop().run_until_complete(_create())


def cleanup_test_data(user_id):
    """Clean up test data after tests"""
    os.environ['REACT_APP_BACKEND_URL'] = BASE_URL
    from database import db
    
    async def _cleanup():
        await db.investments.delete_many({'userId': user_id})
        await db.investment_transactions.delete_many({'userId': user_id})
        await db.user_sessions.delete_many({'user_id': user_id})
        await db.users.delete_many({'user_id': user_id})
    
    asyncio.get_event_loop().run_until_complete(_cleanup())


class TestLoanGivenRepaymentFrequency:
    """Tests for repaymentFrequency field in Loan Given investments"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session for all tests"""
        self.session_token, self.user_id = create_test_session()
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.session.cookies.set("session_token", self.session_token)
        
        self.created_investment_ids = []
        
        # Verify authentication
        verify_resp = self.session.get(f"{BASE_URL}/api/auth/me")
        if verify_resp.status_code != 200:
            pytest.skip(f"Authentication failed: {verify_resp.status_code}")
        
        yield
        
        # Cleanup all test data
        cleanup_test_data(self.user_id)
    
    def test_01_create_loan_with_monthly_repayment_frequency(self):
        """Test creating a Loan Given with repaymentFrequency=Monthly (fixed repayment type)"""
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Growth Only",
            "name": "TEST_Loan with Monthly Repayment",
            "principal": 25000,
            "currentValue": 25000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Monthly Borrower",
            "borrowerContact": "monthly@test.com",
            "interestType": "none",
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
            "dueDate": (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d"),
            "notes": "Fixed monthly installment loan"
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        
        assert response.status_code == 200, f"Failed to create investment: {response.text}"
        
        data = response.json()
        self.created_investment_ids.append(data.get("id"))
        
        # Verify repaymentFrequency is saved
        assert data.get("repaymentType") == "fixed"
        assert data.get("repaymentFrequency") == "Monthly", "repaymentFrequency should be Monthly"
        
        print(f"✓ Created loan with Monthly repaymentFrequency: {data.get('id')}")
    
    def test_02_create_loan_with_daily_repayment_frequency(self):
        """Test creating a Loan Given with repaymentFrequency=Daily"""
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": "TEST_Daily Repayment Loan",
            "principal": 10000,
            "currentValue": 10000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Daily Borrower",
            "interestType": "simple",
            "returnRate": 10,
            "repaymentType": "fixed",
            "repaymentFrequency": "Daily",
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        
        assert response.status_code == 200, f"Failed to create investment: {response.text}"
        data = response.json()
        self.created_investment_ids.append(data.get("id"))
        
        assert data.get("repaymentFrequency") == "Daily"
        print(f"✓ Created loan with Daily repaymentFrequency")
    
    def test_03_create_loan_with_quarterly_repayment_frequency(self):
        """Test creating a Loan Given with repaymentFrequency=Quarterly"""
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Growth Only",
            "name": "TEST_Quarterly Repayment Loan",
            "principal": 100000,
            "currentValue": 100000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Quarterly Borrower",
            "interestType": "none",
            "repaymentType": "fixed",
            "repaymentFrequency": "Quarterly",
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        
        assert response.status_code == 200, f"Failed to create investment: {response.text}"
        data = response.json()
        self.created_investment_ids.append(data.get("id"))
        
        assert data.get("repaymentFrequency") == "Quarterly"
        print(f"✓ Created loan with Quarterly repaymentFrequency")
    
    def test_04_create_loan_with_yearly_repayment_frequency(self):
        """Test creating a Loan Given with repaymentFrequency=Yearly"""
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": "TEST_Yearly Repayment Loan",
            "principal": 500000,
            "currentValue": 500000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Yearly Borrower",
            "interestType": "simple",
            "returnRate": 8,
            "repaymentType": "fixed",
            "repaymentFrequency": "Yearly",
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        
        assert response.status_code == 200, f"Failed to create investment: {response.text}"
        data = response.json()
        self.created_investment_ids.append(data.get("id"))
        
        assert data.get("repaymentFrequency") == "Yearly"
        print(f"✓ Created loan with Yearly repaymentFrequency")
    
    def test_05_loan_detail_returns_repayment_frequency(self):
        """Test GET /api/investments/{id}/loan-detail returns repaymentFrequency"""
        # First create a loan with repaymentFrequency
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Growth Only",
            "name": "TEST_Loan Detail with Frequency",
            "principal": 75000,
            "currentValue": 75000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Detail Test Borrower",
            "interestType": "none",
            "repaymentType": "fixed",
            "repaymentFrequency": "Half-Yearly",
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200, f"Failed to create: {create_resp.text}"
        
        investment_id = create_resp.json().get("id")
        self.created_investment_ids.append(investment_id)
        
        # Now get loan detail
        detail_resp = self.session.get(f"{BASE_URL}/api/investments/{investment_id}/loan-detail")
        assert detail_resp.status_code == 200, f"Failed to get loan detail: {detail_resp.text}"
        
        detail_data = detail_resp.json()
        
        # Verify repaymentFrequency is in the response
        assert "repaymentFrequency" in detail_data, "repaymentFrequency should be in loan-detail response"
        assert detail_data.get("repaymentFrequency") == "Half-Yearly", f"Expected Half-Yearly, got {detail_data.get('repaymentFrequency')}"
        assert detail_data.get("repaymentType") == "fixed"
        
        print(f"✓ loan-detail endpoint returns repaymentFrequency correctly")
    
    def test_06_flexible_repayment_no_frequency(self):
        """Test that flexible repayment type doesn't require frequency"""
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Growth Only",
            "name": "TEST_Flexible Loan No Frequency",
            "principal": 20000,
            "currentValue": 20000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Flexible Borrower",
            "interestType": "none",
            "repaymentType": "flexible",
            # No repaymentFrequency for flexible
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        
        assert response.status_code == 200, f"Failed to create: {response.text}"
        data = response.json()
        self.created_investment_ids.append(data.get("id"))
        
        assert data.get("repaymentType") == "flexible"
        # repaymentFrequency should be null/None for flexible
        assert data.get("repaymentFrequency") is None, f"repaymentFrequency should be None for flexible, got {data.get('repaymentFrequency')}"
        
        print(f"✓ Flexible repayment correctly has no frequency")
    
    def test_07_all_frequency_options(self):
        """Test all valid repaymentFrequency options: Daily, Weekly, Monthly, Quarterly, Half-Yearly, Yearly"""
        all_frequencies = ["Daily", "Weekly", "Monthly", "Quarterly", "Half-Yearly", "Yearly"]
        
        for freq in all_frequencies:
            payload = {
                "investmentCategory": "Loan Given",
                "investmentMode": "Growth Only",
                "name": f"TEST_Freq_{freq}_Loan",
                "principal": 5000,
                "currentValue": 5000,
                "startDate": datetime.now().strftime("%Y-%m-%d"),
                "borrowerName": f"Borrower {freq}",
                "interestType": "none",
                "repaymentType": "fixed",
                "repaymentFrequency": freq,
            }
            
            response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
            assert response.status_code == 200, f"Failed to create with {freq}: {response.text}"
            
            data = response.json()
            self.created_investment_ids.append(data.get("id"))
            
            assert data.get("repaymentFrequency") == freq, f"Expected {freq}, got {data.get('repaymentFrequency')}"
        
        print(f"✓ All {len(all_frequencies)} frequency options work correctly")
    
    def test_08_get_investment_returns_repayment_frequency(self):
        """Test GET /api/investments/{id} returns repaymentFrequency"""
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Growth Only",
            "name": "TEST_Standard Get with Frequency",
            "principal": 15000,
            "currentValue": 15000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Standard Get Borrower",
            "interestType": "none",
            "repaymentType": "fixed",
            "repaymentFrequency": "Weekly",
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200
        
        investment_id = create_resp.json().get("id")
        self.created_investment_ids.append(investment_id)
        
        # Get the investment
        get_resp = self.session.get(f"{BASE_URL}/api/investments/{investment_id}")
        assert get_resp.status_code == 200, f"Failed to get investment: {get_resp.text}"
        
        data = get_resp.json()
        assert data.get("repaymentFrequency") == "Weekly"
        
        print(f"✓ Standard GET endpoint returns repaymentFrequency")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
