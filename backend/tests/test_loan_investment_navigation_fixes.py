"""
Tests for Bug Fixes:
1. Loan/Investment navigation routes (verified in frontend code)
2. Past EMIs should be 'paid' not 'missed' when no ledger data
3. Extra payment mode=reduce_principal keeps emiAmount and tenureMonths unchanged
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test Data
HDFC_LOAN_ID = "886f8ea0-1f10-4a3e-8280-eefc1567bc5e"
SBI_FD_ID = "c269922d-630f-429f-b025-2b8462ab8190"

@pytest.fixture(scope="module")
def auth_session():
    """Authenticated session with cookie auth"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login
    login_response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "test@moneyssutra.com", "password": "test"}
    )
    
    if login_response.status_code != 200:
        pytest.skip(f"Login failed: {login_response.status_code}")
    
    return session


class TestAmortizationStatusFix:
    """Test that past EMIs without ledger data show status='paid' not 'missed'"""
    
    def test_get_amortization_schedule_returns_200(self, auth_session):
        """GET /api/loans/{id}/amortization returns 200"""
        response = auth_session.get(f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}/amortization")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Amortization endpoint returns 200")
    
    def test_amortization_has_schedule_and_summary(self, auth_session):
        """Amortization response has schedule and summary fields"""
        response = auth_session.get(f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}/amortization")
        data = response.json()
        
        assert "schedule" in data, "Missing 'schedule' in response"
        assert "summary" in data, "Missing 'summary' in response"
        assert len(data["schedule"]) > 0, "Schedule is empty"
        print(f"PASS: Schedule has {len(data['schedule'])} EMIs, summary present")
    
    def test_past_emis_are_paid_not_missed(self, auth_session):
        """Past EMIs without ledger data should show status='paid' not 'missed'"""
        response = auth_session.get(f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}/amortization")
        data = response.json()
        
        schedule = data.get("schedule", [])
        summary = data.get("summary", {})
        
        # Count missed EMIs
        missed_count = sum(1 for item in schedule if item.get("status") == "missed")
        summary_missed = summary.get("missedEMIs", 0)
        
        # Both should be 0 according to the bug fix
        assert missed_count == 0, f"Expected 0 missed EMIs in schedule, found {missed_count}"
        assert summary_missed == 0, f"Expected missedEMIs=0 in summary, found {summary_missed}"
        
        # Check paid and pending counts add up
        paid_count = sum(1 for item in schedule if item.get("status") == "paid")
        pending_count = sum(1 for item in schedule if item.get("status") == "pending")
        total = len(schedule)
        
        assert paid_count + pending_count == total, f"paid({paid_count}) + pending({pending_count}) != total({total})"
        
        print(f"PASS: missedEMIs=0, schedule has {paid_count} paid, {pending_count} pending")
    
    def test_summary_counts_match_schedule(self, auth_session):
        """Summary counts should match actual schedule statuses"""
        response = auth_session.get(f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}/amortization")
        data = response.json()
        
        schedule = data.get("schedule", [])
        summary = data.get("summary", {})
        
        schedule_paid = sum(1 for item in schedule if item.get("status") == "paid")
        schedule_pending = sum(1 for item in schedule if item.get("status") == "pending")
        
        assert summary.get("paidEMIs") == schedule_paid, f"Summary paidEMIs ({summary.get('paidEMIs')}) != schedule paid ({schedule_paid})"
        assert summary.get("pendingEMIs") == schedule_pending, f"Summary pendingEMIs ({summary.get('pendingEMIs')}) != schedule pending ({schedule_pending})"
        
        print(f"PASS: Summary counts match - paid={schedule_paid}, pending={schedule_pending}")


