"""
Test Investment CRUD and Dashboard API endpoints
Tests: Investment create/read/update/delete, Dashboard networth calculation, Dashboard breakdown
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://wizard-forms-1.preview.emergentagent.com"


class TestInvestmentCRUD:
    """Test Investment CRUD operations"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data and cleanup after tests"""
        self.test_investment_ids = []
        yield
        # Cleanup - delete all test investments
        for inv_id in self.test_investment_ids:
            try:
                requests.delete(f"{BASE_URL}/api/investments/{inv_id}")
            except Exception:
                pass

    def test_get_investments_list(self):
        """Test GET /api/investments returns a list"""
        response = requests.get(f"{BASE_URL}/api/investments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/investments returned {len(data)} investments")

    def test_create_investment_fd_growth_with_maturity(self):
        """Test creating a Fixed Deposit investment with Growth with Maturity mode"""
        payload = {
            "investmentCategory": "Fixed Deposit (FD)",
            "investmentMode": "Growth with Maturity",
            "name": "TEST_SBI_FD_2026",
            "principal": 100000.0,
            "currentValue": 105000.0,
            "startDate": "2025-01-01",
            "maturityDate": "2026-01-01",
            "expectedMaturityValue": 107000.0,
            "returnRate": 7.0,
            "lockInPeriod": 12
        }
        response = requests.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["investmentCategory"] == "Fixed Deposit (FD)"
        assert data["investmentMode"] == "Growth with Maturity"
        assert data["name"] == "TEST_SBI_FD_2026"
        assert data["principal"] == 100000.0
        assert data["currentValue"] == 105000.0
        assert data["maturityDate"] == "2026-01-01"
        assert "id" in data
        
        self.test_investment_ids.append(data["id"])
        print(f"✓ Created FD investment with id: {data['id']}")

    def test_create_investment_stocks_growth_only(self):
        """Test creating a Stocks investment with Growth Only mode"""
        payload = {
            "investmentCategory": "Stocks",
            "investmentMode": "Growth Only",
            "name": "TEST_Reliance_Stock",
            "principal": 50000.0,
            "currentValue": 60000.0,
            "startDate": "2024-06-15",
            "quantity": 25.0,
            "unitPrice": 2000.0,
            "currentPrice": 2400.0
        }
        response = requests.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["investmentCategory"] == "Stocks"
        assert data["investmentMode"] == "Growth Only"
        assert data["quantity"] == 25.0
        assert data["unitPrice"] == 2000.0
        assert data["currentPrice"] == 2400.0
        
        self.test_investment_ids.append(data["id"])
        print(f"✓ Created Stocks investment with id: {data['id']}")

    def test_create_investment_sgb_income_generating(self):
        """Test creating a SGB investment with Income Generating mode"""
        payload = {
            "investmentCategory": "Sovereign Gold Bond (SGB)",
            "investmentMode": "Income Generating",
            "name": "TEST_SGB_2024",
            "principal": 200000.0,
            "currentValue": 220000.0,
            "startDate": "2024-01-15",
            "returnRate": 2.5,
            "compoundingType": "Simple",
            "payoutFrequency": "Half-Yearly"
        }
        response = requests.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["investmentCategory"] == "Sovereign Gold Bond (SGB)"
        assert data["investmentMode"] == "Income Generating"
        assert data["returnRate"] == 2.5
        assert data["payoutFrequency"] == "Half-Yearly"
        
        self.test_investment_ids.append(data["id"])
        print(f"✓ Created SGB investment with id: {data['id']}")

    def test_create_investment_mutual_fund(self):
        """Test creating a Mutual Fund investment"""
        payload = {
            "investmentCategory": "Mutual Fund",
            "investmentMode": "Growth Only",
            "name": "TEST_HDFC_MF",
            "principal": 75000.0,
            "currentValue": 82500.0,
            "startDate": "2024-03-01",
            "notes": "Monthly SIP"
        }
        response = requests.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["investmentCategory"] == "Mutual Fund"
        assert data["notes"] == "Monthly SIP"
        
        self.test_investment_ids.append(data["id"])
        print(f"✓ Created Mutual Fund investment with id: {data['id']}")

    def test_create_investment_digital_gold(self):
        """Test creating a Digital Gold investment"""
        payload = {
            "investmentCategory": "Digital Gold",
            "investmentMode": "Growth Only",
            "name": "TEST_Digital_Gold",
            "principal": 30000.0,
            "currentValue": 33000.0,
            "startDate": "2024-05-10",
            "quantity": 5.5,
            "unitPrice": 5454.54,
            "currentPrice": 6000.0
        }
        response = requests.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["investmentCategory"] == "Digital Gold"
        assert data["quantity"] == 5.5
        
        self.test_investment_ids.append(data["id"])
        print(f"✓ Created Digital Gold investment with id: {data['id']}")

    def test_create_investment_crypto(self):
        """Test creating a Crypto investment"""
        payload = {
            "investmentCategory": "Crypto",
            "investmentMode": "Growth Only",
            "name": "TEST_Bitcoin",
            "principal": 100000.0,
            "currentValue": 150000.0,
            "startDate": "2024-02-01"
        }
        response = requests.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["investmentCategory"] == "Crypto"
        
        self.test_investment_ids.append(data["id"])
        print(f"✓ Created Crypto investment with id: {data['id']}")

    def test_get_investment_by_id(self):
        """Test GET /api/investments/{id} returns single investment"""
        # First create an investment
        payload = {
            "investmentCategory": "ETF",
            "investmentMode": "Growth Only",
            "name": "TEST_NIFTY_ETF",
            "principal": 40000.0,
            "currentValue": 42000.0,
            "startDate": "2024-07-01"
        }
        create_response = requests.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_response.status_code == 200
        created_id = create_response.json()["id"]
        self.test_investment_ids.append(created_id)
        
        # Get by ID
        get_response = requests.get(f"{BASE_URL}/api/investments/{created_id}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["id"] == created_id
        assert data["name"] == "TEST_NIFTY_ETF"
        print(f"✓ GET /api/investments/{created_id} returned correct investment")

    def test_update_investment(self):
        """Test PUT /api/investments/{id} updates investment"""
        # Create investment first
        payload = {
            "investmentCategory": "Bonds",
            "investmentMode": "Income Generating",
            "name": "TEST_Govt_Bond",
            "principal": 50000.0,
            "currentValue": 52000.0,
            "startDate": "2024-01-01",
            "returnRate": 7.5
        }
        create_response = requests.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_response.status_code == 200
        created_id = create_response.json()["id"]
        self.test_investment_ids.append(created_id)
        
        # Update investment
        update_payload = {
            "investmentCategory": "Bonds",
            "investmentMode": "Income Generating",
            "name": "TEST_Govt_Bond_Updated",
            "principal": 50000.0,
            "currentValue": 55000.0,  # Updated value
            "startDate": "2024-01-01",
            "returnRate": 7.75  # Updated rate
        }
        update_response = requests.put(f"{BASE_URL}/api/investments/{created_id}", json=update_payload)
        assert update_response.status_code == 200
        
        updated_data = update_response.json()
        assert updated_data["name"] == "TEST_Govt_Bond_Updated"
        assert updated_data["currentValue"] == 55000.0
        assert updated_data["returnRate"] == 7.75
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/investments/{created_id}")
        assert get_response.status_code == 200
        fetched_data = get_response.json()
        assert fetched_data["currentValue"] == 55000.0
        print(f"✓ Updated investment and verified persistence")

    def test_delete_investment(self):
        """Test DELETE /api/investments/{id} removes investment"""
        # Create investment first
        payload = {
            "investmentCategory": "P2P Lending",
            "investmentMode": "Income Generating",
            "name": "TEST_P2P_ToDelete",
            "principal": 25000.0,
            "currentValue": 27500.0,
            "startDate": "2024-08-01"
        }
        create_response = requests.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_response.status_code == 200
        created_id = create_response.json()["id"]
        
        # Delete investment
        delete_response = requests.delete(f"{BASE_URL}/api/investments/{created_id}")
        assert delete_response.status_code == 200
        
        # Verify deletion with GET - should return 404
        get_response = requests.get(f"{BASE_URL}/api/investments/{created_id}")
        assert get_response.status_code == 404
        print(f"✓ Deleted investment and verified removal")

    def test_get_nonexistent_investment_returns_404(self):
        """Test GET non-existent investment returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/investments/{fake_id}")
        assert response.status_code == 404
        print(f"✓ GET non-existent investment correctly returns 404")


class TestDashboardNetworth:
    """Test Dashboard Net Worth API"""

    def test_get_networth_summary(self):
        """Test GET /api/dashboard/networth returns aggregated data"""
        response = requests.get(f"{BASE_URL}/api/dashboard/networth")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check all required fields are present
        required_fields = [
            "netWorth", "totalAssets", "totalInvestments", "liquidBalance",
            "totalLiabilities", "creditOutstanding", "monthlyIncome",
            "monthlyExpenses", "monthlySavings", "assetCount",
            "investmentCount", "accountCount", "loanCount", "incomeCount", "expenseCount"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Validate types
        assert isinstance(data["netWorth"], (int, float))
        assert isinstance(data["totalAssets"], (int, float))
        assert isinstance(data["totalInvestments"], (int, float))
        assert isinstance(data["assetCount"], int)
        assert isinstance(data["investmentCount"], int)
        
        print(f"✓ Net worth summary returned with all required fields")
        print(f"  Net Worth: ₹{data['netWorth']:,.2f}")
        print(f"  Assets: ₹{data['totalAssets']:,.2f} ({data['assetCount']} items)")
        print(f"  Investments: ₹{data['totalInvestments']:,.2f} ({data['investmentCount']} items)")
        print(f"  Liabilities: ₹{data['totalLiabilities']:,.2f} ({data['loanCount']} loans)")

    def test_networth_calculation_formula(self):
        """Test net worth calculation: Assets + Investments + Cash - Liabilities"""
        response = requests.get(f"{BASE_URL}/api/dashboard/networth")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify calculation: netWorth = totalAssets + totalInvestments + liquidBalance - totalLiabilities
        calculated_net_worth = (
            data["totalAssets"] + 
            data["totalInvestments"] + 
            data["liquidBalance"] - 
            data["totalLiabilities"]
        )
        
        # Allow small floating point difference
        assert abs(data["netWorth"] - calculated_net_worth) < 0.01, \
            f"Net worth mismatch: {data['netWorth']} != {calculated_net_worth}"
        
        print(f"✓ Net worth calculation verified: {data['totalAssets']} + {data['totalInvestments']} + {data['liquidBalance']} - {data['totalLiabilities']} = {calculated_net_worth}")

    def test_monthly_savings_calculation(self):
        """Test monthly savings = monthlyIncome - monthlyExpenses"""
        response = requests.get(f"{BASE_URL}/api/dashboard/networth")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify savings calculation
        calculated_savings = data["monthlyIncome"] - data["monthlyExpenses"]
        
        assert abs(data["monthlySavings"] - calculated_savings) < 0.01, \
            f"Savings mismatch: {data['monthlySavings']} != {calculated_savings}"
        
        print(f"✓ Monthly savings verified: {data['monthlyIncome']:,.2f} - {data['monthlyExpenses']:,.2f} = {data['monthlySavings']:,.2f}")


class TestDashboardBreakdown:
    """Test Dashboard Breakdown API"""

    def test_get_breakdown(self):
        """Test GET /api/dashboard/breakdown returns category breakdowns"""
        response = requests.get(f"{BASE_URL}/api/dashboard/breakdown")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check all breakdown categories are present
        required_breakdowns = [
            "assetBreakdown", "investmentBreakdown", "loanBreakdown",
            "incomeBreakdown", "expenseBreakdown"
        ]
        for breakdown in required_breakdowns:
            assert breakdown in data, f"Missing breakdown: {breakdown}"
            assert isinstance(data[breakdown], dict)
        
        print(f"✓ Breakdown API returned all required categories")

    def test_asset_breakdown_by_type(self):
        """Test asset breakdown aggregates by assetType"""
        response = requests.get(f"{BASE_URL}/api/dashboard/breakdown")
        assert response.status_code == 200
        
        data = response.json()
        asset_breakdown = data["assetBreakdown"]
        
        # Verify all values are non-negative
        for asset_type, value in asset_breakdown.items():
            assert value >= 0, f"Negative value for {asset_type}: {value}"
            assert isinstance(value, (int, float))
        
        print(f"✓ Asset breakdown by type:")
        for asset_type, value in asset_breakdown.items():
            print(f"  {asset_type}: ₹{value:,.2f}")

    def test_investment_breakdown_by_category(self):
        """Test investment breakdown aggregates by investmentCategory"""
        response = requests.get(f"{BASE_URL}/api/dashboard/breakdown")
        assert response.status_code == 200
        
        data = response.json()
        investment_breakdown = data["investmentBreakdown"]
        
        # Verify all values are non-negative
        for category, value in investment_breakdown.items():
            assert value >= 0, f"Negative value for {category}: {value}"
        
        print(f"✓ Investment breakdown by category:")
        for category, value in investment_breakdown.items():
            print(f"  {category}: ₹{value:,.2f}")

    def test_breakdown_totals_match_networth(self):
        """Test that breakdown totals match networth summary"""
        # Get networth
        networth_response = requests.get(f"{BASE_URL}/api/dashboard/networth")
        assert networth_response.status_code == 200
        networth_data = networth_response.json()
        
        # Get breakdown
        breakdown_response = requests.get(f"{BASE_URL}/api/dashboard/breakdown")
        assert breakdown_response.status_code == 200
        breakdown_data = breakdown_response.json()
        
        # Sum asset breakdown
        asset_total = sum(breakdown_data["assetBreakdown"].values())
        assert abs(asset_total - networth_data["totalAssets"]) < 0.01, \
            f"Asset total mismatch: {asset_total} != {networth_data['totalAssets']}"
        
        # Sum investment breakdown
        investment_total = sum(breakdown_data["investmentBreakdown"].values())
        assert abs(investment_total - networth_data["totalInvestments"]) < 0.01, \
            f"Investment total mismatch: {investment_total} != {networth_data['totalInvestments']}"
        
        print(f"✓ Breakdown totals match networth summary")
        print(f"  Asset breakdown total: ₹{asset_total:,.2f} (matches totalAssets)")
        print(f"  Investment breakdown total: ₹{investment_total:,.2f} (matches totalInvestments)")


class TestInvestmentCategoryValidation:
    """Test all investment categories and modes"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.test_investment_ids = []
        yield
        for inv_id in self.test_investment_ids:
            try:
                requests.delete(f"{BASE_URL}/api/investments/{inv_id}")
            except Exception:
                pass

    def test_all_investment_categories(self):
        """Test creating investments with all category options"""
        categories = [
            "Fixed Deposit (FD)",
            "Recurring Deposit (RD)",
            "Stocks",
            "Mutual Fund",
            "ETF",
            "Bonds",
            "Sovereign Gold Bond (SGB)",
            "Digital Gold",
            "Digital Silver",
            "P2P Lending",
            "SWP",
            "ULIP",
            "Crypto",
            "Other"
        ]
        
        for category in categories:
            payload = {
                "investmentCategory": category,
                "investmentMode": "Growth Only",
                "name": f"TEST_{category.replace(' ', '_')}",
                "principal": 10000.0,
                "currentValue": 10000.0,
                "startDate": "2025-01-01"
            }
            response = requests.post(f"{BASE_URL}/api/investments", json=payload)
            assert response.status_code == 200, f"Failed to create {category}"
            
            data = response.json()
            assert data["investmentCategory"] == category
            self.test_investment_ids.append(data["id"])
        
        print(f"✓ All {len(categories)} investment categories tested successfully")

    def test_all_investment_modes(self):
        """Test creating investments with all mode options"""
        modes = ["Income Generating", "Growth Only", "Growth with Maturity"]
        
        for mode in modes:
            payload = {
                "investmentCategory": "Other",
                "investmentMode": mode,
                "name": f"TEST_{mode.replace(' ', '_')}",
                "principal": 10000.0,
                "currentValue": 10000.0,
                "startDate": "2025-01-01"
            }
            response = requests.post(f"{BASE_URL}/api/investments", json=payload)
            assert response.status_code == 200, f"Failed to create mode: {mode}"
            
            data = response.json()
            assert data["investmentMode"] == mode
            self.test_investment_ids.append(data["id"])
        
        print(f"✓ All {len(modes)} investment modes tested successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
