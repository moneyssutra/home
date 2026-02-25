"""
Test cases for granular tier model Financial Score calculation (iteration 70)
Tests the /api/intelligence/control-score endpoint with the new 7-9 tier model per pillar
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def session():
    """Create authenticated session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    # Login
    login_response = s.post(f"{BASE_URL}/api/auth/login", json={
        "username": "test",
        "password": "test"
    })
    assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    return s


class TestControlScoreEndpoint:
    """Test /api/intelligence/control-score endpoint with granular tier model"""

    def test_control_score_returns_90(self, session):
        """Verify finalScore = 90 (25 + 15 + 25 + 25)"""
        response = session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200
        data = response.json()
        
        # Expected score is 90 with new tier model
        assert data["finalScore"] == 90, f"Expected finalScore=90, got {data['finalScore']}"
        assert data["grade"] == "A", f"Expected grade=A, got {data['grade']}"

    def test_savings_rate_breakdown(self, session):
        """Savings Rate: 47.4% should give 25/25 (≥35% tier)"""
        response = session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200
        data = response.json()
        
        sr = data["breakdown"]["savingsRate"]
        assert sr["score"] == 25, f"Expected savingsRate score=25, got {sr['score']}"
        assert sr["max"] == 25
        # Verify new pct field exists
        assert "pct" in sr, "Missing pct field in savingsRate breakdown"
        assert sr["pct"] == 47.4, f"Expected pct=47.4, got {sr['pct']}"
        # Verify help text exists
        assert "help" in sr, "Missing help field in savingsRate breakdown"
        assert "47%" in sr["help"] or "47" in sr["help"], f"Help text should mention 47%: {sr['help']}"

    def test_emi_load_breakdown(self, session):
        """EMI Load: 30.8% should give 15/25 (31-40% tier, NOT 20/25)"""
        response = session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200
        data = response.json()
        
        emi = data["breakdown"]["emiLoad"]
        # CRITICAL: 30.8% is >30%, so it falls in 31-40% tier = 15pts
        assert emi["score"] == 15, f"Expected emiLoad score=15 (31-40% tier), got {emi['score']}"
        assert emi["max"] == 25
        # Verify new pct field exists
        assert "pct" in emi, "Missing pct field in emiLoad breakdown"
        assert emi["pct"] == 30.8, f"Expected pct=30.8, got {emi['pct']}"
        # Verify help text exists
        assert "help" in emi, "Missing help field in emiLoad breakdown"
        assert "31%" in emi["help"] or "heavy" in emi["help"].lower(), f"Help text should mention heavy EMI: {emi['help']}"

    def test_safety_buffer_breakdown(self, session):
        """Safety Buffer: 10.9 months should give 25/25 (≥8 months tier)"""
        response = session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200
        data = response.json()
        
        buffer = data["breakdown"]["safetyBuffer"]
        assert buffer["score"] == 25, f"Expected safetyBuffer score=25, got {buffer['score']}"
        assert buffer["max"] == 25
        assert buffer["months"] == 10.9, f"Expected months=10.9, got {buffer['months']}"
        # Verify help text exists
        assert "help" in buffer, "Missing help field in safetyBuffer breakdown"
        assert "10.9" in buffer["help"] or "fortress" in buffer["help"].lower(), f"Help text should mention 10.9 months: {buffer['help']}"

    def test_income_consistency_breakdown(self, session):
        """Income Consistency: 0% variance should give 25/25 (≤5% tier)"""
        response = session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200
        data = response.json()
        
        consistency = data["breakdown"]["incomeConsistency"]
        assert consistency["score"] == 25, f"Expected incomeConsistency score=25, got {consistency['score']}"
        assert consistency["max"] == 25
        assert consistency["variancePct"] == 0, f"Expected variancePct=0, got {consistency['variancePct']}"
        # Verify help text exists
        assert "help" in consistency, "Missing help field in incomeConsistency breakdown"
        assert "steady" in consistency["help"].lower() or "0%" in consistency["help"], f"Help text should mention steady: {consistency['help']}"

    def test_new_metrics_fields(self, session):
        """Verify response includes new fields: liquidFunds, semiLiquidFunds"""
        response = session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200
        data = response.json()
        
        metrics = data["metrics"]
        assert "liquidFunds" in metrics, "Missing liquidFunds in metrics"
        assert "semiLiquidFunds" in metrics, "Missing semiLiquidFunds in metrics"
        
        # Verify values are numeric
        assert isinstance(metrics["liquidFunds"], (int, float)), "liquidFunds should be numeric"
        assert isinstance(metrics["semiLiquidFunds"], (int, float)), "semiLiquidFunds should be numeric"
        
        # Additional metrics should exist
        assert "monthlyIncome" in metrics
        assert "monthlyExpenses" in metrics
        assert "totalEMI" in metrics
        assert "availableFunds" in metrics

    def test_score_period(self, session):
        """Verify score period is returned (rolling 3-month window)"""
        response = session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200
        data = response.json()
        
        assert "scorePeriod" in data, "Missing scorePeriod in response"
        period = data["scorePeriod"]
        assert "start" in period
        assert "end" in period
        assert "label" in period
        # Label should include date range
        assert "—" in period["label"] or "-" in period["label"], f"Period label should contain date range: {period['label']}"

    def test_breakdown_structure(self, session):
        """Verify breakdown has all 4 pillars with correct structure"""
        response = session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200
        data = response.json()
        
        breakdown = data["breakdown"]
        expected_pillars = ["savingsRate", "emiLoad", "safetyBuffer", "incomeConsistency"]
        
        for pillar in expected_pillars:
            assert pillar in breakdown, f"Missing {pillar} in breakdown"
            p = breakdown[pillar]
            assert "score" in p, f"Missing score in {pillar}"
            assert "max" in p, f"Missing max in {pillar}"
            assert "label" in p, f"Missing label in {pillar}"
            assert "help" in p, f"Missing help (contextual help text) in {pillar}"
            assert p["max"] == 25, f"{pillar} max should be 25"


class TestEmiLoadTierBoundaries:
    """Test EMI Load tier boundaries specifically (critical fix)"""

    def test_emi_tier_logic(self, session):
        """
        EMI Load tier boundaries (inclusive):
        - ≤20% = 25pts
        - 21-25% = 22pts  
        - 26-30% = 20pts
        - 31-40% = 15pts (current user falls here with 30.8%)
        - 41-50% = 10pts
        - 51-60% = 5pts
        - >60% = 0pts
        
        30.8% is >30%, so it should be in 31-40% tier = 15pts
        """
        response = session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200
        data = response.json()
        
        emi = data["breakdown"]["emiLoad"]
        emi_pct = emi["pct"]
        emi_score = emi["score"]
        
        # Verify the percentage
        assert emi_pct == 30.8, f"EMI percentage should be 30.8%, got {emi_pct}%"
        
        # 30.8% > 30%, so should be in 31-40% tier = 15pts
        # NOT in 26-30% tier which would give 20pts
        assert emi_score == 15, f"EMI 30.8% should give 15pts (31-40% tier), not {emi_score}pts"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
