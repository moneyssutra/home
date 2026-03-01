"""
Test suite for Entity Detail Pages (Credit Card, Insurance, Asset, Income, Expense, Account)
Tests GET /:id/detail endpoints and POST /credit-cards/:id/record-payment endpoint
Iteration 122
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_USER = "test@moneyssutra.com"
TEST_PASS = "test"

# Test IDs - will be discovered dynamically
CC_ID = "89a4093f-018d-4865-a667-6a6cf197c42f"


@pytest.fixture(scope="module")
def session():
    """Get authenticated session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    login_resp = s.post(f"{BASE_URL}/api/auth/login", json={"username": TEST_USER, "password": TEST_PASS})
    if login_resp.status_code != 200:
        pytest.skip("Authentication failed")
    return s


@pytest.fixture(scope="module")
def test_ids(session):
    """Discover IDs for each entity type"""
    ids = {"credit_card": CC_ID}
    
    # Get insurance ID
    resp = session.get(f"{BASE_URL}/api/insurances")
    if resp.status_code == 200 and resp.json():
        ids["insurance"] = resp.json()[0].get("id")
    
    # Get asset ID
    resp = session.get(f"{BASE_URL}/api/assets")
    if resp.status_code == 200 and resp.json():
        ids["asset"] = resp.json()[0].get("id")
    
    # Get account ID
    resp = session.get(f"{BASE_URL}/api/accounts")
    if resp.status_code == 200 and resp.json():
        ids["account"] = resp.json()[0].get("id")
    
    # Get income ID
    resp = session.get(f"{BASE_URL}/api/income")
    if resp.status_code == 200 and resp.json():
        ids["income"] = resp.json()[0].get("id")
    
    # Get expense ID
    resp = session.get(f"{BASE_URL}/api/expenses")
    if resp.status_code == 200 and resp.json():
        ids["expense"] = resp.json()[0].get("id")
    
    return ids


# ============================================================
# CREDIT CARD DETAIL TESTS
# ============================================================

class TestCreditCardDetail:
    """Credit Card detail endpoint tests"""
    
    def test_get_credit_card_detail_returns_200(self, session, test_ids):
        """GET /api/credit-cards/:id/detail returns 200"""
        cc_id = test_ids.get("credit_card")
        if not cc_id:
            pytest.skip("No credit card ID available")
        
        resp = session.get(f"{BASE_URL}/api/credit-cards/{cc_id}/detail")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    
    def test_credit_card_detail_has_utilization(self, session, test_ids):
        """Credit card detail includes utilization metric"""
        cc_id = test_ids.get("credit_card")
        if not cc_id:
            pytest.skip("No credit card ID available")
        
        resp = session.get(f"{BASE_URL}/api/credit-cards/{cc_id}/detail")
        assert resp.status_code == 200
        data = resp.json()
        assert "utilization" in data, "Missing utilization field"
        assert isinstance(data["utilization"], (int, float)), "utilization should be numeric"
    
    def test_credit_card_detail_has_monthly_interest(self, session, test_ids):
        """Credit card detail includes monthlyInterest metric"""
        cc_id = test_ids.get("credit_card")
        if not cc_id:
            pytest.skip("No credit card ID available")
        
        resp = session.get(f"{BASE_URL}/api/credit-cards/{cc_id}/detail")
        assert resp.status_code == 200
        data = resp.json()
        assert "monthlyInterest" in data, "Missing monthlyInterest field"
    
    def test_credit_card_detail_has_months_to_payoff(self, session, test_ids):
        """Credit card detail includes monthsToPayoff metric"""
        cc_id = test_ids.get("credit_card")
        if not cc_id:
            pytest.skip("No credit card ID available")
        
        resp = session.get(f"{BASE_URL}/api/credit-cards/{cc_id}/detail")
        assert resp.status_code == 200
        data = resp.json()
        assert "monthsToPayoff" in data, "Missing monthsToPayoff field"
    
    def test_credit_card_detail_has_available_credit(self, session, test_ids):
        """Credit card detail includes availableCredit"""
        cc_id = test_ids.get("credit_card")
        if not cc_id:
            pytest.skip("No credit card ID available")
        
        resp = session.get(f"{BASE_URL}/api/credit-cards/{cc_id}/detail")
        assert resp.status_code == 200
        data = resp.json()
        assert "availableCredit" in data, "Missing availableCredit field"


