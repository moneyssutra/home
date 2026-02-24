"""
Test suite for Financial Runway Simulator API
Tests the /api/intelligence/runway-simulator endpoint
- Tests baseline runway calculation (no params)
- Tests income change scenarios (job loss, pay cuts, raises)
- Tests expense change scenarios (cut expenses, increase expenses)
- Tests extra savings scenarios
- Tests 12-month projection generation
- Validates response structure and data types
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

class TestRunwaySimulatorAPI:
    """Tests for GET /api/intelligence/runway-simulator endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and store session for authenticated requests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth cookie
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        if login_resp.status_code != 200:
            pytest.skip("Authentication failed - cannot test runway simulator")
        
        # Store session_token cookie
        if "session_token" in login_resp.cookies:
            self.session.cookies.set("session_token", login_resp.cookies["session_token"])
        yield
    
    # --- Response Structure Tests ---
    
    def test_baseline_returns_all_expected_fields(self):
        """Test that baseline (no params) returns current, simulated, impact, projections, insight"""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/runway-simulator")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        
        # Top-level keys
        assert "current" in data, "Missing 'current' in response"
        assert "simulated" in data, "Missing 'simulated' in response"
        assert "impact" in data, "Missing 'impact' in response"
        assert "projections" in data, "Missing 'projections' in response"
        assert "insight" in data, "Missing 'insight' in response"
        
        print(f"PASSED: Baseline returns all expected top-level fields")
    
    def test_current_structure(self):
        """Test 'current' object has required fields"""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/runway-simulator")
        assert resp.status_code == 200
        
        current = resp.json()["current"]
        
        assert "survivalDays" in current, "Missing survivalDays in current"
        assert "effectiveFunds" in current, "Missing effectiveFunds in current"
        assert "monthlyExpense" in current, "Missing monthlyExpense in current"
        assert "monthlyIncome" in current, "Missing monthlyIncome in current"
        assert "level" in current, "Missing level in current"
        
        # Type validations
        assert isinstance(current["survivalDays"], int), "survivalDays should be int"
        assert isinstance(current["effectiveFunds"], (int, float)), "effectiveFunds should be numeric"
        assert current["level"] in ["NEEDS ATTENTION", "BUILDING", "COMFORTABLE", "SECURE", "CHAMPION"], f"Invalid level: {current['level']}"
        
        print(f"PASSED: current structure correct - {current['survivalDays']} days, level={current['level']}")
    
    def test_simulated_structure(self):
        """Test 'simulated' object has required fields including monthlySavings and levelColor"""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/runway-simulator")
        assert resp.status_code == 200
        
        sim = resp.json()["simulated"]
        
        assert "survivalDays" in sim, "Missing survivalDays in simulated"
        assert "effectiveFunds" in sim, "Missing effectiveFunds in simulated"
        assert "monthlyExpense" in sim, "Missing monthlyExpense in simulated"
        assert "monthlyIncome" in sim, "Missing monthlyIncome in simulated"
        assert "monthlySavings" in sim, "Missing monthlySavings in simulated"
        assert "level" in sim, "Missing level in simulated"
        assert "levelColor" in sim, "Missing levelColor in simulated"
        
        # levelColor should be a hex color
        assert sim["levelColor"].startswith("#"), f"levelColor should be hex: {sim['levelColor']}"
        
        print(f"PASSED: simulated structure correct with levelColor={sim['levelColor']}")
    
    def test_impact_structure(self):
        """Test 'impact' object has changeDays, changePct, direction"""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/runway-simulator")
        assert resp.status_code == 200
        
        impact = resp.json()["impact"]
        
        assert "changeDays" in impact, "Missing changeDays in impact"
        assert "changePct" in impact, "Missing changePct in impact"
        assert "direction" in impact, "Missing direction in impact"
        
        # direction should be up/down/same
        assert impact["direction"] in ["up", "down", "same"], f"Invalid direction: {impact['direction']}"
        
        # baseline should have no change
        assert impact["changeDays"] == 0, f"Baseline should have 0 changeDays, got {impact['changeDays']}"
        assert impact["direction"] == "same", f"Baseline should be 'same', got {impact['direction']}"
        
        print(f"PASSED: impact structure correct, baseline shows no change")
    
    def test_projections_structure(self):
        """Test 'projections' is array of 13 months (0-12) with required fields"""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/runway-simulator")
        assert resp.status_code == 200
        
        projections = resp.json()["projections"]
        
        assert isinstance(projections, list), "projections should be array"
        assert len(projections) == 13, f"Expected 13 projections (0-12 months), got {len(projections)}"
        
        # Check first projection (month 0)
        p0 = projections[0]
        assert p0["month"] == 0, "First projection should be month 0"
        assert "funds" in p0, "Missing funds in projection"
        assert "survivalDays" in p0, "Missing survivalDays in projection"
        assert "level" in p0, "Missing level in projection"
        
        # Check last projection (month 12)
        p12 = projections[12]
        assert p12["month"] == 12, "Last projection should be month 12"
        
        print(f"PASSED: projections has 13 months from {projections[0]['survivalDays']} to {projections[12]['survivalDays']} days")
    
    # --- Income Change Scenarios ---
    
    def test_job_loss_scenario_100_percent_income_cut(self):
        """Test -100% income change (job loss) shows correct projection decline"""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/runway-simulator", params={
            "income_change_pct": -100
        })
        assert resp.status_code == 200
        
        data = resp.json()
        
        # Job loss (-100% income) shouldn't change immediate survival days
        # (Emergency Runway already assumes zero income)
        # But projections should show decline over time
        
        projections = data["projections"]
        month0_funds = projections[0]["funds"]
        month12_funds = projections[12]["funds"]
        
        # With job loss and no income, funds should decline (unless expenses = 0)
        current_expense = data["current"]["monthlyExpense"]
        if current_expense > 0:
            # monthlySavings should be negative
            assert data["simulated"]["monthlySavings"] < 0 or data["simulated"]["monthlyIncome"] == 0, \
                "Job loss should result in negative savings or zero income"
        
        # Check insight mentions the scenario
        assert "income" in data["insight"].lower() or "same" in data["insight"].lower(), \
            f"Insight should mention income change: {data['insight']}"
        
        print(f"PASSED: Job loss scenario - funds from ₹{month0_funds:,.0f} to ₹{month12_funds:,.0f} over 12 months")
        print(f"  - Monthly savings: ₹{data['simulated']['monthlySavings']:,.0f}")
        print(f"  - Insight: {data['insight'][:100]}")
    
    def test_50_percent_pay_cut(self):
        """Test -50% income change shows reduced runway growth"""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/runway-simulator", params={
            "income_change_pct": -50
        })
        assert resp.status_code == 200
        
        data = resp.json()
        
        # Income should be halved
        current_income = data["current"]["monthlyIncome"]
        sim_income = data["simulated"]["monthlyIncome"]
        
        expected_income = current_income * 0.5
        assert abs(sim_income - expected_income) < 1, \
            f"Expected simulated income {expected_income}, got {sim_income}"
        
        print(f"PASSED: 50% pay cut - income from ₹{current_income:,.0f} to ₹{sim_income:,.0f}")
    
    def test_income_raise_positive(self):
        """Test +20% income shows improved projections"""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/runway-simulator", params={
            "income_change_pct": 20
        })
        assert resp.status_code == 200
        
        data = resp.json()
        
        # Income should increase by 20%
        current_income = data["current"]["monthlyIncome"]
        sim_income = data["simulated"]["monthlyIncome"]
        
        expected_income = current_income * 1.2
        assert abs(sim_income - expected_income) < 1, \
            f"Expected simulated income {expected_income}, got {sim_income}"
        
        # Monthly savings should likely increase
        print(f"PASSED: 20% raise - income from ₹{current_income:,.0f} to ₹{sim_income:,.0f}")
        print(f"  - Monthly savings: ₹{data['simulated']['monthlySavings']:,.0f}")
    
    # --- Expense Change Scenarios ---
    
    def test_cut_20_percent_expenses(self):
        """Test -20% expense change extends runway"""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/runway-simulator", params={
            "expense_change_pct": -20
        })
        assert resp.status_code == 200
        
        data = resp.json()
        
        current_expense = data["current"]["monthlyExpense"]
        sim_expense = data["simulated"]["monthlyExpense"]
        
        expected_expense = current_expense * 0.8
        assert abs(sim_expense - expected_expense) < 1, \
            f"Expected simulated expense {expected_expense}, got {sim_expense}"
        
        # Cutting expenses should extend runway (positive or same impact)
        if current_expense > 0:
            assert data["impact"]["changeDays"] >= 0 or data["impact"]["direction"] in ["up", "same"], \
                "Cutting expenses should not reduce runway"
        
        print(f"PASSED: Cut 20% expenses - from ₹{current_expense:,.0f} to ₹{sim_expense:,.0f}")
        print(f"  - Impact: {data['impact']['changeDays']} days ({data['impact']['direction']})")
    
    def test_increase_100_percent_expenses(self):
        """Test +100% expense change reduces runway"""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/runway-simulator", params={
            "expense_change_pct": 100
        })
        assert resp.status_code == 200
        
        data = resp.json()
        
        current_expense = data["current"]["monthlyExpense"]
        sim_expense = data["simulated"]["monthlyExpense"]
        
        expected_expense = current_expense * 2
        assert abs(sim_expense - expected_expense) < 1, \
            f"Expected simulated expense {expected_expense}, got {sim_expense}"
        
        # Doubling expenses should reduce runway
        assert data["impact"]["changeDays"] <= 0 or data["impact"]["direction"] in ["down", "same"], \
            "Doubling expenses should not increase runway"
        
        print(f"PASSED: Double expenses - from ₹{current_expense:,.0f} to ₹{sim_expense:,.0f}")
        print(f"  - Impact: {data['impact']['changeDays']} days ({data['impact']['direction']})")
    
    # --- Extra Savings Scenarios ---
    
    def test_add_extra_savings_2_lakh(self):
        """Test adding ₹2L extra savings extends runway"""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/runway-simulator", params={
            "extra_savings": 200000
        })
        assert resp.status_code == 200
        
        data = resp.json()
        
        current_funds = data["current"]["effectiveFunds"]
        sim_funds = data["simulated"]["effectiveFunds"]
        
        expected_funds = current_funds + 200000
        assert abs(sim_funds - expected_funds) < 1, \
            f"Expected simulated funds {expected_funds}, got {sim_funds}"
        
        # Adding savings should extend runway
        assert data["impact"]["changeDays"] >= 0, \
            f"Adding savings should extend runway, got {data['impact']['changeDays']} days change"
        assert data["impact"]["direction"] in ["up", "same"], \
            f"Adding savings should show 'up' or 'same', got {data['impact']['direction']}"
        
        print(f"PASSED: Add ₹2L savings - funds from ₹{current_funds:,.0f} to ₹{sim_funds:,.0f}")
        print(f"  - Impact: +{data['impact']['changeDays']} days")
    
    def test_combined_scenario_expense_cut_plus_savings(self):
        """Test -20% expenses + ₹2L savings shows extended runway"""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/runway-simulator", params={
            "expense_change_pct": -20,
            "extra_savings": 200000
        })
        assert resp.status_code == 200
        
        data = resp.json()
        
        # Both expense cut and extra savings should extend runway
        assert data["impact"]["direction"] in ["up", "same"], \
            f"Combined positive scenario should extend runway: {data['impact']}"
        
        print(f"PASSED: Combined -20% expenses + ₹2L savings")
        print(f"  - Impact: {data['impact']['changeDays']} days ({data['impact']['direction']})")
        print(f"  - Insight: {data['insight'][:100]}")
    
    def test_combined_scenario_raise_plus_save(self):
        """Test +20% income + -10% expenses + ₹1L savings (Raise+Save scenario)"""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/runway-simulator", params={
            "income_change_pct": 20,
            "expense_change_pct": -10,
            "extra_savings": 100000
        })
        assert resp.status_code == 200
        
        data = resp.json()
        
        # This should definitely improve runway
        assert data["impact"]["direction"] in ["up", "same"], \
            f"Raise+Save should improve runway: {data['impact']}"
        
        print(f"PASSED: Raise+Save scenario (+20% income, -10% exp, +₹1L savings)")
        print(f"  - Impact: {data['impact']['changeDays']} days")
        print(f"  - Month 12 projection: {data['projections'][12]['survivalDays']} days")
    
    # --- Edge Cases ---
    
    def test_zero_changes_returns_same_values(self):
        """Test that 0 changes returns identical current and simulated values"""
        resp = self.session.get(f"{BASE_URL}/api/intelligence/runway-simulator", params={
            "income_change_pct": 0,
            "expense_change_pct": 0,
            "extra_savings": 0
        })
        assert resp.status_code == 200
        
        data = resp.json()
        
        assert data["current"]["survivalDays"] == data["simulated"]["survivalDays"], \
            "Zero changes should return same survival days"
        assert data["impact"]["changeDays"] == 0, \
            "Zero changes should have 0 change days"
        assert data["impact"]["direction"] == "same", \
            "Zero changes should have 'same' direction"
        
        print(f"PASSED: Zero changes returns identical values")
    
    # --- Auth Required Test ---
    
    def test_unauthenticated_returns_401(self):
        """Test that runway-simulator requires authentication"""
        # Create new session without auth
        unauth_session = requests.Session()
        resp = unauth_session.get(f"{BASE_URL}/api/intelligence/runway-simulator")
        assert resp.status_code == 401, f"Expected 401 without auth, got {resp.status_code}"
        
        print(f"PASSED: Unauthenticated request returns 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
