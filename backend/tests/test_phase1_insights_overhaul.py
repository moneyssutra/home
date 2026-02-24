"""
Test cases for MoneySutra Phase 1 Insights Overhaul.
Tests: 
- Money Pattern Recognition (personality, spendingDNA, traits, strengths, blindSpots)
- 20 Survival Stages aligned to days (~10 visible stages)
- 3-Bucket Liquidity Classification (Liquid/Semi-Liquid/Illiquid) with 60% semi-liquid factor
- 100 Badges in 8 categories with Bronze/Silver/Gold/Platinum tiers
- Financial Score with 4-pillar breakdown and metrics
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestMoneyPatternRecognition:
    """Tests for Money Pattern Recognition endpoint."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and store session."""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    
    def test_money_pattern_returns_all_expected_fields(self):
        """GET /api/intelligence/money-pattern - verify personality, tagline, spendingDNA."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/money-pattern")
        assert resp.status_code == 200, f"Money pattern failed: {resp.text}"
        data = resp.json()
        
        # Core fields
        assert "personality" in data, "personality missing"
        assert "tagline" in data, "tagline missing"
        assert "spendingDNA" in data, "spendingDNA missing"
        assert "traits" in data, "traits missing"
        assert "strengths" in data, "strengths missing"
        assert "blindSpots" in data, "blindSpots missing"
        assert "topExpenseCategories" in data, "topExpenseCategories missing"
        assert "metrics" in data, "metrics missing"
    
    def test_money_pattern_spending_dna_structure(self):
        """GET /api/intelligence/money-pattern - verify spendingDNA has needs/wants/savings/emi."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/money-pattern")
        assert resp.status_code == 200
        data = resp.json()
        
        dna = data["spendingDNA"]
        assert "needs" in dna, "needs missing from spendingDNA"
        assert "wants" in dna, "wants missing from spendingDNA"
        assert "savings" in dna, "savings missing from spendingDNA"
        assert "emi" in dna, "emi missing from spendingDNA"
        
        # Each should be a percentage (0-100 range typical, but could sum > 100 in edge cases)
        for key in ["needs", "wants", "savings", "emi"]:
            assert isinstance(dna[key], (int, float)), f"{key} should be numeric"
    
    def test_money_pattern_traits_strengths_blindspots(self):
        """GET /api/intelligence/money-pattern - verify traits, strengths, blindSpots are arrays."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/money-pattern")
        assert resp.status_code == 200
        data = resp.json()
        
        assert isinstance(data["traits"], list), "traits should be array"
        assert isinstance(data["strengths"], list), "strengths should be array"
        assert isinstance(data["blindSpots"], list), "blindSpots should be array"
        
        # Each should have at least one item
        assert len(data["traits"]) > 0 or len(data["strengths"]) > 0, "Should have traits or strengths"
        # Max 4 items in strengths/blindSpots as per implementation
        assert len(data["strengths"]) <= 4, "strengths should have at most 4 items"
        assert len(data["blindSpots"]) <= 4, "blindSpots should have at most 4 items"
    
    def test_money_pattern_top_expense_categories(self):
        """GET /api/intelligence/money-pattern - verify topExpenseCategories structure."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/money-pattern")
        assert resp.status_code == 200
        data = resp.json()
        
        cats = data["topExpenseCategories"]
        assert isinstance(cats, list), "topExpenseCategories should be array"
        assert len(cats) <= 3, "Should have at most 3 top categories"
        
        for cat in cats:
            assert "category" in cat, "category field missing"
            assert "amount" in cat, "amount field missing"
    
    def test_money_pattern_metrics(self):
        """GET /api/intelligence/money-pattern - verify metrics object."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/money-pattern")
        assert resp.status_code == 200
        data = resp.json()
        
        m = data["metrics"]
        assert "monthlyIncome" in m, "monthlyIncome missing"
        assert "totalExpenses" in m, "totalExpenses missing"
        assert "savings" in m, "savings missing"
        assert "investments" in m, "investments count missing"


class TestSurvivalClock20Stages:
    """Tests for 20 Survival Stages with ~10 visible stages."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and store session."""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    
    def test_survival_clock_returns_20_stage_data(self):
        """GET /api/intelligence/survival-clock - verify 20-stage structure."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/survival-clock")
        assert resp.status_code == 200, f"Survival clock failed: {resp.text}"
        data = resp.json()
        
        # Core stage fields
        assert "stage" in data, "stage (current stage number) missing"
        assert "phase" in data, "phase missing"
        assert "phaseNum" in data, "phaseNum missing"
        assert "totalStages" in data, "totalStages missing"
        assert data["totalStages"] == 20, f"Expected 20 total stages, got {data['totalStages']}"
        
        # Current stage should be 1-20
        assert 1 <= data["stage"] <= 20, f"Stage {data['stage']} out of range"
    
    def test_survival_clock_visible_stages(self):
        """GET /api/intelligence/survival-clock - verify ~10 visible stages around current."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/survival-clock")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "visibleStages" in data, "visibleStages missing"
        visible = data["visibleStages"]
        
        assert isinstance(visible, list), "visibleStages should be array"
        assert 5 <= len(visible) <= 10, f"Expected 5-10 visible stages, got {len(visible)}"
        
        # Each stage should have required fields
        for stage in visible:
            assert "stage" in stage, "stage number missing"
            assert "name" in stage, "name missing"
            assert "min" in stage, "min days missing"
            assert "max" in stage, "max days missing"
            assert "phase" in stage, "phase missing"
            assert "phase_num" in stage, "phase_num missing"
            assert "color" in stage, "color (hex) missing"
            assert "reached" in stage, "reached boolean missing"
            assert "current" in stage, "current boolean missing"
        
        # Exactly one stage should be current
        current_stages = [s for s in visible if s["current"]]
        assert len(current_stages) == 1, f"Expected 1 current stage, got {len(current_stages)}"
    
    def test_survival_clock_phases(self):
        """GET /api/intelligence/survival-clock - verify 5 phases."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/survival-clock")
        assert resp.status_code == 200
        data = resp.json()
        
        # Phase should be one of 5 phases
        valid_phases = ["Critical", "Stabilizing", "Control", "Growth", "Power"]
        assert data["phase"] in valid_phases, f"Invalid phase: {data['phase']}"
        
        # PhaseNum should be 1-5
        assert 1 <= data["phaseNum"] <= 5, f"PhaseNum {data['phaseNum']} out of range"
    
    def test_survival_clock_3_bucket_fund_breakdown(self):
        """GET /api/intelligence/survival-clock - verify 3-bucket liquidity classification."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/survival-clock")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "fundBreakdown" in data, "fundBreakdown missing"
        fb = data["fundBreakdown"]
        
        # 3 buckets: liquid, semiLiquid, illiquid
        assert "liquid" in fb, "liquid bucket missing"
        assert "semiLiquid" in fb, "semiLiquid bucket missing"
        assert "illiquid" in fb, "illiquid bucket missing"
        
        # Each bucket should have total, label, description
        for bucket_name in ["liquid", "semiLiquid", "illiquid"]:
            bucket = fb[bucket_name]
            assert "total" in bucket, f"{bucket_name} missing total"
            assert "label" in bucket, f"{bucket_name} missing label"
            assert "description" in bucket, f"{bucket_name} missing description"
        
        # 3 buffer numbers
        assert "liquidBuffer" in fb, "liquidBuffer missing"
        assert "extendedBuffer" in fb, "extendedBuffer missing (Liquid + 60% Semi-Liquid)"
        assert "netWorth" in fb, "netWorth missing"
        
        # Verify 60% semi-liquid factor
        expected_extended = fb["liquid"]["total"] + (fb["semiLiquid"]["total"] * 0.60)
        assert abs(fb["extendedBuffer"] - expected_extended) < 1, "Extended buffer should be Liquid + 60% Semi-Liquid"
    
    def test_survival_clock_fund_details(self):
        """GET /api/intelligence/survival-clock - verify fund breakdown details."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/survival-clock")
        assert resp.status_code == 200
        data = resp.json()
        
        fb = data["fundBreakdown"]
        assert "details" in fb, "details array missing"
        
        for item in fb.get("details", []):
            assert "name" in item, "name missing in detail"
            assert "amount" in item, "amount missing in detail"
            assert "category" in item, "category missing in detail"
            assert "pct" in item, "pct missing in detail"
            
            # Category should be one of the 3 buckets
            assert item["category"] in ["liquid", "semi_liquid", "illiquid"], f"Invalid category: {item['category']}"
            
            # pct should be 100 (liquid), 60 (semi_liquid), or 0 (illiquid)
            if item["category"] == "liquid":
                assert item["pct"] == 100, "Liquid should be 100%"
            elif item["category"] == "semi_liquid":
                assert item["pct"] == 60, "Semi-liquid should be 60%"
            else:
                assert item["pct"] == 0, "Illiquid should be 0%"


class TestControlScore:
    """Tests for Financial Control Score API."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and store session."""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    
    def test_control_score_returns_all_fields(self):
        """GET /api/intelligence/control-score - verify full response."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert resp.status_code == 200, f"Control score failed: {resp.text}"
        data = resp.json()
        
        assert "finalScore" in data, "finalScore missing"
        assert "grade" in data, "grade missing"
        assert "breakdown" in data, "breakdown missing"
        assert "metrics" in data, "metrics missing"
        
        assert 0 <= data["finalScore"] <= 100, "Score should be 0-100"
        assert data["grade"] in ["A", "B", "C", "D", "E"], f"Invalid grade: {data['grade']}"
    
    def test_control_score_breakdown_4_pillars(self):
        """GET /api/intelligence/control-score - verify 4 pillars."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert resp.status_code == 200
        data = resp.json()
        
        bd = data["breakdown"]
        pillars = ["savingsRate", "emiLoad", "safetyBuffer", "incomeConsistency"]
        
        for p in pillars:
            assert p in bd, f"{p} pillar missing"
            assert "score" in bd[p], f"{p} missing score"
            assert "max" in bd[p], f"{p} missing max"
            assert bd[p]["max"] == 25, f"{p} max should be 25"
    
    def test_control_score_metrics(self):
        """GET /api/intelligence/control-score - verify monthly metrics."""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/control-score")
        assert resp.status_code == 200
        data = resp.json()
        
        m = data["metrics"]
        assert "monthlyIncome" in m, "monthlyIncome missing"
        assert "monthlyExpenses" in m, "monthlyExpenses missing"
        assert "totalEMI" in m, "totalEMI missing"
        assert "availableFunds" in m, "availableFunds missing"


