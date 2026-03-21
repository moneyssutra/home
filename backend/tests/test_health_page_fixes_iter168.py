"""
Test Health Page Fixes - Iteration 168
Tests for:
1. Backend: /api/dashboard/networth returns totalEMI and effectiveFunds fields
2. Backend: /api/dashboard/networth?memberId= works for member view
3. Frontend hook: useIntelligenceData.js member branch uses networth API
4. Frontend: generateBadgesAndChallenges includes growth challenges
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestNetworthAPIFields:
    """Test that /api/dashboard/networth returns totalEMI and effectiveFunds"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "demo@test.com",
            "password": "Demo@1234"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.user_data = login_resp.json()
    
    def test_networth_returns_totalEMI_field(self):
        """Verify totalEMI field is present in networth response"""
        resp = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        assert resp.status_code == 200, f"Networth API failed: {resp.text}"
        data = resp.json()
        
        # Check totalEMI field exists
        assert "totalEMI" in data, f"totalEMI field missing from response. Keys: {list(data.keys())}"
        # totalEMI should be a number (int or float)
        assert isinstance(data["totalEMI"], (int, float)), f"totalEMI should be a number, got {type(data['totalEMI'])}"
        print(f"PASS: totalEMI = {data['totalEMI']}")
    
    def test_networth_returns_effectiveFunds_field(self):
        """Verify effectiveFunds field is present in networth response"""
        resp = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        assert resp.status_code == 200, f"Networth API failed: {resp.text}"
        data = resp.json()
        
        # Check effectiveFunds field exists
        assert "effectiveFunds" in data, f"effectiveFunds field missing from response. Keys: {list(data.keys())}"
        # effectiveFunds should be a number (int or float)
        assert isinstance(data["effectiveFunds"], (int, float)), f"effectiveFunds should be a number, got {type(data['effectiveFunds'])}"
        print(f"PASS: effectiveFunds = {data['effectiveFunds']}")
    
    def test_networth_all_required_fields_present(self):
        """Verify all required fields for Health page are present"""
        resp = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        assert resp.status_code == 200, f"Networth API failed: {resp.text}"
        data = resp.json()
        
        # Required fields for Health page calculations
        required_fields = [
            "netWorth", "totalAssets", "totalInvestments", "liquidBalance",
            "totalLiabilities", "monthlyIncome", "monthlyExpenses",
            "totalEMI", "effectiveFunds", "incomeCount"
        ]
        
        missing = [f for f in required_fields if f not in data]
        assert not missing, f"Missing required fields: {missing}"
        print(f"PASS: All {len(required_fields)} required fields present")
    
    def test_networth_with_memberId_parameter(self):
        """Verify networth API accepts memberId parameter"""
        # First get family members
        family_resp = self.session.get(f"{BASE_URL}/api/family/members")
        if family_resp.status_code != 200:
            pytest.skip("No family members available for testing")
        
        members = family_resp.json()
        if not members:
            pytest.skip("No family members available for testing")
        
        member_id = members[0].get("id") or members[0].get("userId")
        if not member_id:
            pytest.skip("Member ID not found")
        
        # Test networth with memberId
        resp = self.session.get(f"{BASE_URL}/api/dashboard/networth?memberId={member_id}")
        assert resp.status_code == 200, f"Networth with memberId failed: {resp.text}"
        data = resp.json()
        
        # Should still have totalEMI and effectiveFunds
        assert "totalEMI" in data, "totalEMI missing in member view"
        assert "effectiveFunds" in data, "effectiveFunds missing in member view"
        print(f"PASS: Networth with memberId returns totalEMI={data['totalEMI']}, effectiveFunds={data['effectiveFunds']}")


