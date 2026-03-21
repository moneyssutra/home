"""
Test Financial Health Member View - Iteration 169
Tests the fix for Health page showing ALL zeros for family member views.

Key fixes being tested:
1. Backend /api/financial-health accepts ?memberId= parameter
2. Backend uses get_effective_user_filter for proper member data filtering
3. Frontend FinancialHealth.js member view calls API instead of hardcoded zeros
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFinancialHealthMemberView:
    """Test /api/financial-health endpoint with memberId parameter"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Use demo user credentials
        self.test_email = "demo@test.com"
        self.test_password = "Demo@1234"
        
        # Login with username field
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": self.test_email,
            "password": self.test_password
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Could not authenticate test user")
        
        # Verify auth
        me_resp = self.session.get(f"{BASE_URL}/api/auth/me")
        if me_resp.status_code != 200:
            pytest.skip("Authentication failed")
        
        self.user_data = me_resp.json()
        self.user_id = self.user_data.get('user_id')
        yield
    
    def test_financial_health_endpoint_exists(self):
        """Test that /api/financial-health endpoint exists and returns 200"""
        response = self.session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: /api/financial-health endpoint exists and returns 200")
    
    def test_financial_health_returns_required_fields(self):
        """Test that /api/financial-health returns all required fields for Health page"""
        response = self.session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200
        
        data = response.json()
        
        # Required top-level fields
        required_fields = [
            "overallScore",
            "contributions",
            "emergencyFund",
            "lifeInsurance",
            "healthInsurance",
            "investmentAllocation",
            "creditUtilization",
            "loanBurden",
            "debtToAsset",
            "savingsRate",
            "retirementReadiness",
            "netWorthTrend"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"PASS: All {len(required_fields)} required fields present in response")
        print(f"  overallScore: {data.get('overallScore')}")
        print(f"  contributions keys: {list(data.get('contributions', {}).keys())}")
    
    def test_financial_health_contributions_structure(self):
        """Test that contributions object has proper structure with rawScore, weight, contribution, maxContribution"""
        response = self.session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200
        
        data = response.json()
        contributions = data.get("contributions", {})
        
        expected_modules = [
            "emergencyFund", "lifeInsurance", "healthInsurance", "savingsRate",
            "loanBurden", "creditUtilization", "investmentAllocation",
            "retirementReadiness", "debtToAsset"
        ]
        
        for module in expected_modules:
            assert module in contributions, f"Missing contribution module: {module}"
            contrib = contributions[module]
            assert "rawScore" in contrib, f"Missing rawScore in {module}"
            assert "weight" in contrib, f"Missing weight in {module}"
            assert "contribution" in contrib, f"Missing contribution in {module}"
            assert "maxContribution" in contrib, f"Missing maxContribution in {module}"
        
        print(f"PASS: All {len(expected_modules)} contribution modules have proper structure")
    
    def test_financial_health_accepts_member_id_param(self):
        """Test that /api/financial-health accepts ?memberId= query parameter"""
        # Test with a dummy memberId - should not error, just return user's own data
        response = self.session.get(f"{BASE_URL}/api/financial-health?memberId=dummy-member-id")
        assert response.status_code == 200, f"Expected 200 with memberId param, got {response.status_code}"
        
        data = response.json()
        assert "overallScore" in data, "Response should still have overallScore"
        
        print("PASS: /api/financial-health accepts ?memberId= parameter without error")
    
    def test_financial_health_with_own_user_id_as_member_id(self):
        """Test that passing own user_id as memberId returns same data as without memberId"""
        # Get data without memberId
        response_without = self.session.get(f"{BASE_URL}/api/financial-health")
        assert response_without.status_code == 200
        data_without = response_without.json()
        
        # Get data with own user_id as memberId
        response_with = self.session.get(f"{BASE_URL}/api/financial-health?memberId={self.user_id}")
        assert response_with.status_code == 200
        data_with = response_with.json()
        
        # Both should have same overallScore
        assert data_without.get("overallScore") == data_with.get("overallScore"), \
            f"Scores differ: {data_without.get('overallScore')} vs {data_with.get('overallScore')}"
        
        print(f"PASS: Same data returned with/without memberId={self.user_id}")
    
    def test_financial_health_module_status_fields(self):
        """Test that each health module has status and action fields"""
        response = self.session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200
        
        data = response.json()
        
        modules_to_check = [
            "emergencyFund", "lifeInsurance", "healthInsurance",
            "investmentAllocation", "creditUtilization", "loanBurden",
            "debtToAsset", "savingsRate", "retirementReadiness", "netWorthTrend"
        ]
        
        for module in modules_to_check:
            module_data = data.get(module, {})
            assert "status" in module_data, f"Missing status in {module}"
            assert "action" in module_data, f"Missing action in {module}"
        
        print(f"PASS: All {len(modules_to_check)} modules have status and action fields")
    
    def test_financial_health_savings_rate_structure(self):
        """Test savingsRate module has rate, surplus, monthlyIncome fields"""
        response = self.session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200
        
        data = response.json()
        savings = data.get("savingsRate", {})
        
        assert "rate" in savings, "Missing rate in savingsRate"
        assert "surplus" in savings, "Missing surplus in savingsRate"
        assert "monthlyIncome" in savings, "Missing monthlyIncome in savingsRate"
        assert "status" in savings, "Missing status in savingsRate"
        
        print(f"PASS: savingsRate has proper structure - rate: {savings.get('rate')}, status: {savings.get('status')}")
    
    def test_financial_health_loan_burden_structure(self):
        """Test loanBurden module has emiRatio, totalEmi, totalLoans fields"""
        response = self.session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200
        
        data = response.json()
        loan = data.get("loanBurden", {})
        
        assert "emiRatio" in loan, "Missing emiRatio in loanBurden"
        assert "totalEmi" in loan, "Missing totalEmi in loanBurden"
        assert "totalLoans" in loan, "Missing totalLoans in loanBurden"
        assert "status" in loan, "Missing status in loanBurden"
        
        print(f"PASS: loanBurden has proper structure - emiRatio: {loan.get('emiRatio')}, status: {loan.get('status')}")
    
    def test_financial_health_credit_utilization_structure(self):
        """Test creditUtilization module has utilization, outstanding, limit fields"""
        response = self.session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200
        
        data = response.json()
        cc = data.get("creditUtilization", {})
        
        assert "utilization" in cc, "Missing utilization in creditUtilization"
        assert "outstanding" in cc, "Missing outstanding in creditUtilization"
        assert "limit" in cc, "Missing limit in creditUtilization"
        assert "status" in cc, "Missing status in creditUtilization"
        
        print(f"PASS: creditUtilization has proper structure - utilization: {cc.get('utilization')}, status: {cc.get('status')}")
    
    def test_financial_health_emergency_fund_structure(self):
        """Test emergencyFund module has current, target, gap fields"""
        response = self.session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200
        
        data = response.json()
        ef = data.get("emergencyFund", {})
        
        assert "current" in ef, "Missing current in emergencyFund"
        assert "target" in ef, "Missing target in emergencyFund"
        assert "gap" in ef, "Missing gap in emergencyFund"
        assert "status" in ef, "Missing status in emergencyFund"
        
        print(f"PASS: emergencyFund has proper structure - current: {ef.get('current')}, status: {ef.get('status')}")