class TestCreditCardRecordPayment:
    """Credit Card record-payment endpoint tests"""
    
    def test_record_payment_requires_amount(self, session, test_ids):
        """POST /api/credit-cards/:id/record-payment requires positive amount"""
        cc_id = test_ids.get("credit_card")
        if not cc_id:
            pytest.skip("No credit card ID available")
        
        resp = session.post(f"{BASE_URL}/api/credit-cards/{cc_id}/record-payment", json={"amount": 0})
        assert resp.status_code == 400, "Should reject zero amount"
        
        resp = session.post(f"{BASE_URL}/api/credit-cards/{cc_id}/record-payment", json={"amount": -100})
        assert resp.status_code == 400, "Should reject negative amount"
    
    def test_record_payment_success(self, session, test_ids):
        """POST /api/credit-cards/:id/record-payment records payment and reduces outstanding"""
        cc_id = test_ids.get("credit_card")
        if not cc_id:
            pytest.skip("No credit card ID available")
        
        # Get current outstanding
        detail_before = session.get(f"{BASE_URL}/api/credit-cards/{cc_id}/detail").json()
        outstanding_before = detail_before.get("outstandingAmount", 0)
        
        # Record payment of 100
        payment_amount = 100
        resp = session.post(f"{BASE_URL}/api/credit-cards/{cc_id}/record-payment", json={"amount": payment_amount})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert data.get("success") == True, "Payment should succeed"
        assert "payment" in data, "Response should include payment details"
        assert "newOutstanding" in data, "Response should include newOutstanding"
        
        # Verify outstanding reduced
        expected_outstanding = max(0, outstanding_before - payment_amount)
        assert data["newOutstanding"] == expected_outstanding, f"Outstanding should reduce by payment amount"
        
        # Verify payment appears in history
        detail_after = session.get(f"{BASE_URL}/api/credit-cards/{cc_id}/detail").json()
        payments = detail_after.get("payments", [])
        assert len(payments) > 0, "Should have at least one payment in history"
        assert payments[0].get("amount") == payment_amount, "Latest payment should match amount"


# ============================================================
# INSURANCE DETAIL TESTS
# ============================================================

class TestInsuranceDetail:
    """Insurance detail endpoint tests"""
    
    def test_get_insurance_detail_returns_200(self, session, test_ids):
        """GET /api/insurances/:id/detail returns 200"""
        ins_id = test_ids.get("insurance")
        if not ins_id:
            pytest.skip("No insurance ID available")
        
        resp = session.get(f"{BASE_URL}/api/insurances/{ins_id}/detail")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    
    def test_insurance_detail_has_premium_schedule(self, session, test_ids):
        """Insurance detail includes premium schedule"""
        ins_id = test_ids.get("insurance")
        if not ins_id:
            pytest.skip("No insurance ID available")
        
        resp = session.get(f"{BASE_URL}/api/insurances/{ins_id}/detail")
        assert resp.status_code == 200
        data = resp.json()
        assert "schedule" in data, "Missing schedule field"
        assert isinstance(data["schedule"], list), "schedule should be a list"
    
    def test_insurance_detail_has_summary(self, session, test_ids):
        """Insurance detail includes summary with premium counts"""
        ins_id = test_ids.get("insurance")
        if not ins_id:
            pytest.skip("No insurance ID available")
        
        resp = session.get(f"{BASE_URL}/api/insurances/{ins_id}/detail")
        assert resp.status_code == 200
        data = resp.json()
        assert "summary" in data, "Missing summary field"
        summary = data["summary"]
        assert "totalPremiumsPaid" in summary, "Missing totalPremiumsPaid in summary"
        assert "totalPremiumsUpcoming" in summary, "Missing totalPremiumsUpcoming in summary"
        assert "totalAmountPaid" in summary, "Missing totalAmountPaid in summary"


# ============================================================
# ASSET DETAIL TESTS
# ============================================================

