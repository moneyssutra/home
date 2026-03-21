"""
Test Family Member Data Isolation - Iteration 167
Tests that all backend endpoints accept ?memberId= parameter and return filtered data.
Covers: dashboard/networth, bank-overview, cc-overview, expenses endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def session():
    """Create a requests session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

@pytest.fixture(scope="module")
def auth_session(session):
    """Get authenticated session - try demo user first, then register new user"""
    # Try demo user
    login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
        "username": "demo@test.com",
        "password": "Demo@1234"
    })
    if login_resp.status_code == 200:
        return session
    
    # Try registering a new test user
    test_email = f"test_iter167_{uuid.uuid4().hex[:8]}@test.com"
    reg_resp = session.post(f"{BASE_URL}/api/auth/register", json={
        "name": "Test User 167",
        "username": test_email,
        "email": test_email,
        "password": "TestPass1@"
    })
    if reg_resp.status_code in [200, 201]:
        # Login with new user
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "username": test_email,
            "password": "TestPass1@"
        })
        if login_resp.status_code == 200:
            return session
    
    pytest.skip("Could not authenticate - skipping tests")

@pytest.fixture(scope="module")
def family_member_id(auth_session):
    """Get a family member ID if available, or return None"""
    resp = auth_session.get(f"{BASE_URL}/api/family")
    if resp.status_code == 200:
        data = resp.json()
        family = data.get("family") or data
        members = family.get("members", [])
        # Find a non-owner member
        for m in members:
            if m.get("role") != "owner":
                return m.get("id")
    return None


