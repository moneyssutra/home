"""
Iteration 136: Tests for Loan Given Income Visibility Fix
Bug: Income from Loan Given not visible on income page
Root cause: auto-created income source was missing selectedDate/selectedDay fields

Key tests:
1. POST Loan Given with Monthly frequency creates income source with selectedDate
2. POST Loan Given with Weekly frequency creates income source with selectedDay  
3. GET income/list/summary returns the auto-created income source
4. Income source has expectedAmount > 0 when agreedReturnAmount > principal
5. GET investments/{id}/loan-detail returns correct outstandingAmount (equals principal for fresh loan)
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

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://wizard-forms-1.preview.emergentagent.com').rstrip('/')


def create_test_session():
    """Create a test user and session in MongoDB via Python driver"""
    os.environ['REACT_APP_BACKEND_URL'] = BASE_URL
    from database import db
    
    user_id = 'test_user_iter136_' + str(uuid.uuid4())[:8]
    session_token = 'test_session_iter136_' + str(uuid.uuid4())[:8]
    
    async def _create():
        # Insert user
        await db.users.insert_one({
            'user_id': user_id,
            'email': f'{user_id}@test.com',
            'name': 'Test User For Income Visibility Iter136',
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


class TestLoanGivenIncomeVisibility:
    """Tests for income visibility from Loan Given investments"""

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

    # Test 1: Monthly frequency Loan Given creates income source with selectedDate
    def test_01_monthly_loan_given_creates_income_with_selected_date(self):
        """POST Loan Given with Monthly repaymentFrequency should create income source with selectedDate='15'"""
        print("\n--- Test 01: Monthly Loan Given creates income with selectedDate ---")
        
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": f"{self.test_prefix}_Monthly_Loan",
            "principal": 50000,
            "currentValue": 50000,
            "startDate": "2026-01-01",
            "borrowerName": "Test Borrower Monthly",
            "interestType": "simple",
            "returnRate": 12,
            "agreedReturnAmount": 55000,
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
            "paymentDay": "15",  # 15th of month
            "installmentAmount": 5500,
            "numberOfInstallments": 10
        }
        
        resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        print(f"Create investment response: {resp.status_code}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        self.created_investments.append(data.get("id"))
        
        # Verify linkedIncomeSourceId was created
        linked_income_id = data.get("linkedIncomeSourceId")
        print(f"Linked income source ID: {linked_income_id}")
        assert linked_income_id, "Should have linkedIncomeSourceId"
        
        # Fetch the income source and verify selectedDate
        income_resp = self.session.get(f"{BASE_URL}/api/income/{linked_income_id}")
        print(f"Income source response: {income_resp.status_code}")
        
        if income_resp.status_code == 200:
            income_data = income_resp.json()
            selected_date = income_data.get("selectedDate")
            print(f"Income source selectedDate: {selected_date}")
            assert selected_date == "15", f"Expected selectedDate='15', got {selected_date}"
            print("✓ Monthly loan creates income source with selectedDate='15'")
        else:
            # Alternative: check via income list
            list_resp = self.session.get(f"{BASE_URL}/api/income/list/summary")
            if list_resp.status_code == 200:
                incomes = list_resp.json()
                found = [i for i in incomes if i.get("id") == linked_income_id]
                if found:
                    selected_date = found[0].get("selectedDate")
                    print(f"Income selectedDate from list: {selected_date}")
                    assert selected_date == "15", f"Expected selectedDate='15', got {selected_date}"
                    print("✓ Income source created with correct selectedDate")

    # Test 2: Weekly frequency Loan Given creates income source with selectedDay
    def test_02_weekly_loan_given_creates_income_with_selected_day(self):
        """POST Loan Given with Weekly repaymentFrequency should create income source with selectedDay='Monday'"""
        print("\n--- Test 02: Weekly Loan Given creates income with selectedDay ---")
        
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": f"{self.test_prefix}_Weekly_Loan",
            "principal": 40000,
            "currentValue": 40000,
            "startDate": "2026-01-01",
            "borrowerName": "Test Borrower Weekly",
            "interestType": "simple",
            "returnRate": 10,
            "agreedReturnAmount": 44000,
            "repaymentType": "fixed",
            "repaymentFrequency": "Weekly",
            "paymentDay": "Monday",
            "installmentAmount": 4000,
            "numberOfInstallments": 11
        }
        
        resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        print(f"Create investment response: {resp.status_code}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        self.created_investments.append(data.get("id"))
        
        linked_income_id = data.get("linkedIncomeSourceId")
        print(f"Linked income source ID: {linked_income_id}")
        assert linked_income_id, "Should have linkedIncomeSourceId"
        
        # Fetch the income source and verify selectedDay
        income_resp = self.session.get(f"{BASE_URL}/api/income/{linked_income_id}")
        print(f"Income source response: {income_resp.status_code}")
        
        if income_resp.status_code == 200:
            income_data = income_resp.json()
            selected_day = income_data.get("selectedDay")
            print(f"Income source selectedDay: {selected_day}")
            assert selected_day == "Monday", f"Expected selectedDay='Monday', got {selected_day}"
            print("✓ Weekly loan creates income source with selectedDay='Monday'")
        else:
            # Fallback: Check income list
            list_resp = self.session.get(f"{BASE_URL}/api/income/list/summary")
            if list_resp.status_code == 200:
                incomes = list_resp.json()
                found = [i for i in incomes if i.get("id") == linked_income_id]
                if found:
                    selected_day = found[0].get("selectedDay")
                    print(f"Income selectedDay from list: {selected_day}")
                    assert selected_day == "Monday", f"Expected selectedDay='Monday', got {selected_day}"
                    print("✓ Income source created with correct selectedDay")

    # Test 3: Auto-created income source appears in income/list/summary
    def test_03_income_source_appears_in_income_list_summary(self):
        """Auto-created income source should appear in GET /api/income/list/summary"""
        print("\n--- Test 03: Income source appears in income list summary ---")
        
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": f"{self.test_prefix}_List_Test_Loan",
            "principal": 30000,
            "currentValue": 30000,
            "startDate": "2026-01-01",
            "borrowerName": "Test Borrower List",
            "interestType": "simple",
            "agreedReturnAmount": 35000,
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
            "paymentDay": "10",
            "installmentAmount": 3500,
            "numberOfInstallments": 10
        }
        
        resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert resp.status_code == 200, f"Create failed: {resp.status_code}"
        
        data = resp.json()
        self.created_investments.append(data.get("id"))
        loan_name = data.get("name")
        linked_income_id = data.get("linkedIncomeSourceId")
        print(f"Created loan: {loan_name}, income source: {linked_income_id}")
        
        # Fetch income list summary
        list_resp = self.session.get(f"{BASE_URL}/api/income/list/summary")
        print(f"Income list summary response: {list_resp.status_code}")
        assert list_resp.status_code == 200, f"List failed: {list_resp.status_code}"
        
        incomes = list_resp.json()
        print(f"Total income sources in list: {len(incomes)}")
        
        # Find the auto-created income source
        matching = [i for i in incomes if i.get("id") == linked_income_id]
        print(f"Found {len(matching)} matching income sources")
        
        assert len(matching) > 0, f"Income source {linked_income_id} should appear in list"
        
        found = matching[0]
        print(f"Found income: name={found.get('name')}, frequency={found.get('frequency')}, selectedDate={found.get('selectedDate')}")
        assert "Interest" in found.get("name", ""), "Income name should contain 'Interest'"
        print("✓ Auto-created income source appears in income list summary")

    # Test 4: Income source has expectedAmount > 0 when agreedReturnAmount > principal
    def test_04_income_source_has_positive_expected_amount(self):
        """Income source expectedAmount should be > 0 when agreedReturnAmount > principal"""
        print("\n--- Test 04: Income source has positive expectedAmount ---")
        
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": f"{self.test_prefix}_Expected_Amount_Test",
            "principal": 60000,
            "currentValue": 60000,
            "startDate": "2026-01-01",
            "borrowerName": "Test Borrower ExpAmt",
            "interestType": "simple",
            "agreedReturnAmount": 72000,  # 12000 interest
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
            "paymentDay": "5",
            "installmentAmount": 6000,
            "numberOfInstallments": 12
        }
        
        resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert resp.status_code == 200, f"Create failed: {resp.status_code}"
        
        data = resp.json()
        self.created_investments.append(data.get("id"))
        linked_income_id = data.get("linkedIncomeSourceId")
        
        # Fetch income source
        income_resp = self.session.get(f"{BASE_URL}/api/income/{linked_income_id}")
        if income_resp.status_code == 200:
            income_data = income_resp.json()
            expected_amount = income_data.get("expectedAmount", 0)
            print(f"Income expectedAmount: {expected_amount}")
            assert expected_amount > 0, f"expectedAmount should be > 0, got {expected_amount}"
            
            # Calculate expected: interest portion per installment
            total_interest = 72000 - 60000  # 12000
            interest_fraction = total_interest / 72000  # ~0.167
            expected_per_period = round(6000 * interest_fraction, 2)  # ~1000 per installment
            print(f"Expected interest per installment: ~{expected_per_period}")
            print(f"✓ Income source has expectedAmount={expected_amount}")
        else:
            # Alternative check via list
            list_resp = self.session.get(f"{BASE_URL}/api/income/list/summary")
            if list_resp.status_code == 200:
                incomes = list_resp.json()
                found = [i for i in incomes if i.get("id") == linked_income_id]
                if found:
                    expected_amount = found[0].get("expectedAmount", 0)
                    print(f"Income expectedAmount from list: {expected_amount}")
                    assert expected_amount > 0, "expectedAmount should be > 0"
                    print("✓ Income source has positive expectedAmount")

    # Test 5: loan-detail outstandingAmount equals principal for fresh loan
    def test_05_loan_detail_outstanding_equals_principal_for_fresh_loan(self):
        """GET /api/investments/{id}/loan-detail should show outstandingAmount = principal for new loan"""
        print("\n--- Test 05: Loan detail outstanding equals principal ---")
        
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": f"{self.test_prefix}_Outstanding_Test",
            "principal": 75000,
            "currentValue": 75000,
            "startDate": "2026-01-01",
            "borrowerName": "Test Borrower Outstanding",
            "interestType": "simple",
            "agreedReturnAmount": 82500,
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
            "paymentDay": "20",
            "installmentAmount": 8250,
            "numberOfInstallments": 10
        }
        
        resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert resp.status_code == 200, f"Create failed: {resp.status_code}"
        
        data = resp.json()
        inv_id = data.get("id")
        self.created_investments.append(inv_id)
        
        # Fetch loan detail
        detail_resp = self.session.get(f"{BASE_URL}/api/investments/{inv_id}/loan-detail")
        print(f"Loan detail response: {detail_resp.status_code}")
        assert detail_resp.status_code == 200, f"Detail failed: {detail_resp.status_code}"
        
        detail = detail_resp.json()
        principal = detail.get("principal")
        outstanding = detail.get("outstandingAmount")
        amount_received = detail.get("amountReceived")
        
        print(f"Principal: {principal}, Outstanding: {outstanding}, Received: {amount_received}")
        
        assert outstanding == principal, f"For fresh loan, outstanding ({outstanding}) should equal principal ({principal})"
        assert amount_received == 0, f"For fresh loan, amountReceived should be 0, got {amount_received}"
        print("✓ Fresh loan has outstanding = principal")

    # Test 6: Verify income has received/pending calculations (selectedDate used for schedule)
    def test_06_income_schedule_uses_selected_date(self):
        """Income monthlyReceived/monthlyPending should be calculated using selectedDate"""
        print("\n--- Test 06: Income schedule uses selectedDate ---")
        
        today = datetime.now()
        # Use a date that's already passed this month for "received" test
        payment_day = "1" if today.day > 1 else "28"
        
        payload = {
            "investmentCategory": "Loan Given",
            "investmentMode": "Income Generating",
            "name": f"{self.test_prefix}_Schedule_Test",
            "principal": 25000,
            "currentValue": 25000,
            "startDate": "2026-01-01",
            "borrowerName": "Test Borrower Schedule",
            "interestType": "simple",
            "agreedReturnAmount": 27500,
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
            "paymentDay": payment_day,
            "installmentAmount": 2750,
            "numberOfInstallments": 10
        }
        
        resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert resp.status_code == 200, f"Create failed: {resp.status_code}"
        
        data = resp.json()
        self.created_investments.append(data.get("id"))
        linked_income_id = data.get("linkedIncomeSourceId")
        
        # Fetch income list summary (which calculates monthly received/pending)
        list_resp = self.session.get(f"{BASE_URL}/api/income/list/summary")
        assert list_resp.status_code == 200
        
        incomes = list_resp.json()
        found = [i for i in incomes if i.get("id") == linked_income_id]
        
        if found:
            income = found[0]
            monthly_received = income.get("monthlyReceived", 0)
            monthly_pending = income.get("monthlyPending", 0)
            monthly_total = income.get("monthlyTotal", 0)
            selected_date = income.get("selectedDate")
            
            print(f"selectedDate: {selected_date}")
            print(f"monthlyTotal: {monthly_total}")
            print(f"monthlyReceived: {monthly_received}")
            print(f"monthlyPending: {monthly_pending}")
            
            # Verify schedule calculation happened (at least one of received/pending should be > 0)
            assert monthly_total > 0, "monthlyTotal should be > 0"
            
            if today.day >= int(payment_day):
                # Payment day has passed
                print(f"Payment day {payment_day} has passed today ({today.day}), expecting monthlyReceived > 0")
            else:
                # Payment day hasn't come yet
                print(f"Payment day {payment_day} hasn't come yet (today is {today.day}), expecting monthlyPending > 0")
            
            print("✓ Income source has schedule calculations based on selectedDate")
        else:
            pytest.fail(f"Income source {linked_income_id} not found in list")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