class TestAssetDetail:
    """Asset detail endpoint tests"""
    
    def test_get_asset_detail_returns_200(self, session, test_ids):
        """GET /api/assets/:id/detail returns 200"""
        asset_id = test_ids.get("asset")
        if not asset_id:
            pytest.skip("No asset ID available")
        
        resp = session.get(f"{BASE_URL}/api/assets/{asset_id}/detail")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    
    def test_asset_detail_has_appreciation_metrics(self, session, test_ids):
        """Asset detail includes appreciation metrics"""
        asset_id = test_ids.get("asset")
        if not asset_id:
            pytest.skip("No asset ID available")
        
        resp = session.get(f"{BASE_URL}/api/assets/{asset_id}/detail")
        assert resp.status_code == 200
        data = resp.json()
        assert "metrics" in data, "Missing metrics field"
        metrics = data["metrics"]
        assert "appreciation" in metrics, "Missing appreciation in metrics"
        assert "appreciationPct" in metrics, "Missing appreciationPct in metrics"
    
    def test_asset_detail_has_cagr(self, session, test_ids):
        """Asset detail includes CAGR calculation"""
        asset_id = test_ids.get("asset")
        if not asset_id:
            pytest.skip("No asset ID available")
        
        resp = session.get(f"{BASE_URL}/api/assets/{asset_id}/detail")
        assert resp.status_code == 200
        data = resp.json()
        metrics = data.get("metrics", {})
        assert "cagr" in metrics, "Missing cagr in metrics"
        assert "yearsHeld" in metrics, "Missing yearsHeld in metrics"
        assert "netEquity" in metrics, "Missing netEquity in metrics"


# ============================================================
# INCOME DETAIL TESTS
# ============================================================

class TestIncomeDetail:
    """Income detail endpoint tests"""
    
    def test_get_income_detail_returns_200(self, session, test_ids):
        """GET /api/income/:id/detail returns 200"""
        income_id = test_ids.get("income")
        if not income_id:
            pytest.skip("No income ID available")
        
        resp = session.get(f"{BASE_URL}/api/income/{income_id}/detail")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    
    def test_income_detail_has_schedule(self, session, test_ids):
        """Income detail includes receipt schedule"""
        income_id = test_ids.get("income")
        if not income_id:
            pytest.skip("No income ID available")
        
        resp = session.get(f"{BASE_URL}/api/income/{income_id}/detail")
        assert resp.status_code == 200
        data = resp.json()
        assert "schedule" in data, "Missing schedule field"
        assert isinstance(data["schedule"], list), "schedule should be a list"
    
    def test_income_detail_has_transactions(self, session, test_ids):
        """Income detail includes transaction history"""
        income_id = test_ids.get("income")
        if not income_id:
            pytest.skip("No income ID available")
        
        resp = session.get(f"{BASE_URL}/api/income/{income_id}/detail")
        assert resp.status_code == 200
        data = resp.json()
        assert "transactions" in data, "Missing transactions field"
        assert isinstance(data["transactions"], list), "transactions should be a list"
    
    def test_income_detail_has_summary(self, session, test_ids):
        """Income detail includes summary"""
        income_id = test_ids.get("income")
        if not income_id:
            pytest.skip("No income ID available")
        
        resp = session.get(f"{BASE_URL}/api/income/{income_id}/detail")
        assert resp.status_code == 200
        data = resp.json()
        assert "summary" in data, "Missing summary field"
        summary = data["summary"]
        assert "totalReceived" in summary, "Missing totalReceived in summary"
        assert "receivedCount" in summary, "Missing receivedCount in summary"


# ============================================================
# EXPENSE DETAIL TESTS
# ============================================================

class TestExpenseDetail:
    """Expense detail endpoint tests"""
    
    def test_get_expense_detail_returns_200(self, session, test_ids):
        """GET /api/expenses/:id/detail returns 200"""
        expense_id = test_ids.get("expense")
        if not expense_id:
            pytest.skip("No expense ID available")
        
        resp = session.get(f"{BASE_URL}/api/expenses/{expense_id}/detail")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    
    def test_expense_detail_has_monthly_equivalent(self, session, test_ids):
        """Expense detail includes monthlyEquivalent metric"""
        expense_id = test_ids.get("expense")
        if not expense_id:
            pytest.skip("No expense ID available")
        
        resp = session.get(f"{BASE_URL}/api/expenses/{expense_id}/detail")
        assert resp.status_code == 200
        data = resp.json()
        assert "metrics" in data, "Missing metrics field"
        metrics = data["metrics"]
        assert "monthlyEquivalent" in metrics, "Missing monthlyEquivalent in metrics"
    
    def test_expense_detail_has_expense_to_income_percent(self, session, test_ids):
        """Expense detail includes expenseToIncomePercent metric"""
        expense_id = test_ids.get("expense")
        if not expense_id:
            pytest.skip("No expense ID available")
        
        resp = session.get(f"{BASE_URL}/api/expenses/{expense_id}/detail")
        assert resp.status_code == 200
        data = resp.json()
        metrics = data.get("metrics", {})
        assert "expenseToIncomePercent" in metrics, "Missing expenseToIncomePercent in metrics"


