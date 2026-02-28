"""
Iteration 101 Tests: Insurance page, back buttons, and Financial Intelligence API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFinancialIntelligenceAPI:
    """Test the Financial Intelligence Engine - /api/expenses/overspend-analysis"""

    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test@moneyssutra.com", "password": "test"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        return session

    def test_overspend_analysis_endpoint_returns_200(self, auth_session):
        """Test that the overspend-analysis endpoint returns 200"""
        response = auth_session.get(f"{BASE_URL}/api/expenses/overspend-analysis")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ /api/expenses/overspend-analysis returns 200")

    def test_overspend_analysis_has_required_fields(self, auth_session):
        """Test overspend-analysis returns required fields for Financial Intelligence"""
        response = auth_session.get(f"{BASE_URL}/api/expenses/overspend-analysis")
        assert response.status_code == 200
        data = response.json()
        
        # Check required top-level fields
        required_fields = [
            "actualRatios", "daysOfSafety", "primaryAdvice", 
            "overspendAlerts", "structuralAlerts", "incomeRatioAlerts",
            "recommendedRatios", "template", "monthlyIncome", "monthlySpend"
        ]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        print(f"✓ overspend-analysis has all required fields: {required_fields}")

    def test_overspend_analysis_actual_ratios_structure(self, auth_session):
        """Test actualRatios contains essential/lifestyle/wealth percentages"""
        response = auth_session.get(f"{BASE_URL}/api/expenses/overspend-analysis")
        assert response.status_code == 200
        data = response.json()
        
        ratios = data.get("actualRatios", {})
        assert "essential" in ratios, "actualRatios missing 'essential'"
        assert "lifestyle" in ratios, "actualRatios missing 'lifestyle'"
        assert "wealth" in ratios, "actualRatios missing 'wealth'"
        
        # Check they are numeric
        assert isinstance(ratios["essential"], (int, float)), "essential should be numeric"
        assert isinstance(ratios["lifestyle"], (int, float)), "lifestyle should be numeric"
        assert isinstance(ratios["wealth"], (int, float)), "wealth should be numeric"
        
        print(f"✓ actualRatios structure valid: essential={ratios['essential']}%, lifestyle={ratios['lifestyle']}%, wealth={ratios['wealth']}%")

    def test_overspend_analysis_days_of_safety(self, auth_session):
        """Test daysOfSafety is present and numeric"""
        response = auth_session.get(f"{BASE_URL}/api/expenses/overspend-analysis")
        assert response.status_code == 200
        data = response.json()
        
        days = data.get("daysOfSafety")
        assert days is not None, "daysOfSafety should not be None"
        assert isinstance(days, (int, float)), "daysOfSafety should be numeric"
        print(f"✓ daysOfSafety is valid: {days} days")

    def test_overspend_analysis_primary_advice(self, auth_session):
        """Test primaryAdvice is present and non-empty string"""
        response = auth_session.get(f"{BASE_URL}/api/expenses/overspend-analysis")
        assert response.status_code == 200
        data = response.json()
        
        advice = data.get("primaryAdvice")
        assert advice is not None, "primaryAdvice should not be None"
        assert isinstance(advice, str), "primaryAdvice should be a string"
        assert len(advice) > 0, "primaryAdvice should not be empty"
        print(f"✓ primaryAdvice is valid: '{advice[:60]}...'")


class TestInsuranceAPI:
    """Test Insurance API to ensure it returns valid data (no crashes)"""

    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test@moneyssutra.com", "password": "test"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        return session

    def test_insurances_list_returns_200(self, auth_session):
        """Test that /api/insurances returns 200 and valid data"""
        response = auth_session.get(f"{BASE_URL}/api/insurances")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Insurances should return a list"
        print(f"✓ /api/insurances returns 200 with {len(data)} policies")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
