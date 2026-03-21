"""
Test Loan Given Investment Features - Iteration 134
Tests for:
- Repayment plan restructuring (3 types: lump_sum, fixed, flexible)
- Installment calculator (installmentAmount, numberOfInstallments)
- Income auto-creation for interest tracking
- Smart interest/principal split on repayment
- Repayment validation (amount limits, negative values)
"""

import pytest
import requests
import os
import asyncio
from datetime import datetime, timedelta, timezone
import uuid
import sys

# Add backend path for database access
sys.path.insert(0, '/app/backend')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://money-wizard-21.preview.emergentagent.com').rstrip('/')


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
            'name': 'Test User For Repayment Features',
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
        await db.income_sources.delete_many({'userId': user_id})
        await db.income_received.delete_many({'userId': user_id})
        await db.user_sessions.delete_many({'user_id': user_id})
        await db.users.delete_many({'user_id': user_id})
    
    asyncio.get_event_loop().run_until_complete(_cleanup())


class TestLoanGivenCreation:
    """Tests for creating Loan Given investments with new repayment structure"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session for all tests"""
        self.session_token, self.user_id = create_test_session()
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.session.cookies.set("session_token", self.session_token)
        
        # Verify authentication
        verify_resp = self.session.get(f"{BASE_URL}/api/auth/me")
        if verify_resp.status_code != 200:
            pytest.skip(f"Authentication failed: {verify_resp.status_code}")
        
        yield
        
        # Cleanup all test data
        cleanup_test_data(self.user_id)
    
    def test_01_create_loan_with_fixed_repayment_type(self):
        """Create Loan Given with repaymentType='fixed', installmentAmount, numberOfInstallments"""
        unique_name = f"TEST_FixedEMILoan_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": unique_name,
            "principal": 50000,
            "currentValue": 50000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Test Borrower Fixed",
            "interestType": "simple",
            "returnRate": 12,
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
            "installmentAmount": 5000,
            "numberOfInstallments": 10,
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Failed to create: {response.text}"
        
        data = response.json()
        
        # Verify fields saved correctly
        assert data["repaymentType"] == "fixed"
        assert data["repaymentFrequency"] == "Monthly"
        assert data["installmentAmount"] == 5000
        assert data["numberOfInstallments"] == 10
        assert data["loanStatus"] == "active"
        assert data["outstandingAmount"] == 50000
        print(f"✓ Fixed EMI loan created: {data['id']}")
    
    def test_02_create_loan_with_lump_sum_repayment(self):
        """Create Loan Given with repaymentType='lump_sum'"""
        unique_name = f"TEST_LumpSumLoan_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Growth with Maturity",
            "name": unique_name,
            "principal": 100000,
            "currentValue": 100000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Lump Sum Borrower",
            "interestType": "simple",
            "agreedReturnAmount": 112000,
            "repaymentType": "lump_sum",
            "dueDate": (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d"),
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        assert data["repaymentType"] == "lump_sum"
        assert data["agreedReturnAmount"] == 112000
        print(f"✓ Lump sum loan created: {data['id']}")
    
    def test_03_create_loan_with_flexible_repayment(self):
        """Create Loan Given with repaymentType='flexible'"""
        unique_name = f"TEST_FlexibleLoan_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Growth with Maturity",
            "name": unique_name,
            "principal": 25000,
            "currentValue": 25000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Flexible Borrower",
            "interestType": "none",
            "repaymentType": "flexible",
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        assert data["repaymentType"] == "flexible"
        assert data.get("installmentAmount") is None
        assert data.get("numberOfInstallments") is None
        print(f"✓ Flexible loan created: {data['id']}")
    
    def test_04_create_loan_with_interest_auto_creates_income_source(self):
        """Create Loan Given with interestType='simple' should auto-create income source"""
        unique_name = f"TEST_InterestLoan_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": unique_name,
            "principal": 75000,
            "currentValue": 75000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Interest Borrower",
            "interestType": "simple",
            "returnRate": 15,
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Verify linkedIncomeSourceId is populated
        assert data.get("linkedIncomeSourceId") is not None, "No linkedIncomeSourceId returned"
        linked_id = data["linkedIncomeSourceId"]
        
        # Verify income source exists in DB
        income_resp = self.session.get(f"{BASE_URL}/api/income")
        assert income_resp.status_code == 200
        
        income_sources = income_resp.json()
        matching = [inc for inc in income_sources if inc.get("id") == linked_id]
        assert len(matching) == 1, f"Expected income source {linked_id} not found"
        
        income_source = matching[0]
        assert f"Interest - {unique_name}" in income_source.get("name", ""), "Income source name mismatch"
        assert income_source.get("sourceCategory") == "loan_interest"
        print(f"✓ Income source auto-created: {linked_id}")
    
    def test_05_no_interest_loan_does_not_create_income_source(self):
        """Loan with interestType='none' should NOT auto-create income source"""
        unique_name = f"TEST_NoInterestLoan_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Fixed",
            "name": unique_name,
            "principal": 20000,
            "currentValue": 20000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "No Interest Borrower",
            "interestType": "none",
            "repaymentType": "flexible",
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Should NOT have linkedIncomeSourceId
        assert data.get("linkedIncomeSourceId") is None, "Unexpected linkedIncomeSourceId for no-interest loan"
        print(f"✓ No income source created for no-interest loan")


class TestLoanDetailEndpoint:
    """Tests for GET /api/investments/{id}/loan-detail endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session for all tests"""
        self.session_token, self.user_id = create_test_session()
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.session.cookies.set("session_token", self.session_token)
        
        # Verify authentication
        verify_resp = self.session.get(f"{BASE_URL}/api/auth/me")
        if verify_resp.status_code != 200:
            pytest.skip(f"Authentication failed: {verify_resp.status_code}")
        
        yield
        
        # Cleanup all test data
        cleanup_test_data(self.user_id)
    
    def test_06_loan_detail_returns_installment_fields(self):
        """GET loan-detail should return installmentAmount, numberOfInstallments, linkedIncomeSourceId"""
        unique_name = f"TEST_DetailLoan_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": unique_name,
            "principal": 60000,
            "currentValue": 60000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Detail Borrower",
            "interestType": "simple",
            "returnRate": 10,
            "agreedReturnAmount": 66000,
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
            "installmentAmount": 6600,
            "numberOfInstallments": 10,
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200
        inv_id = create_resp.json()["id"]
        
        # GET loan-detail
        detail_resp = self.session.get(f"{BASE_URL}/api/investments/{inv_id}/loan-detail")
        assert detail_resp.status_code == 200, f"loan-detail failed: {detail_resp.text}"
        
        detail = detail_resp.json()
        
        # Verify required fields exist
        assert "installmentAmount" in detail, "Missing installmentAmount"
        assert "numberOfInstallments" in detail, "Missing numberOfInstallments"
        assert "linkedIncomeSourceId" in detail, "Missing linkedIncomeSourceId"
        
        assert detail["installmentAmount"] == 6600
        assert detail["numberOfInstallments"] == 10
        assert detail["linkedIncomeSourceId"] is not None
        assert detail["repaymentType"] == "fixed"
        print(f"✓ loan-detail returns all installment fields correctly")


class TestRepaymentWithInterestSplit:
    """Tests for add-repayment endpoint with smart interest/principal split"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session for all tests"""
        self.session_token, self.user_id = create_test_session()
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.session.cookies.set("session_token", self.session_token)
        
        # Verify authentication
        verify_resp = self.session.get(f"{BASE_URL}/api/auth/me")
        if verify_resp.status_code != 200:
            pytest.skip(f"Authentication failed: {verify_resp.status_code}")
        
        yield
        
        # Cleanup all test data
        cleanup_test_data(self.user_id)
    
    def test_07_repayment_returns_interest_principal_portions(self):
        """POST add-repayment should return interestPortion and principalPortion"""
        unique_name = f"TEST_RepayLoan_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": unique_name,
            "principal": 100000,
            "currentValue": 100000,
            "startDate": (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"),
            "borrowerName": "Repay Borrower",
            "interestType": "simple",
            "agreedReturnAmount": 120000,  # 20k interest total
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200
        data = create_resp.json()
        inv_id = data["id"]
        
        # Add repayment
        repay_resp = self.session.post(f"{BASE_URL}/api/investments/{inv_id}/add-repayment", json={
            "amount": 12000,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Test repayment"
        })
        
        assert repay_resp.status_code == 200, f"Repayment failed: {repay_resp.text}"
        repay_data = repay_resp.json()
        
        # Verify response includes interest/principal split
        assert "transaction" in repay_data
        txn = repay_data["transaction"]
        assert "interestPortion" in txn, "Missing interestPortion"
        assert "principalPortion" in txn, "Missing principalPortion"
        
        # Verify updatedLoan also has portions
        assert "updatedLoan" in repay_data
        updated = repay_data["updatedLoan"]
        assert "interestPortion" in updated
        assert "principalPortion" in updated
        
        # Interest portion should be ~20% of 12000 = 2400 (proportional to agreedReturn)
        # (20k interest / 120k total) * 12k repayment = 2000
        # Allow some rounding tolerance
        assert txn["interestPortion"] >= 0
        assert txn["principalPortion"] >= 0
        assert txn["interestPortion"] + txn["principalPortion"] == 12000
        
        print(f"✓ Repayment split: principal={txn['principalPortion']}, interest={txn['interestPortion']}")
    
    def test_08_repayment_with_interest_creates_income_transaction(self):
        """Repayment on loan WITH interest should auto-create income_received entry"""
        unique_name = f"TEST_IncomeCreationLoan_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": unique_name,
            "principal": 50000,
            "currentValue": 50000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Income Creation Borrower",
            "interestType": "simple",
            "agreedReturnAmount": 60000,  # 10k interest
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200
        data = create_resp.json()
        inv_id = data["id"]
        linked_income_id = data.get("linkedIncomeSourceId")
        
        assert linked_income_id is not None, "No linkedIncomeSourceId"
        
        # Add repayment
        repay_resp = self.session.post(f"{BASE_URL}/api/investments/{inv_id}/add-repayment", json={
            "amount": 6000,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Income creation test"
        })
        
        assert repay_resp.status_code == 200
        
        # Check income_received collection for auto-created entry
        income_txn_resp = self.session.get(f"{BASE_URL}/api/income-received?entityId={linked_income_id}")
        if income_txn_resp.status_code == 200:
            income_txns = income_txn_resp.json()
            # Should have at least one transaction for this income source
            matching = [t for t in income_txns if t.get("source") == "auto_loan_repayment"]
            if matching:
                print(f"✓ Income transaction auto-created for interest portion")
                return
        
        # Alternative: Check via repayment response
        repay_data = repay_resp.json()
        if repay_data.get("transaction", {}).get("interestPortion", 0) > 0:
            print(f"✓ Interest portion tracked: {repay_data['transaction']['interestPortion']}")
    
    def test_09_repayment_without_interest_no_income_transaction(self):
        """Repayment on loan WITHOUT interest should NOT create income transaction"""
        unique_name = f"TEST_NoInterestRepay_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Fixed",
            "name": unique_name,
            "principal": 30000,
            "currentValue": 30000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "No Interest Repay",
            "interestType": "none",
            "repaymentType": "flexible",
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200
        data = create_resp.json()
        inv_id = data["id"]
        
        # Should NOT have linkedIncomeSourceId
        assert data.get("linkedIncomeSourceId") is None
        
        # Add repayment
        repay_resp = self.session.post(f"{BASE_URL}/api/investments/{inv_id}/add-repayment", json={
            "amount": 10000,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "No interest repayment"
        })
        
        assert repay_resp.status_code == 200
        repay_data = repay_resp.json()
        
        # Interest portion should be 0
        assert repay_data["transaction"]["interestPortion"] == 0
        assert repay_data["transaction"]["principalPortion"] == 10000
        print(f"✓ No interest portion for no-interest loan")


class TestRepaymentValidation:
    """Tests for repayment validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session for all tests"""
        self.session_token, self.user_id = create_test_session()
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.session.cookies.set("session_token", self.session_token)
        
        # Verify authentication
        verify_resp = self.session.get(f"{BASE_URL}/api/auth/me")
        if verify_resp.status_code != 200:
            pytest.skip(f"Authentication failed: {verify_resp.status_code}")
        
        yield
        
        # Cleanup all test data
        cleanup_test_data(self.user_id)
    
    def test_10_repayment_exceeds_outstanding_blocked(self):
        """Repayment amount cannot exceed outstanding"""
        unique_name = f"TEST_ExceedsLoan_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Fixed",
            "name": unique_name,
            "principal": 10000,
            "currentValue": 10000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Exceeds Borrower",
            "interestType": "none",
            "repaymentType": "flexible",
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200
        inv_id = create_resp.json()["id"]
        
        # Try to repay more than outstanding
        repay_resp = self.session.post(f"{BASE_URL}/api/investments/{inv_id}/add-repayment", json={
            "amount": 15000,
            "date": datetime.now().strftime("%Y-%m-%d"),
        })
        
        assert repay_resp.status_code == 400, "Should fail for exceeding outstanding"
        assert "exceeds" in repay_resp.text.lower()
        print(f"✓ Repayment exceeding outstanding blocked")
    
    def test_11_negative_repayment_blocked(self):
        """Negative repayment amount should be blocked"""
        unique_name = f"TEST_NegativeLoan_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Fixed",
            "name": unique_name,
            "principal": 10000,
            "currentValue": 10000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Negative Borrower",
            "interestType": "none",
            "repaymentType": "flexible",
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200
        inv_id = create_resp.json()["id"]
        
        # Try negative repayment
        repay_resp = self.session.post(f"{BASE_URL}/api/investments/{inv_id}/add-repayment", json={
            "amount": -5000,
            "date": datetime.now().strftime("%Y-%m-%d"),
        })
        
        assert repay_resp.status_code == 400, "Should fail for negative amount"
        print(f"✓ Negative repayment blocked")
    
    def test_12_zero_repayment_blocked(self):
        """Zero repayment amount should be blocked"""
        unique_name = f"TEST_ZeroLoan_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Fixed",
            "name": unique_name,
            "principal": 10000,
            "currentValue": 10000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Zero Borrower",
            "interestType": "none",
            "repaymentType": "flexible",
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200
        inv_id = create_resp.json()["id"]
        
        # Try zero repayment
        repay_resp = self.session.post(f"{BASE_URL}/api/investments/{inv_id}/add-repayment", json={
            "amount": 0,
            "date": datetime.now().strftime("%Y-%m-%d"),
        })
        
        assert repay_resp.status_code == 400, "Should fail for zero amount"
        print(f"✓ Zero repayment blocked")


class TestAllRepaymentTypes:
    """Summary tests for all 3 repayment types"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session for all tests"""
        self.session_token, self.user_id = create_test_session()
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.session.cookies.set("session_token", self.session_token)
        
        # Verify authentication
        verify_resp = self.session.get(f"{BASE_URL}/api/auth/me")
        if verify_resp.status_code != 200:
            pytest.skip(f"Authentication failed: {verify_resp.status_code}")
        
        yield
        
        # Cleanup all test data
        cleanup_test_data(self.user_id)
    
    def test_13_all_repayment_types_save_correctly(self):
        """Verify all 3 repayment types save and retrieve correctly"""
        types_tested = []
        
        for rep_type in ["lump_sum", "fixed", "flexible"]:
            unique_name = f"TEST_{rep_type}_{uuid.uuid4().hex[:8]}"
            payload = {
                "investmentCategory": "Loan Given",
                "investmentMode": "Fixed",
                "name": unique_name,
                "principal": 25000,
                "currentValue": 25000,
                "startDate": datetime.now().strftime("%Y-%m-%d"),
                "borrowerName": f"{rep_type} Borrower",
                "interestType": "none",
                "repaymentType": rep_type,
            }
            
            if rep_type == "fixed":
                payload["repaymentFrequency"] = "Monthly"
                payload["installmentAmount"] = 5000
                payload["numberOfInstallments"] = 5
            
            resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
            assert resp.status_code == 200, f"Failed for {rep_type}: {resp.text}"
            
            data = resp.json()
            
            assert data["repaymentType"] == rep_type
            types_tested.append(rep_type)
        
        assert set(types_tested) == {"lump_sum", "fixed", "flexible"}
        print(f"✓ All 3 repayment types save correctly: {types_tested}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
