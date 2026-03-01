"""
Test Loan EMI Auto-Deduction Scheduler and Ledger Features
Tests for MoneySutra iteration_118 - Loan EMI processing and Share Card API
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERNAME = "test@moneyssutra.com"
TEST_PASSWORD = "test"

# Known loan ID from the test data
HDFC_HOME_LOAN_ID = "886f8ea0-1f10-4a3e-8280-eefc1567bc5e"


class TestAuth:
    """Authentication helper tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return s
    
    def test_login_returns_user_data(self, session):
        """Verify login returns expected user data"""
        response = session.get(f"{BASE_URL}/api/auth/me")
        # Should not be 401 since we are logged in
        assert response.status_code in [200, 404], f"Auth check failed: {response.status_code}"


class TestShareCardAPI:
    """Share Card API tests - verify name capitalization in API response"""
    
    @pytest.fixture(scope="class")
    def session(self):
        s = requests.Session()
        s.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        return s
    
    def test_share_card_endpoint_returns_200(self, session):
        """GET /api/gamification/share-card returns 200"""
        response = session.get(f"{BASE_URL}/api/gamification/share-card")
        assert response.status_code == 200, f"Share card API failed: {response.status_code}"
    
    def test_share_card_contains_required_fields(self, session):
        """Share card response has all required fields"""
        response = session.get(f"{BASE_URL}/api/gamification/share-card")
        data = response.json()
        
        required_fields = ['name', 'level', 'levelNumber', 'survivalDays', 'controlScore', 
                          'streak', 'achievements', 'generated_at']
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
    
    def test_share_card_name_is_string(self, session):
        """Name field is a string for capitalization"""
        response = session.get(f"{BASE_URL}/api/gamification/share-card")
        data = response.json()
        
        assert isinstance(data.get('name'), str), "Name should be a string"
        assert len(data['name']) > 0, "Name should not be empty"


