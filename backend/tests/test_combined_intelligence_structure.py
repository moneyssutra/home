"""
Test Combined Intelligence Endpoint - Verifies full data structure for chandrashekhar user
Bug fix: Combined intelligence endpoint was returning oversimplified flat data instead of full structured responses
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
CHANDRASHEKHAR_SESSION = "9ec37623-73ff-43a1-908e-056a333e0bac"


class TestCombinedIntelligenceStructure:
    """Test that GET /api/combined/intelligence returns full structured survivalClock and controlScore"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with chandrashekhar user credentials"""
        self.session = requests.Session()
        self.session.cookies.set("session_token", CHANDRASHEKHAR_SESSION)
    
    def test_combined_intelligence_endpoint_returns_200(self):
        """API returns 200 status"""
        response = self.session.get(f"{BASE_URL}/api/combined/intelligence?tz_offset=-330")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Combined intelligence endpoint returns 200")
    
    def test_survival_clock_has_effective_funds(self):
        """survivalClock.effectiveFunds exists and > 0"""
        response = self.session.get(f"{BASE_URL}/api/combined/intelligence?tz_offset=-330")
        data = response.json()
        survival_clock = data.get("survivalClock", {})
        effective_funds = survival_clock.get("effectiveFunds")
        
        assert effective_funds is not None, "survivalClock.effectiveFunds is missing"
        assert effective_funds > 0, f"effectiveFunds should be > 0, got {effective_funds}"
        print(f"PASS: survivalClock.effectiveFunds = {effective_funds}")
    
    def test_survival_clock_has_monthly_mandatory_expense(self):
        """survivalClock.monthlyMandatoryExpense exists and > 0"""
        response = self.session.get(f"{BASE_URL}/api/combined/intelligence?tz_offset=-330")
        data = response.json()
        survival_clock = data.get("survivalClock", {})
        monthly_expense = survival_clock.get("monthlyMandatoryExpense")
        
        assert monthly_expense is not None, "survivalClock.monthlyMandatoryExpense is missing"
        assert monthly_expense > 0, f"monthlyMandatoryExpense should be > 0, got {monthly_expense}"
        print(f"PASS: survivalClock.monthlyMandatoryExpense = {monthly_expense}")
    
    def test_survival_clock_has_daily_burn_rate(self):
        """survivalClock.dailyBurnRate exists and > 0"""
        response = self.session.get(f"{BASE_URL}/api/combined/intelligence?tz_offset=-330")
        data = response.json()
        survival_clock = data.get("survivalClock", {})
        daily_burn = survival_clock.get("dailyBurnRate")
        
        assert daily_burn is not None, "survivalClock.dailyBurnRate is missing"
        assert daily_burn > 0, f"dailyBurnRate should be > 0, got {daily_burn}"
        print(f"PASS: survivalClock.dailyBurnRate = {daily_burn}")
    
    def test_survival_clock_has_survival_days_greater_than_zero(self):
        """survivalClock.survivalDays > 0 for chandrashekhar user with extensive data"""
        response = self.session.get(f"{BASE_URL}/api/combined/intelligence?tz_offset=-330")
        data = response.json()
        survival_clock = data.get("survivalClock", {})
        survival_days = survival_clock.get("survivalDays")
        
        assert survival_days is not None, "survivalClock.survivalDays is missing"
        assert survival_days > 0, f"survivalDays should be > 0 for chandrashekhar user, got {survival_days}"
        print(f"PASS: survivalClock.survivalDays = {survival_days}")
    
    def test_survival_clock_has_fund_breakdown(self):
        """survivalClock.fundBreakdown exists with liquid, semiLiquid, illiquid"""
        response = self.session.get(f"{BASE_URL}/api/combined/intelligence?tz_offset=-330")
        data = response.json()
        survival_clock = data.get("survivalClock", {})
        fund_breakdown = survival_clock.get("fundBreakdown", {})
        
        assert fund_breakdown, "survivalClock.fundBreakdown is missing"
        
        # Check liquid
        liquid = fund_breakdown.get("liquid", {})
        assert "total" in liquid, "fundBreakdown.liquid.total is missing"
        
        # Check semiLiquid
        semi_liquid = fund_breakdown.get("semiLiquid", {})
        assert "total" in semi_liquid, "fundBreakdown.semiLiquid.total is missing"
        
        # Check liquidBuffer
        liquid_buffer = fund_breakdown.get("liquidBuffer")
        assert liquid_buffer is not None, "fundBreakdown.liquidBuffer is missing"
        assert liquid_buffer > 0, f"liquidBuffer should be > 0, got {liquid_buffer}"
        
        print(f"PASS: survivalClock.fundBreakdown.liquidBuffer = {liquid_buffer}")
    
    def test_control_score_has_final_score(self):
        """controlScore.finalScore exists and > 0"""
        response = self.session.get(f"{BASE_URL}/api/combined/intelligence?tz_offset=-330")
        data = response.json()
        control_score = data.get("controlScore", {})
        final_score = control_score.get("finalScore")
        
        assert final_score is not None, "controlScore.finalScore is missing"
        assert final_score > 0, f"finalScore should be > 0, got {final_score}"
        print(f"PASS: controlScore.finalScore = {final_score}")
    
    def test_control_score_has_grade(self):
        """controlScore.grade exists"""
        response = self.session.get(f"{BASE_URL}/api/combined/intelligence?tz_offset=-330")
        data = response.json()
        control_score = data.get("controlScore", {})
        grade = control_score.get("grade")
        
        assert grade is not None, "controlScore.grade is missing"
        assert grade in ["A+", "A", "B+", "B", "C", "D", "F"], f"Invalid grade: {grade}"
        print(f"PASS: controlScore.grade = {grade}")
    
    def test_control_score_has_breakdown_savings_rate(self):
        """controlScore.breakdown.savingsRate exists with score"""
        response = self.session.get(f"{BASE_URL}/api/combined/intelligence?tz_offset=-330")
        data = response.json()
        control_score = data.get("controlScore", {})
        breakdown = control_score.get("breakdown", {})
        savings_rate = breakdown.get("savingsRate", {})
        
        assert savings_rate, "controlScore.breakdown.savingsRate is missing"
        assert "score" in savings_rate, "breakdown.savingsRate.score is missing"
        print(f"PASS: controlScore.breakdown.savingsRate.score = {savings_rate.get('score')}")
    
    def test_control_score_has_breakdown_emi_load(self):
        """controlScore.breakdown.emiLoad exists with score"""
        response = self.session.get(f"{BASE_URL}/api/combined/intelligence?tz_offset=-330")
        data = response.json()
        control_score = data.get("controlScore", {})
        breakdown = control_score.get("breakdown", {})
        emi_load = breakdown.get("emiLoad", {})
        
        assert emi_load, "controlScore.breakdown.emiLoad is missing"
        assert "score" in emi_load, "breakdown.emiLoad.score is missing"
        print(f"PASS: controlScore.breakdown.emiLoad.score = {emi_load.get('score')}")
    
    def test_control_score_metrics_has_monthly_income(self):
        """controlScore.metrics.monthlyIncome exists and > 0"""
        response = self.session.get(f"{BASE_URL}/api/combined/intelligence?tz_offset=-330")
        data = response.json()
        control_score = data.get("controlScore", {})
        metrics = control_score.get("metrics", {})
        monthly_income = metrics.get("monthlyIncome")
        
        assert monthly_income is not None, "controlScore.metrics.monthlyIncome is missing"
        assert monthly_income > 0, f"monthlyIncome should be > 0, got {monthly_income}"
        print(f"PASS: controlScore.metrics.monthlyIncome = {monthly_income}")
    
    def test_control_score_metrics_has_monthly_expenses(self):
        """controlScore.metrics.monthlyExpenses exists and > 0"""
        response = self.session.get(f"{BASE_URL}/api/combined/intelligence?tz_offset=-330")
        data = response.json()
        control_score = data.get("controlScore", {})
        metrics = control_score.get("metrics", {})
        monthly_expenses = metrics.get("monthlyExpenses")
        
        assert monthly_expenses is not None, "controlScore.metrics.monthlyExpenses is missing"
        assert monthly_expenses > 0, f"monthlyExpenses should be > 0, got {monthly_expenses}"
        print(f"PASS: controlScore.metrics.monthlyExpenses = {monthly_expenses}")
    
    def test_all_values_non_zero_for_chandrashekhar(self):
        """Summary test: All critical values are non-zero for chandrashekhar user"""
        response = self.session.get(f"{BASE_URL}/api/combined/intelligence?tz_offset=-330")
        data = response.json()
        
        sc = data.get("survivalClock", {})
        cs = data.get("controlScore", {})
        
        # All these should be > 0 for a user with extensive financial data
        checks = {
            "survivalClock.effectiveFunds": sc.get("effectiveFunds", 0),
            "survivalClock.monthlyMandatoryExpense": sc.get("monthlyMandatoryExpense", 0),
            "survivalClock.dailyBurnRate": sc.get("dailyBurnRate", 0),
            "survivalClock.survivalDays": sc.get("survivalDays", 0),
            "survivalClock.fundBreakdown.liquidBuffer": sc.get("fundBreakdown", {}).get("liquidBuffer", 0),
            "controlScore.finalScore": cs.get("finalScore", 0),
            "controlScore.metrics.monthlyIncome": cs.get("metrics", {}).get("monthlyIncome", 0),
            "controlScore.metrics.monthlyExpenses": cs.get("metrics", {}).get("monthlyExpenses", 0),
        }
        
        all_non_zero = True
        for key, value in checks.items():
            if value == 0 or value is None:
                print(f"FAIL: {key} = {value} (expected > 0)")
                all_non_zero = False
            else:
                print(f"OK: {key} = {value}")
        
        assert all_non_zero, "Some values are zero for chandrashekhar user with extensive data"
        print("PASS: All critical values are non-zero for chandrashekhar user")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
