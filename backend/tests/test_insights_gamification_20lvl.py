"""
Test cases for Insights Page - Financial Intelligence & Gamification with 20 Levels.
Tests: survival-clock, control-score, behavior-alerts, gamification profile, challenges, join/leave
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestIntelligenceAPIs:
    """Tests for Financial Intelligence APIs."""
    
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
    
    # ─── SURVIVAL CLOCK (Emergency Runway) ───
    def test_survival_clock_returns_all_expected_fields(self):
        """GET /api/intelligence/survival-clock - verify response structure with FDs in semi-liquid."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/survival-clock")
        assert resp.status_code == 200, f"Survival clock failed: {resp.text}"
        data = resp.json()
        
        # Main fields
        assert "effectiveFunds" in data, "effectiveFunds missing"
        assert "monthlyMandatoryExpense" in data, "monthlyMandatoryExpense missing"
        assert "dailyBurnRate" in data, "dailyBurnRate missing"
        assert "survivalDays" in data, "survivalDays missing"
        assert "survivalMonths" in data, "survivalMonths missing"
        assert "level" in data, "level missing"
        assert "levelColor" in data, "levelColor missing"
        assert "fundBreakdown" in data, "fundBreakdown missing"
        assert "tip" in data, "tip missing"
        
        # Fund breakdown structure (verify FDs in semi-liquid)
        fb = data["fundBreakdown"]
        assert "instant" in fb, "instant missing from fundBreakdown"
        assert "semiLiquid" in fb, "semiLiquid missing from fundBreakdown"
        assert "marketable" in fb, "marketable missing from fundBreakdown"
        assert "locked" in fb, "locked missing from fundBreakdown"
        assert "effectiveTotal" in fb
        assert "grossTotal" in fb
        assert "details" in fb
        
        # Verify levels
        valid_levels = ["NEEDS ATTENTION", "BUILDING", "COMFORTABLE", "SECURE", "CHAMPION"]
        assert data["level"] in valid_levels, f"Invalid level: {data['level']}"
    
    def test_survival_clock_fund_breakdown_details(self):
        """GET /api/intelligence/survival-clock - verify fund breakdown includes FD categorization."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/survival-clock")
        assert resp.status_code == 200
        data = resp.json()
        fb = data["fundBreakdown"]
        
        # Check details array structure
        for item in fb.get("details", []):
            assert "name" in item
            assert "amount" in item
            assert "category" in item
            assert "pct" in item
            # Category should be one of the valid categories
            assert item["category"] in ["instant", "semi_liquid", "marketable", "locked", "other"]
    
    # ─── CONTROL SCORE (Financial Score) ───
    def test_control_score_returns_4_pillars(self):
        """GET /api/intelligence/control-score - verify 4 pillars breakdown with help text."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert resp.status_code == 200, f"Control score failed: {resp.text}"
        data = resp.json()
        
        # Main fields
        assert "finalScore" in data, "finalScore missing"
        assert "grade" in data, "grade missing"
        assert "breakdown" in data, "breakdown missing"
        assert "metrics" in data, "metrics missing"
        
        # 4 pillars in breakdown
        bd = data["breakdown"]
        assert "savingsRate" in bd, "savingsRate pillar missing"
        assert "emiLoad" in bd, "emiLoad pillar missing"
        assert "safetyBuffer" in bd, "safetyBuffer pillar missing"
        assert "incomeConsistency" in bd, "incomeConsistency pillar missing"
        
        # Each pillar should have score, max, label, help
        for key in ["savingsRate", "emiLoad", "safetyBuffer", "incomeConsistency"]:
            pillar = bd[key]
            assert "score" in pillar, f"{key} missing score"
            assert "max" in pillar, f"{key} missing max"
            assert "label" in pillar, f"{key} missing label"
            assert "help" in pillar, f"{key} missing help text"
            assert len(pillar["help"]) > 0, f"{key} help text is empty"
    
    def test_control_score_grade_values(self):
        """GET /api/intelligence/control-score - verify grade is A-E."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["grade"] in ["A", "B", "C", "D", "E"]
        assert 0 <= data["finalScore"] <= 100
    
    # ─── BEHAVIOR ALERTS ───
    def test_behavior_alerts_returns_array(self):
        """GET /api/intelligence/behavior-alerts - verify alerts array structure."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/behavior-alerts")
        assert resp.status_code == 200, f"Behavior alerts failed: {resp.text}"
        data = resp.json()
        
        assert "alerts" in data, "alerts missing"
        assert "alertCount" in data, "alertCount missing"
        assert "highCount" in data, "highCount missing"
        assert "generated_at" in data, "generated_at missing"
        
        assert isinstance(data["alerts"], list)
        assert data["alertCount"] == len(data["alerts"])
        
        # If there are alerts, verify structure
        for alert in data["alerts"]:
            assert "type" in alert
            assert "severity" in alert
            assert "message" in alert
            assert alert["severity"] in ["HIGH", "MEDIUM", "LOW"]


