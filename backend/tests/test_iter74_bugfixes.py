"""
Test Iteration 74 Bug Fixes - Empty State Behavior
Verifies that empty users see correct zero values instead of misleading defaults.

Bug fixes tested:
1. Financial Health score = 0 for empty user (was 47)
2. Financial Score (control-score) = 0 for empty user (was 50)
3. Survival Days = 0 for empty user (was 999)
4. Journey level = Stage 1 "Exposed" for empty user (was 19 "Financially Free")
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEmptyUserZeroState:
    """Tests for empty user showing correct zero values"""
    
    @pytest.fixture(scope="class")
    def empty_user_session(self):
        """Create a new user with no financial data"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Register new user with unique email
        unique_email = f"test_empty_{uuid.uuid4().hex[:8]}@test.com"
        register_data = {
            "email": unique_email,
            "password": "TestPass123!",
            "name": "Empty Test User",
            "firstName": "Empty",
            "lastName": "Test",
            "sex": "male",
            "dateOfBirth": "1995-01-01"
        }
        
        response = session.post(f"{BASE_URL}/api/auth/register", json=register_data)
        
        if response.status_code != 200:
            pytest.skip(f"Could not create test user: {response.text}")
        
        user_data = response.json()
        yield session
        
        # Cleanup - skip if endpoint doesn't exist
        try:
            session.delete(f"{BASE_URL}/api/auth/delete-account")
        except:
            pass
    
    def test_financial_score_zero_for_empty_user(self, empty_user_session):
        """BUG FIX: Financial Score should be 0 (not 50) for user with no data"""
        response = empty_user_session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["finalScore"] == 0, f"Expected 0, got {data['finalScore']} - Bug: should not show 50 for empty user"
        assert data["grade"] == "N/A", f"Expected N/A grade for empty user, got {data['grade']}"
        assert data["scorePeriod"]["label"] == "No data available"
        assert data["metrics"]["monthlyIncome"] == 0
        assert data["metrics"]["monthlyExpenses"] == 0
        print(f"✓ Financial Score = {data['finalScore']}, Grade = {data['grade']}")
    
    def test_survival_days_zero_for_empty_user(self, empty_user_session):
        """BUG FIX: Survival Days should be 0 (not 999) for user with no data"""
        response = empty_user_session.get(f"{BASE_URL}/api/intelligence/survival-clock")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["survivalDays"] == 0, f"Expected 0, got {data['survivalDays']} - Bug: should not show 999 days for empty user"
        assert data["survivalMonths"] == 0.0, f"Expected 0.0 months, got {data['survivalMonths']}"
        assert data["effectiveFunds"] == 0, f"Expected 0 funds, got {data['effectiveFunds']}"
        print(f"✓ Survival Days = {data['survivalDays']}, Months = {data['survivalMonths']}")
    
    def test_journey_level_exposed_for_empty_user(self, empty_user_session):
        """BUG FIX: Journey level should be Stage 1 'Exposed' (not 19 'Financially Free') for empty user"""
        response = empty_user_session.get(f"{BASE_URL}/api/intelligence/survival-clock")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["stage"] == 1, f"Expected stage 1, got {data['stage']} - Bug: empty user should be at Stage 1"
        assert data["level"] == "Exposed", f"Expected 'Exposed', got {data['level']}"
        assert data["phase"] == "Critical", f"Expected 'Critical' phase, got {data['phase']}"
        print(f"✓ Stage = {data['stage']}, Level = {data['level']}, Phase = {data['phase']}")
    
    def test_financial_health_zero_for_empty_user(self, empty_user_session):
        """BUG FIX: Financial Health Score should be 0 (not 47) for user with no data"""
        response = empty_user_session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["overallScore"] == 0, f"Expected 0, got {data['overallScore']} - Bug: should not show 47 for empty user"
        
        # All contribution scores should be 0 for empty user
        for key, contribution in data["contributions"].items():
            assert contribution["contribution"] == 0, f"{key} contribution should be 0, got {contribution['contribution']}"
        
        print(f"✓ Financial Health Score = {data['overallScore']}")


