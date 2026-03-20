"""
Iteration 137: Tests for CRITICAL FIX - Income from Loan Given must be visible for ALL loans
Bug: Previous code only created income source for loans WITH interest (interestType != 'none')
Fix: Now ALL Loan Given investments create an income source regardless of interestType

Key tests:
1. POST Loan Given WITHOUT interest (interestType='none') - verify income source IS created
2. POST Loan Given WITH interest (interestType='simple') - verify income source IS created  
3. GET income/list/summary - verify auto-created income sources appear with expectedAmount > 0
4. Backend: Fixed EMI has expectedAmount = installmentAmount
5. Backend: Lump Sum has expectedAmount = principal or agreedReturnAmount
6. Backend: Flexible has expectedAmount = principal/12
7. Backend: Weekly frequency has proper selectedDay
8. Backend: Monthly frequency has proper selectedDate
9. Backend: add-repayment creates income_received for ALL repayments (not just interest)
10. Income source name is 'Loan Repayment - {name}' for no-interest loans
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

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://card-hub-5.preview.emergentagent.com').rstrip('/')


def create_test_session():
    """Create a test user and session in MongoDB via Python driver"""
    os.environ['REACT_APP_BACKEND_URL'] = BASE_URL
    from database import db
    
    user_id = 'test_user_iter137_' + str(uuid.uuid4())[:8]
    session_token = 'test_session_iter137_' + str(uuid.uuid4())[:8]
    
    async def _create():
        # Insert user
        await db.users.insert_one({
            'user_id': user_id,
            'email': f'{user_id}@test.com',
            'name': 'Test User For All Loans Income Iter137',
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


def get_income_source_from_db(user_id, income_id):
    """Fetch income source directly from MongoDB"""
    os.environ['REACT_APP_BACKEND_URL'] = BASE_URL
    from database import db
    
    async def _fetch():
        return await db.income_sources.find_one({'userId': user_id, 'id': income_id}, {'_id': 0})
    
    return asyncio.get_event_loop().run_until_complete(_fetch())


class TestLoanGivenIncomeForAllLoans:
    """Tests for income source creation for ALL Loan Given investments"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session_token, self.user_id = create_test_session()
        self.session = requests.Session()
        self.session.cookies.set('session_token', self.session_token)
        self.test_prefix = f"TEST_{uuid.uuid4().hex[:8]}"
        self.created_investments = []
        yield
        # Cleanup
        for inv_id in self.created_investments:
            try:
                self.session.delete(f"{BASE_URL}/api/investments/{inv_id}")
            except:
                pass
        cleanup_test_data(self.user_id)

    # CRITICAL Test 1: Loan Given WITHOUT interest MUST create income source
    def test_01_loan_without_interest_creates_income_source(self):
        """CRITICAL: POST Loan Given with interestType='none' should create income source"""
        print("\n--- Test 01: Loan WITHOUT interest creates income source ---")
        
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": f"{self.test_prefix}_No_Interest_Loan",
            "principal": 50000,
            "currentValue": 50000,
            "startDate": "2026-01-01",
            "borrowerName": "Test Borrower No Interest",
            "interestType": "none",  # NO INTEREST
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
            "paymentDay": "10",
            "installmentAmount": 5000,
            "numberOfInstallments": 10
        }
        
        resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        print(f"Create investment response: {resp.status_code}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        self.created_investments.append(data.get("id"))
        
        # CRITICAL VERIFICATION: linkedIncomeSourceId should exist even for no-interest loans
        linked_income_id = data.get("linkedIncomeSourceId")
        print(f"Linked income source ID: {linked_income_id}")
        assert linked_income_id is not None, "CRITICAL BUG: No-interest loan MUST have linkedIncomeSourceId"
        
        # Verify income source was actually created in DB
        income_source = get_income_source_from_db(self.user_id, linked_income_id)
        assert income_source is not None, "Income source should exist in database"
        
        # Verify income source name format for no-interest loans
        name = income_source.get("name", "")
        print(f"Income source name: {name}")
        assert "Loan Repayment" in name, f"Name should contain 'Loan Repayment', got: {name}"
        assert "interest" not in name.lower() or "no interest" in income_source.get("notes", "").lower(), \
            "No-interest loan income source should not mention interest in name or should have 'No interest' in notes"
        
        print("✓ CRITICAL: No-interest loan correctly creates income source")

    # CRITICAL Test 2: Loan Given WITH interest also creates income source
    def test_02_loan_with_interest_creates_income_source(self):
        """POST Loan Given with interestType='simple' should create income source"""
        print("\n--- Test 02: Loan WITH interest creates income source ---")
        
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": f"{self.test_prefix}_With_Interest_Loan",
            "principal": 60000,
            "currentValue": 60000,
            "startDate": "2026-01-01",
            "borrowerName": "Test Borrower With Interest",
            "interestType": "simple",  # WITH INTEREST
            "returnRate": 12,
            "agreedReturnAmount": 72000,
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
            "paymentDay": "15",
            "installmentAmount": 6000,
            "numberOfInstallments": 12
        }
        
        resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        print(f"Create investment response: {resp.status_code}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        self.created_investments.append(data.get("id"))
        
        linked_income_id = data.get("linkedIncomeSourceId")
        print(f"Linked income source ID: {linked_income_id}")
        assert linked_income_id is not None, "With-interest loan should have linkedIncomeSourceId"
        
        # Verify income source in DB
        income_source = get_income_source_from_db(self.user_id, linked_income_id)
        assert income_source is not None, "Income source should exist in database"
        
        name = income_source.get("name", "")
        print(f"Income source name: {name}")
        assert "Loan Repayment" in name, f"Name should contain 'Loan Repayment', got: {name}"
        assert "interest" in name.lower(), "With-interest loan income source should mention interest in name"
        
        print("✓ With-interest loan creates income source with interest mention in name")

    # CRITICAL Test 3: Income sources appear in /api/income/list/summary
    def test_03_income_sources_appear_in_list_summary(self):
        """GET /api/income/list/summary should include auto-created income sources"""
        print("\n--- Test 03: Income sources appear in list/summary ---")
        
        # Create a loan (no interest)
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": f"{self.test_prefix}_List_Test_Loan",
            "principal": 40000,
            "currentValue": 40000,
            "startDate": "2026-01-01",
            "borrowerName": "Test Borrower List",
            "interestType": "none",
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
            "paymentDay": "5",
            "installmentAmount": 4000,
            "numberOfInstallments": 10
        }
        
        resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        self.created_investments.append(data.get("id"))
        linked_income_id = data.get("linkedIncomeSourceId")
        print(f"Created loan with income source: {linked_income_id}")
        
        # Fetch income list summary
        list_resp = self.session.get(f"{BASE_URL}/api/income/list/summary")
        print(f"Income list summary response: {list_resp.status_code}")
        assert list_resp.status_code == 200, f"List failed: {list_resp.status_code}"
        
        incomes = list_resp.json()
        print(f"Total income sources: {len(incomes)}")
        
        # Find the auto-created income source
        matching = [i for i in incomes if i.get("id") == linked_income_id]
        print(f"Found {len(matching)} matching income sources")
        
        assert len(matching) > 0, f"CRITICAL: Income source {linked_income_id} should appear in list/summary"
        
        found = matching[0]
        expected_amount = found.get("expectedAmount", 0)
        print(f"Income source: name={found.get('name')}, expectedAmount={expected_amount}")
        
        assert expected_amount > 0, f"expectedAmount should be > 0, got {expected_amount}"
        print("✓ CRITICAL: Auto-created income source appears in income list summary")

    # Test 4: Fixed EMI has expectedAmount = installmentAmount
    def test_04_fixed_emi_expected_amount_equals_installment(self):
        """Backend: Fixed EMI loan has expectedAmount = installmentAmount"""
        print("\n--- Test 04: Fixed EMI expectedAmount = installmentAmount ---")
        
        installment_amount = 7500
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": f"{self.test_prefix}_Fixed_EMI_Test",
            "principal": 75000,
            "currentValue": 75000,
            "startDate": "2026-01-01",
            "borrowerName": "Test Borrower Fixed EMI",
            "interestType": "none",
            "repaymentType": "fixed",  # FIXED EMI
            "repaymentFrequency": "Monthly",
            "paymentDay": "20",
            "installmentAmount": installment_amount,
            "numberOfInstallments": 10
        }
        
        resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        self.created_investments.append(data.get("id"))
        linked_income_id = data.get("linkedIncomeSourceId")
        
        # Verify expected amount
        income_source = get_income_source_from_db(self.user_id, linked_income_id)
        expected_amount = income_source.get("expectedAmount", 0)
        print(f"installmentAmount: {installment_amount}, expectedAmount: {expected_amount}")
        
        assert expected_amount == installment_amount, \
            f"For fixed EMI, expectedAmount ({expected_amount}) should equal installmentAmount ({installment_amount})"
        
        print("✓ Fixed EMI has expectedAmount = installmentAmount")

    # Test 5: Lump Sum has expectedAmount = principal or agreedReturnAmount
    def test_05_lump_sum_expected_amount(self):
        """Backend: Lump Sum loan has expectedAmount = agreedReturnAmount or principal"""
        print("\n--- Test 05: Lump Sum expectedAmount ---")
        
        principal = 100000
        agreed_return = 110000
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": f"{self.test_prefix}_Lump_Sum_Test",
            "principal": principal,
            "currentValue": principal,
            "startDate": "2026-01-01",
            "borrowerName": "Test Borrower Lump Sum",
            "interestType": "custom",
            "agreedReturnAmount": agreed_return,
            "repaymentType": "lump_sum",  # LUMP SUM
            "paymentDay": "25"
        }
        
        resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        self.created_investments.append(data.get("id"))
        linked_income_id = data.get("linkedIncomeSourceId")
        
        income_source = get_income_source_from_db(self.user_id, linked_income_id)
        expected_amount = income_source.get("expectedAmount", 0)
        print(f"principal: {principal}, agreedReturnAmount: {agreed_return}, expectedAmount: {expected_amount}")
        
        # For lump_sum, expectedAmount should be agreedReturnAmount if > 0, else principal
        assert expected_amount == agreed_return, \
            f"For lump sum, expectedAmount ({expected_amount}) should equal agreedReturnAmount ({agreed_return})"
        
        print("✓ Lump Sum has expectedAmount = agreedReturnAmount")

    # Test 6: Flexible has expectedAmount = principal/12
    def test_06_flexible_expected_amount(self):
        """Backend: Flexible loan has expectedAmount = principal/12 (or agreedReturn/12)"""
        print("\n--- Test 06: Flexible expectedAmount = principal/12 ---")
        
        principal = 60000
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": f"{self.test_prefix}_Flexible_Test",
            "principal": principal,
            "currentValue": principal,
            "startDate": "2026-01-01",
            "borrowerName": "Test Borrower Flexible",
            "interestType": "none",
            "repaymentType": "flexible",  # FLEXIBLE
            "paymentDay": "1"
        }
        
        resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        self.created_investments.append(data.get("id"))
        linked_income_id = data.get("linkedIncomeSourceId")
        
        income_source = get_income_source_from_db(self.user_id, linked_income_id)
        expected_amount = income_source.get("expectedAmount", 0)
        expected_calculation = round(principal / 12, 2)
        print(f"principal: {principal}, principal/12: {expected_calculation}, expectedAmount: {expected_amount}")
        
        assert expected_amount == expected_calculation, \
            f"For flexible, expectedAmount ({expected_amount}) should equal principal/12 ({expected_calculation})"
        
        print("✓ Flexible has expectedAmount = principal/12")

    # Test 7: Weekly frequency has proper selectedDay
    def test_07_weekly_frequency_has_selected_day(self):
        """Backend: Weekly frequency loan has selectedDay in income source"""
        print("\n--- Test 07: Weekly frequency has selectedDay ---")
        
        payment_day = "Wednesday"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": f"{self.test_prefix}_Weekly_Day_Test",
            "principal": 35000,
            "currentValue": 35000,
            "startDate": "2026-01-01",
            "borrowerName": "Test Borrower Weekly",
            "interestType": "none",
            "repaymentType": "fixed",
            "repaymentFrequency": "Weekly",
            "paymentDay": payment_day,  # Day of week
            "installmentAmount": 3500,
            "numberOfInstallments": 10
        }
        
        resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        self.created_investments.append(data.get("id"))
        linked_income_id = data.get("linkedIncomeSourceId")
        
        income_source = get_income_source_from_db(self.user_id, linked_income_id)
        selected_day = income_source.get("selectedDay")
        frequency = income_source.get("frequency")
        
        print(f"frequency: {frequency}, paymentDay input: {payment_day}, selectedDay: {selected_day}")
        
        assert frequency == "Weekly", f"Expected frequency='Weekly', got {frequency}"
        assert selected_day == payment_day, \
            f"For weekly, selectedDay ({selected_day}) should equal paymentDay ({payment_day})"
        
        print("✓ Weekly frequency has correct selectedDay")

    # Test 8: Monthly frequency has proper selectedDate
    def test_08_monthly_frequency_has_selected_date(self):
        """Backend: Monthly frequency loan has selectedDate in income source"""
        print("\n--- Test 08: Monthly frequency has selectedDate ---")
        
        payment_day = "18"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": f"{self.test_prefix}_Monthly_Date_Test",
            "principal": 45000,
            "currentValue": 45000,
            "startDate": "2026-01-01",
            "borrowerName": "Test Borrower Monthly",
            "interestType": "none",
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
            "paymentDay": payment_day,  # Day of month
            "installmentAmount": 4500,
            "numberOfInstallments": 10
        }
        
        resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        self.created_investments.append(data.get("id"))
        linked_income_id = data.get("linkedIncomeSourceId")
        
        income_source = get_income_source_from_db(self.user_id, linked_income_id)
        selected_date = income_source.get("selectedDate")
        frequency = income_source.get("frequency")
        
        print(f"frequency: {frequency}, paymentDay input: {payment_day}, selectedDate: {selected_date}")
        
        assert frequency == "Monthly", f"Expected frequency='Monthly', got {frequency}"
        assert selected_date == payment_day, \
            f"For monthly, selectedDate ({selected_date}) should equal paymentDay ({payment_day})"
        
        print("✓ Monthly frequency has correct selectedDate")

    # CRITICAL Test 9: add-repayment creates income_received for ALL repayments
    def test_09_add_repayment_creates_income_received_for_all(self):
        """CRITICAL: add-repayment creates income_received entry for ALL repayments (not just interest)"""
        print("\n--- Test 09: add-repayment creates income_received for ALL ---")
        
        # Create a no-interest loan
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": f"{self.test_prefix}_Repayment_Test",
            "principal": 30000,
            "currentValue": 30000,
            "startDate": "2026-01-01",
            "borrowerName": "Test Borrower Repayment",
            "interestType": "none",  # NO INTEREST
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
            "paymentDay": "12",
            "installmentAmount": 3000,
            "numberOfInstallments": 10
        }
        
        resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        inv_id = data.get("id")
        self.created_investments.append(inv_id)
        linked_income_id = data.get("linkedIncomeSourceId")
        
        print(f"Created loan: {inv_id}, linkedIncomeSourceId: {linked_income_id}")
        assert linked_income_id, "Must have linkedIncomeSourceId for repayment tracking"
        
        # Add a repayment
        repayment_resp = self.session.post(f"{BASE_URL}/api/investments/{inv_id}/add-repayment", json={
            "amount": 3000,
            "date": "2026-01-15",
            "notes": "Test repayment for iter137"
        })
        
        print(f"Repayment response: {repayment_resp.status_code}")
        assert repayment_resp.status_code == 200, f"Repayment failed: {repayment_resp.text}"
        
        repayment_data = repayment_resp.json()
        print(f"Repayment result: {repayment_data}")
        
        # Verify income_received entry was created
        os.environ['REACT_APP_BACKEND_URL'] = BASE_URL
        from database import db
        
        async def check_income_received():
            entry = await db.income_received.find_one({
                'userId': self.user_id,
                'entityId': linked_income_id
            }, {'_id': 0})
            return entry
        
        income_received = asyncio.get_event_loop().run_until_complete(check_income_received())
        print(f"Income received entry: {income_received}")
        
        assert income_received is not None, \
            "CRITICAL: income_received entry should be created for ALL repayments (including no-interest)"
        assert income_received.get("amount") == 3000, "Income received amount should match repayment"
        assert income_received.get("source") == "auto_loan_repayment", "Source should be auto_loan_repayment"
        
        print("✓ CRITICAL: add-repayment creates income_received for no-interest loans")

    # Test 10: Income source name format for no-interest loans
    def test_10_income_source_name_format(self):
        """Income source name is 'Loan Repayment - {name}' for no-interest loans"""
        print("\n--- Test 10: Income source name format ---")
        
        loan_name = f"{self.test_prefix}_Name_Format_Test"
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": loan_name,
            "principal": 25000,
            "currentValue": 25000,
            "startDate": "2026-01-01",
            "borrowerName": "Test Borrower Name",
            "interestType": "none",
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
            "paymentDay": "8",
            "installmentAmount": 2500,
            "numberOfInstallments": 10
        }
        
        resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        self.created_investments.append(data.get("id"))
        linked_income_id = data.get("linkedIncomeSourceId")
        
        income_source = get_income_source_from_db(self.user_id, linked_income_id)
        name = income_source.get("name", "")
        notes = income_source.get("notes", "")
        source_category = income_source.get("sourceCategory", "")
        
        print(f"Income source name: {name}")
        print(f"Income source notes: {notes}")
        print(f"Source category: {source_category}")
        
        expected_name = f"Loan Repayment - {loan_name}"
        assert name == expected_name, f"Expected name '{expected_name}', got '{name}'"
        assert "No interest" in notes, f"Notes should mention 'No interest', got: {notes}"
        assert source_category == "loan_repayment", f"sourceCategory should be 'loan_repayment', got: {source_category}"
        
        print("✓ Income source name format is correct for no-interest loans")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
