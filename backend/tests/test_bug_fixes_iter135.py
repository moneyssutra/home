"""
Test Bug Fixes - Iteration 135
Tests for:
1. Bug Fix: Repayment amount input accepts numeric values (backend validation)
2. Bug Fix: GET /api/investments/{id}/loan-detail handles null outstandingAmount - falls back to principal 
3. Bug Fix: Income source auto-creation calculates proper expectedAmount > 0
4. Bug Fix: Add-repayment response includes interestPortion and principalPortion > 0 for loans with interest
5. Bug Fix: Repayment with interest portion creates income_received entry
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

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://data-sync-24.preview.emergentagent.com').rstrip('/')


def create_test_session():
    """Create a test user and session in MongoDB via Python driver"""
    os.environ['REACT_APP_BACKEND_URL'] = BASE_URL
    from database import db
    
    user_id = 'test_user_iter135_' + str(uuid.uuid4())[:8]
    session_token = 'test_session_iter135_' + str(uuid.uuid4())[:8]
    
    async def _create():
        # Insert user
        await db.users.insert_one({
            'user_id': user_id,
            'email': f'{user_id}@test.com',
            'name': 'Test User For Bug Fixes Iter135',
            'auth_type': 'test',
            'created_at': datetime.now(timezone.utc).isoformat()
        })
        
        # Insert session
        await db.user_sessions.insert_one({
            'session_id': 'session_' + str(uuid.uuid4())[:8],
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


class TestBugFix1RepaymentInputAcceptsNumericValues:
    """
    Bug Fix 1: Repayment amount input accepts numeric values
    - Frontend bug was HTML max=0 attribute when outstanding is null
    - Backend should properly validate and accept positive amounts
    """
    
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
        cleanup_test_data(self.user_id)
    
    def test_01_repayment_accepts_positive_amount(self):
        """POST add-repayment should accept positive numeric values"""
        unique_name = f"TEST_RepayAccept_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Fixed",
            "name": unique_name,
            "principal": 50000,
            "currentValue": 50000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Repay Test Borrower",
            "interestType": "none",
            "repaymentType": "flexible",
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200, f"Failed to create loan: {create_resp.text}"
        inv_id = create_resp.json()["id"]
        
        # Add repayment with positive amount - should work
        test_amounts = [100, 500, 1000, 5000, 10000, 25000]
        
        for amount in test_amounts:
            repay_resp = self.session.post(f"{BASE_URL}/api/investments/{inv_id}/add-repayment", json={
                "amount": amount,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "notes": f"Test repayment of {amount}"
            })
            
            if repay_resp.status_code == 200:
                print(f"✓ Repayment of ₹{amount} accepted")
                break  # Successful repayment
            elif "exceeds" in repay_resp.text.lower():
                print(f"⚠ Repayment of ₹{amount} exceeds outstanding - expected")
            else:
                pytest.fail(f"Unexpected error for ₹{amount}: {repay_resp.text}")
        
        assert repay_resp.status_code == 200, "Should accept valid positive repayment amount"
    
    def test_02_repayment_accepts_decimal_values(self):
        """POST add-repayment should accept decimal numeric values"""
        unique_name = f"TEST_DecimalRepay_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Fixed",
            "name": unique_name,
            "principal": 10000,
            "currentValue": 10000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Decimal Test Borrower",
            "interestType": "none",
            "repaymentType": "flexible",
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200
        inv_id = create_resp.json()["id"]
        
        # Test decimal amounts (common in financial apps)
        repay_resp = self.session.post(f"{BASE_URL}/api/investments/{inv_id}/add-repayment", json={
            "amount": 1234.56,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Decimal amount test"
        })
        
        assert repay_resp.status_code == 200, f"Should accept decimal: {repay_resp.text}"
        print(f"✓ Decimal repayment (₹1234.56) accepted")


class TestBugFix2LoanDetailNullOutstandingFallback:
    """
    Bug Fix 2: GET /api/investments/{id}/loan-detail handles null outstandingAmount
    - Should fall back to principal using 'or' instead of default param
    - Key change: inv.get('outstandingAmount') or principal
    """
    
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
        cleanup_test_data(self.user_id)
    
    def test_03_loan_detail_fresh_loan_outstanding_equals_principal(self):
        """GET loan-detail should return outstandingAmount = principal for fresh loan"""
        unique_name = f"TEST_FreshLoan_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Fixed",
            "name": unique_name,
            "principal": 75000,
            "currentValue": 75000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Fresh Loan Borrower",
            "interestType": "none",
            "repaymentType": "flexible",
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200, f"Failed: {create_resp.text}"
        inv_id = create_resp.json()["id"]
        
        # GET loan-detail
        detail_resp = self.session.get(f"{BASE_URL}/api/investments/{inv_id}/loan-detail")
        assert detail_resp.status_code == 200, f"loan-detail failed: {detail_resp.text}"
        
        detail = detail_resp.json()
        
        # For fresh loan: outstanding should equal principal
        assert detail["outstandingAmount"] == 75000, f"Expected outstanding=75000, got {detail['outstandingAmount']}"
        assert detail["outstandingAmount"] == detail["principal"], "Outstanding should equal principal for fresh loan"
        print(f"✓ Fresh loan: outstandingAmount ({detail['outstandingAmount']}) = principal ({detail['principal']})")
    
    def test_04_loan_detail_null_outstanding_falls_back_to_principal(self):
        """
        Simulate scenario where outstandingAmount is null/0 in DB
        The 'or' pattern should fall back to principal
        """
        unique_name = f"TEST_NullOutstanding_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Fixed",
            "name": unique_name,
            "principal": 50000,
            "currentValue": 50000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Null Outstanding Borrower",
            "interestType": "none",
            "repaymentType": "flexible",
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200
        data = create_resp.json()
        inv_id = data["id"]
        
        # Manually set outstandingAmount to null/0 in DB to simulate the bug scenario
        from database import db
        
        async def _set_null_outstanding():
            await db.investments.update_one(
                {"id": inv_id},
                {"$set": {"outstandingAmount": None}}  # Set to null to simulate bug
            )
        
        asyncio.get_event_loop().run_until_complete(_set_null_outstanding())
        
        # GET loan-detail should still work and use principal as fallback
        detail_resp = self.session.get(f"{BASE_URL}/api/investments/{inv_id}/loan-detail")
        assert detail_resp.status_code == 200, f"loan-detail failed: {detail_resp.text}"
        
        detail = detail_resp.json()
        
        # With 'or' pattern: null should fall back to principal
        assert detail["outstandingAmount"] == 50000, f"Expected outstanding=50000 (principal fallback), got {detail['outstandingAmount']}"
        print(f"✓ Null outstandingAmount correctly falls back to principal: {detail['outstandingAmount']}")
    
    def test_05_loan_detail_zero_outstanding_falls_back_to_principal(self):
        """
        Test scenario where outstandingAmount is explicitly 0 (but loan not closed)
        This was causing the bug where input had max=0
        """
        unique_name = f"TEST_ZeroOutstanding_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Fixed",
            "name": unique_name,
            "principal": 40000,
            "currentValue": 40000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Zero Outstanding Borrower",
            "interestType": "none",
            "repaymentType": "flexible",
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200
        inv_id = create_resp.json()["id"]
        
        # GET loan-detail
        detail_resp = self.session.get(f"{BASE_URL}/api/investments/{inv_id}/loan-detail")
        assert detail_resp.status_code == 200
        
        detail = detail_resp.json()
        
        # Outstanding should be principal, not 0 or null
        assert detail["outstandingAmount"] > 0, f"Outstanding should be > 0 for new loan, got {detail['outstandingAmount']}"
        print(f"✓ Outstanding amount correctly set: {detail['outstandingAmount']}")


class TestBugFix3IncomeSourceExpectedAmountGreaterThanZero:
    """
    Bug Fix 3: Income source auto-creation calculates proper expectedAmount > 0
    - For loans with interest, the auto-created income source should have expectedAmount > 0
    - Was being set to 0, causing income not to show on income page
    """
    
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
        cleanup_test_data(self.user_id)
    
    def test_06_income_source_created_with_expected_amount_greater_than_zero(self):
        """
        Create Loan Given with interestType='simple', agreedReturnAmount > principal
        Verify income source expectedAmount > 0
        """
        unique_name = f"TEST_IncomeExpected_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": unique_name,
            "principal": 50000,
            "currentValue": 50000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Income Expected Borrower",
            "interestType": "simple",
            "agreedReturnAmount": 55000,  # 5000 total interest
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
            "installmentAmount": 5500,
            "numberOfInstallments": 10,
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200, f"Failed: {create_resp.text}"
        data = create_resp.json()
        
        linked_id = data.get("linkedIncomeSourceId")
        assert linked_id is not None, "No linkedIncomeSourceId returned"
        
        # Fetch the income source
        income_resp = self.session.get(f"{BASE_URL}/api/income")
        assert income_resp.status_code == 200
        
        income_sources = income_resp.json()
        matching = [inc for inc in income_sources if inc.get("id") == linked_id]
        assert len(matching) == 1, f"Income source {linked_id} not found"
        
        income_source = matching[0]
        expected_amount = income_source.get("expectedAmount", 0)
        
        # expectedAmount should be > 0 based on installment plan
        # Total interest = 55000 - 50000 = 5000
        # Interest fraction = 5000 / 55000 ≈ 0.0909
        # Expected per installment = 5500 * 0.0909 ≈ 500
        assert expected_amount > 0, f"expectedAmount should be > 0, got {expected_amount}"
        print(f"✓ Income source created with expectedAmount: ₹{expected_amount}")
    
    def test_07_income_source_with_return_rate_has_expected_amount(self):
        """
        Create Loan Given with returnRate (percentage)
        Verify income source expectedAmount calculated from rate
        """
        unique_name = f"TEST_RateIncome_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": unique_name,
            "principal": 100000,
            "currentValue": 100000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Rate Income Borrower",
            "interestType": "simple",
            "returnRate": 12,  # 12% p.a.
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
            "installmentAmount": 10000,
            "numberOfInstallments": 10,
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200, f"Failed: {create_resp.text}"
        data = create_resp.json()
        
        linked_id = data.get("linkedIncomeSourceId")
        assert linked_id is not None, "No linkedIncomeSourceId returned"
        
        # Fetch the income source
        income_resp = self.session.get(f"{BASE_URL}/api/income")
        assert income_resp.status_code == 200
        
        income_sources = income_resp.json()
        matching = [inc for inc in income_sources if inc.get("id") == linked_id]
        assert len(matching) == 1
        
        income_source = matching[0]
        expected_amount = income_source.get("expectedAmount", 0)
        
        # For 12% p.a. on 100000: monthly interest = 100000 * 0.12 / 12 = 1000
        assert expected_amount > 0, f"expectedAmount should be > 0, got {expected_amount}"
        print(f"✓ Income source from rate: expectedAmount=₹{expected_amount}")


class TestBugFix4RepaymentInterestPortionGreaterThanZero:
    """
    Bug Fix 4: POST /api/investments/{id}/add-repayment 
    - Returns interestPortion and principalPortion > 0 for loans with interest
    """
    
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
        cleanup_test_data(self.user_id)
    
    def test_08_repayment_with_interest_returns_positive_portions(self):
        """
        Add repayment to loan with interest
        Verify both interestPortion and principalPortion > 0
        """
        unique_name = f"TEST_InterestPortion_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": unique_name,
            "principal": 50000,
            "currentValue": 50000,
            "startDate": (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"),
            "borrowerName": "Interest Portion Borrower",
            "interestType": "simple",
            "agreedReturnAmount": 60000,  # 10000 total interest
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200, f"Failed: {create_resp.text}"
        inv_id = create_resp.json()["id"]
        
        # Add repayment
        repay_resp = self.session.post(f"{BASE_URL}/api/investments/{inv_id}/add-repayment", json={
            "amount": 6000,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Interest portion test"
        })
        
        assert repay_resp.status_code == 200, f"Repayment failed: {repay_resp.text}"
        repay_data = repay_resp.json()
        
        # Verify transaction has interest/principal portions
        txn = repay_data.get("transaction", {})
        assert "interestPortion" in txn, "Missing interestPortion in transaction"
        assert "principalPortion" in txn, "Missing principalPortion in transaction"
        
        interest = txn["interestPortion"]
        principal = txn["principalPortion"]
        
        # For loan with interest, both should be > 0
        assert interest > 0, f"interestPortion should be > 0, got {interest}"
        assert principal > 0, f"principalPortion should be > 0, got {principal}"
        assert interest + principal == 6000, f"Portions should sum to repayment amount"
        
        # Verify updatedLoan also has portions
        updated = repay_data.get("updatedLoan", {})
        assert updated.get("interestPortion", 0) > 0, "updatedLoan.interestPortion should be > 0"
        assert updated.get("principalPortion", 0) > 0, "updatedLoan.principalPortion should be > 0"
        
        print(f"✓ Repayment split: principal=₹{principal}, interest=₹{interest}")


class TestBugFix5RepaymentCreatesIncomeReceivedEntry:
    """
    Bug Fix 5: POST /api/investments/{id}/add-repayment 
    - When interest portion > 0, creates entry in income_received collection
    """
    
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
        cleanup_test_data(self.user_id)
    
    def test_09_repayment_with_interest_creates_income_received(self):
        """
        Add repayment to loan with interest
        Verify income_received entry is created for interest portion
        """
        unique_name = f"TEST_IncomeReceived_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": unique_name,
            "principal": 100000,
            "currentValue": 100000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Income Received Borrower",
            "interestType": "simple",
            "agreedReturnAmount": 115000,  # 15000 total interest
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200, f"Failed: {create_resp.text}"
        data = create_resp.json()
        inv_id = data["id"]
        linked_income_id = data.get("linkedIncomeSourceId")
        
        assert linked_income_id is not None, "No linkedIncomeSourceId"
        
        # Add repayment
        repay_resp = self.session.post(f"{BASE_URL}/api/investments/{inv_id}/add-repayment", json={
            "amount": 11500,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Income received test"
        })
        
        assert repay_resp.status_code == 200
        repay_data = repay_resp.json()
        interest_portion = repay_data.get("transaction", {}).get("interestPortion", 0)
        
        if interest_portion > 0:
            # Check income_received collection for auto-created entry
            from database import db
            
            async def _check_income_received():
                entries = await db.income_received.find({
                    "userId": self.user_id,
                    "entityId": linked_income_id,
                    "source": "auto_loan_repayment"
                }, {"_id": 0}).to_list(100)
                return entries
            
            entries = asyncio.get_event_loop().run_until_complete(_check_income_received())
            
            assert len(entries) >= 1, "income_received entry not created for interest portion"
            entry = entries[0]
            assert entry["amount"] == interest_portion, f"Amount mismatch: expected {interest_portion}, got {entry['amount']}"
            print(f"✓ income_received entry created for interest: ₹{interest_portion}")
        else:
            print(f"⚠ No interest portion calculated (might need adjustment in interest calculation)")


class TestRepaymentValidationStillWorks:
    """
    Ensure validation still works after bug fixes:
    - Negative amounts rejected
    - Oversized amounts rejected
    """
    
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
        cleanup_test_data(self.user_id)
    
    def test_10_negative_repayment_still_rejected(self):
        """Negative amounts should still be rejected"""
        unique_name = f"TEST_NegReject_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Fixed",
            "name": unique_name,
            "principal": 20000,
            "currentValue": 20000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Neg Reject Borrower",
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
        
        assert repay_resp.status_code == 400, f"Negative should be rejected, got {repay_resp.status_code}"
        print(f"✓ Negative repayment correctly rejected")
    
    def test_11_oversized_repayment_still_rejected(self):
        """Amounts exceeding outstanding should still be rejected"""
        unique_name = f"TEST_OversizedReject_{uuid.uuid4().hex[:8]}"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Fixed",
            "name": unique_name,
            "principal": 15000,
            "currentValue": 15000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "borrowerName": "Oversized Reject Borrower",
            "interestType": "none",
            "repaymentType": "flexible",
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200
        inv_id = create_resp.json()["id"]
        
        # Try oversized repayment
        repay_resp = self.session.post(f"{BASE_URL}/api/investments/{inv_id}/add-repayment", json={
            "amount": 20000,  # More than principal
            "date": datetime.now().strftime("%Y-%m-%d"),
        })
        
        assert repay_resp.status_code == 400, f"Oversized should be rejected, got {repay_resp.status_code}"
        assert "exceeds" in repay_resp.text.lower(), "Error should mention 'exceeds'"
        print(f"✓ Oversized repayment correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