class TestSeededUserNonZeroValues:
    """Tests for seeded test user showing correct non-zero values"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Login as seeded test user"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        
        if response.status_code != 200:
            pytest.skip(f"Could not login: {response.text}")
        
        return session
    
    def test_seeded_user_financial_score_non_zero(self, auth_session):
        """Seeded test user should have Financial Score ~95"""
        response = auth_session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Expected ~95 based on previous iteration context
        assert data["finalScore"] >= 90, f"Expected ~95, got {data['finalScore']}"
        assert data["grade"] in ["A", "B"], f"Expected grade A or B, got {data['grade']}"
        print(f"✓ Seeded User Financial Score = {data['finalScore']}, Grade = {data['grade']}")
    
    def test_seeded_user_survival_days_non_zero(self, auth_session):
        """Seeded test user should have Survival Days ~433"""
        response = auth_session.get(f"{BASE_URL}/api/intelligence/survival-clock")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Expected ~433 based on previous iteration context
        assert data["survivalDays"] >= 400, f"Expected ~433, got {data['survivalDays']}"
        assert data["stage"] >= 15, f"Expected stage >= 15, got {data['stage']}"
        print(f"✓ Seeded User Survival Days = {data['survivalDays']}, Stage = {data['stage']}")
    
    def test_seeded_user_financial_health_non_zero(self, auth_session):
        """Seeded test user should have Financial Health ~66"""
        response = auth_session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Expected ~66 based on previous iteration context
        assert data["overallScore"] >= 60, f"Expected ~66, got {data['overallScore']}"
        print(f"✓ Seeded User Financial Health = {data['overallScore']}")


class TestInsightsAPIsLoad:
    """Test that Insights page APIs all return 200"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test", "password": "test"
        })
        if response.status_code != 200:
            pytest.skip("Could not login")
        return session
    
    def test_survival_clock_api(self, auth_session):
        """Phase 1 - Critical: survival-clock loads"""
        response = auth_session.get(f"{BASE_URL}/api/intelligence/survival-clock")
        assert response.status_code == 200
        data = response.json()
        assert "survivalDays" in data
        print(f"✓ survival-clock API OK - {data['survivalDays']} days")
    
    def test_control_score_api(self, auth_session):
        """Phase 1 - Critical: control-score loads"""
        response = auth_session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert response.status_code == 200
        data = response.json()
        assert "finalScore" in data
        print(f"✓ control-score API OK - Score: {data['finalScore']}")
    
    def test_gamification_profile_api(self, auth_session):
        """Phase 1 - Critical: gamification profile loads"""
        response = auth_session.get(f"{BASE_URL}/api/gamification/profile")
        assert response.status_code == 200
        data = response.json()
        assert "level" in data or "xp" in data or "profile" in data
        print(f"✓ gamification/profile API OK")
    
    def test_behavior_alerts_api(self, auth_session):
        """Phase 2 - Secondary: behavior-alerts loads"""
        response = auth_session.get(f"{BASE_URL}/api/intelligence/behavior-alerts")
        assert response.status_code == 200
        data = response.json()
        assert "alerts" in data
        print(f"✓ behavior-alerts API OK - {len(data['alerts'])} alerts")
    
    def test_gamification_challenges_api(self, auth_session):
        """Phase 2 - Secondary: gamification challenges loads"""
        response = auth_session.get(f"{BASE_URL}/api/gamification/challenges")
        assert response.status_code == 200
        print(f"✓ gamification/challenges API OK")
    
    def test_money_pattern_api(self, auth_session):
        """Phase 2 - Secondary: money-pattern loads"""
        response = auth_session.get(f"{BASE_URL}/api/intelligence/money-pattern")
        assert response.status_code == 200
        data = response.json()
        assert "personality" in data
        print(f"✓ money-pattern API OK - {data['personality']}")
    
    def test_future_you_api(self, auth_session):
        """Phase 2 - Secondary: future-you loads"""
        response = auth_session.get(f"{BASE_URL}/api/intelligence/future-you")
        assert response.status_code == 200
        data = response.json()
        assert "projections" in data
        print(f"✓ future-you API OK")
    
    def test_personality_history_api(self, auth_session):
        """Phase 2 - Secondary: personality-history loads"""
        response = auth_session.get(f"{BASE_URL}/api/intelligence/personality-history")
        assert response.status_code == 200
        print(f"✓ personality-history API OK")


class TestReportsGeneration:
    """Test that PDF reports still generate correctly"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test", "password": "test"
        })
        if response.status_code != 200:
            pytest.skip("Could not login")
        return session
    
    @pytest.mark.parametrize("report_type", ["expense", "income", "cashflow", "networth"])
    def test_report_generation(self, auth_session, report_type):
        """Test all report types generate"""
        response = auth_session.get(
            f"{BASE_URL}/api/reports/generate/{report_type}",
            params={"format": "pdf"}
        )
        assert response.status_code == 200, f"{report_type} report failed: {response.text}"
        assert len(response.content) > 1000, f"{report_type} report too small"
        print(f"✓ {report_type} report generated - {len(response.content)} bytes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