class TestGamification20Levels:
    """Tests for Gamification with 20-level system."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and store session."""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    
    # ─── PROFILE WITH 20 LEVELS ───
    def test_profile_returns_20_levels(self):
        """GET /api/gamification/profile - verify 20 levels system."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200, f"Profile failed: {resp.text}"
        data = resp.json()
        
        # 20 levels
        assert "allLevels" in data, "allLevels missing"
        assert len(data["allLevels"]) == 20, f"Expected 20 levels, got {len(data['allLevels'])}"
        
        # Verify level progression structure
        for lvl in data["allLevels"]:
            assert "level" in lvl
            assert "title" in lvl
            assert "min_xp" in lvl
            assert "stage" in lvl
            assert "reached" in lvl
            assert isinstance(lvl["reached"], bool)
        
        # Verify levels are ordered correctly
        for i, lvl in enumerate(data["allLevels"]):
            assert lvl["level"] == i + 1, f"Level {i+1} has wrong level number"
    
    def test_profile_has_gender_friendly_titles(self):
        """GET /api/gamification/profile - verify gender-neutral titles."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200
        data = resp.json()
        
        titles = [lvl["title"] for lvl in data["allLevels"]]
        # Verify no gendered terms
        for title in titles:
            assert "king" not in title.lower()
            assert "queen" not in title.lower()
            assert "prince" not in title.lower()
            assert "princess" not in title.lower()
    
    def test_profile_level_stages(self):
        """GET /api/gamification/profile - verify stages: begin, learn, grow, control, expand, master, legend, freedom."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200
        data = resp.json()
        
        stages = set(lvl["stage"] for lvl in data["allLevels"])
        expected_stages = {"begin", "learn", "grow", "control", "expand", "master", "legend", "freedom"}
        assert stages == expected_stages, f"Unexpected stages: {stages}"
    
    def test_profile_current_level_fields(self):
        """GET /api/gamification/profile - verify current level info."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "level" in data
        assert "title" in data
        assert "stage" in data
        assert "currentXP" in data
        assert "levelMinXP" in data
        assert "xpToNextLevel" in data
        assert "prevLevelTitle" in data
        
        # Verify current level is 1-20
        assert 1 <= data["level"] <= 20
    
    # ─── ACHIEVEMENTS (24 total with gender-friendly names) ───
    def test_profile_achievements_structure(self):
        """GET /api/gamification/profile - verify 24 achievements with categories."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "totalAchievements" in data
        assert data["totalAchievements"] == 24, f"Expected 24 achievements, got {data['totalAchievements']}"
        
        assert "allAchievements" in data
        assert len(data["allAchievements"]) == 24
        
        # Each achievement should have required fields
        for ach in data["allAchievements"]:
            assert "code" in ach
            assert "title" in ach
            assert "description" in ach
            assert "icon" in ach
            assert "xp_bonus" in ach
            assert "category" in ach
            assert "unlocked" in ach
    
    def test_profile_max_badges_unlocked(self):
        """GET /api/gamification/profile - verify maxBadgesUnlocked metric."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "maxBadgesUnlocked" in data, "maxBadgesUnlocked missing"
        assert "achievementCount" in data
        assert isinstance(data["maxBadgesUnlocked"], int)
        assert data["maxBadgesUnlocked"] >= data["achievementCount"]
    
    def test_profile_xp_rules(self):
        """GET /api/gamification/profile - verify XP rules for 'How to earn XP?'"""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "xpRules" in data
        assert len(data["xpRules"]) >= 5, "Should have at least 5 XP rules"
        
        for rule in data["xpRules"]:
            assert "action" in rule
            assert "xp" in rule
            assert "icon" in rule


