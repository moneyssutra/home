"""
Tests for Family Member Switching - Bug Fix Verification
Tests family endpoints: /api/family, /api/family/member/{id}/summary, /api/family/combined-summary
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFamilyMemberSwitching:
    """Test family member switching functionality"""
    
    @pytest.fixture(scope="class")
    def api_client(self):
        """Shared requests session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def session_token(self, api_client):
        """Get authentication token via login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test@moneyssutra.com",
            "password": "test"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, "session_token not in login response"
        return data["session_token"]
    
    @pytest.fixture(scope="class")
    def auth_cookies(self, session_token):
        """Return auth cookies dict"""
        return {"session_token": session_token}
    
    # ====================== Family Endpoints Tests ======================
    
    def test_get_family_returns_members(self, api_client, auth_cookies):
        """Test GET /api/family returns family with members"""
        response = api_client.get(f"{BASE_URL}/api/family", cookies=auth_cookies)
        assert response.status_code == 200
        
        data = response.json()
        # Can be returned directly or in 'family' key
        family = data.get('family', data) if 'family' in data or 'id' in data else None
        
        assert family is not None, "No family data returned"
        assert 'members' in family, "Family should have members array"
        assert 'familyName' in family, "Family should have familyName"
        assert len(family['members']) >= 1, "Should have at least 1 member"
    
    def test_family_has_three_members(self, api_client, auth_cookies):
        """Test family has exactly 3 members: Rahul, Priya, Son"""
        response = api_client.get(f"{BASE_URL}/api/family", cookies=auth_cookies)
        assert response.status_code == 200
        
        data = response.json()
        family = data.get('family', data) if 'family' in data or 'id' in data else data
        members = family.get('members', [])
        
        assert len(members) == 3, f"Expected 3 members, got {len(members)}"
        
        # Check member names/relationships
        member_names = [m.get('name', '') for m in members]
        member_rels = [m.get('relationship', '') for m in members]
        
        assert 'Rahul Sharma' in member_names, "Rahul Sharma should be in family"
        assert 'Priya Sharma' in member_names, "Priya Sharma should be in family"
        assert 'Wife' in member_rels, "Wife relationship should exist"
        assert 'Son' in member_rels, "Son relationship should exist"
    
    def test_family_has_owner(self, api_client, auth_cookies):
        """Test family has an owner member"""
        response = api_client.get(f"{BASE_URL}/api/family", cookies=auth_cookies)
        assert response.status_code == 200
        
        data = response.json()
        family = data.get('family', data) if 'family' in data or 'id' in data else data
        members = family.get('members', [])
        
        owner = [m for m in members if m.get('role') == 'owner']
        assert len(owner) == 1, "Should have exactly 1 owner"
        assert owner[0]['name'] == 'Rahul Sharma', "Owner should be Rahul Sharma"
    
    # ====================== Member Summary Endpoint Tests ======================
    
    def test_get_priya_member_summary(self, api_client, auth_cookies):
        """Test GET /api/family/member/member_deb344c3-906/summary returns Priya's data"""
        response = api_client.get(
            f"{BASE_URL}/api/family/member/member_deb344c3-906/summary",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        
        data = response.json()
        assert 'member' in data, "Response should have member info"
        assert 'summary' in data, "Response should have summary"
        
        member = data['member']
        assert member['name'] == 'Priya Sharma', "Should be Priya's data"
        assert member['relationship'] == 'Wife', "Relationship should be Wife"
        
        summary = data['summary']
        assert 'netWorth' in summary, "Summary should have netWorth"
        assert 'totalAssets' in summary, "Summary should have totalAssets"
        assert 'totalInvestments' in summary, "Summary should have totalInvestments"
        assert 'monthlyIncome' in summary, "Summary should have monthlyIncome"
        assert 'monthlyExpenses' in summary, "Summary should have monthlyExpenses"
        assert 'counts' in summary, "Summary should have counts"
    
    def test_priya_summary_has_zero_values(self, api_client, auth_cookies):
        """Test Priya has ₹0 net worth (no data assigned yet)"""
        response = api_client.get(
            f"{BASE_URL}/api/family/member/member_deb344c3-906/summary",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        
        data = response.json()
        summary = data['summary']
        
        # Priya should have ₹0 since no data is assigned to her
        assert summary['netWorth'] == 0, f"Priya's netWorth should be 0, got {summary['netWorth']}"
        assert summary['totalAssets'] == 0, "Priya's totalAssets should be 0"
        assert summary['totalInvestments'] == 0, "Priya's totalInvestments should be 0"
    
    def test_member_summary_has_counts(self, api_client, auth_cookies):
        """Test member summary includes counts for all categories"""
        response = api_client.get(
            f"{BASE_URL}/api/family/member/member_deb344c3-906/summary",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        
        data = response.json()
        counts = data['summary'].get('counts', {})
        
        expected_keys = ['income', 'expenses', 'investments', 'assets', 'loans', 'accounts']
        for key in expected_keys:
            assert key in counts, f"Counts should have '{key}'"
    
    def test_invalid_member_returns_404(self, api_client, auth_cookies):
        """Test getting summary for non-existent member returns 404"""
        response = api_client.get(
            f"{BASE_URL}/api/family/member/invalid-member-id/summary",
            cookies=auth_cookies
        )
        assert response.status_code == 404, "Should return 404 for invalid member"
    
    # ====================== Combined Summary Endpoint Tests ======================
    
    def test_get_combined_family_summary(self, api_client, auth_cookies):
        """Test GET /api/family/combined-summary returns aggregated data"""
        response = api_client.get(
            f"{BASE_URL}/api/family/combined-summary",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        
        data = response.json()
        assert 'familyName' in data, "Should have familyName"
        assert 'memberCount' in data, "Should have memberCount"
        assert 'combinedSummary' in data, "Should have combinedSummary"
    
    def test_combined_summary_has_all_fields(self, api_client, auth_cookies):
        """Test combined summary has all required financial fields"""
        response = api_client.get(
            f"{BASE_URL}/api/family/combined-summary",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        
        data = response.json()
        summary = data['combinedSummary']
        
        required_fields = ['monthlyIncome', 'monthlyExpenses', 'totalInvestments', 
                          'totalAssets', 'totalLoans', 'liquidBalance', 'netWorth']
        for field in required_fields:
            assert field in summary, f"Combined summary should have '{field}'"
    
    def test_combined_summary_has_three_members(self, api_client, auth_cookies):
        """Test combined summary reports 3 family members"""
        response = api_client.get(
            f"{BASE_URL}/api/family/combined-summary",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['memberCount'] == 3, f"Expected 3 members, got {data['memberCount']}"
    
    def test_combined_networth_is_correct(self, api_client, auth_cookies):
        """Test combined net worth is approximately ₹1.5 Cr"""
        response = api_client.get(
            f"{BASE_URL}/api/family/combined-summary",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        
        data = response.json()
        net_worth = data['combinedSummary']['netWorth']
        
        # Should be around ₹1.5 Cr (15,000,000)
        assert net_worth > 10000000, f"Net worth should be > 1 Cr, got {net_worth}"
        assert net_worth < 20000000, f"Net worth should be < 2 Cr, got {net_worth}"
    
    def test_family_name_is_sharma_family(self, api_client, auth_cookies):
        """Test family name is 'Sharma Family'"""
        response = api_client.get(
            f"{BASE_URL}/api/family/combined-summary",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['familyName'] == 'Sharma Family', f"Family name should be 'Sharma Family', got {data['familyName']}"
    
    # ====================== Authentication Tests ======================
    
    def test_family_endpoint_requires_auth(self, api_client):
        """Test /api/family requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/family")
        assert response.status_code == 401, "Should return 401 without auth"
    
    def test_member_summary_requires_auth(self, api_client):
        """Test member summary requires authentication"""
        response = api_client.get(
            f"{BASE_URL}/api/family/member/member_deb344c3-906/summary"
        )
        assert response.status_code == 401, "Should return 401 without auth"
    
    def test_combined_summary_requires_auth(self, api_client):
        """Test combined summary requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/family/combined-summary")
        assert response.status_code == 401, "Should return 401 without auth"


class TestDashboardNetworth:
    """Test dashboard networth endpoint still works"""
    
    @pytest.fixture(scope="class")
    def api_client(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def auth_cookies(self, api_client):
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test@moneyssutra.com",
            "password": "test"
        })
        return {"session_token": response.json()["session_token"]}
    
    def test_dashboard_networth_returns_data(self, api_client, auth_cookies):
        """Test personal dashboard networth endpoint works"""
        response = api_client.get(
            f"{BASE_URL}/api/dashboard/networth?tz_offset=0",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        
        data = response.json()
        assert 'netWorth' in data, "Should have netWorth"
        assert 'totalAssets' in data, "Should have totalAssets"
        assert 'totalInvestments' in data, "Should have totalInvestments"