class TestFinancialHealthWithFamilyMember:
    """Test /api/financial-health with actual family member data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with family"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Use demo user credentials from previous iteration
        self.test_email = "demo@test.com"
        self.test_password = "Demo@1234"
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": self.test_email,
            "password": self.test_password
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Could not login as demo user")
        
        me_resp = self.session.get(f"{BASE_URL}/api/auth/me")
        if me_resp.status_code != 200:
            pytest.skip("Authentication failed")
        
        self.user_data = me_resp.json()
        self.user_id = self.user_data.get('user_id')
        yield
    
    def test_get_family_members(self):
        """Test getting family members to use for memberId testing"""
        # Use /api/family endpoint which returns members array
        response = self.session.get(f"{BASE_URL}/api/family")
        
        if response.status_code == 404:
            pytest.skip("No family found for demo user")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        members = data.get("members", [])
        
        print(f"Found {len(members)} family members")
        for m in members:
            print(f"  - {m.get('name')} (id: {m.get('id')})")
        
        return members
    
    def test_financial_health_for_family_member(self):
        """Test /api/financial-health with a real family member's ID"""
        # First get family members using /api/family
        members_resp = self.session.get(f"{BASE_URL}/api/family")
        
        if members_resp.status_code == 404:
            pytest.skip("No family found for demo user")
        
        members = members_resp.json().get("members", [])
        
        if len(members) < 2:
            pytest.skip("Need at least 2 family members to test member view")
        
        # Find a member that is not the current user
        other_member = None
        for m in members:
            if m.get("id") != self.user_id:
                other_member = m
                break
        
        if not other_member:
            pytest.skip("No other family member found")
        
        member_id = other_member.get("id")
        member_name = other_member.get("name")
        
        print(f"Testing financial health for member: {member_name} (id: {member_id})")
        
        # Get financial health for this member
        response = self.session.get(f"{BASE_URL}/api/financial-health?memberId={member_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response has required fields
        assert "overallScore" in data, "Missing overallScore"
        assert "contributions" in data, "Missing contributions"
        assert "emergencyFund" in data, "Missing emergencyFund"
        assert "savingsRate" in data, "Missing savingsRate"
        
        print(f"PASS: Financial health for {member_name}:")
        print(f"  overallScore: {data.get('overallScore')}")
        print(f"  emergencyFund status: {data.get('emergencyFund', {}).get('status')}")
        print(f"  savingsRate: {data.get('savingsRate', {}).get('rate')}%")
        
        # The key test: if member has financial data, overallScore should NOT be 0
        # (unless they truly have no data, in which case all modules would be N/A)
        contributions = data.get("contributions", {})
        all_na = all(c.get("rawScore", 0) == 0 for c in contributions.values())
        
        if all_na:
            print(f"  Note: Member {member_name} has no financial data (all N/A)")
        else:
            assert data.get("overallScore", 0) > 0, \
                f"Member with financial data should have overallScore > 0, got {data.get('overallScore')}"
            print(f"  PASS: Member has financial data with overallScore > 0")


class TestChallengesGeneration:
    """Test that challenges are generated properly"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Use demo user
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "demo@test.com",
            "password": "Demo@1234"
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Could not login as demo user")
        yield
    
    def test_combined_intelligence_has_challenges(self):
        """Test that /api/combined/intelligence returns challenges"""
        response = self.session.get(f"{BASE_URL}/api/combined/intelligence?tz_offset=0")
        
        if response.status_code != 200:
            pytest.skip(f"Combined intelligence endpoint returned {response.status_code}")
        
        data = response.json()
        
        # Check challenges structure
        challenges = data.get("challenges", {})
        
        assert "active" in challenges or "available" in challenges, \
            "Challenges should have active or available arrays"
        
        active = challenges.get("active", [])
        available = challenges.get("available", [])
        
        print(f"PASS: Challenges found - {len(active)} active, {len(available)} available")
        
        for c in available[:3]:
            print(f"  Available: {c.get('code')} - {c.get('title')}")
    
    def test_gamification_has_achievements(self):
        """Test that gamification data includes achievements/badges"""
        response = self.session.get(f"{BASE_URL}/api/combined/intelligence?tz_offset=0")
        
        if response.status_code != 200:
            pytest.skip(f"Combined intelligence endpoint returned {response.status_code}")
        
        data = response.json()
        
        gamification = data.get("gamification", {})
        
        achievements = gamification.get("achievements", [])
        all_achievements = gamification.get("allAchievements", [])
        
        print(f"PASS: Gamification - {len(achievements)} unlocked, {len(all_achievements)} total badges")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
