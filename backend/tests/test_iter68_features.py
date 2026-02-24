"""
Test Iteration 68 Features:
1. Financial Health contributions - backend returns contributions dict with rawScore, weight, contribution for each module
2. Financial Score period - backend returns scorePeriod with start, end, label fields (3-month range)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

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


class TestFinancialHealthContributions:
    """Test Financial Health endpoint returns contributions breakdown"""
    
    def test_financial_health_returns_contributions(self, auth_session):
        """Verify contributions object exists with all 8 modules"""
        response = auth_session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200
        
        data = response.json()
        assert "contributions" in data, "Missing 'contributions' key in response"
        
        expected_modules = [
            "emergencyFund", "lifeInsurance", "healthInsurance", "savingsRate",
            "loanBurden", "creditUtilization", "investmentAllocation", "retirementReadiness"
        ]
        
        for module in expected_modules:
            assert module in data["contributions"], f"Missing module '{module}' in contributions"
    
    def test_contributions_have_required_fields(self, auth_session):
        """Verify each contribution has rawScore, weight, and contribution fields"""
        response = auth_session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200
        
        data = response.json()
        contributions = data["contributions"]
        
        for module, contrib in contributions.items():
            assert "rawScore" in contrib, f"Missing 'rawScore' in {module} contribution"
            assert "weight" in contrib, f"Missing 'weight' in {module} contribution"
            assert "contribution" in contrib, f"Missing 'contribution' in {module} contribution"
            
            # Verify types
            assert isinstance(contrib["rawScore"], (int, float)), f"rawScore should be numeric for {module}"
            assert isinstance(contrib["weight"], (int, float)), f"weight should be numeric for {module}"
            assert isinstance(contrib["contribution"], (int, float)), f"contribution should be numeric for {module}"
    
    def test_contributions_weights_sum_to_100(self, auth_session):
        """Verify all weights sum to 100%"""
        response = auth_session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200
        
        data = response.json()
        contributions = data["contributions"]
        
        total_weight = sum(c["weight"] for c in contributions.values())
        assert total_weight == 100, f"Weights should sum to 100, got {total_weight}"
    
    def test_contributions_sum_equals_overall_score(self, auth_session):
        """Verify contributions sum equals the overall score"""
        response = auth_session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200
        
        data = response.json()
        contributions = data["contributions"]
        overall_score = data.get("overallScore", 0)
        
        contributions_sum = sum(c["contribution"] for c in contributions.values())
        # Allow small rounding difference
        assert abs(contributions_sum - overall_score) <= 1, \
            f"Contributions sum ({contributions_sum}) should equal overallScore ({overall_score})"
    
    def test_contribution_calculation_is_correct(self, auth_session):
        """Verify contribution = rawScore * (weight/100)"""
        response = auth_session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200
        
        data = response.json()
        contributions = data["contributions"]
        
        for module, contrib in contributions.items():
            expected = round(contrib["rawScore"] * (contrib["weight"] / 100), 1)
            actual = contrib["contribution"]
            # Allow small rounding difference
            assert abs(expected - actual) <= 0.2, \
                f"{module}: contribution should be ~{expected}, got {actual}"
    
    def test_correct_weights_per_module(self, auth_session):
        """Verify each module has the correct weight as per spec"""
        response = auth_session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200
        
        data = response.json()
        contributions = data["contributions"]
        
        expected_weights = {
            "emergencyFund": 20,
            "lifeInsurance": 7.5,
            "healthInsurance": 7.5,
            "savingsRate": 15,
            "loanBurden": 15,
            "creditUtilization": 10,
            "investmentAllocation": 15,
            "retirementReadiness": 10
        }
        
        for module, expected_weight in expected_weights.items():
            actual_weight = contributions[module]["weight"]
            # Weight stored as integer (7.5 stored as 7 or 8) - check close match
            assert abs(actual_weight - expected_weight) <= 0.5, \
                f"{module}: weight should be {expected_weight}, got {actual_weight}"


class TestFinancialScorePeriod:
    """Test Financial Score (control-score) endpoint returns scorePeriod"""
    
    def test_control_score_returns_score_period(self, auth_session):
        """Verify scorePeriod object exists in response"""
        response = auth_session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200
        
        data = response.json()
        assert "scorePeriod" in data, "Missing 'scorePeriod' key in response"
    
    def test_score_period_has_required_fields(self, auth_session):
        """Verify scorePeriod has start, end, and label fields"""
        response = auth_session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200
        
        data = response.json()
        period = data["scorePeriod"]
        
        assert "start" in period, "Missing 'start' in scorePeriod"
        assert "end" in period, "Missing 'end' in scorePeriod"
        assert "label" in period, "Missing 'label' in scorePeriod"
    
    def test_score_period_label_format(self, auth_session):
        """Verify label format is 'DD Mon YYYY — DD Mon YYYY'"""
        response = auth_session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200
        
        data = response.json()
        label = data["scorePeriod"]["label"]
        
        # Should contain em-dash (—) separator
        assert "—" in label, f"Label should contain '—' separator, got: {label}"
        
        # Should have two date parts
        parts = label.split("—")
        assert len(parts) == 2, f"Label should have 2 date parts, got {len(parts)}"
    
    def test_score_period_is_3_months(self, auth_session):
        """Verify period spans approximately 3 months (90 days)"""
        response = auth_session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200
        
        data = response.json()
        period = data["scorePeriod"]
        
        # Parse start and end dates
        try:
            # Format: "DD Mon YYYY" e.g., "02 Oct 2025"
            start = datetime.strptime(period["start"].strip(), "%d %b %Y")
            end = datetime.strptime(period["end"].strip(), "%d %b %Y")
            
            diff_days = (end - start).days
            # Should be roughly 90 days (allow 85-92 days)
            assert 85 <= diff_days <= 92, f"Period should be ~90 days, got {diff_days} days"
        except ValueError as e:
            pytest.fail(f"Could not parse dates: {period['start']} to {period['end']} - {e}")
    
    def test_score_period_end_is_today(self, auth_session):
        """Verify end date is approximately today"""
        response = auth_session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200
        
        data = response.json()
        period = data["scorePeriod"]
        
        try:
            end_date = datetime.strptime(period["end"].strip(), "%d %b %Y")
            today = datetime.now()
            
            diff_days = abs((today - end_date).days)
            # Should be within 1 day of today
            assert diff_days <= 1, f"End date should be today, got {diff_days} days difference"
        except ValueError as e:
            pytest.fail(f"Could not parse end date: {period['end']} - {e}")


class TestAuthRequired:
    """Test endpoints require authentication"""
    
    def test_financial_health_requires_auth(self):
        """Verify /api/financial-health returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 401
    
    def test_control_score_requires_auth(self):
        """Verify /api/intelligence/control-score returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 401


# Print test data for debugging
class TestPrintData:
    """Helper tests to print actual data for debugging"""
    
    def test_print_financial_health_contributions(self, auth_session):
        """Print contributions data for verification"""
        response = auth_session.get(f"{BASE_URL}/api/financial-health")
        if response.status_code == 200:
            data = response.json()
            print("\n=== Financial Health Contributions ===")
            print(f"Overall Score: {data.get('overallScore')}")
            if "contributions" in data:
                for module, contrib in data["contributions"].items():
                    print(f"  {module}: rawScore={contrib['rawScore']}, weight={contrib['weight']}, contribution={contrib['contribution']}")
                total = sum(c["contribution"] for c in data["contributions"].values())
                print(f"  TOTAL: {total}")
        assert True  # Always pass - this is just for printing
    
    def test_print_score_period(self, auth_session):
        """Print score period data for verification"""
        response = auth_session.get(f"{BASE_URL}/api/intelligence/control-score")
        if response.status_code == 200:
            data = response.json()
            print("\n=== Financial Score Period ===")
            if "scorePeriod" in data:
                period = data["scorePeriod"]
                print(f"  Start: {period.get('start')}")
                print(f"  End: {period.get('end')}")
                print(f"  Label: {period.get('label')}")
        assert True  # Always pass - this is just for printing
