"""
Investment Detail + Ledger API Tests (Phase 2)
Tests: GET /api/investments/:id/detail, POST /api/investments/:id/add-contribution
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test investment IDs from seed data
SBI_FD_ID = "c269922d-630f-429f-b025-2b8462ab8190"  # Lumpsum FD investment
HDFC_RD_ID = "7ee7ae10-dd7b-4b7f-8e99-d984aa32f147"  # SIP RD Monthly investment
RELIANCE_STOCK_ID = "949c9438-ff3d-4684-817c-8cf8ac996818"  # Lumpsum Stock


@pytest.fixture(scope="session")
def session():
    """Login and return authenticated session"""
    s = requests.Session()
    login_resp = s.post(f"{BASE_URL}/api/auth/login", json={
        "username": "test@moneyssutra.com",
        "password": "test"
    })
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    return s


class TestInvestmentsList:
    """Verify investments list still works"""
    
    def test_get_investments_list(self, session):
        """GET /api/investments returns list of investments"""
        resp = session.get(f"{BASE_URL}/api/investments")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"Found {len(data)} investments")
    
    def test_investments_list_has_test_investments(self, session):
        """All 3 test investments exist in list"""
        resp = session.get(f"{BASE_URL}/api/investments")
        data = resp.json()
        ids = [inv['id'] for inv in data]
        assert SBI_FD_ID in ids, "SBI FD not found"
        assert HDFC_RD_ID in ids, "HDFC RD not found"
        assert RELIANCE_STOCK_ID in ids, "Reliance Stock not found"


class TestInvestmentDetail:
    """Tests for GET /api/investments/:id/detail endpoint"""
    
    def test_get_fd_lumpsum_detail(self, session):
        """SBI FD (lumpsum) returns correct detail structure"""
        resp = session.get(f"{BASE_URL}/api/investments/{SBI_FD_ID}/detail")
        assert resp.status_code == 200
        data = resp.json()
        
        # Basic fields
        assert data['id'] == SBI_FD_ID
        assert data['name'] == "SBI FD 3yr"
        assert data['category'] == "Fixed Deposit (FD)"
        assert data['principal'] > 0
        assert data['currentValue'] > 0
        assert data['expectedReturn'] > 0
        
        # Metrics
        assert 'metrics' in data
        m = data['metrics']
        assert 'gainLoss' in m
        assert 'gainLossPct' in m
        assert 'cagr' in m
        assert 'daysHeld' in m
        assert 'yearsHeld' in m
        assert 'performanceTag' in m
        assert m['performanceTag'] in ['Outperforming', 'On Track', 'Underperforming', 'N/A']
        print(f"SBI FD CAGR: {m['cagr']}%, Tag: {m['performanceTag']}")
    
    def test_get_sip_investment_detail(self, session):
        """HDFC RD (SIP) returns SIP amount and frequency"""
        resp = session.get(f"{BASE_URL}/api/investments/{HDFC_RD_ID}/detail")
        assert resp.status_code == 200
        data = resp.json()
        
        assert data['name'] == "HDFC RD Monthly"
        assert data['sipAmount'] is not None and data['sipAmount'] > 0
        assert data['frequency'] == "Monthly"
        print(f"HDFC RD SIP: ₹{data['sipAmount']}/month")
    
    def test_projections_exist(self, session):
        """Detail returns projections for 1yr, 3yr, 5yr, 10yr, 15yr, 20yr"""
        resp = session.get(f"{BASE_URL}/api/investments/{SBI_FD_ID}/detail")
        data = resp.json()
        
        assert 'projections' in data
        proj = data['projections']
        expected_periods = ['1yr', '3yr', '5yr', '10yr', '15yr', '20yr']
        for period in expected_periods:
            assert period in proj, f"Missing projection for {period}"
            assert proj[period] > 0
        print(f"Projections: {proj}")
    
    def test_ledger_lumpsum_single_entry(self, session):
        """Lumpsum investment has ledger entries"""
        resp = session.get(f"{BASE_URL}/api/investments/{RELIANCE_STOCK_ID}/detail")
        data = resp.json()
        
        assert 'ledger' in data
        ledger = data['ledger']
        assert data['totalLedgerEntries'] >= 1
        
        # Check first entry structure - could be lumpsum or contribution
        entry = ledger[0]
        assert 'date' in entry or 'transactionDate' in entry
        assert 'contribution' in entry or 'amount' in entry
        print(f"Reliance Stock ledger entries: {data['totalLedgerEntries']}")
    
    def test_ledger_sip_multiple_entries(self, session):
        """SIP investment has multiple ledger entries"""
        resp = session.get(f"{BASE_URL}/api/investments/{HDFC_RD_ID}/detail")
        data = resp.json()
        
        ledger = data['ledger']
        total_entries = data['totalLedgerEntries']
        assert total_entries > 1, "SIP should have multiple ledger entries"
        
        # Check SIP entries have correct structure
        for entry in ledger[:3]:
            assert entry.get('type') == 'sip'
            assert 'contribution' in entry
            assert entry['contribution'] > 0
        print(f"HDFC RD SIP ledger entries: {total_entries}")
    
    def test_performance_tag_values(self, session):
        """Performance tag has valid values based on CAGR vs expected"""
        resp = session.get(f"{BASE_URL}/api/investments/{RELIANCE_STOCK_ID}/detail")
        data = resp.json()
        
        tag = data['metrics']['performanceTag']
        cagr = data['metrics']['cagr']
        expected = data['expectedReturn']
        
        # Validate performance tag logic
        if tag == 'Outperforming':
            assert cagr >= expected + 2, f"Outperforming but CAGR {cagr}% < expected {expected}% + 2"
        elif tag == 'On Track':
            assert expected - 2 <= cagr <= expected + 2, f"On Track but CAGR {cagr}% not within +-2% of {expected}%"
        elif tag == 'Underperforming':
            assert cagr < expected - 2, f"Underperforming but CAGR {cagr}% >= expected {expected}% - 2"
        
        print(f"Reliance: CAGR={cagr}%, Expected={expected}%, Tag={tag}")
    
    def test_404_for_nonexistent_investment(self, session):
        """Detail returns 404 for invalid investment ID"""
        resp = session.get(f"{BASE_URL}/api/investments/nonexistent-id-123/detail")
        assert resp.status_code == 404


class TestAddContribution:
    """Tests for POST /api/investments/:id/add-contribution"""
    
    def test_add_contribution_success(self, session):
        """Add contribution increases principal and currentValue"""
        # Get current values
        before_resp = session.get(f"{BASE_URL}/api/investments/{SBI_FD_ID}/detail")
        before = before_resp.json()
        original_principal = before['principal']
        original_value = before['currentValue']
        
        # Add contribution
        amount = 1000
        resp = session.post(
            f"{BASE_URL}/api/investments/{SBI_FD_ID}/add-contribution",
            json={"amount": amount}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert data['success'] == True
        assert 'transaction' in data
        assert data['transaction']['amount'] == amount
        assert data['transaction']['investmentName'] == "SBI FD 3yr"
        assert data['transaction']['principalAfter'] == original_principal + amount
        
        # Verify updated values
        assert data['updatedInvestment']['principal'] == original_principal + amount
        assert data['updatedInvestment']['currentValue'] == original_value + amount
        print(f"Added ₹{amount} contribution, new principal: ₹{data['updatedInvestment']['principal']}")
    
    def test_add_contribution_creates_transaction(self, session):
        """Contribution creates transaction record in ledger"""
        amount = 500
        resp = session.post(
            f"{BASE_URL}/api/investments/{SBI_FD_ID}/add-contribution",
            json={"amount": amount}
        )
        data = resp.json()
        
        txn = data['transaction']
        assert txn['type'] == 'contribution'
        assert 'transactionDate' in txn
        assert 'createdAt' in txn
        assert txn['principalBefore'] < txn['principalAfter']
    
    def test_add_contribution_invalid_amount(self, session):
        """Contribution with zero/negative amount fails"""
        resp = session.post(
            f"{BASE_URL}/api/investments/{SBI_FD_ID}/add-contribution",
            json={"amount": 0}
        )
        assert resp.status_code == 400
        
        resp2 = session.post(
            f"{BASE_URL}/api/investments/{SBI_FD_ID}/add-contribution",
            json={"amount": -100}
        )
        assert resp2.status_code == 400
    
    def test_add_contribution_nonexistent_investment(self, session):
        """Contribution to nonexistent investment fails"""
        resp = session.post(
            f"{BASE_URL}/api/investments/fake-investment-id/add-contribution",
            json={"amount": 1000}
        )
        assert resp.status_code == 404


class TestInvestmentCRUD:
    """Verify base CRUD still works"""
    
    def test_get_single_investment(self, session):
        """GET /api/investments/:id returns investment"""
        resp = session.get(f"{BASE_URL}/api/investments/{SBI_FD_ID}")
        assert resp.status_code == 200
        data = resp.json()
        assert data['id'] == SBI_FD_ID
        assert data['name'] == "SBI FD 3yr"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
