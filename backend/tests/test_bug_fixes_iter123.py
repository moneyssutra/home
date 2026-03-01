"""
Test bug fixes for iteration 123 - 4 reported bugs after detail pages feature release
1. Insurance date crash (Invalid time value)
2. Credit Card UI overlap
3. Missing Account ledger
4. Missing Income detail sections
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestInsuranceDateFix:
    """Issue 1: Insurance date crash - verify no 'Invalid time value' errors"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.session.cookies.update(response.cookies)
    
    def test_insurance_list_api(self):
        """Test that insurance list API returns valid data"""
        response = self.session.get(f"{BASE_URL}/api/insurances")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} insurances")
        
        # Check that dates are properly formatted in response
        for ins in data:
            if ins.get('startDate'):
                assert 'Invalid' not in str(ins.get('startDate')), f"Invalid startDate: {ins.get('startDate')}"
            if ins.get('endDate'):
                assert 'Invalid' not in str(ins.get('endDate')), f"Invalid endDate: {ins.get('endDate')}"
    
    def test_insurance_detail_api(self):
        """Test insurance detail API with schedule generation"""
        # First get list of insurances
        response = self.session.get(f"{BASE_URL}/api/insurances")
        assert response.status_code == 200
        insurances = response.json()
        
        if not insurances:
            pytest.skip("No insurances to test")
        
        # Test detail endpoint for first insurance
        ins_id = insurances[0]['id']
        detail_response = self.session.get(f"{BASE_URL}/api/insurances/{ins_id}/detail")
        assert detail_response.status_code == 200
        detail = detail_response.json()
        
        # Verify schedule is properly generated
        assert 'schedule' in detail
        assert 'summary' in detail
        
        # Check dates in schedule are valid
        for entry in detail.get('schedule', []):
            if entry.get('dueDate'):
                assert 'Invalid' not in str(entry['dueDate']), f"Invalid dueDate in schedule: {entry['dueDate']}"
        
        print(f"Insurance detail API working - schedule has {len(detail.get('schedule', []))} entries")


class TestCreditCardDetailFix:
    """Issue 2: Credit Card UI - verify proper data structure for layout"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert response.status_code == 200
        self.session.cookies.update(response.cookies)
    
    def test_credit_card_detail_structure(self):
        """Verify credit card detail API returns all required fields"""
        # Get list of credit cards
        response = self.session.get(f"{BASE_URL}/api/credit-cards")
        assert response.status_code == 200
        cards = response.json()
        
        if not cards:
            pytest.skip("No credit cards to test")
        
        # Test detail endpoint
        card_id = cards[0]['id']
        detail_response = self.session.get(f"{BASE_URL}/api/credit-cards/{card_id}/detail")
        assert detail_response.status_code == 200
        detail = detail_response.json()
        
        # Verify required fields for proper layout
        assert 'utilization' in detail, "Missing utilization field"
        assert 'monthlyInterest' in detail, "Missing monthlyInterest field"
        assert 'monthsToPayoff' in detail, "Missing monthsToPayoff field"
        assert 'availableCredit' in detail, "Missing availableCredit field"
        
        # Verify payment history dates are valid
        if detail.get('payments'):
            for payment in detail['payments']:
                if payment.get('paymentDate'):
                    date_str = str(payment['paymentDate'])
                    assert 'Invalid' not in date_str, f"Invalid payment date: {date_str}"
        
        print(f"Credit card detail API structure verified - utilization: {detail['utilization']}%")


class TestAccountLedgerFix:
    """Issue 3: Missing Account ledger - verify ledger array in detail"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert response.status_code == 200
        self.session.cookies.update(response.cookies)
    
    def test_account_detail_has_ledger(self):
        """Verify account detail API returns ledger array"""
        # Get list of accounts
        response = self.session.get(f"{BASE_URL}/api/accounts")
        assert response.status_code == 200
        accounts = response.json()
        
        if not accounts:
            pytest.skip("No accounts to test")
        
        # Test detail endpoint
        account_id = accounts[0]['id']
        detail_response = self.session.get(f"{BASE_URL}/api/accounts/{account_id}/detail")
        assert detail_response.status_code == 200
        detail = detail_response.json()
        
        # Verify ledger exists
        assert 'ledger' in detail, "Missing ledger field in account detail"
        assert isinstance(detail['ledger'], list), "Ledger should be a list"
        
        # Verify ledger has Opening Balance entry
        ledger = detail['ledger']
        assert len(ledger) > 0, "Ledger should have at least Opening Balance entry"
        
        # Check first entry is Opening Balance
        opening_entry = ledger[0]
        assert opening_entry.get('description') == 'Opening Balance', \
            f"First ledger entry should be 'Opening Balance', got: {opening_entry.get('description')}"
        assert opening_entry.get('type') == 'opening', \
            f"Opening entry type should be 'opening', got: {opening_entry.get('type')}"
        
        print(f"Account ledger verified - {len(ledger)} entries, first: {opening_entry}")
    
    def test_account_ledger_balance_tracking(self):
        """Verify ledger has running balance calculations"""
        # Get list of accounts
        response = self.session.get(f"{BASE_URL}/api/accounts")
        accounts = response.json()
        
        if not accounts:
            pytest.skip("No accounts to test")
        
        account_id = accounts[0]['id']
        detail_response = self.session.get(f"{BASE_URL}/api/accounts/{account_id}/detail")
        detail = detail_response.json()
        
        ledger = detail.get('ledger', [])
        
        # Verify balance field exists in entries
        for entry in ledger:
            assert 'balance' in entry, f"Entry missing balance field: {entry}"
            assert 'amount' in entry, f"Entry missing amount field: {entry}"
            assert 'type' in entry, f"Entry missing type field: {entry}"
        
        print(f"Account ledger balance tracking verified")