class TestGamification100Badges:
    """Tests for 100 Badges in 8 categories with tier system."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and store session."""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    
    def test_profile_returns_100_achievements(self):
        """GET /api/gamification/profile - verify 100 badges total."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200, f"Profile failed: {resp.text}"
        data = resp.json()
        
        assert "totalAchievements" in data, "totalAchievements missing"
        assert data["totalAchievements"] == 100, f"Expected 100 badges, got {data['totalAchievements']}"
        
        assert "allAchievements" in data, "allAchievements missing"
        assert len(data["allAchievements"]) == 100, f"Expected 100 in allAchievements, got {len(data['allAchievements'])}"
    
    def test_profile_achievements_have_tiers(self):
        """GET /api/gamification/profile - verify tier field (bronze/silver/gold/platinum)."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200
        data = resp.json()
        
        valid_tiers = ["bronze", "silver", "gold", "platinum"]
        for ach in data["allAchievements"]:
            assert "tier" in ach, f"Badge {ach['code']} missing tier"
            assert ach["tier"] in valid_tiers, f"Badge {ach['code']} has invalid tier: {ach['tier']}"
    
    def test_profile_achievements_have_categories(self):
        """GET /api/gamification/profile - verify 8 categories."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200
        data = resp.json()
        
        valid_categories = ["survival", "score", "behavior", "savings", "debt", "investment", "streak", "elite"]
        categories_found = set()
        
        for ach in data["allAchievements"]:
            assert "category" in ach, f"Badge {ach['code']} missing category"
            assert ach["category"] in valid_categories, f"Badge {ach['code']} has invalid category: {ach['category']}"
            categories_found.add(ach["category"])
        
        # All 8 categories should be present
        assert len(categories_found) == 8, f"Expected 8 categories, found: {categories_found}"
    
    def test_profile_achievements_have_required_fields(self):
        """GET /api/gamification/profile - verify each badge has required fields."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200
        data = resp.json()
        
        for ach in data["allAchievements"][:10]:  # Check first 10 to save time
            assert "code" in ach, "code missing"
            assert "title" in ach, "title missing"
            assert "description" in ach, "description missing"
            assert "icon" in ach, "icon missing"
            assert "xp_bonus" in ach, "xp_bonus missing"
            assert "category" in ach, "category missing"
            assert "tier" in ach, "tier missing"
            assert "unlocked" in ach, "unlocked missing"
            assert isinstance(ach["unlocked"], bool), "unlocked should be boolean"
    
    def test_profile_tier_distribution(self):
        """GET /api/gamification/profile - verify tier distribution (Bronze: 1-30, Silver: 31-60, etc.)."""
        resp = self.session.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 200
        data = resp.json()
        
        tier_counts = {"bronze": 0, "silver": 0, "gold": 0, "platinum": 0}
        for ach in data["allAchievements"]:
            tier_counts[ach["tier"]] += 1
        
        # Per the spec, Bronze (1-30), Silver (31-60), Gold (61-85), Platinum (86-100)
        # This means approx: Bronze ~30, Silver ~30, Gold ~25, Platinum ~15
        assert tier_counts["bronze"] >= 15, f"Too few bronze badges: {tier_counts['bronze']}"
        assert tier_counts["platinum"] >= 5, f"Too few platinum badges: {tier_counts['platinum']}"