# ============================================================
# ACCOUNT DETAIL TESTS
# ============================================================

class TestAccountDetail:
    """Account detail endpoint tests"""
    
    def test_get_account_detail_returns_200(self, session, test_ids):
        """GET /api/accounts/:id/detail returns 200"""
        account_id = test_ids.get("account")
        if not account_id:
            pytest.skip("No account ID available")
        
        resp = session.get(f"{BASE_URL}/api/accounts/{account_id}/detail")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    
    def test_account_detail_has_balance_metrics(self, session, test_ids):
        """Account detail includes balance change metrics"""
        account_id = test_ids.get("account")
        if not account_id:
            pytest.skip("No account ID available")
        
        resp = session.get(f"{BASE_URL}/api/accounts/{account_id}/detail")
        assert resp.status_code == 200
        data = resp.json()
        assert "metrics" in data, "Missing metrics field"
        metrics = data["metrics"]
        assert "balanceChange" in metrics, "Missing balanceChange in metrics"
        assert "balanceChangePct" in metrics, "Missing balanceChangePct in metrics"
    
    def test_account_detail_has_monthly_flow(self, session, test_ids):
        """Account detail includes monthly flow metrics"""
        account_id = test_ids.get("account")
        if not account_id:
            pytest.skip("No account ID available")
        
        resp = session.get(f"{BASE_URL}/api/accounts/{account_id}/detail")
        assert resp.status_code == 200
        data = resp.json()
        metrics = data.get("metrics", {})
        assert "totalMonthlyInflow" in metrics, "Missing totalMonthlyInflow in metrics"
        assert "totalMonthlyOutflow" in metrics, "Missing totalMonthlyOutflow in metrics"
        assert "netMonthlyFlow" in metrics, "Missing netMonthlyFlow in metrics"
    
    def test_account_detail_has_linked_entities(self, session, test_ids):
        """Account detail includes linked entities arrays"""
        account_id = test_ids.get("account")
        if not account_id:
            pytest.skip("No account ID available")
        
        resp = session.get(f"{BASE_URL}/api/accounts/{account_id}/detail")
        assert resp.status_code == 200
        data = resp.json()
        # These should exist even if empty
        assert "linkedLoans" in data, "Missing linkedLoans field"
        assert "linkedInvestments" in data, "Missing linkedInvestments field"
        assert "linkedExpenses" in data, "Missing linkedExpenses field"
        assert "linkedIncome" in data, "Missing linkedIncome field"


# ============================================================
# LIST ENDPOINTS FOR ID DISCOVERY
# ============================================================

class TestListEndpoints:
    """Test that list endpoints return data for ID discovery"""
    
    def test_get_credit_cards_list(self, session):
        """GET /api/credit-cards returns list"""
        resp = session.get(f"{BASE_URL}/api/credit-cards")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
    
    def test_get_insurances_list(self, session):
        """GET /api/insurances returns list"""
        resp = session.get(f"{BASE_URL}/api/insurances")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
    
    def test_get_assets_list(self, session):
        """GET /api/assets returns list"""
        resp = session.get(f"{BASE_URL}/api/assets")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
    
    def test_get_income_list(self, session):
        """GET /api/income returns list"""
        resp = session.get(f"{BASE_URL}/api/income")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
    
    def test_get_expenses_list(self, session):
        """GET /api/expenses returns list"""
        resp = session.get(f"{BASE_URL}/api/expenses")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
    
    def test_get_accounts_list(self, session):
        """GET /api/accounts returns list"""
        resp = session.get(f"{BASE_URL}/api/accounts")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