class TestChallenges:
    """Tests for Challenges with join/leave functionality."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and store session."""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert login_resp.status_code == 200
        self.joined_challenge_id = None
    
    def teardown_method(self):
        """Clean up any joined challenges."""
        if self.joined_challenge_id:
            try:
                self.session.delete(f"{BASE_URL}/api/gamification/challenges/{self.joined_challenge_id}/leave")
            except:
                pass
    
    def test_challenges_returns_three_arrays(self):
        """GET /api/gamification/challenges - returns available, active, completed arrays."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/challenges")
        assert resp.status_code == 200, f"Challenges failed: {resp.text}"
        data = resp.json()
        
        assert "available" in data
        assert "active" in data
        assert "completed" in data
        
        assert isinstance(data["available"], list)
        assert isinstance(data["active"], list)
        assert isinstance(data["completed"], list)
    
    def test_available_challenges_have_explainer_and_difficulty(self):
        """GET /api/gamification/challenges - available have explainer and difficulty."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/challenges")
        assert resp.status_code == 200
        data = resp.json()
        
        for ch in data["available"]:
            assert "code" in ch
            assert "title" in ch
            assert "description" in ch
            assert "xp_reward" in ch
            assert "duration_days" in ch
            assert "difficulty" in ch, f"Challenge {ch['code']} missing difficulty"
            assert "explainer" in ch, f"Challenge {ch['code']} missing explainer"
            assert ch["difficulty"] in ["Easy", "Medium", "Hard"]
            assert len(ch["explainer"]) > 10
    
    def test_join_challenge_works(self):
        """POST /api/gamification/challenges/{code}/join - successfully joins challenge."""
        # Get available challenges
        list_resp = self.session.get(f"{BASE_URL}/api/gamification/challenges")
        assert list_resp.status_code == 200
        data = list_resp.json()
        
        available = data.get("available", [])
        if not available:
            pytest.skip("No available challenges to test join")
        
        code = available[0]["code"]
        join_resp = self.session.post(f"{BASE_URL}/api/gamification/challenges/{code}/join")
        
        if join_resp.status_code == 400:
            # Already enrolled - this is OK
            pytest.skip("Already enrolled in this challenge")
        
        assert join_resp.status_code == 200, f"Join failed: {join_resp.text}"
        join_data = join_resp.json()
        
        assert "success" in join_data
        assert join_data["success"] is True
        assert "challenge" in join_data
        
        ch = join_data["challenge"]
        assert "id" in ch
        assert "challenge_code" in ch
        assert "difficulty" in ch
        assert ch["is_completed"] is False
        
        self.joined_challenge_id = ch["id"]
    
    def test_leave_challenge_works(self):
        """DELETE /api/gamification/challenges/{id}/leave - abandons active challenge."""
        # First join a challenge
        list_resp = self.session.get(f"{BASE_URL}/api/gamification/challenges")
        data = list_resp.json()
        
        available = data.get("available", [])
        if not available:
            pytest.skip("No available challenges to test leave")
        
        code = available[0]["code"]
        join_resp = self.session.post(f"{BASE_URL}/api/gamification/challenges/{code}/join")
        
        if join_resp.status_code == 400:
            # Already enrolled - use existing active challenge
            active = data.get("active", [])
            if not active:
                pytest.skip("No active challenges to test leave")
            challenge_id = active[0]["id"]
        else:
            challenge_id = join_resp.json()["challenge"]["id"]
        
        # Now leave
        leave_resp = self.session.delete(f"{BASE_URL}/api/gamification/challenges/{challenge_id}/leave")
        assert leave_resp.status_code == 200, f"Leave failed: {leave_resp.text}"
        leave_data = leave_resp.json()
        
        assert leave_data["success"] is True
        assert "message" in leave_data
    
    def test_leave_invalid_challenge_returns_404(self):
        """DELETE /api/gamification/challenges/{id}/leave - 404 for invalid ID."""
        resp = self.session.delete(f"{BASE_URL}/api/gamification/challenges/invalid-uuid-123/leave")
        assert resp.status_code == 404


class TestProcessWeekly:
    """Tests for weekly gamification processing."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and store session."""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert login_resp.status_code == 200
    
    def test_process_returns_expected_fields(self):
        """POST /api/gamification/process - verify response structure."""
        resp = self.session.post(f"{BASE_URL}/api/gamification/process")
        assert resp.status_code == 200, f"Process failed: {resp.text}"
        data = resp.json()
        
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
        
        # newLevel should have 20 levels
        new_level = data["newLevel"]
        assert "allLevels" in new_level
        assert len(new_level["allLevels"]) == 20


class TestAuthRequired:
    """Verify all endpoints require authentication."""
    
    def test_survival_clock_requires_auth(self):
        """GET /api/intelligence/survival-clock - 401 without auth."""
        resp = requests.get(f"{BASE_URL}/api/intelligence/survival-clock")
        assert resp.status_code == 401
    
    def test_control_score_requires_auth(self):
        """GET /api/intelligence/control-score - 401 without auth."""
        resp = requests.get(f"{BASE_URL}/api/intelligence/control-score")
        assert resp.status_code == 401
    
    def test_behavior_alerts_requires_auth(self):
        """GET /api/intelligence/behavior-alerts - 401 without auth."""
        resp = requests.get(f"{BASE_URL}/api/intelligence/behavior-alerts")
        assert resp.status_code == 401
    
    def test_gamification_profile_requires_auth(self):
        """GET /api/gamification/profile - 401 without auth."""
        resp = requests.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 401
    
    def test_gamification_challenges_requires_auth(self):
        """GET /api/gamification/challenges - 401 without auth."""
        resp = requests.get(f"{BASE_URL}/api/gamification/challenges")
        assert resp.status_code == 401
    
    def test_gamification_process_requires_auth(self):
        """POST /api/gamification/process - 401 without auth."""
        resp = requests.post(f"{BASE_URL}/api/gamification/process")
        assert resp.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