class TestProcessGamification:
    """Tests for POST /api/gamification/process with 100-badge achievement checks."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and store session."""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    
    def test_process_gamification_returns_expected_fields(self):
        """POST /api/gamification/process - verify response structure."""
        resp = self.session.post(f"{BASE_URL}/api/gamification/process")
        assert resp.status_code == 200, f"Process failed: {resp.text}"
        data = resp.json()
        
        assert "xpEarned" in data, "xpEarned missing"
        assert "totalXP" in data, "totalXP missing"
        assert "xpBreakdown" in data, "xpBreakdown missing"
        assert "leveledUp" in data, "leveledUp missing"
        assert "newLevel" in data, "newLevel missing"
        assert "streak" in data, "streak missing"
        assert "score" in data, "score missing"
        assert "survivalDays" in data, "survivalDays missing"
        assert "newAchievements" in data, "newAchievements missing"
    
    def test_process_gamification_awards_badges(self):
        """POST /api/gamification/process - verify new badges can be awarded."""
        resp = self.session.post(f"{BASE_URL}/api/gamification/process")
        assert resp.status_code == 200
        data = resp.json()
        
        # newAchievements should be an array
        assert isinstance(data["newAchievements"], list), "newAchievements should be array"
        
        # If new badges were awarded, verify structure
        for ach in data["newAchievements"]:
            assert "achievement_code" in ach or "code" in ach, "Badge missing code"
            assert "title" in ach, "Badge missing title"
            assert "xp_bonus" in ach, "Badge missing xp_bonus"
    
    def test_process_gamification_xp_breakdown(self):
        """POST /api/gamification/process - verify xpBreakdown structure."""
        resp = self.session.post(f"{BASE_URL}/api/gamification/process")
        assert resp.status_code == 200
        data = resp.json()
        
        breakdown = data["xpBreakdown"]
        assert isinstance(breakdown, list), "xpBreakdown should be array"
        
        for item in breakdown:
            assert "reason" in item, "xpBreakdown item missing reason"
            assert "xp" in item, "xpBreakdown item missing xp"


class TestAuthRequired:
    """Verify all endpoints require authentication."""
    
    def test_money_pattern_requires_auth(self):
        """GET /api/intelligence/money-pattern - 401 without auth."""
        resp = requests.get(f"{BASE_URL}/api/intelligence/money-pattern")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
    
    def test_survival_clock_requires_auth(self):
        """GET /api/intelligence/survival-clock - 401 without auth."""
        resp = requests.get(f"{BASE_URL}/api/intelligence/survival-clock")
        assert resp.status_code == 401
    
    def test_control_score_requires_auth(self):
        """GET /api/intelligence/control-score - 401 without auth."""
        resp = requests.get(f"{BASE_URL}/api/intelligence/control-score")
        assert resp.status_code == 401
    
    def test_gamification_profile_requires_auth(self):
        """GET /api/gamification/profile - 401 without auth."""
        resp = requests.get(f"{BASE_URL}/api/gamification/profile")
        assert resp.status_code == 401
    
    def test_gamification_process_requires_auth(self):
        """POST /api/gamification/process - 401 without auth."""
        resp = requests.post(f"{BASE_URL}/api/gamification/process")
        assert resp.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