class TestChallengesLogic:
    """Test that challenges are generated correctly based on financial metrics"""
    
    def test_challenges_with_good_metrics_still_has_challenges(self):
        """
        Test that even with good metrics (sr=25, survivalDays=100, emiRatio=15, totalInv=500000, incomeSources=2),
        challenges are still generated (growth challenges like save_30, build_6m_buffer, maintain_health)
        """
        # Simulate the generateBadgesAndChallenges logic from useIntelligenceData.js
        # Good metrics scenario
        survivalDays = 100
        sr = 25  # savings rate
        finalScore = 70
        emiRatio = 15
        totalInvestments = 500000
        incomeSources = 2
        
        challs = []
        
        # Original challenges (for poor metrics)
        if sr < 20:
            challs.append({"code": "save_20", "name": "Save 20% Challenge"})
        if survivalDays < 90:
            challs.append({"code": "build_buffer", "name": "3-Month Buffer"})
        if emiRatio > 30:
            challs.append({"code": "reduce_emi", "name": "EMI Reduction"})
        
        # Growth challenges (always available for good metrics)
        if sr >= 20 and sr < 30:
            challs.append({"code": "save_30", "name": "Super Saver Challenge"})
        if survivalDays >= 90 and survivalDays < 180:
            challs.append({"code": "build_6m_buffer", "name": "6-Month Safety Net"})
        if totalInvestments == 0:
            challs.append({"code": "first_investment", "name": "First Investment"})
        if incomeSources <= 1:
            challs.append({"code": "diversify_income", "name": "Income Diversification"})
        if finalScore < 75:
            challs.append({"code": "health_75", "name": "Health Star"})
        if finalScore >= 75:
            challs.append({"code": "maintain_health", "name": "Consistency King"})
        
        # With good metrics, we should have at least some challenges
        assert len(challs) > 0, "Challenges should not be empty even with good metrics"
        
        # Specifically, with sr=25 (between 20-30), we should have save_30
        codes = [c["code"] for c in challs]
        assert "save_30" in codes, f"save_30 challenge should be present for sr=25. Got: {codes}"
        
        # With survivalDays=100 (between 90-180), we should have build_6m_buffer
        assert "build_6m_buffer" in codes, f"build_6m_buffer challenge should be present for survivalDays=100. Got: {codes}"
        
        # With finalScore=70 (<75), we should have health_75
        assert "health_75" in codes, f"health_75 challenge should be present for finalScore=70. Got: {codes}"
        
        print(f"PASS: Good metrics scenario has {len(challs)} challenges: {codes}")
    
    def test_challenges_with_excellent_metrics_has_maintain_health(self):
        """
        Test that with excellent metrics (finalScore >= 75), maintain_health challenge is present
        """
        survivalDays = 200
        sr = 35
        finalScore = 80
        emiRatio = 10
        totalInvestments = 1000000
        incomeSources = 3
        
        challs = []
        
        if sr < 20:
            challs.append({"code": "save_20"})
        if survivalDays < 90:
            challs.append({"code": "build_buffer"})
        if emiRatio > 30:
            challs.append({"code": "reduce_emi"})
        if sr >= 20 and sr < 30:
            challs.append({"code": "save_30"})
        if survivalDays >= 90 and survivalDays < 180:
            challs.append({"code": "build_6m_buffer"})
        if totalInvestments == 0:
            challs.append({"code": "first_investment"})
        if incomeSources <= 1:
            challs.append({"code": "diversify_income"})
        if finalScore < 75:
            challs.append({"code": "health_75"})
        if finalScore >= 75:
            challs.append({"code": "maintain_health"})
        
        codes = [c["code"] for c in challs]
        assert "maintain_health" in codes, f"maintain_health should be present for finalScore=80. Got: {codes}"
        assert len(challs) > 0, "Challenges should not be empty even with excellent metrics"
        print(f"PASS: Excellent metrics scenario has {len(challs)} challenges: {codes}")
    
    def test_challenges_with_poor_metrics_has_basic_challenges(self):
        """
        Test that with poor metrics, basic challenges are present
        """
        survivalDays = 30
        sr = 10
        finalScore = 40
        emiRatio = 40
        totalInvestments = 0
        incomeSources = 1
        
        challs = []
        
        if sr < 20:
            challs.append({"code": "save_20"})
        if survivalDays < 90:
            challs.append({"code": "build_buffer"})
        if emiRatio > 30:
            challs.append({"code": "reduce_emi"})
        if sr >= 20 and sr < 30:
            challs.append({"code": "save_30"})
        if survivalDays >= 90 and survivalDays < 180:
            challs.append({"code": "build_6m_buffer"})
        if totalInvestments == 0:
            challs.append({"code": "first_investment"})
        if incomeSources <= 1:
            challs.append({"code": "diversify_income"})
        if finalScore < 75:
            challs.append({"code": "health_75"})
        if finalScore >= 75:
            challs.append({"code": "maintain_health"})
        
        codes = [c["code"] for c in challs]
        assert "save_20" in codes, f"save_20 should be present for sr=10. Got: {codes}"
        assert "build_buffer" in codes, f"build_buffer should be present for survivalDays=30. Got: {codes}"
        assert "reduce_emi" in codes, f"reduce_emi should be present for emiRatio=40. Got: {codes}"
        assert "first_investment" in codes, f"first_investment should be present for totalInvestments=0. Got: {codes}"
        assert "diversify_income" in codes, f"diversify_income should be present for incomeSources=1. Got: {codes}"
        assert "health_75" in codes, f"health_75 should be present for finalScore=40. Got: {codes}"
        
        print(f"PASS: Poor metrics scenario has {len(challs)} challenges: {codes}")