class TestDashboardNetworthMemberId:
    """Test /api/dashboard/networth accepts memberId parameter"""
    
    def test_networth_without_memberid(self, auth_session):
        """Test networth endpoint returns data without memberId"""
        resp = auth_session.get(f"{BASE_URL}/api/dashboard/networth?tz_offset=0")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        # Verify response structure
        assert "netWorth" in data
        assert "totalAssets" in data
        assert "totalInvestments" in data
        assert "totalLiabilities" in data
        assert "liquidBalance" in data
        assert "incomeReceived" in data
        assert "expectedIncome" in data
        assert "expensesDone" in data
        assert "upcomingExpenses" in data
        # Verify counts are present
        assert "assetCount" in data
        assert "investmentCount" in data
        assert "accountCount" in data
        assert "loanCount" in data
        assert "creditCardCount" in data
        assert "incomeCount" in data
        assert "expenseCount" in data
        print(f"PASS: /api/dashboard/networth returns proper structure with counts")
    
    def test_networth_with_memberid(self, auth_session, family_member_id):
        """Test networth endpoint accepts memberId parameter"""
        if not family_member_id:
            pytest.skip("No family member available for testing")
        
        resp = auth_session.get(f"{BASE_URL}/api/dashboard/networth?tz_offset=0&memberId={family_member_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        # Verify response structure is same
        assert "netWorth" in data
        assert "assetCount" in data
        assert "investmentCount" in data
        print(f"PASS: /api/dashboard/networth accepts memberId={family_member_id}")
    
    def test_networth_with_invalid_memberid(self, auth_session):
        """Test networth endpoint with invalid memberId returns empty/zero data"""
        fake_id = "nonexistent-member-id-12345"
        resp = auth_session.get(f"{BASE_URL}/api/dashboard/networth?tz_offset=0&memberId={fake_id}")
        # Should return 200 with zero/empty data (not 404)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        # With invalid member, should return zeros
        assert data.get("assetCount", 0) == 0
        assert data.get("investmentCount", 0) == 0
        print(f"PASS: /api/dashboard/networth with invalid memberId returns zero counts")


class TestBankOverviewMemberId:
    """Test /api/bank-overview accepts memberId parameter"""
    
    def test_bank_overview_without_memberid(self, auth_session):
        """Test bank-overview endpoint returns data without memberId"""
        resp = auth_session.get(f"{BASE_URL}/api/bank-overview")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        # Verify response structure
        assert "accounts" in data
        assert "transactions" in data
        assert "recurring" in data
        assert "cashflow" in data
        print(f"PASS: /api/bank-overview returns proper structure")
    
    def test_bank_overview_with_memberid(self, auth_session, family_member_id):
        """Test bank-overview endpoint accepts memberId parameter"""
        if not family_member_id:
            pytest.skip("No family member available for testing")
        
        resp = auth_session.get(f"{BASE_URL}/api/bank-overview?memberId={family_member_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "accounts" in data
        print(f"PASS: /api/bank-overview accepts memberId={family_member_id}")


class TestCCOverviewMemberId:
    """Test /api/cc-overview accepts memberId parameter"""
    
    def test_cc_overview_without_memberid(self, auth_session):
        """Test cc-overview endpoint returns data without memberId"""
        resp = auth_session.get(f"{BASE_URL}/api/cc-overview")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        # Verify response structure
        assert "cards" in data
        assert "payments" in data
        assert "summary" in data
        print(f"PASS: /api/cc-overview returns proper structure")
    
    def test_cc_overview_with_memberid(self, auth_session, family_member_id):
        """Test cc-overview endpoint accepts memberId parameter"""
        if not family_member_id:
            pytest.skip("No family member available for testing")
        
        resp = auth_session.get(f"{BASE_URL}/api/cc-overview?memberId={family_member_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "cards" in data
        print(f"PASS: /api/cc-overview accepts memberId={family_member_id}")


class TestExpensesMemberId:
    """Test expense endpoints accept memberId parameter"""
    
    def test_expenses_with_next_date_without_memberid(self, auth_session):
        """Test expenses/with-next-date endpoint"""
        resp = auth_session.get(f"{BASE_URL}/api/expenses/with-next-date")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: /api/expenses/with-next-date returns list")
    
    def test_expenses_with_next_date_with_memberid(self, auth_session, family_member_id):
        """Test expenses/with-next-date accepts memberId"""
        if not family_member_id:
            pytest.skip("No family member available for testing")
        
        resp = auth_session.get(f"{BASE_URL}/api/expenses/with-next-date?memberId={family_member_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print(f"PASS: /api/expenses/with-next-date accepts memberId")
    
    def test_expenses_weekly_summary_without_memberid(self, auth_session):
        """Test expenses/weekly-summary endpoint"""
        resp = auth_session.get(f"{BASE_URL}/api/expenses/weekly-summary")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "weeks" in data
        print(f"PASS: /api/expenses/weekly-summary returns proper structure")
    
    def test_expenses_weekly_summary_with_memberid(self, auth_session, family_member_id):
        """Test expenses/weekly-summary accepts memberId"""
        if not family_member_id:
            pytest.skip("No family member available for testing")
        
        resp = auth_session.get(f"{BASE_URL}/api/expenses/weekly-summary?memberId={family_member_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print(f"PASS: /api/expenses/weekly-summary accepts memberId")
    
    def test_expenses_behavior_insights_without_memberid(self, auth_session):
        """Test expenses/behavior-insights endpoint"""
        resp = auth_session.get(f"{BASE_URL}/api/expenses/behavior-insights")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "insights" in data
        assert "patternData" in data
        print(f"PASS: /api/expenses/behavior-insights returns proper structure")
    
    def test_expenses_behavior_insights_with_memberid(self, auth_session, family_member_id):
        """Test expenses/behavior-insights accepts memberId"""
        if not family_member_id:
            pytest.skip("No family member available for testing")
        
        resp = auth_session.get(f"{BASE_URL}/api/expenses/behavior-insights?memberId={family_member_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print(f"PASS: /api/expenses/behavior-insights accepts memberId")
    
    def test_expenses_by_month_with_memberid(self, auth_session, family_member_id):
        """Test expenses/by-month accepts memberId"""
        if not family_member_id:
            pytest.skip("No family member available for testing")
        
        resp = auth_session.get(f"{BASE_URL}/api/expenses/by-month?memberId={family_member_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print(f"PASS: /api/expenses/by-month accepts memberId")
    
    def test_expenses_monthly_summary_with_memberid(self, auth_session, family_member_id):
        """Test expenses/monthly-summary accepts memberId"""
        if not family_member_id:
            pytest.skip("No family member available for testing")
        
        resp = auth_session.get(f"{BASE_URL}/api/expenses/monthly-summary?memberId={family_member_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print(f"PASS: /api/expenses/monthly-summary accepts memberId")


class TestAccountsMemberId:
    """Test /api/accounts accepts memberId parameter"""
    
    def test_accounts_without_memberid(self, auth_session):
        """Test accounts endpoint returns data without memberId"""
        resp = auth_session.get(f"{BASE_URL}/api/accounts")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: /api/accounts returns list")
    
    def test_accounts_with_memberid(self, auth_session, family_member_id):
        """Test accounts endpoint accepts memberId parameter"""
        if not family_member_id:
            pytest.skip("No family member available for testing")
        
        resp = auth_session.get(f"{BASE_URL}/api/accounts?memberId={family_member_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print(f"PASS: /api/accounts accepts memberId={family_member_id}")


class TestCreditCardsMemberId:
    """Test /api/credit-cards accepts memberId parameter"""
    
    def test_credit_cards_without_memberid(self, auth_session):
        """Test credit-cards endpoint returns data without memberId"""
        resp = auth_session.get(f"{BASE_URL}/api/credit-cards")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: /api/credit-cards returns list")
    
    def test_credit_cards_with_memberid(self, auth_session, family_member_id):
        """Test credit-cards endpoint accepts memberId parameter"""
        if not family_member_id:
            pytest.skip("No family member available for testing")
        
        resp = auth_session.get(f"{BASE_URL}/api/credit-cards?memberId={family_member_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print(f"PASS: /api/credit-cards accepts memberId={family_member_id}")


class TestDashboardBreakdownMemberId:
    """Test /api/dashboard/breakdown accepts memberId parameter"""
    
    def test_breakdown_without_memberid(self, auth_session):
        """Test breakdown endpoint returns data without memberId"""
        resp = auth_session.get(f"{BASE_URL}/api/dashboard/breakdown")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "assetBreakdown" in data
        assert "investmentBreakdown" in data
        assert "loanBreakdown" in data
        print(f"PASS: /api/dashboard/breakdown returns proper structure")
    
    def test_breakdown_with_memberid(self, auth_session, family_member_id):
        """Test breakdown endpoint accepts memberId parameter"""
        if not family_member_id:
            pytest.skip("No family member available for testing")
        
        resp = auth_session.get(f"{BASE_URL}/api/dashboard/breakdown?memberId={family_member_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print(f"PASS: /api/dashboard/breakdown accepts memberId={family_member_id}")


class TestDashboardCombinedMemberId:
    """Test /api/dashboard/combined endpoint"""
    
    def test_combined_without_memberid(self, auth_session):
        """Test combined endpoint returns data without memberId"""
        resp = auth_session.get(f"{BASE_URL}/api/dashboard/combined?tz_offset=0")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "networth" in data
        assert "profile" in data or "completion" in data
        print(f"PASS: /api/dashboard/combined returns proper structure")


class TestFamilyMemberSummary:
    """Test /api/family/member/{id}/summary endpoint"""
    
    def test_member_summary(self, auth_session, family_member_id):
        """Test member summary endpoint"""
        if not family_member_id:
            pytest.skip("No family member available for testing")
        
        resp = auth_session.get(f"{BASE_URL}/api/family/member/{family_member_id}/summary")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "member" in data or "summary" in data
        print(f"PASS: /api/family/member/{family_member_id}/summary returns data")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