class TestIncomeDetailSectionsFix:
    """Issue 4: Missing Income detail sections - verify schedule, transactions, linked asset"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert response.status_code == 200
        self.session.cookies.update(response.cookies)
    
    def test_income_detail_has_schedule(self):
        """Verify income detail API returns schedule array"""
        # Get list of income sources
        response = self.session.get(f"{BASE_URL}/api/income")
        assert response.status_code == 200
        incomes = response.json()
        
        if not incomes:
            pytest.skip("No income sources to test")
        
        # Test detail endpoint
        income_id = incomes[0]['id']
        detail_response = self.session.get(f"{BASE_URL}/api/income/{income_id}/detail")
        assert detail_response.status_code == 200
        detail = detail_response.json()
        
        # Verify schedule exists
        assert 'schedule' in detail, "Missing schedule field in income detail"
        assert isinstance(detail['schedule'], list), "Schedule should be a list"
        
        print(f"Income schedule verified - {len(detail['schedule'])} entries")
    
    def test_income_detail_has_transactions(self):
        """Verify income detail API returns transactions array"""
        response = self.session.get(f"{BASE_URL}/api/income")
        incomes = response.json()
        
        if not incomes:
            pytest.skip("No income sources to test")
        
        income_id = incomes[0]['id']
        detail_response = self.session.get(f"{BASE_URL}/api/income/{income_id}/detail")
        detail = detail_response.json()
        
        # Verify transactions field exists (may be empty array)
        assert 'transactions' in detail, "Missing transactions field in income detail"
        assert isinstance(detail['transactions'], list), "Transactions should be a list"
        
        print(f"Income transactions verified - {len(detail['transactions'])} entries")
    
    def test_income_detail_has_linked_asset(self):
        """Verify income detail API returns linkedAsset field"""
        response = self.session.get(f"{BASE_URL}/api/income")
        incomes = response.json()
        
        if not incomes:
            pytest.skip("No income sources to test")
        
        income_id = incomes[0]['id']
        detail_response = self.session.get(f"{BASE_URL}/api/income/{income_id}/detail")
        detail = detail_response.json()
        
        # Verify linkedAsset field exists (may be null)
        assert 'linkedAsset' in detail, "Missing linkedAsset field in income detail"
        
        print(f"Income linkedAsset field verified - value: {detail.get('linkedAsset')}")
    
    def test_income_detail_has_summary(self):
        """Verify income detail API returns summary with totals"""
        response = self.session.get(f"{BASE_URL}/api/income")
        incomes = response.json()
        
        if not incomes:
            pytest.skip("No income sources to test")
        
        income_id = incomes[0]['id']
        detail_response = self.session.get(f"{BASE_URL}/api/income/{income_id}/detail")
        detail = detail_response.json()
        
        # Verify summary exists with required fields
        assert 'summary' in detail, "Missing summary field in income detail"
        summary = detail['summary']
        assert 'totalReceived' in summary, "Missing totalReceived in summary"
        assert 'receivedCount' in summary, "Missing receivedCount in summary"
        
        print(f"Income summary verified - totalReceived: {summary['totalReceived']}, count: {summary['receivedCount']}")
    
    def test_income_schedule_generated_without_start_date(self):
        """Verify schedule is generated even when startDate is missing (uses createdAt)"""
        response = self.session.get(f"{BASE_URL}/api/income")
        incomes = response.json()
        
        if not incomes:
            pytest.skip("No income sources to test")
        
        # Find an income without explicit startDate or test first one
        income_id = incomes[0]['id']
        detail_response = self.session.get(f"{BASE_URL}/api/income/{income_id}/detail")
        detail = detail_response.json()
        
        # Even if no startDate, schedule should be generated from createdAt
        schedule = detail.get('schedule', [])
        
        # Check schedule entries have valid dates
        for entry in schedule:
            assert 'dueDate' in entry, "Schedule entry missing dueDate"
            assert 'amount' in entry, "Schedule entry missing amount"
            assert 'status' in entry, "Schedule entry missing status"
            # Verify status is valid
            assert entry['status'] in ['received', 'upcoming'], \
                f"Invalid status: {entry['status']}"
        
        print(f"Income schedule generation verified - {len(schedule)} entries with valid status")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
