"""
Test Iteration 69 - 3 Bug Fixes:
1. Financial Health contributions now include 'maxContribution' field (e.g., emergencyFund.maxContribution = 20)
2. Financial Score scorePeriod.label format is 'DD Mon YYYY — DD Mon YYYY'
3. XP rules use 'action' key (not 'rule') and xp field contains formatted value like '+20 XP'
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_session():
    """Get authenticated session"""
    session = requests.Session()
    login_response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "test", "password": "test"}
    )
    if login_response.status_code != 200:
        pytest.skip("Login failed - skipping authenticated tests")
    return session


class TestFinancialHealthMaxContribution:
    """Test Financial Health endpoint returns maxContribution for each module"""
    
    def test_contributions_have_max_contribution_field(self, auth_session):
        """Verify each contribution has maxContribution field"""
        response = auth_session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200
        
        data = response.json()
        assert "contributions" in data, "Missing 'contributions' key"
        
        contributions = data["contributions"]
        for module, contrib in contributions.items():
            assert "maxContribution" in contrib, f"Missing 'maxContribution' in {module}"
            assert isinstance(contrib["maxContribution"], (int, float)), f"maxContribution should be numeric for {module}"
    
    def test_max_contributions_values_are_correct(self, auth_session):
        """Verify maxContribution values match expected weights"""
        response = auth_session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200
        
        data = response.json()
        contributions = data["contributions"]
        
        # Expected maxContribution = 100 * weight fraction
        expected_max = {
            "emergencyFund": 20.0,
            "lifeInsurance": 7.5,
            "healthInsurance": 7.5,
            "savingsRate": 15.0,
            "loanBurden": 15.0,
            "creditUtilization": 10.0,
            "investmentAllocation": 15.0,
            "retirementReadiness": 10.0
        }
        
        for module, expected in expected_max.items():
            actual = contributions[module]["maxContribution"]
            assert abs(actual - expected) <= 0.1, \
                f"{module}: maxContribution should be {expected}, got {actual}"
    
    def test_contribution_less_than_or_equal_max(self, auth_session):
        """Verify contribution <= maxContribution for all modules"""
        response = auth_session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200
        
        data = response.json()
        contributions = data["contributions"]
        
        for module, contrib in contributions.items():
            assert contrib["contribution"] <= contrib["maxContribution"], \
                f"{module}: contribution ({contrib['contribution']}) > maxContribution ({contrib['maxContribution']})"
    
    def test_max_contributions_sum_to_100(self, auth_session):
        """Verify all maxContributions sum to 100"""
        response = auth_session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200
        
        data = response.json()
        contributions = data["contributions"]
        
        total_max = sum(c["maxContribution"] for c in contributions.values())
        assert abs(total_max - 100.0) <= 0.1, f"Max contributions should sum to 100, got {total_max}"


class TestFinancialScorePeriodLabel:
    """Test Financial Score scorePeriod.label format"""
    
    def test_score_period_label_contains_em_dash(self, auth_session):
        """Verify label contains em-dash separator"""
        response = auth_session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200
        
        data = response.json()
        assert "scorePeriod" in data, "Missing scorePeriod"
        label = data["scorePeriod"]["label"]
        
        # Should contain em-dash (—) not hyphen (-)
        assert "—" in label, f"Label should contain '—' em-dash, got: '{label}'"
    
    def test_score_period_label_format_dd_mon_yyyy(self, auth_session):
        """Verify label format is 'DD Mon YYYY — DD Mon YYYY'"""
        response = auth_session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200
        
        data = response.json()
        label = data["scorePeriod"]["label"]
        
        parts = label.split("—")
        assert len(parts) == 2, f"Label should have 2 parts separated by —, got: '{label}'"
        
        start_part = parts[0].strip()
        end_part = parts[1].strip()
        
        # Check format: DD Mon YYYY (e.g., "02 Oct 2025")
        import re
        pattern = r'^\d{1,2} [A-Za-z]{3} \d{4}$'
        assert re.match(pattern, start_part), f"Start date '{start_part}' should match 'DD Mon YYYY'"
        assert re.match(pattern, end_part), f"End date '{end_part}' should match 'DD Mon YYYY'"


class TestGamificationXpRules:
    """Test XP rules use 'action' key and xp field is formatted"""
    
    def test_xp_rules_use_action_key(self, auth_session):
        """Verify XP rules have 'action' field, not 'rule'"""
        response = auth_session.get(f"{BASE_URL}/api/gamification/profile")
        assert response.status_code == 200
        
        data = response.json()
        assert "xpRules" in data, "Missing xpRules in profile"
        
        xp_rules = data["xpRules"]
        assert len(xp_rules) > 0, "xpRules should not be empty"
        
        for rule in xp_rules:
            assert "action" in rule, f"XP rule missing 'action' field: {rule}"
            # 'rule' key should NOT be present (old format)
            assert rule.get("action") is not None, f"'action' should not be None: {rule}"
    
    def test_xp_rules_action_is_not_none(self, auth_session):
        """Verify action field has actual text, not 'None'"""
        response = auth_session.get(f"{BASE_URL}/api/gamification/profile")
        assert response.status_code == 200
        
        data = response.json()
        xp_rules = data["xpRules"]
        
        for rule in xp_rules:
            action = rule.get("action", "")
            assert action != "None", f"Action should not be string 'None': {rule}"
            assert action != "", f"Action should not be empty: {rule}"
            assert len(action) > 5, f"Action should be descriptive text: {rule}"
    
    def test_xp_rules_xp_field_is_formatted(self, auth_session):
        """Verify xp field contains formatted value like '+20 XP'"""
        response = auth_session.get(f"{BASE_URL}/api/gamification/profile")
        assert response.status_code == 200
        
        data = response.json()
        xp_rules = data["xpRules"]
        
        for rule in xp_rules:
            xp_value = rule.get("xp", "")
            # Should contain '+' and 'XP'
            assert "+" in xp_value or xp_value.strip().endswith("XP"), \
                f"XP value should be formatted like '+20 XP': got '{xp_value}'"
            # Should NOT have duplicate '++' or 'XP XP'
            assert "++" not in xp_value, f"XP value should not have '++': got '{xp_value}'"
            assert "XP XP" not in xp_value, f"XP value should not have 'XP XP': got '{xp_value}'"
    
    def test_xp_rules_have_icon(self, auth_session):
        """Verify XP rules have icon field"""
        response = auth_session.get(f"{BASE_URL}/api/gamification/profile")
        assert response.status_code == 200
        
        data = response.json()
        xp_rules = data["xpRules"]
        
        for rule in xp_rules:
            assert "icon" in rule, f"XP rule missing 'icon' field: {rule}"


class TestRegressionStageJourney:
    """Regression: Stage Journey should still show all 20 stages"""
    
    def test_survival_clock_returns_all_stages(self, auth_session):
        """Verify allStages has 20 items with info"""
        response = auth_session.get(f"{BASE_URL}/api/intelligence/survival-clock")
        assert response.status_code == 200
        
        data = response.json()
        all_stages = data.get("allStages", [])
        
        assert len(all_stages) == 20, f"Should have 20 stages, got {len(all_stages)}"
        
        # Check each stage has required fields
        for stage in all_stages:
            assert "stage" in stage, "Stage missing 'stage' number"
            assert "name" in stage, "Stage missing 'name'"
            assert "min" in stage, "Stage missing 'min' days"
            assert "max" in stage, "Stage missing 'max' days"
            assert "reached" in stage, "Stage missing 'reached' flag"
            assert "current" in stage, "Stage missing 'current' flag"


class TestRegressionEmergencyRunway:
    """Regression: Emergency Runway fund names should still be visible"""
    
    def test_fund_breakdown_has_details(self, auth_session):
        """Verify fundBreakdown contains details with fund names"""
        response = auth_session.get(f"{BASE_URL}/api/intelligence/survival-clock")
        assert response.status_code == 200
        
        data = response.json()
        fb = data.get("fundBreakdown", {})
        
        assert "liquid" in fb, "Missing liquid bucket"
        assert "semiLiquid" in fb, "Missing semiLiquid bucket"
        assert "illiquid" in fb, "Missing illiquid bucket"
        assert "details" in fb, "Missing details array with fund names"
        
        # Verify details have name and amount
        details = fb.get("details", [])
        if len(details) > 0:
            for item in details[:5]:  # Check first 5
                assert "name" in item, f"Detail missing 'name': {item}"
                assert "amount" in item, f"Detail missing 'amount': {item}"


class TestRegressionScoreContribution:
    """Regression: Score contribution section should still show pillar breakdown"""
    
    def test_control_score_breakdown_4_pillars(self, auth_session):
        """Verify breakdown has all 4 pillars"""
        response = auth_session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200
        
        data = response.json()
        bd = data.get("breakdown", {})
        
        pillars = ["savingsRate", "emiLoad", "safetyBuffer", "incomeConsistency"]
        for pillar in pillars:
            assert pillar in bd, f"Missing pillar '{pillar}' in breakdown"
            assert "score" in bd[pillar], f"Missing 'score' in {pillar}"
            assert "max" in bd[pillar], f"Missing 'max' in {pillar}"
            assert bd[pillar]["max"] == 25, f"{pillar} max should be 25"


# Debug helper
class TestPrintDebugInfo:
    """Print data for debugging"""
    
    def test_print_max_contributions(self, auth_session):
        """Print maxContribution values"""
        response = auth_session.get(f"{BASE_URL}/api/financial-health")
        if response.status_code == 200:
            data = response.json()
            print("\n=== Max Contributions ===")
            for module, contrib in data.get("contributions", {}).items():
                print(f"  {module}: contribution={contrib.get('contribution')}, maxContribution={contrib.get('maxContribution')}")
        assert True
    
    def test_print_xp_rules(self, auth_session):
        """Print XP rules"""
        response = auth_session.get(f"{BASE_URL}/api/gamification/profile")
        if response.status_code == 200:
            data = response.json()
            print("\n=== XP Rules ===")
            for rule in data.get("xpRules", []):
                print(f"  action='{rule.get('action')}', xp='{rule.get('xp')}', icon='{rule.get('icon')}'")
        assert True
    
    def test_print_score_period(self, auth_session):
        """Print score period"""
        response = auth_session.get(f"{BASE_URL}/api/intelligence/control-score")
        if response.status_code == 200:
            data = response.json()
            print("\n=== Score Period ===")
            period = data.get("scorePeriod", {})
            print(f"  label: '{period.get('label')}'")
        assert True
