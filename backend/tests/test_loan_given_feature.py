"""
Test suite for Loan Given investment feature
Tests:
- Create Loan Given investment with borrower fields
- Add repayment to a loan and verify status changes
- Get loan detail with loan-specific fields
- Get repayment history
- Validation: repayment cannot exceed outstanding
- Dashboard networth includes loanGivenTotal, loanGivenAtRisk fields
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

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://financial-health-v2.preview.emergentagent.com').rstrip('/')


def create_test_session():
    """Create a test user and session in MongoDB via Python driver"""
    # Import database with correct env
    os.environ['REACT_APP_BACKEND_URL'] = BASE_URL
    from database import db
    
    user_id = 'test_user_' + str(uuid.uuid4())[:12]
    session_token = 'test_session_' + str(uuid.uuid4())[:12]
    
    async def _create():
        # Insert user
        await db.users.insert_one({
            'user_id': user_id,
            'email': f'{user_id}@test.com',
            'name': 'Test User For Loans',
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
        # Delete test investments
        await db.investments.delete_many({'userId': user_id})
        # Delete test transactions
        await db.investment_transactions.delete_many({'userId': user_id})
        # Delete test session
        await db.user_sessions.delete_many({'user_id': user_id})
        # Delete test user
        await db.users.delete_many({'user_id': user_id})
    
    asyncio.get_event_loop().run_until_complete(_cleanup())


class TestLoanGivenFeature:
    """Tests for the Loan Given investment feature"""
    
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
    
    def test_01_create_loan_given_investment(self):
        """Test creating a Loan Given investment with borrower fields"""
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": "TEST_Loan to Friend ABC",
            "principal": 50000,
            "currentValue": 50000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "John Doe",
            "borrowerContact": "9876543210",
            "interestType": "simple",
            "returnRate": 12,
            "repaymentType": "flexible",
            "dueDate": (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d"),
            "notes": "Loan for emergency medical expenses"
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        
        # Verify creation
        assert response.status_code == 200, f"Failed to create investment: {response.text}"
        
        data = response.json()
        self.created_investment_ids.append(data.get("id"))
        
        # Verify Loan Given auto-initialized fields
        assert data.get("investmentCategory") == "Loan Given"
        assert data.get("borrowerName") == "John Doe"
        assert data.get("borrowerContact") == "9876543210"
        assert data.get("interestType") == "simple"
        assert data.get("repaymentType") == "flexible"
        assert data.get("amountReceived") == 0, "amountReceived should be 0 on creation"
        assert data.get("outstandingAmount") == 50000, "outstandingAmount should equal principal on creation"
        assert data.get("loanStatus") == "active", "loanStatus should be 'active' on creation"
        
        print(f"✓ Created Loan Given investment: {data.get('id')}")
    
    def test_02_get_loan_detail(self):
        """Test getting loan-specific detail via /api/investments/{id}/detail"""
        # First create a loan
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": "TEST_Loan Detail Test",
            "principal": 30000,
            "currentValue": 30000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Jane Smith",
            "borrowerContact": "jane@test.com",
            "interestType": "none",
            "repaymentType": "flexible",
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_response.status_code == 200
        
        loan_id = create_response.json().get("id")
        self.created_investment_ids.append(loan_id)
        
        # Get detail endpoint
        detail_response = self.session.get(f"{BASE_URL}/api/investments/{loan_id}/detail")
        
        assert detail_response.status_code == 200, f"Failed to get detail: {detail_response.text}"
        
        detail = detail_response.json()
        
        # Verify loan-specific fields in detail
        assert detail.get("investmentCategory") == "Loan Given"
        assert detail.get("borrowerName") == "Jane Smith"
        assert detail.get("borrowerContact") == "jane@test.com"
        assert detail.get("principal") == 30000
        assert detail.get("outstandingAmount") == 30000
        assert "recoveryPct" in detail
        assert "repayments" in detail
        assert detail.get("repaymentCount") == 0
        
        print(f"✓ Loan detail returned correctly with loan-specific fields")
    
    def test_03_add_repayment_status_partial(self):
        """Test adding repayment and verifying status changes to partial"""
        # Create a loan
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": "TEST_Repayment Test Loan",
            "principal": 10000,
            "currentValue": 10000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Test Borrower",
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_response.status_code == 200
        
        loan_id = create_response.json().get("id")
        self.created_investment_ids.append(loan_id)
        
        # Add repayment of 3000
        repay_response = self.session.post(f"{BASE_URL}/api/investments/{loan_id}/add-repayment", json={
            "amount": 3000,
            "notes": "First partial payment"
        })
        
        assert repay_response.status_code == 200, f"Repayment failed: {repay_response.text}"
        
        repay_data = repay_response.json()
        
        # Verify repayment response
        assert repay_data.get("success") == True
        assert repay_data.get("updatedLoan", {}).get("amountReceived") == 3000
        assert repay_data.get("updatedLoan", {}).get("outstandingAmount") == 7000
        assert repay_data.get("updatedLoan", {}).get("loanStatus") == "partial"
        
        print("✓ Repayment added and status changed to 'partial'")
    
    def test_04_add_repayment_status_closed(self):
        """Test full repayment closes the loan"""
        # Create a loan
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": "TEST_Full Repayment Loan",
            "principal": 5000,
            "currentValue": 5000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Full Payer",
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_response.status_code == 200
        
        loan_id = create_response.json().get("id")
        self.created_investment_ids.append(loan_id)
        
        # Add full repayment
        repay_response = self.session.post(f"{BASE_URL}/api/investments/{loan_id}/add-repayment", json={
            "amount": 5000,
            "notes": "Full repayment"
        })
        
        assert repay_response.status_code == 200
        
        repay_data = repay_response.json()
        
        assert repay_data.get("updatedLoan", {}).get("amountReceived") == 5000
        assert repay_data.get("updatedLoan", {}).get("outstandingAmount") == 0
        assert repay_data.get("updatedLoan", {}).get("loanStatus") == "closed"
        
        print("✓ Full repayment closed the loan")
    
    def test_05_repayment_exceeds_outstanding_rejected(self):
        """Test that repayment amount cannot exceed outstanding"""
        # Create a loan
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": "TEST_Over Repayment Loan",
            "principal": 2000,
            "currentValue": 2000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Over Payer",
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_response.status_code == 200
        
        loan_id = create_response.json().get("id")
        self.created_investment_ids.append(loan_id)
        
        # Try to add repayment exceeding outstanding
        repay_response = self.session.post(f"{BASE_URL}/api/investments/{loan_id}/add-repayment", json={
            "amount": 5000,
        })
        
        assert repay_response.status_code == 400, "Should reject repayment exceeding outstanding"
        assert "exceeds outstanding" in repay_response.text.lower()
        
        print("✓ Repayment exceeding outstanding was correctly rejected")
    
    def test_06_negative_repayment_rejected(self):
        """Test that negative repayment amount is rejected"""
        # Create a loan
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": "TEST_Negative Repayment Loan",
            "principal": 1000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Test",
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_response.status_code == 200
        
        loan_id = create_response.json().get("id")
        self.created_investment_ids.append(loan_id)
        
        # Try negative repayment
        repay_response = self.session.post(f"{BASE_URL}/api/investments/{loan_id}/add-repayment", json={
            "amount": -500,
        })
        
        assert repay_response.status_code == 400, "Should reject negative repayment"
        
        print("✓ Negative repayment was correctly rejected")
    
    def test_07_get_repayment_history(self):
        """Test getting repayment history for a loan"""
        # Create a loan
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": "TEST_Repayment History Loan",
            "principal": 10000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "History Test",
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_response.status_code == 200
        
        loan_id = create_response.json().get("id")
        self.created_investment_ids.append(loan_id)
        
        # Add multiple repayments
        self.session.post(f"{BASE_URL}/api/investments/{loan_id}/add-repayment", json={"amount": 2000, "notes": "First"})
        self.session.post(f"{BASE_URL}/api/investments/{loan_id}/add-repayment", json={"amount": 3000, "notes": "Second"})
        
        # Get repayment history
        history_response = self.session.get(f"{BASE_URL}/api/investments/{loan_id}/repayments")
        
        assert history_response.status_code == 200, f"Failed to get history: {history_response.text}"
        
        history = history_response.json()
        
        assert "repayments" in history
        assert len(history["repayments"]) == 2
        assert history.get("summary", {}).get("amountReceived") == 5000
        assert history.get("summary", {}).get("outstandingAmount") == 5000
        
        print("✓ Repayment history returned correctly")
    
    def test_08_dashboard_networth_loan_given_fields(self):
        """Test dashboard/networth includes loanGivenTotal, loanGivenAtRisk, loanGivenCount"""
        # Create a loan
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": "TEST_Dashboard Loan",
            "principal": 25000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Dashboard Test",
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_response.status_code == 200
        
        self.created_investment_ids.append(create_response.json().get("id"))
        
        # Get dashboard networth
        networth_response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        
        assert networth_response.status_code == 200, f"Failed to get networth: {networth_response.text}"
        
        data = networth_response.json()
        
        # Verify loan given fields exist
        assert "loanGivenTotal" in data, "loanGivenTotal should be in networth response"
        assert "loanGivenAtRisk" in data, "loanGivenAtRisk should be in networth response"
        assert "loanGivenCount" in data, "loanGivenCount should be in networth response"
        
        # Verify values are reasonable
        assert data["loanGivenTotal"] >= 25000, f"loanGivenTotal should include our loan: {data['loanGivenTotal']}"
        assert data["loanGivenCount"] >= 1, f"loanGivenCount should be >= 1: {data['loanGivenCount']}"
        
        print(f"✓ Dashboard networth includes Loan Given snapshot: total={data['loanGivenTotal']}, atRisk={data['loanGivenAtRisk']}, count={data['loanGivenCount']}")
    
    def test_09_repayment_only_for_loan_given(self):
        """Test repayment endpoint rejects non-Loan Given investments"""
        # Create a regular investment (not Loan Given)
        payload = {
            "investmentCategory": "Fixed Deposit (FD)",
            "investmentMode": "Growth with Maturity",
            "name": "TEST_Regular FD",
            "principal": 10000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_response.status_code == 200
        
        inv_id = create_response.json().get("id")
        self.created_investment_ids.append(inv_id)
        
        # Try to add repayment to non-Loan Given investment
        repay_response = self.session.post(f"{BASE_URL}/api/investments/{inv_id}/add-repayment", json={
            "amount": 1000
        })
        
        assert repay_response.status_code == 400, "Should reject repayment for non-Loan Given investment"
        assert "loan given" in repay_response.text.lower()
        
        print("✓ Repayment correctly rejected for non-Loan Given investment")
    
    def test_10_loan_given_with_interest_type_custom(self):
        """Test Loan Given with custom agreed return amount"""
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": "TEST_Custom Interest Loan",
            "principal": 20000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Custom Interest Borrower",
            "interestType": "custom",
            "agreedReturnAmount": 25000,  # Expecting total return of 25000 (5000 interest)
            "repaymentType": "fixed",
            "dueDate": (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d"),
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_response.status_code == 200
        
        loan_id = create_response.json().get("id")
        self.created_investment_ids.append(loan_id)
        
        # Get detail to verify custom interest handling
        detail_response = self.session.get(f"{BASE_URL}/api/investments/{loan_id}/detail")
        assert detail_response.status_code == 200
        
        detail = detail_response.json()
        
        assert detail.get("agreedReturnAmount") == 25000
        assert detail.get("totalExpected") == 25000  # Should use agreedReturnAmount
        
        print("✓ Loan Given with custom interest type created correctly")


class TestLoanGivenListDisplay:
    """Tests for Loan Given display in investment list"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session_token, self.user_id = create_test_session()
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.session.cookies.set("session_token", self.session_token)
        
        # Verify authentication
        verify_resp = self.session.get(f"{BASE_URL}/api/auth/me")
        if verify_resp.status_code != 200:
            pytest.skip(f"Authentication failed: {verify_resp.status_code}")
        
        yield
        
        # Cleanup
        cleanup_test_data(self.user_id)
    
    def test_investments_list_includes_loan_status(self):
        """Test GET /api/investments returns loan-specific fields"""
        # Create a Loan Given
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": "TEST_List Display Loan",
            "principal": 15000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "List Test Borrower",
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_response.status_code == 200
        
        loan_id = create_response.json().get("id")
        
        # Get investments list
        list_response = self.session.get(f"{BASE_URL}/api/investments")
        assert list_response.status_code == 200
        
        investments = list_response.json()
        
        # Find our loan
        loan = next((inv for inv in investments if inv.get("id") == loan_id), None)
        
        assert loan is not None, "Created loan not found in list"
        assert loan.get("investmentCategory") == "Loan Given"
        assert loan.get("borrowerName") == "List Test Borrower"
        assert loan.get("loanStatus") == "active"
        assert loan.get("outstandingAmount") == 15000
        
        print("✓ Investment list includes Loan Given with correct fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
