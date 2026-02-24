"""
Test cases for Financial Intelligence and Gamification APIs.
Tests: Survival Clock, Control Score, Behavior Alerts, Gamification Profile,
       Process Weekly, Challenges, Share Card
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestIntelligenceGamification:
    """Tests for intelligence and gamification APIs."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and store session."""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.user_data = login_resp.json()
    
    # ─── SURVIVAL CLOCK API ───
    def test_survival_clock_returns_expected_fields(self):
        """GET /api/intelligence/survival-clock - verify response structure."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/survival-clock")
        assert resp.status_code == 200, f"Survival clock failed: {resp.text}"
        data = resp.json()
        
        # Verify required fields
        assert "liquidFunds" in data
        assert "monthlyMandatoryExpense" in data
        assert "dailyBurnRate" in data
        assert "survivalDays" in data
        assert "level" in data
        
        # Verify data types
        assert isinstance(data["liquidFunds"], (int, float))
        assert isinstance(data["monthlyMandatoryExpense"], (int, float))
        assert isinstance(data["survivalDays"], int)
        assert data["level"] in ["CRITICAL", "VULNERABLE", "STABLE", "SECURE", "FINANCIAL WARRIOR"]
    
    def test_survival_clock_unauthenticated_fails(self):
        """GET /api/intelligence/survival-clock - fails without auth."""
        new_session = requests.Session()
        resp = new_session.get(f"{BASE_URL}/api/intelligence/survival-clock")
        assert resp.status_code == 401
    
    # ─── CONTROL SCORE API ───
    def test_control_score_returns_expected_fields(self):
        """GET /api/intelligence/control-score - verify response structure."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert resp.status_code == 200, f"Control score failed: {resp.text}"
        data = resp.json()
        
        # Verify required fields
        assert "finalScore" in data
        assert "grade" in data
        assert "breakdown" in data
        assert "metrics" in data
        
        # Verify breakdown components
        breakdown = data["breakdown"]
        assert "cashControl" in breakdown
        assert "debtPressure" in breakdown
        assert "liquidity" in breakdown
        assert "stability" in breakdown
        
        # Verify score ranges
        assert 0 <= data["finalScore"] <= 100
        assert data["grade"] in ["A", "B", "C", "D", "E"]
        
        # Verify each breakdown has score and ratio/value
        for key in ["cashControl", "debtPressure", "liquidity", "stability"]:
            assert "score" in breakdown[key]
            assert 0 <= breakdown[key]["score"] <= 25
    
    def test_control_score_unauthenticated_fails(self):
        """GET /api/intelligence/control-score - fails without auth."""
        new_session = requests.Session()
        resp = new_session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert resp.status_code == 401
    
    # ─── BEHAVIOR ALERTS API ───
    def test_behavior_alerts_returns_expected_fields(self):
        """GET /api/intelligence/behavior-alerts - verify response structure."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/behavior-alerts")
        assert resp.status_code == 200, f"Behavior alerts failed: {resp.text}"
        data = resp.json()
        
        # Verify required fields
        assert "alerts" in data
        assert "alertCount" in data
        assert "highCount" in data
        assert "generated_at" in data
        
        # Verify alerts is a list
        assert isinstance(data["alerts"], list)
        assert data["alertCount"] == len(data["alerts"])
        
        # Verify alert structure if alerts exist
        if data["alerts"]:
            alert = data["alerts"][0]
            assert "type" in alert
            assert "severity" in alert
            assert "message" in alert
            assert alert["severity"] in ["HIGH", "MEDIUM", "LOW"]
    
    def test_behavior_alerts_unauthenticated_fails(self):
        """GET /api/intelligence/behavior-alerts - fails without auth."""
        new_session = requests.Session()
        resp = new_session.get(f"{BASE_URL}/api/intelligence/behavior-alerts")
        assert resp.status_code == 401
    
    # ─── GAMIFICATION PROFILE API ───
    def test_gamification_profile_returns_expected_fields(self):
        """GET /api/gamification/profile - verify response structure."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200, f"Gamification profile failed: {resp.text}"
        data = resp.json()
        
        # Verify required fields
        assert "level" in data
        assert "title" in data
        assert "currentXP" in data
        assert "streak" in data
        assert "achievements" in data
        assert "activeChallenges" in data
        assert "allAchievements" in data
        
        # Verify data types
        assert isinstance(data["level"], int)
        assert isinstance(data["currentXP"], int)
        assert isinstance(data["streak"], int)
        assert isinstance(data["achievements"], list)
        assert isinstance(data["allAchievements"], list)
        
        # Verify all achievements have required fields
        for ach in data["allAchievements"]:
            assert "code" in ach
            assert "title" in ach
            assert "description" in ach
            assert "unlocked" in ach
    
    def test_gamification_profile_unauthenticated_fails(self):
        """GET /api/gamification/profile - fails without auth."""
        new_session = requests.Session()
        resp = new_session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 401
    
    # ─── GAMIFICATION PROCESS API ───
    def test_gamification_process_returns_expected_fields(self):
        """POST /api/gamification/process - verify response structure."""
        resp = self.session.post(f"{BASE_URL}/api/gamification/process")
        assert resp.status_code == 200, f"Gamification process failed: {resp.text}"
        data = resp.json()
        
        # Verify required fields
        assert "xpEarned" in data
        assert "totalXP" in data
        assert "xpBreakdown" in data
        assert "leveledUp" in data
        assert "newLevel" in data
        assert "streak" in data
        assert "score" in data
        assert "survivalDays" in data
        assert "newAchievements" in data
        
        # Verify data types
        assert isinstance(data["xpEarned"], int)
        assert isinstance(data["totalXP"], int)
        assert isinstance(data["xpBreakdown"], list)
        assert isinstance(data["leveledUp"], bool)
        assert isinstance(data["newAchievements"], list)
        
        # Verify newLevel structure
        new_level = data["newLevel"]
        assert "level" in new_level
        assert "title" in new_level
        assert "currentXP" in new_level
    
    def test_gamification_process_unauthenticated_fails(self):
        """POST /api/gamification/process - fails without auth."""
        new_session = requests.Session()
        resp = new_session.post(f"{BASE_URL}/api/gamification/process")
        assert resp.status_code == 401
    
    # ─── CHALLENGES API ───
    def test_challenges_list_returns_expected_fields(self):
        """GET /api/gamification/challenges - verify response structure."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/challenges")
        assert resp.status_code == 200, f"Challenges list failed: {resp.text}"
        data = resp.json()
        
        # Verify required fields
        assert "active" in data
        assert "available" in data
        assert "completed" in data
        
        # Verify lists
        assert isinstance(data["active"], list)
        assert isinstance(data["available"], list)
        assert isinstance(data["completed"], list)
        
        # Verify available challenge structure
        if data["available"]:
            ch = data["available"][0]
            assert "code" in ch
            assert "title" in ch
            assert "description" in ch
            assert "xp_reward" in ch
    
    def test_join_challenge_works(self):
        """POST /api/gamification/challenges/{code}/join - join a challenge."""
        # First check available challenges
        list_resp = self.session.get(f"{BASE_URL}/api/gamification/challenges")
        assert list_resp.status_code == 200
        data = list_resp.json()
        
        available = data["available"]
        if available:
            # Try to join the first available challenge
            code = available[0]["code"]
            join_resp = self.session.post(f"{BASE_URL}/api/gamification/challenges/{code}/join")
            
            # Should succeed or already enrolled
            if join_resp.status_code == 200:
                join_data = join_resp.json()
                assert join_data["success"] is True
                assert "challenge" in join_data
            elif join_resp.status_code == 400:
                # Already enrolled is acceptable
                assert "Already enrolled" in join_resp.json().get("detail", "")
        else:
            pytest.skip("No available challenges to test join")
    
    def test_join_invalid_challenge_fails(self):
        """POST /api/gamification/challenges/{code}/join - fails for invalid challenge."""
        resp = self.session.post(f"{BASE_URL}/api/gamification/challenges/INVALID_CODE/join")
        assert resp.status_code == 404
    
    def test_challenges_unauthenticated_fails(self):
        """GET /api/gamification/challenges - fails without auth."""
        new_session = requests.Session()
        resp = new_session.get(f"{BASE_URL}/api/gamification/challenges")
        assert resp.status_code == 401
    
    # ─── SHARE CARD API ───
    def test_share_card_returns_expected_fields(self):
        """GET /api/gamification/share-card - verify response structure."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/share-card")
        assert resp.status_code == 200, f"Share card failed: {resp.text}"
        data = resp.json()
        
        # Verify required fields
        assert "name" in data
        assert "level" in data
        assert "levelNumber" in data
        assert "xp" in data
        assert "survivalDays" in data
        assert "controlScore" in data
        assert "streak" in data
        assert "achievements" in data
        assert "generated_at" in data
        
        # Verify data types
        assert isinstance(data["levelNumber"], int)
        assert isinstance(data["xp"], int)
        assert isinstance(data["survivalDays"], int)
        assert isinstance(data["controlScore"], int)
        assert isinstance(data["streak"], int)
        assert isinstance(data["achievements"], int)
    
    def test_share_card_unauthenticated_fails(self):
        """GET /api/gamification/share-card - fails without auth."""
        new_session = requests.Session()
        resp = new_session.get(f"{BASE_URL}/api/gamification/share-card")
        assert resp.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