class TestExtraPaymentModes:
    """Test extra payment with mode=reduce_principal"""
    
    def test_get_loan_initial_state(self, auth_session):
        """Get loan initial state before extra payment"""
        response = auth_session.get(f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert "outstandingAmount" in data, "Missing outstandingAmount"
        assert "emiAmount" in data, "Missing emiAmount"
        assert "tenureMonths" in data, "Missing tenureMonths"
        
        print(f"PASS: Loan has outstanding={data.get('outstandingAmount')}, emi={data.get('emiAmount')}, tenure={data.get('tenureMonths')}")
        return data
    
    def test_extra_payment_reduce_principal_mode(self, auth_session):
        """POST extra payment with mode=reduce_principal keeps EMI and tenure unchanged"""
        # Get initial state
        initial_response = auth_session.get(f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}")
        initial_data = initial_response.json()
        
        initial_outstanding = initial_data.get("outstandingAmount", 0)
        initial_emi = initial_data.get("emiAmount", 0)
        initial_tenure = initial_data.get("tenureMonths", 0)
        
        # Small test payment
        test_amount = 100
        
        response = auth_session.post(
            f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}/extra-payment",
            json={"amount": test_amount, "mode": "reduce_principal"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        result = response.json()
        
        # Verify response structure
        assert result.get("success") == True, "Expected success=True"
        assert "updatedLoan" in result, "Missing updatedLoan in response"
        
        updated = result.get("updatedLoan", {})
        new_outstanding = updated.get("outstandingAmount")
        new_emi = updated.get("emiAmount")
        new_tenure = updated.get("tenureMonths")
        
        # Outstanding should decrease
        assert new_outstanding < initial_outstanding, f"Outstanding should decrease: {new_outstanding} < {initial_outstanding}"
        
        # EMI should remain unchanged for reduce_principal mode
        assert new_emi == initial_emi, f"EMI should stay same for reduce_principal: {new_emi} != {initial_emi}"
        
        # Tenure should remain unchanged for reduce_principal mode
        assert new_tenure == initial_tenure, f"Tenure should stay same for reduce_principal: {new_tenure} != {initial_tenure}"
        
        print(f"PASS: reduce_principal - outstanding reduced from {initial_outstanding} to {new_outstanding}, EMI={new_emi} (unchanged), tenure={new_tenure} (unchanged)")
    
    def test_extra_payment_recorded(self, auth_session):
        """Extra payment should be recorded in loan_extra_payments"""
        response = auth_session.get(f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}/amortization")
        assert response.status_code == 200
        
        data = response.json()
        extra_payments = data.get("extraPayments", [])
        
        # Should have at least one extra payment from previous test
        assert len(extra_payments) > 0, "No extra payments found"
        
        # Check latest payment has mode field
        latest = extra_payments[-1]
        assert "amount" in latest, "Missing amount in extra payment"
        assert "mode" in latest, "Missing mode in extra payment"
        
        print(f"PASS: Found {len(extra_payments)} extra payments recorded")


class TestInvestmentDetailPage:
    """Test investment detail endpoint still works"""
    
    def test_get_investment_detail(self, auth_session):
        """GET /api/investments/{id}/detail returns investment data"""
        response = auth_session.get(f"{BASE_URL}/api/investments/{SBI_FD_ID}/detail")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "investment" in data or "investmentName" in data, "Missing investment data"
        
        print(f"PASS: Investment detail endpoint works")
    
    def test_get_investment_by_id(self, auth_session):
        """GET /api/investments/{id} returns basic investment"""
        response = auth_session.get(f"{BASE_URL}/api/investments/{SBI_FD_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("id") == SBI_FD_ID, "Investment ID mismatch"
        
        print(f"PASS: Investment basic endpoint works - {data.get('investmentName')}")


class TestLoanDetailPage:
    """Test loan detail endpoint still works"""
    
    def test_get_loan_by_id(self, auth_session):
        """GET /api/loans/{id} returns loan data"""
        response = auth_session.get(f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("id") == HDFC_LOAN_ID, "Loan ID mismatch"
        assert data.get("loanName") == "HDFC Home Loan", f"Unexpected loan name: {data.get('loanName')}"
        
        print(f"PASS: Loan detail endpoint works - {data.get('loanName')}")
    
    def test_get_loan_insights(self, auth_session):
        """GET /api/loans/{id}/insights returns insights data"""
        response = auth_session.get(f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}/insights")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "totalInterestPayable" in data, "Missing totalInterestPayable"
        assert "emiToIncomePercent" in data, "Missing emiToIncomePercent"
        
        print(f"PASS: Loan insights endpoint works - interest payable={data.get('totalInterestPayable')}")


class TestLoansList:
    """Test loans list endpoint"""
    
    def test_get_loans_list(self, auth_session):
        """GET /api/loans returns list of loans"""
        response = auth_session.get(f"{BASE_URL}/api/loans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        loans = response.json()
        assert isinstance(loans, list), "Expected list response"
        assert len(loans) > 0, "No loans found"
        
        # Find HDFC loan
        hdfc_loan = next((l for l in loans if l.get("id") == HDFC_LOAN_ID), None)
        assert hdfc_loan is not None, "HDFC Home Loan not found in list"
        
        print(f"PASS: Loans list has {len(loans)} loans, HDFC loan found")


class TestInvestmentsList:
    """Test investments list endpoint"""
    
    def test_get_investments_list(self, auth_session):
        """GET /api/investments returns list of investments"""
        response = auth_session.get(f"{BASE_URL}/api/investments")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        investments = response.json()
        assert isinstance(investments, list), "Expected list response"
        assert len(investments) > 0, "No investments found"
        
        # Find SBI FD
        sbi_fd = next((i for i in investments if i.get("id") == SBI_FD_ID), None)
        assert sbi_fd is not None, "SBI FD not found in list"
        
        print(f"PASS: Investments list has {len(investments)} investments, SBI FD found")
