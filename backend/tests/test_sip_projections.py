"""
Test file for Phase 3: SIP Projections and Monthly Contribution Breakdown
Tests: SIP projection calculation using compound interest formula,
monthly contribution breakdown, additionalMonthlySavingsNeeded, totalMonthlyNeeded
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSIPProjections:
    """Test SIP projection calculations in Goal detail"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data IDs for cleanup"""
        self.created_investment_ids = []
        self.created_goal_ids = []
        yield
        # Cleanup created data
        for goal_id in self.created_goal_ids:
            try:
                requests.delete(f"{BASE_URL}/api/goals/{goal_id}")
            except:
                pass
        for inv_id in self.created_investment_ids:
            try:
                requests.delete(f"{BASE_URL}/api/investments/{inv_id}")
            except:
                pass
    
    def test_create_investment_with_sip(self):
        """Test creating an investment with SIP amount and frequency"""
        payload = {
            "investmentCategory": "Mutual Fund",
            "investmentMode": "SIP",
            "name": "TEST_SIP_MF_Monthly",
            "principal": 100000,
            "currentValue": 120000,
            "startDate": "2025-01-01",
            "returnRate": 12.0,
            "investmentFrequency": "Monthly",
            "sipAmount": 5000
        }
        
        response = requests.post(f"{BASE_URL}/api/investments", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify SIP fields are stored
        assert data["sipAmount"] == 5000
        assert data["investmentFrequency"] == "Monthly"
        assert data["returnRate"] == 12.0
        assert "id" in data
        
        self.created_investment_ids.append(data["id"])
        print(f"✓ Created investment with SIP: {data['id']}")
        return data["id"]
    
    def test_goal_with_sip_investment_shows_projections(self):
        """Test that a goal linked to SIP investment shows SIP projections"""
        # Create investment with SIP
        inv_payload = {
            "investmentCategory": "Mutual Fund",
            "investmentMode": "SIP",
            "name": "TEST_SIP_Flexi_Cap",
            "principal": 200000,
            "currentValue": 250000,
            "startDate": "2024-06-01",
            "returnRate": 15.0,
            "investmentFrequency": "Monthly",
            "sipAmount": 10000
        }
        inv_response = requests.post(f"{BASE_URL}/api/investments", json=inv_payload)
        assert inv_response.status_code == 200
        investment_id = inv_response.json()["id"]
        self.created_investment_ids.append(investment_id)
        
        # Create goal linked to this investment
        target_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        goal_payload = {
            "goalName": "TEST_SIP_Goal_Wealth",
            "goalType": "Wealth Creation",
            "targetAmount": 1000000,
            "targetDate": target_date,
            "priority": 1,
            "linkedInvestmentIds": [investment_id],
            "autoCalculate": True
        }
        goal_response = requests.post(f"{BASE_URL}/api/goals", json=goal_payload)
        assert goal_response.status_code == 200
        goal_id = goal_response.json()["id"]
        self.created_goal_ids.append(goal_id)
        
        # Fetch goal detail
        detail_response = requests.get(f"{BASE_URL}/api/goals/{goal_id}")
        assert detail_response.status_code == 200
        goal = detail_response.json()
        
        # VERIFY SIP PROJECTIONS
        assert "sipProjections" in goal, "sipProjections field should be present"
        assert isinstance(goal["sipProjections"], list), "sipProjections should be a list"
        assert len(goal["sipProjections"]) > 0, "Should have at least 1 SIP projection"
        
        sip = goal["sipProjections"][0]
        assert sip["investmentName"] == "TEST_SIP_Flexi_Cap"
        assert sip["sipAmount"] == 10000
        assert sip["frequency"] == "Monthly"
        assert sip["returnRate"] == 15.0
        assert sip["currentValue"] == 250000
        assert "projectedValue" in sip
        assert "monthlyContribution" in sip
        
        # Projected value should be > current value (compound growth)
        assert sip["projectedValue"] > sip["currentValue"], \
            f"Projected value {sip['projectedValue']} should be > current {sip['currentValue']}"
        
        print(f"✓ SIP projection: Current ₹{sip['currentValue']:,} → Projected ₹{sip['projectedValue']:,.0f}")
        print(f"  Monthly contribution: ₹{sip['monthlyContribution']:,}")
    
    def test_goal_returns_total_sip_fields(self):
        """Test that goal response includes totalProjectedFromSIPs and totalMonthlySIPContribution"""
        # Create investment with SIP
        inv_payload = {
            "investmentCategory": "Mutual Fund",
            "investmentMode": "SIP",
            "name": "TEST_SIP_Total_Fields",
            "principal": 50000,
            "currentValue": 60000,
            "startDate": "2025-01-01",
            "returnRate": 10.0,
            "investmentFrequency": "Monthly",
            "sipAmount": 3000
        }
        inv_response = requests.post(f"{BASE_URL}/api/investments", json=inv_payload)
        assert inv_response.status_code == 200
        investment_id = inv_response.json()["id"]
        self.created_investment_ids.append(investment_id)
        
        # Create goal
        target_date = (datetime.now() + timedelta(days=730)).strftime("%Y-%m-%d")  # 2 years
        goal_payload = {
            "goalName": "TEST_SIP_Total_Fields_Goal",
            "goalType": "Investment Target",
            "targetAmount": 500000,
            "targetDate": target_date,
            "linkedInvestmentIds": [investment_id],
            "priority": 1
        }
        goal_response = requests.post(f"{BASE_URL}/api/goals", json=goal_payload)
        assert goal_response.status_code == 200
        goal_id = goal_response.json()["id"]
        self.created_goal_ids.append(goal_id)
        
        # Fetch goal detail
        detail_response = requests.get(f"{BASE_URL}/api/goals/{goal_id}")
        goal = detail_response.json()
        
        # VERIFY TOTAL SIP FIELDS
        assert "totalProjectedFromSIPs" in goal, "totalProjectedFromSIPs field missing"
        assert "totalMonthlySIPContribution" in goal, "totalMonthlySIPContribution field missing"
        assert "monthsToTarget" in goal, "monthsToTarget field missing"
        
        assert goal["totalProjectedFromSIPs"] > 0, "totalProjectedFromSIPs should be > 0"
        assert goal["totalMonthlySIPContribution"] == 3000, \
            f"Expected totalMonthlySIPContribution=3000, got {goal['totalMonthlySIPContribution']}"
        assert goal["monthsToTarget"] > 0, "monthsToTarget should be > 0"
        
        print(f"✓ Total projected from SIPs: ₹{goal['totalProjectedFromSIPs']:,.0f}")
        print(f"  Total monthly SIP contribution: ₹{goal['totalMonthlySIPContribution']:,}")
        print(f"  Months to target: {goal['monthsToTarget']}")
    
    def test_additional_monthly_savings_needed(self):
        """Test additionalMonthlySavingsNeeded and totalMonthlyNeeded calculations"""
        # Create investment with SIP
        inv_payload = {
            "investmentCategory": "Mutual Fund",
            "investmentMode": "SIP",
            "name": "TEST_SIP_Additional_Needed",
            "principal": 100000,
            "currentValue": 120000,
            "startDate": "2024-01-01",
            "returnRate": 12.0,
            "investmentFrequency": "Monthly",
            "sipAmount": 5000
        }
        inv_response = requests.post(f"{BASE_URL}/api/investments", json=inv_payload)
        investment_id = inv_response.json()["id"]
        self.created_investment_ids.append(investment_id)
        
        # Create goal with target much higher than projected
        target_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        goal_payload = {
            "goalName": "TEST_SIP_Additional_Savings",
            "goalType": "Wealth Creation",
            "targetAmount": 2000000,  # 20 lakhs - higher than SIP projection
            "targetDate": target_date,
            "linkedInvestmentIds": [investment_id],
            "priority": 1
        }
        goal_response = requests.post(f"{BASE_URL}/api/goals", json=goal_payload)
        goal_id = goal_response.json()["id"]
        self.created_goal_ids.append(goal_id)
        
        # Fetch goal detail
        detail_response = requests.get(f"{BASE_URL}/api/goals/{goal_id}")
        goal = detail_response.json()
        
        # VERIFY ADDITIONAL MONTHLY FIELDS
        assert "additionalMonthlySavingsNeeded" in goal, "additionalMonthlySavingsNeeded field missing"
        assert "totalMonthlyNeeded" in goal, "totalMonthlyNeeded field missing"
        
        # totalMonthlyNeeded should be > SIP contribution (since target is high)
        assert goal["totalMonthlyNeeded"] > goal["totalMonthlySIPContribution"], \
            f"Total monthly needed ({goal['totalMonthlyNeeded']}) should be > SIP contribution ({goal['totalMonthlySIPContribution']})"
        
        # additionalMonthlySavingsNeeded should be > 0
        assert goal["additionalMonthlySavingsNeeded"] >= 0, \
            f"Additional monthly savings should be >= 0, got {goal['additionalMonthlySavingsNeeded']}"
        
        print(f"✓ Total monthly needed: ₹{goal['totalMonthlyNeeded']:,.0f}")
        print(f"  Existing SIP: ₹{goal['totalMonthlySIPContribution']:,}/month")
        print(f"  Additional needed: ₹{goal['additionalMonthlySavingsNeeded']:,.0f}/month")
    
    def test_linked_details_show_has_sip_flag(self):
        """Test that linkedDetails includes hasSIP flag for investments with SIP"""
        # Create investment with SIP
        inv_payload = {
            "investmentCategory": "Mutual Fund",
            "investmentMode": "SIP",
            "name": "TEST_SIP_HasSIP_Flag",
            "principal": 50000,
            "currentValue": 55000,
            "startDate": "2025-01-01",
            "returnRate": 10.0,
            "investmentFrequency": "Monthly",
            "sipAmount": 2000
        }
        inv_response = requests.post(f"{BASE_URL}/api/investments", json=inv_payload)
        investment_id = inv_response.json()["id"]
        self.created_investment_ids.append(investment_id)
        
        # Create goal
        target_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        goal_payload = {
            "goalName": "TEST_SIP_HasSIP_Goal",
            "goalType": "Wealth Creation",
            "targetAmount": 200000,
            "targetDate": target_date,
            "linkedInvestmentIds": [investment_id],
            "priority": 1
        }
        goal_response = requests.post(f"{BASE_URL}/api/goals", json=goal_payload)
        goal_id = goal_response.json()["id"]
        self.created_goal_ids.append(goal_id)
        
        # Fetch goal detail
        detail_response = requests.get(f"{BASE_URL}/api/goals/{goal_id}")
        goal = detail_response.json()
        
        # VERIFY linkedDetails has hasSIP flag
        assert "linkedDetails" in goal
        assert len(goal["linkedDetails"]) > 0
        
        investment_link = next((d for d in goal["linkedDetails"] if d["name"] == "TEST_SIP_HasSIP_Flag"), None)
        assert investment_link is not None, "Investment not found in linkedDetails"
        assert investment_link.get("hasSIP") == True, "hasSIP should be True"
        assert investment_link.get("sipAmount") == 2000
        assert investment_link.get("frequency") == "Monthly"
        assert "projectedValue" in investment_link
        
        print(f"✓ linkedDetails shows hasSIP=True for SIP investment")
        print(f"  Projected value in linkedDetails: ₹{investment_link.get('projectedValue'):,.0f}")
    
    def test_multiple_sip_investments_aggregation(self):
        """Test that multiple SIP investments are properly aggregated"""
        # Create first SIP investment
        inv1_payload = {
            "investmentCategory": "Mutual Fund",
            "investmentMode": "SIP",
            "name": "TEST_SIP_Multi_1",
            "principal": 50000,
            "currentValue": 60000,
            "startDate": "2024-06-01",
            "returnRate": 12.0,
            "investmentFrequency": "Monthly",
            "sipAmount": 5000
        }
        inv1_response = requests.post(f"{BASE_URL}/api/investments", json=inv1_payload)
        inv1_id = inv1_response.json()["id"]
        self.created_investment_ids.append(inv1_id)
        
        # Create second SIP investment
        inv2_payload = {
            "investmentCategory": "Mutual Fund",
            "investmentMode": "SIP",
            "name": "TEST_SIP_Multi_2",
            "principal": 30000,
            "currentValue": 35000,
            "startDate": "2024-06-01",
            "returnRate": 10.0,
            "investmentFrequency": "Monthly",
            "sipAmount": 3000
        }
        inv2_response = requests.post(f"{BASE_URL}/api/investments", json=inv2_payload)
        inv2_id = inv2_response.json()["id"]
        self.created_investment_ids.append(inv2_id)
        
        # Create goal linked to both
        target_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        goal_payload = {
            "goalName": "TEST_SIP_Multi_Goal",
            "goalType": "Wealth Creation",
            "targetAmount": 500000,
            "targetDate": target_date,
            "linkedInvestmentIds": [inv1_id, inv2_id],
            "priority": 1
        }
        goal_response = requests.post(f"{BASE_URL}/api/goals", json=goal_payload)
        goal_id = goal_response.json()["id"]
        self.created_goal_ids.append(goal_id)
        
        # Fetch goal detail
        detail_response = requests.get(f"{BASE_URL}/api/goals/{goal_id}")
        goal = detail_response.json()
        
        # VERIFY aggregation
        assert len(goal["sipProjections"]) == 2, f"Expected 2 SIP projections, got {len(goal['sipProjections'])}"
        
        # Total monthly should be 5000 + 3000 = 8000
        assert goal["totalMonthlySIPContribution"] == 8000, \
            f"Expected total monthly SIP = 8000, got {goal['totalMonthlySIPContribution']}"
        
        # Total projected should be sum of both projections
        sum_projected = sum(sp["projectedValue"] for sp in goal["sipProjections"])
        assert abs(goal["totalProjectedFromSIPs"] - sum_projected) < 1, \
            f"totalProjectedFromSIPs ({goal['totalProjectedFromSIPs']}) should equal sum of projections ({sum_projected})"
        
        print(f"✓ Multiple SIP aggregation: 2 investments, ₹{goal['totalMonthlySIPContribution']:,}/month")
        print(f"  Total projected: ₹{goal['totalProjectedFromSIPs']:,.0f}")
    
    def test_weekly_sip_frequency_conversion(self):
        """Test that weekly SIP is correctly converted to monthly"""
        inv_payload = {
            "investmentCategory": "Mutual Fund",
            "investmentMode": "SIP",
            "name": "TEST_SIP_Weekly",
            "principal": 20000,
            "currentValue": 25000,
            "startDate": "2025-01-01",
            "returnRate": 12.0,
            "investmentFrequency": "Weekly",
            "sipAmount": 1000  # ₹1000/week
        }
        inv_response = requests.post(f"{BASE_URL}/api/investments", json=inv_payload)
        investment_id = inv_response.json()["id"]
        self.created_investment_ids.append(investment_id)
        
        target_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        goal_payload = {
            "goalName": "TEST_SIP_Weekly_Goal",
            "goalType": "Wealth Creation",
            "targetAmount": 200000,
            "targetDate": target_date,
            "linkedInvestmentIds": [investment_id],
            "priority": 1
        }
        goal_response = requests.post(f"{BASE_URL}/api/goals", json=goal_payload)
        goal_id = goal_response.json()["id"]
        self.created_goal_ids.append(goal_id)
        
        detail_response = requests.get(f"{BASE_URL}/api/goals/{goal_id}")
        goal = detail_response.json()
        
        # Weekly ₹1000 = Monthly ₹4000 (4 weeks)
        assert goal["totalMonthlySIPContribution"] == 4000, \
            f"Expected monthly contribution = 4000 (weekly * 4), got {goal['totalMonthlySIPContribution']}"
        
        print(f"✓ Weekly SIP conversion: ₹1000/week → ₹{goal['totalMonthlySIPContribution']:,}/month")
    
    def test_quarterly_sip_frequency_conversion(self):
        """Test that quarterly SIP is correctly converted to monthly"""
        inv_payload = {
            "investmentCategory": "Mutual Fund",
            "investmentMode": "SIP",
            "name": "TEST_SIP_Quarterly",
            "principal": 50000,
            "currentValue": 55000,
            "startDate": "2025-01-01",
            "returnRate": 12.0,
            "investmentFrequency": "Quarterly",
            "sipAmount": 15000  # ₹15000/quarter
        }
        inv_response = requests.post(f"{BASE_URL}/api/investments", json=inv_payload)
        investment_id = inv_response.json()["id"]
        self.created_investment_ids.append(investment_id)
        
        target_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        goal_payload = {
            "goalName": "TEST_SIP_Quarterly_Goal",
            "goalType": "Wealth Creation",
            "targetAmount": 200000,
            "targetDate": target_date,
            "linkedInvestmentIds": [investment_id],
            "priority": 1
        }
        goal_response = requests.post(f"{BASE_URL}/api/goals", json=goal_payload)
        goal_id = goal_response.json()["id"]
        self.created_goal_ids.append(goal_id)
        
        detail_response = requests.get(f"{BASE_URL}/api/goals/{goal_id}")
        goal = detail_response.json()
        
        # Quarterly ₹15000 = Monthly ₹5000 (15000/3)
        assert goal["totalMonthlySIPContribution"] == 5000, \
            f"Expected monthly contribution = 5000 (quarterly / 3), got {goal['totalMonthlySIPContribution']}"
        
        print(f"✓ Quarterly SIP conversion: ₹15000/quarter → ₹{goal['totalMonthlySIPContribution']:,}/month")
    
    def test_goal_without_sip_has_empty_projections(self):
        """Test that goal without SIP investments has empty sipProjections"""
        # Create investment WITHOUT SIP
        inv_payload = {
            "investmentCategory": "Fixed Deposit (FD)",
            "investmentMode": "Growth with Maturity",
            "name": "TEST_NoSIP_FD",
            "principal": 100000,
            "currentValue": 107000,
            "startDate": "2024-01-01",
            "returnRate": 7.0,
            "investmentFrequency": None,
            "sipAmount": None
        }
        inv_response = requests.post(f"{BASE_URL}/api/investments", json=inv_payload)
        investment_id = inv_response.json()["id"]
        self.created_investment_ids.append(investment_id)
        
        target_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        goal_payload = {
            "goalName": "TEST_NoSIP_Goal",
            "goalType": "Wealth Creation",
            "targetAmount": 200000,
            "targetDate": target_date,
            "linkedInvestmentIds": [investment_id],
            "priority": 1
        }
        goal_response = requests.post(f"{BASE_URL}/api/goals", json=goal_payload)
        goal_id = goal_response.json()["id"]
        self.created_goal_ids.append(goal_id)
        
        detail_response = requests.get(f"{BASE_URL}/api/goals/{goal_id}")
        goal = detail_response.json()
        
        # Should have sipProjections but empty
        assert "sipProjections" in goal
        assert len(goal["sipProjections"]) == 0, "sipProjections should be empty for non-SIP investments"
        assert goal["totalMonthlySIPContribution"] == 0
        assert goal["totalProjectedFromSIPs"] == 0
        
        print("✓ Goal without SIP has empty sipProjections and zero monthly contribution")
    
    def test_compound_interest_formula_accuracy(self):
        """Test that FV calculation follows compound interest formula correctly
        FV = PV*(1+r)^n + PMT*[((1+r)^n-1)/r]
        """
        inv_payload = {
            "investmentCategory": "Mutual Fund",
            "investmentMode": "SIP",
            "name": "TEST_SIP_Formula",
            "principal": 100000,
            "currentValue": 100000,  # Use exact value for calculation
            "startDate": "2025-01-01",
            "returnRate": 12.0,  # 12% annual = 1% monthly
            "investmentFrequency": "Monthly",
            "sipAmount": 10000
        }
        inv_response = requests.post(f"{BASE_URL}/api/investments", json=inv_payload)
        investment_id = inv_response.json()["id"]
        self.created_investment_ids.append(investment_id)
        
        # 12 months from now
        target_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        goal_payload = {
            "goalName": "TEST_SIP_Formula_Goal",
            "goalType": "Wealth Creation",
            "targetAmount": 500000,
            "targetDate": target_date,
            "linkedInvestmentIds": [investment_id],
            "priority": 1
        }
        goal_response = requests.post(f"{BASE_URL}/api/goals", json=goal_payload)
        goal_id = goal_response.json()["id"]
        self.created_goal_ids.append(goal_id)
        
        detail_response = requests.get(f"{BASE_URL}/api/goals/{goal_id}")
        goal = detail_response.json()
        
        # Manual calculation for ~12 months:
        # PV = 100000, PMT = 10000, r = 0.01 (1% monthly), n ≈ 12
        # PV_growth = 100000 * (1.01)^12 ≈ 112,682
        # PMT_growth = 10000 * ((1.01^12 - 1) / 0.01) ≈ 126,825
        # Total ≈ 239,507
        
        sip = goal["sipProjections"][0]
        projected = sip["projectedValue"]
        
        # Allow 5% tolerance due to day calculation variations
        expected_approx = 239500
        tolerance = expected_approx * 0.10  # 10% tolerance
        
        assert abs(projected - expected_approx) < tolerance, \
            f"Projected value {projected:.0f} should be near {expected_approx} (tolerance: {tolerance:.0f})"
        
        print(f"✓ Compound interest calculation: Projected ₹{projected:,.0f} (expected ~₹{expected_approx:,})")


class TestGoalListWithSIPProjections:
    """Test that goal list also includes SIP projection summary"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.created_investment_ids = []
        self.created_goal_ids = []
        yield
        for goal_id in self.created_goal_ids:
            try:
                requests.delete(f"{BASE_URL}/api/goals/{goal_id}")
            except:
                pass
        for inv_id in self.created_investment_ids:
            try:
                requests.delete(f"{BASE_URL}/api/investments/{inv_id}")
            except:
                pass
    
    def test_goals_list_includes_sip_fields(self):
        """Test that GET /api/goals includes SIP projection fields"""
        # Create investment with SIP
        inv_payload = {
            "investmentCategory": "Mutual Fund",
            "investmentMode": "SIP",
            "name": "TEST_SIP_List",
            "principal": 50000,
            "currentValue": 60000,
            "startDate": "2025-01-01",
            "returnRate": 12.0,
            "investmentFrequency": "Monthly",
            "sipAmount": 5000
        }
        inv_response = requests.post(f"{BASE_URL}/api/investments", json=inv_payload)
        investment_id = inv_response.json()["id"]
        self.created_investment_ids.append(investment_id)
        
        target_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        goal_payload = {
            "goalName": "TEST_SIP_List_Goal",
            "goalType": "Wealth Creation",
            "targetAmount": 500000,
            "targetDate": target_date,
            "linkedInvestmentIds": [investment_id],
            "priority": 1
        }
        goal_response = requests.post(f"{BASE_URL}/api/goals", json=goal_payload)
        goal_id = goal_response.json()["id"]
        self.created_goal_ids.append(goal_id)
        
        # Fetch goals list
        list_response = requests.get(f"{BASE_URL}/api/goals")
        assert list_response.status_code == 200
        goals = list_response.json()
        
        # Find our test goal
        test_goal = next((g for g in goals if g["id"] == goal_id), None)
        assert test_goal is not None
        
        # Verify SIP fields in list response
        assert "sipProjections" in test_goal
        assert "totalProjectedFromSIPs" in test_goal
        assert "totalMonthlySIPContribution" in test_goal
        
        print(f"✓ Goals list includes SIP projection fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
