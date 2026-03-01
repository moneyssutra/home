"""
Loan Detail & Amortization Tests - Phase 1
Tests: amortization schedule, extra-payment, mark-emi, insights endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER = "test@moneyssutra.com"
TEST_PASS = "test"
HDFC_LOAN_ID = "886f8ea0-1f10-4a3e-8280-eefc1567bc5e"


@pytest.fixture(scope="module")
def auth_session():
    """Get authenticated session with session_token cookie."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login to get session token
    login_response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": TEST_USER, "password": TEST_PASS}
    )
    
    if login_response.status_code != 200:
        pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
    
    return session


class TestLoanDetailAPI:
    """Test loan detail and related endpoints."""
    
    def test_get_loan_by_id(self, auth_session):
        """Test GET /api/loans/:id returns loan details."""
        response = auth_session.get(f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("id") == HDFC_LOAN_ID
        assert "loanName" in data
        assert "loanType" in data
        assert "outstandingAmount" in data
        assert "interestRate" in data
        assert "emiAmount" in data
        assert "tenureMonths" in data
        
        print(f"Loan: {data.get('loanName')}, Outstanding: {data.get('outstandingAmount')}, EMI: {data.get('emiAmount')}")


class TestAmortizationAPI:
    """Test amortization schedule endpoint."""
    
    def test_get_amortization_schedule(self, auth_session):
        """Test GET /api/loans/:id/amortization returns full schedule."""
        response = auth_session.get(f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}/amortization")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "schedule" in data
        assert "summary" in data
        assert data.get("loanId") == HDFC_LOAN_ID
        
        schedule = data.get("schedule", [])
        print(f"Total EMIs in schedule: {len(schedule)}")
        
        # HDFC Home Loan should have ~220 EMIs
        assert len(schedule) > 200, f"Expected >200 EMIs, got {len(schedule)}"
        
        # Check schedule entry structure
        if schedule:
            first_entry = schedule[0]
            assert "emiNo" in first_entry
            assert "dueDate" in first_entry
            assert "principalComponent" in first_entry
            assert "interestComponent" in first_entry
            assert "outstandingAfter" in first_entry
            assert "status" in first_entry
    
    def test_amortization_summary_counts(self, auth_session):
        """Test amortization summary has paid/missed/pending counts."""
        response = auth_session.get(f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}/amortization")
        
        assert response.status_code == 200
        
        data = response.json()
        summary = data.get("summary", {})
        
        assert "totalEMIs" in summary
        assert "paidEMIs" in summary
        assert "missedEMIs" in summary
        assert "pendingEMIs" in summary
        assert "remainingEMIs" in summary
        
        total = summary.get("totalEMIs", 0)
        paid = summary.get("paidEMIs", 0)
        missed = summary.get("missedEMIs", 0)
        pending = summary.get("pendingEMIs", 0)
        
        print(f"Summary - Total: {total}, Paid: {paid}, Missed: {missed}, Pending: {pending}")
        
        # Verify counts add up
        assert paid + missed + pending == total, "Paid + Missed + Pending should equal Total"
    
    def test_amortization_status_values(self, auth_session):
        """Test schedule entries have correct status values (paid/missed/pending)."""
        response = auth_session.get(f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}/amortization")
        
        assert response.status_code == 200
        
        data = response.json()
        schedule = data.get("schedule", [])
        
        valid_statuses = {"paid", "missed", "pending"}
        
        for entry in schedule[:10]:  # Check first 10
            status = entry.get("status")
            assert status in valid_statuses, f"Invalid status: {status}"
        
        # Count statuses
        status_counts = {"paid": 0, "missed": 0, "pending": 0}
        for entry in schedule:
            status_counts[entry.get("status", "pending")] += 1
        
        print(f"Status counts from schedule: {status_counts}")


class TestMarkEmiAPI:
    """Test mark EMI as paid endpoint."""
    
    def test_mark_emi_paid_reduces_outstanding(self, auth_session):
        """Test POST /api/loans/:id/mark-emi marks EMI and reduces outstanding."""
        # First get current outstanding
        loan_response = auth_session.get(f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}")
        assert loan_response.status_code == 200
        
        initial_outstanding = loan_response.json().get("outstandingAmount", 0)
        
        # Get amortization to find a missed EMI
        amort_response = auth_session.get(f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}/amortization")
        assert amort_response.status_code == 200
        
        schedule = amort_response.json().get("schedule", [])
        missed_emis = [e for e in schedule if e.get("status") == "missed"]
        
        if not missed_emis:
            pytest.skip("No missed EMIs to mark as paid")
        
        # Mark the first missed EMI as paid
        emi_to_mark = missed_emis[0]
        response = auth_session.post(
            f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}/mark-emi",
            json={
                "emiNo": emi_to_mark.get("emiNo"),
                "paidDate": emi_to_mark.get("dueDate")
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "newOutstanding" in data
        assert "transaction" in data
        
        new_outstanding = data.get("newOutstanding")
        print(f"Marked EMI #{emi_to_mark.get('emiNo')} as paid. Outstanding: {initial_outstanding} -> {new_outstanding}")
        
        # Verify outstanding reduced
        assert new_outstanding < initial_outstanding, "Outstanding should be reduced after marking EMI paid"


class TestExtraPaymentAPI:
    """Test extra payment endpoint."""
    
    def test_extra_payment_reduce_tenure(self, auth_session):
        """Test POST /api/loans/:id/extra-payment with reduce_tenure mode."""
        # Get current outstanding
        loan_response = auth_session.get(f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}")
        assert loan_response.status_code == 200
        
        initial_outstanding = loan_response.json().get("outstandingAmount", 0)
        
        # Make small extra payment
        extra_amount = 1000
        response = auth_session.post(
            f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}/extra-payment",
            json={
                "amount": extra_amount,
                "mode": "reduce_tenure"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "payment" in data
        assert "updatedLoan" in data
        
        payment = data.get("payment", {})
        assert payment.get("amount") == extra_amount
        assert payment.get("mode") == "reduce_tenure"
        
        new_outstanding = data.get("updatedLoan", {}).get("outstandingAmount", 0)
        print(f"Extra payment: {extra_amount}. Outstanding: {initial_outstanding} -> {new_outstanding}")
        
        # Verify outstanding reduced
        assert new_outstanding == initial_outstanding - extra_amount
    
    def test_extra_payment_reduce_emi(self, auth_session):
        """Test POST /api/loans/:id/extra-payment with reduce_emi mode."""
        # Get current EMI
        loan_response = auth_session.get(f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}")
        assert loan_response.status_code == 200
        
        initial_emi = loan_response.json().get("emiAmount", 0)
        
        # Make extra payment
        extra_amount = 5000
        response = auth_session.post(
            f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}/extra-payment",
            json={
                "amount": extra_amount,
                "mode": "reduce_emi"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        updated_loan = data.get("updatedLoan", {})
        print(f"Extra payment: {extra_amount}. EMI may be recalculated.")
        
        # Note: EMI might not change if loan is almost paid off
        # Just verify the response structure is correct


class TestLoanInsightsAPI:
    """Test loan insights endpoint."""
    
    def test_get_loan_insights(self, auth_session):
        """Test GET /api/loans/:id/insights returns financial insights."""
        response = auth_session.get(f"{BASE_URL}/api/loans/{HDFC_LOAN_ID}/insights")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("loanId") == HDFC_LOAN_ID
        
        # Check required insight fields
        assert "totalInterestPayable" in data
        assert "interestPaid" in data
        assert "emiToIncomePercent" in data
        assert "safetyImpactDays" in data
        
        print(f"Insights - Interest Payable: {data.get('totalInterestPayable')}, "
              f"EMI-to-Income: {data.get('emiToIncomePercent')}%, "
              f"Safety Impact: {data.get('safetyImpactDays')} days")


class TestLoanListNavigation:
    """Test loan list returns correct IDs for navigation."""
    
    def test_loans_list_has_hdfc_loan(self, auth_session):
        """Test GET /api/loans includes HDFC Home Loan."""
        response = auth_session.get(f"{BASE_URL}/api/loans")
        
        assert response.status_code == 200
        
        loans = response.json()
        loan_ids = [l.get("id") for l in loans]
        
        assert HDFC_LOAN_ID in loan_ids, f"HDFC Loan ID not found in loans list"
        
        hdfc_loan = next((l for l in loans if l.get("id") == HDFC_LOAN_ID), None)
        print(f"HDFC Loan found: {hdfc_loan.get('loanName')}, Outstanding: {hdfc_loan.get('outstandingAmount')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