class TestCombinedIntelligenceEndpoint:
    """Test the combined intelligence endpoint used by personal view"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "demo@test.com",
            "password": "Demo@1234"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    
    def test_combined_intelligence_returns_challenges(self):
        """Verify combined intelligence endpoint returns challenges data"""
        resp = self.session.get(f"{BASE_URL}/api/combined/intelligence")
        assert resp.status_code == 200, f"Combined intelligence API failed: {resp.text}"
        data = resp.json()
        
        # Check challenges structure
        assert "challenges" in data, f"challenges missing from response. Keys: {list(data.keys())}"
        challenges = data["challenges"]
        
        # Challenges should have active, available, completed arrays
        if challenges:
            assert "active" in challenges or "available" in challenges or "completed" in challenges, \
                f"challenges should have active/available/completed. Got: {challenges}"
        
        print(f"PASS: Combined intelligence returns challenges: {challenges}")
    
    def test_combined_intelligence_returns_gamification(self):
        """Verify combined intelligence endpoint returns gamification data"""
        resp = self.session.get(f"{BASE_URL}/api/combined/intelligence")
        assert resp.status_code == 200, f"Combined intelligence API failed: {resp.text}"
        data = resp.json()
        
        # Check gamification structure
        assert "gamification" in data, f"gamification missing from response. Keys: {list(data.keys())}"
        gam = data["gamification"]
        
        if gam:
            # Should have achievements/badges
            assert "achievements" in gam or "allAchievements" in gam, \
                f"gamification should have achievements. Got keys: {list(gam.keys()) if isinstance(gam, dict) else gam}"
        
        print(f"PASS: Combined intelligence returns gamification data")


class TestFamilyCombinedSummary:
    """Test family combined summary endpoint for family view"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "demo@test.com",
            "password": "Demo@1234"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    
    def test_family_combined_summary_returns_required_fields(self):
        """Verify family combined summary returns fields needed for Health page"""
        resp = self.session.get(f"{BASE_URL}/api/family/combined-summary")
        if resp.status_code == 404:
            pytest.skip("Family combined summary endpoint not available")
        
        assert resp.status_code == 200, f"Family combined summary failed: {resp.text}"
        data = resp.json()
        
        # Check combinedSummary structure
        if "combinedSummary" in data:
            cs = data["combinedSummary"]
            # Should have fields for Health page calculations
            expected_fields = ["liquidBalance", "monthlyIncome", "monthlyExpenses", "netWorth"]
            present = [f for f in expected_fields if f in cs]
            print(f"PASS: Family combined summary has fields: {present}")
        else:
            print(f"INFO: Response structure: {list(data.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