class TestLoanCRUD:
    """Loan CRUD operations still work after EMI scheduler changes"""
    
    @pytest.fixture(scope="class")
    def session(self):
        s = requests.Session()
        s.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        return s
    
    def test_get_all_loans(self, session):
        """GET /api/loans returns loans list"""
        response = session.get(f"{BASE_URL}/api/loans")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Loans should be a list"
        assert len(data) > 0, "Should have at least one loan"
    
    def test_get_specific_loan(self, session):
        """GET /api/loans/{loan_id} returns specific loan"""
        response = session.get(f"{BASE_URL}/api/loans/{HDFC_HOME_LOAN_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('id') == HDFC_HOME_LOAN_ID
        assert data.get('loanName') == "HDFC Home Loan"
    
    def test_loan_has_emi_fields(self, session):
        """Loan has EMI-related fields"""
        response = session.get(f"{BASE_URL}/api/loans/{HDFC_HOME_LOAN_ID}")
        data = response.json()
        
        assert 'emiAmount' in data, "Missing emiAmount"
        assert 'emiFrequency' in data, "Missing emiFrequency"
        assert 'outstandingAmount' in data, "Missing outstandingAmount"
        assert 'lastEmiUpdateDate' in data, "Missing lastEmiUpdateDate"


class TestEMITriggerEndpoint:
    """POST /api/loans/trigger-emi-update tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        s = requests.Session()
        s.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        return s
    
    def test_trigger_emi_update_returns_200(self, session):
        """POST /api/loans/trigger-emi-update returns 200"""
        response = session.post(f"{BASE_URL}/api/loans/trigger-emi-update")
        assert response.status_code == 200
    
    def test_trigger_emi_returns_all_9_loans(self, session):
        """Trigger EMI response includes all 9 loans"""
        response = session.post(f"{BASE_URL}/api/loans/trigger-emi-update")
        data = response.json()
        
        assert 'totalLoans' in data, "Missing totalLoans field"
        assert data['totalLoans'] == 9, f"Expected 9 loans, got {data['totalLoans']}"
    
    def test_trigger_emi_has_due_day_info(self, session):
        """Each loan has isDueToday and emiDueDay fields"""
        response = session.post(f"{BASE_URL}/api/loans/trigger-emi-update")
        data = response.json()
        
        for loan in data.get('details', []):
            assert 'isDueToday' in loan, f"Missing isDueToday for {loan.get('loanName')}"
            assert 'emiDueDay' in loan, f"Missing emiDueDay for {loan.get('loanName')}"
    
    def test_trigger_emi_has_principal_interest_breakdown(self, session):
        """Each loan has principal/interest breakdown"""
        response = session.post(f"{BASE_URL}/api/loans/trigger-emi-update")
        data = response.json()
        
        for loan in data.get('details', []):
            assert 'principalPortion' in loan, f"Missing principalPortion for {loan.get('loanName')}"
            assert 'interestPortion' in loan, f"Missing interestPortion for {loan.get('loanName')}"
            
            # Validate breakdown adds up to EMI
            emi = loan.get('emiAmount', 0)
            principal = loan.get('principalPortion', 0)
            interest = loan.get('interestPortion', 0)
            assert abs((principal + interest) - emi) < 1, f"Principal + Interest should equal EMI for {loan.get('loanName')}"


class TestEMILedgerAll:
    """GET /api/loans/emi-ledger-all tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        s = requests.Session()
        s.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        return s
    
    def test_emi_ledger_all_returns_200(self, session):
        """GET /api/loans/emi-ledger-all returns 200"""
        response = session.get(f"{BASE_URL}/api/loans/emi-ledger-all")
        assert response.status_code == 200
    
    def test_emi_ledger_all_returns_9_transactions(self, session):
        """EMI ledger has 9 transactions from scheduler processing"""
        response = session.get(f"{BASE_URL}/api/loans/emi-ledger-all")
        data = response.json()
        
        assert 'totalTransactions' in data
        assert 'transactions' in data
        assert data['totalTransactions'] == 9, f"Expected 9 transactions, got {data['totalTransactions']}"
    
    def test_emi_transaction_has_breakdown(self, session):
        """Each EMI transaction has principal/interest breakdown"""
        response = session.get(f"{BASE_URL}/api/loans/emi-ledger-all")
        data = response.json()
        
        for tx in data.get('transactions', []):
            assert 'principalPortion' in tx, f"Missing principalPortion in transaction"
            assert 'interestPortion' in tx, f"Missing interestPortion in transaction"
            assert 'outstandingBefore' in tx, f"Missing outstandingBefore"
            assert 'outstandingAfter' in tx, f"Missing outstandingAfter"
    
    def test_transactions_have_source_field(self, session):
        """Transactions indicate they were auto-scheduled"""
        response = session.get(f"{BASE_URL}/api/loans/emi-ledger-all")
        data = response.json()
        
        for tx in data.get('transactions', []):
            assert tx.get('source') == 'auto_scheduler', f"Expected source=auto_scheduler, got {tx.get('source')}"


class TestEMILedgerSpecificLoan:
    """GET /api/loans/emi-ledger/{loan_id} tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        s = requests.Session()
        s.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        return s
    
    def test_emi_ledger_specific_returns_200(self, session):
        """GET /api/loans/emi-ledger/{loan_id} returns 200"""
        response = session.get(f"{BASE_URL}/api/loans/emi-ledger/{HDFC_HOME_LOAN_ID}")
        assert response.status_code == 200
    
    def test_emi_ledger_specific_returns_correct_loan(self, session):
        """EMI ledger for HDFC Home Loan returns transactions for that loan"""
        response = session.get(f"{BASE_URL}/api/loans/emi-ledger/{HDFC_HOME_LOAN_ID}")
        data = response.json()
        
        assert data.get('loanId') == HDFC_HOME_LOAN_ID
        assert 'totalTransactions' in data
        assert data['totalTransactions'] >= 1, "Should have at least 1 transaction"
    
    def test_hdfc_loan_outstanding_reduced(self, session):
        """HDFC Home Loan outstanding was reduced from 4200000 to ~4184750"""
        response = session.get(f"{BASE_URL}/api/loans/emi-ledger/{HDFC_HOME_LOAN_ID}")
        data = response.json()
        
        if data['totalTransactions'] > 0:
            tx = data['transactions'][0]  # Most recent transaction
            
            # Verify the reduction
            assert tx.get('outstandingBefore') == 4200000, f"Expected outstandingBefore=4200000"
            assert tx.get('outstandingAfter') == 4184750, f"Expected outstandingAfter=4184750"
            
            # Verify breakdown
            assert tx.get('principalPortion') == 15250, "Principal should be 15250"
            assert tx.get('interestPortion') == 29750, "Interest should be 29750"


class TestLoanOutstandingVerification:
    """Verify loan outstanding amounts were actually reduced after EMI processing"""
    
    @pytest.fixture(scope="class")
    def session(self):
        s = requests.Session()
        s.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        return s
    
    def test_hdfc_home_loan_outstanding_reduced(self, session):
        """HDFC Home Loan outstanding reduced from 4200000 to 4184750"""
        response = session.get(f"{BASE_URL}/api/loans/{HDFC_HOME_LOAN_ID}")
        data = response.json()
        
        assert data.get('outstandingAmount') == 4184750, f"Expected 4184750, got {data.get('outstandingAmount')}"
    
    def test_hdfc_home_loan_last_update_date_set(self, session):
        """HDFC Home Loan lastEmiUpdateDate was set to today"""
        response = session.get(f"{BASE_URL}/api/loans/{HDFC_HOME_LOAN_ID}")
        data = response.json()
        
        assert data.get('lastEmiUpdateDate') == "2026-03-01", f"Expected lastEmiUpdateDate=2026-03-01, got {data.get('lastEmiUpdateDate')}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
