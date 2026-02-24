"""
Test cases for P0 Polish - Financial Intelligence and Gamification Enhancements.
Tests: Level progression with allLevels/xpRules, 20 achievements, challenge leave/explainer, max badges
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestP0GamificationEnhancements:
    """Tests for P0 Polish gamification enhancements."""
    
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
    
    # ─── GAMIFICATION PROFILE - LEVEL PROGRESSION ENHANCEMENTS ───
    def test_profile_returns_all_levels_array(self):
        """GET /api/gamification/profile - verify allLevels array returned."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200, f"Profile failed: {resp.text}"
        data = resp.json()
        
        # Verify allLevels is present and is array
        assert "allLevels" in data, "allLevels missing from profile response"
        assert isinstance(data["allLevels"], list), "allLevels should be a list"
        assert len(data["allLevels"]) == 6, f"Expected 6 levels, got {len(data['allLevels'])}"
        
        # Verify each level structure
        for level in data["allLevels"]:
            assert "level" in level
            assert "title" in level
            assert "min_xp" in level
            assert "stage" in level
            assert "reached" in level
            assert isinstance(level["reached"], bool)
    
    def test_profile_returns_stage_and_description(self):
        """GET /api/gamification/profile - verify stage and description fields."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200
        data = resp.json()
        
        # Verify stage and description
        assert "stage" in data, "stage missing from profile response"
        assert "description" in data, "description missing from profile response"
        assert data["stage"] in ["survival", "stabilization", "control", "expansion", "command", "freedom"]
    
    def test_profile_returns_prev_level_title(self):
        """GET /api/gamification/profile - verify prevLevelTitle field."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200
        data = resp.json()
        
        # prevLevelTitle should be present (can be null for level 1)
        assert "prevLevelTitle" in data, "prevLevelTitle missing from profile response"
        
        # If level > 1, prevLevelTitle should not be None
        if data["level"] > 1:
            assert data["prevLevelTitle"] is not None
    
    def test_profile_returns_max_badges_unlocked(self):
        """GET /api/gamification/profile - verify maxBadgesUnlocked field."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200
        data = resp.json()
        
        # Verify maxBadgesUnlocked
        assert "maxBadgesUnlocked" in data, "maxBadgesUnlocked missing from profile response"
        assert isinstance(data["maxBadgesUnlocked"], int)
        assert data["maxBadgesUnlocked"] >= data.get("achievementCount", 0), "maxBadges should be >= current badges"
    
    def test_profile_returns_xp_rules(self):
        """GET /api/gamification/profile - verify xpRules array returned."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200
        data = resp.json()
        
        # Verify xpRules
        assert "xpRules" in data, "xpRules missing from profile response"
        assert isinstance(data["xpRules"], list)
        assert len(data["xpRules"]) > 0, "xpRules should not be empty"
        
        # Verify xpRules structure
        for rule in data["xpRules"]:
            assert "action" in rule, "action missing from xpRule"
            assert "xp" in rule, "xp missing from xpRule"
            assert "icon" in rule, "icon missing from xpRule"
    
    # ─── 20 ACHIEVEMENTS VERIFICATION ───
    def test_profile_returns_20_total_achievements(self):
        """GET /api/gamification/profile - verify 20 total achievements."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200
        data = resp.json()
        
        # Verify total achievements is 20
        assert "totalAchievements" in data, "totalAchievements missing"
        assert data["totalAchievements"] == 20, f"Expected 20 achievements, got {data['totalAchievements']}"
        
        # Verify allAchievements list has 20 items
        assert "allAchievements" in data
        assert len(data["allAchievements"]) == 20, f"allAchievements should have 20 items"
    
    def test_achievements_have_categories(self):
        """GET /api/gamification/profile - verify achievements have category field."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200
        data = resp.json()
        
        # Verify each achievement has category
        for ach in data["allAchievements"]:
            assert "category" in ach, f"Achievement {ach.get('code')} missing category"
        
        # Verify expected categories exist
        categories = set(a["category"] for a in data["allAchievements"])
        expected_cats = {"starter", "behavior", "survival", "score", "streak", "debt", "insurance", "emergency", "investment", "goals", "income"}
        assert categories.issubset(expected_cats) or expected_cats.issubset(categories), f"Unexpected categories: {categories}"
    
    def test_domain_specific_achievements_present(self):
        """Verify new domain achievements are present: INSURANCE_COVERED, EMERGENCY_FUND, DIVERSIFIED, etc."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200
        data = resp.json()
        
        achievement_codes = [a["code"] for a in data["allAchievements"]]
        
        # Verify new domain achievements
        expected_new_achievements = [
            "INSURANCE_COVERED", "EMERGENCY_FUND", "DIVERSIFIED", 
            "BUDGET_MASTER", "GOAL_SETTER", "INCOME_DIVERSIFIED", "CONTROL_60"
        ]
        for code in expected_new_achievements:
            assert code in achievement_codes, f"New achievement {code} missing from allAchievements"
    
    # ─── CHALLENGES - EXPLAINER AND DIFFICULTY ───
    def test_challenges_have_difficulty_field(self):
        """GET /api/gamification/challenges - verify difficulty field on available challenges."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/challenges")
        assert resp.status_code == 200
        data = resp.json()
        
        # Check available challenges have difficulty
        for challenge in data.get("available", []):
            assert "difficulty" in challenge, f"Challenge {challenge.get('code')} missing difficulty"
            assert challenge["difficulty"] in ["Easy", "Medium", "Hard"]
    
    def test_challenges_have_explainer_text(self):
        """GET /api/gamification/challenges - verify explainer text on available challenges."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/challenges")
        assert resp.status_code == 200
        data = resp.json()
        
        # Check available challenges have explainer
        for challenge in data.get("available", []):
            assert "explainer" in challenge, f"Challenge {challenge.get('code')} missing explainer"
            assert isinstance(challenge["explainer"], str)
            assert len(challenge["explainer"]) > 20, "Explainer should be a meaningful description"
    
    # ─── CHALLENGE LEAVE/ABANDON ENDPOINT ───
    def test_leave_challenge_endpoint_exists(self):
        """DELETE /api/gamification/challenges/{id}/leave - verify endpoint works."""
        # First get list of challenges
        list_resp = self.session.get(f"{BASE_URL}/api/gamification/challenges")
        assert list_resp.status_code == 200
        data = list_resp.json()
        
        active_challenges = data.get("active", [])
        
        if not active_challenges:
            # Try to join a challenge first so we can test leave
            available = data.get("available", [])
            if available:
                join_code = available[0]["code"]
                join_resp = self.session.post(f"{BASE_URL}/api/gamification/challenges/{join_code}/join")
                if join_resp.status_code == 200:
                    join_data = join_resp.json()
                    challenge_id = join_data["challenge"]["id"]
                    
                    # Now test leave
                    leave_resp = self.session.delete(f"{BASE_URL}/api/gamification/challenges/{challenge_id}/leave")
                    assert leave_resp.status_code == 200, f"Leave failed: {leave_resp.text}"
                    leave_data = leave_resp.json()
                    assert leave_data["success"] is True
                    assert "message" in leave_data
                else:
                    pytest.skip("Could not join challenge to test leave")
            else:
                pytest.skip("No available challenges to test leave")
        else:
            # Test leave on existing active challenge
            challenge_id = active_challenges[0]["id"]
            leave_resp = self.session.delete(f"{BASE_URL}/api/gamification/challenges/{challenge_id}/leave")
            assert leave_resp.status_code == 200, f"Leave failed: {leave_resp.text}"
            leave_data = leave_resp.json()
            assert leave_data["success"] is True
    
    def test_leave_invalid_challenge_fails(self):
        """DELETE /api/gamification/challenges/{id}/leave - fails for invalid ID."""
        resp = self.session.delete(f"{BASE_URL}/api/gamification/challenges/invalid-id-123/leave")
        assert resp.status_code == 404
    
    def test_leave_challenge_unauthenticated_fails(self):
        """DELETE /api/gamification/challenges/{id}/leave - fails without auth."""
        new_session = requests.Session()
        resp = new_session.delete(f"{BASE_URL}/api/gamification/challenges/any-id/leave")
        assert resp.status_code == 401
    
    # ─── CHALLENGE JOIN ENDPOINT ───
    def test_join_challenge_returns_difficulty(self):
        """POST /api/gamification/challenges/{code}/join - verify joined challenge has difficulty."""
        list_resp = self.session.get(f"{BASE_URL}/api/gamification/challenges")
        assert list_resp.status_code == 200
        data = list_resp.json()
        
        available = data.get("available", [])
        if available:
            code = available[0]["code"]
            join_resp = self.session.post(f"{BASE_URL}/api/gamification/challenges/{code}/join")
            
            if join_resp.status_code == 200:
                join_data = join_resp.json()
                challenge = join_data["challenge"]
                assert "difficulty" in challenge, "Joined challenge missing difficulty"
            elif join_resp.status_code == 400:
                # Already enrolled
                pass
        else:
            pytest.skip("No available challenges")
    
    # ─── GAMIFICATION PROCESS - NEW ACHIEVEMENTS CHECK ───
    def test_process_returns_new_achievements(self):
        """POST /api/gamification/process - verify response structure unchanged."""
        resp = self.session.post(f"{BASE_URL}/api/gamification/process")
        assert resp.status_code == 200, f"Process failed: {resp.text}"
        data = resp.json()
        
        # Verify all expected fields
        assert "xpEarned" in data
        assert "totalXP" in data
        assert "xpBreakdown" in data
        assert "leveledUp" in data
        assert "newLevel" in data
        assert "streak" in data
        assert "longestStreak" in data
        assert "score" in data
        assert "survivalDays" in data
        assert "newAchievements" in data
        
        # newLevel should have allLevels
        new_level = data["newLevel"]
        assert "allLevels" in new_level


class TestSurvivalClock:
    """Tests for survival clock API."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and store session."""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert login_resp.status_code == 200
    
    def test_survival_clock_returns_all_fields(self):
        """GET /api/intelligence/survival-clock - verify all expected fields."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/survival-clock")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "liquidFunds" in data
        assert "monthlyMandatoryExpense" in data
        assert "dailyBurnRate" in data
        assert "survivalDays" in data
        assert "level" in data
        
        # Verify level values
        valid_levels = ["CRITICAL", "VULNERABLE", "STABLE", "SECURE", "FINANCIAL WARRIOR"]
        assert data["level"] in valid_levels


class TestControlScore:
    """Tests for control score API."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and store session."""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert login_resp.status_code == 200
    
    def test_control_score_returns_breakdown(self):
        """GET /api/intelligence/control-score - verify breakdown with all 4 components."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert resp.status_code == 200
        data = resp.json()
        
        breakdown = data["breakdown"]
        assert "cashControl" in breakdown
        assert "debtPressure" in breakdown
        assert "liquidity" in breakdown
        assert "stability" in breakdown
        
        # Each should have score
        for key in ["cashControl", "debtPressure", "liquidity", "stability"]:
            assert "score" in breakdown[key]


class TestBehaviorAlerts:
    """Tests for behavior alerts API."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and store session."""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert login_resp.status_code == 200
    
    def test_behavior_alerts_returns_expected_structure(self):
        """GET /api/intelligence/behavior-alerts - verify response structure."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/behavior-alerts")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "alerts" in data
        assert "alertCount" in data
        assert "highCount" in data
        assert "generated_at" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
