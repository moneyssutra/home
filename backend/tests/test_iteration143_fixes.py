"""
Test iteration 143 fixes:
1. Loans API returns 200 even with null outstandingAmount/startDate
2. Financial Health API returns 'breakdown' in investmentAllocation
3. Debt to Asset action text includes actual amounts (rupees and percentage)
4. ACHIEVEMENTS dict has exactly 30 entries
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Session tokens from test requirements
MONEYSUTRA_SESSION = "61ab1fc5-1116-411d-b097-d1406b50c9e2"
SANDEEPDASH_SESSION = "4bf40bb8-b8bb-4bda-bb96-ec262a903a1d"


class TestLoansAPI:
    """Test Loans API works even with null outstandingAmount/startDate"""
    
    def test_get_loans_returns_200(self):
        """GET /api/loans should return 200 even with loans that have null fields"""
        response = requests.get(
            f"{BASE_URL}/api/loans",
            cookies={"session_token": MONEYSUTRA_SESSION}
        )
        # Main assertion: should return 200, not 500
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Should be a list
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/loans returned 200 with {len(data)} loans")


class TestFinancialHealthAPI:
    """Test Financial Health API improvements"""
    
    def test_investment_allocation_has_breakdown(self):
        """GET /api/financial-health should include breakdown object in investmentAllocation"""
        response = requests.get(
            f"{BASE_URL}/api/financial-health",
            cookies={"session_token": SANDEEPDASH_SESSION}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check investmentAllocation exists
        assert "investmentAllocation" in data, "Missing investmentAllocation in response"
        inv_alloc = data["investmentAllocation"]
        
        # Check breakdown exists
        assert "breakdown" in inv_alloc, "Missing 'breakdown' in investmentAllocation"
        breakdown = inv_alloc["breakdown"]
        
        # Check breakdown structure
        required_keys = ["equity", "debt", "gold", "other", "total"]
        for key in required_keys:
            assert key in breakdown, f"Missing '{key}' in breakdown"
        
        # Check each category has amount and percent
        for category in ["equity", "debt", "gold", "other"]:
            assert "amount" in breakdown[category], f"Missing 'amount' in breakdown.{category}"
            assert "percent" in breakdown[category], f"Missing 'percent' in breakdown.{category}"
        
        print(f"PASS: investmentAllocation.breakdown structure verified")
        print(f"  - Equity: {breakdown['equity']['percent']}% (₹{breakdown['equity']['amount']})")
        print(f"  - Debt: {breakdown['debt']['percent']}% (₹{breakdown['debt']['amount']})")
        print(f"  - Gold: {breakdown['gold']['percent']}% (₹{breakdown['gold']['amount']})")
        print(f"  - Other: {breakdown['other']['percent']}% (₹{breakdown['other']['amount']})")
        print(f"  - Total: ₹{breakdown['total']}")
    
    def test_debt_to_asset_action_has_amounts(self):
        """Debt to Asset action text should include actual amounts (rupees and percentage)"""
        response = requests.get(
            f"{BASE_URL}/api/financial-health",
            cookies={"session_token": SANDEEPDASH_SESSION}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check debtToAsset exists
        assert "debtToAsset" in data, "Missing debtToAsset in response"
        debt_data = data["debtToAsset"]
        
        # Check required fields
        assert "action" in debt_data, "Missing 'action' in debtToAsset"
        assert "ratio" in debt_data, "Missing 'ratio' in debtToAsset"
        assert "totalDebt" in debt_data, "Missing 'totalDebt' in debtToAsset"
        assert "totalWorth" in debt_data, "Missing 'totalWorth' in debtToAsset"
        
        action_text = debt_data["action"]
        
        # Action should contain rupee amounts (₹) and percentage (%)
        # The format is like: "Your debt (₹X) is Y% of your net worth (₹Z)..."
        assert "₹" in action_text, f"Action text should contain rupee symbol: {action_text}"
        assert "%" in action_text, f"Action text should contain percentage: {action_text}"
        
        print(f"PASS: debtToAsset action text includes amounts")
        print(f"  - Action: {action_text[:100]}...")
        print(f"  - Ratio: {debt_data['ratio']}%")
        print(f"  - Total Debt: ₹{debt_data['totalDebt']}")
        print(f"  - Total Worth: ₹{debt_data['totalWorth']}")


class TestGamificationBadges:
    """Test badges count is exactly 30"""
    
    def test_achievements_count_is_30(self):
        """Gamification profile should show totalAchievements as 30"""
        response = requests.get(
            f"{BASE_URL}/api/gamification/profile",
            cookies={"session_token": SANDEEPDASH_SESSION}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check totalAchievements is exactly 30
        total = data.get("totalAchievements", 0)
        assert total == 30, f"Expected 30 achievements, got {total}"
        
        # Also verify allAchievements array
        all_achievements = data.get("allAchievements", [])
        assert len(all_achievements) == 30, f"Expected 30 items in allAchievements, got {len(all_achievements)}"
        
        print(f"PASS: Exactly 30 achievements/badges configured")
        print(f"  - totalAchievements: {total}")
        print(f"  - allAchievements count: {len(all_achievements)}")


class TestWealthPageExpenses:
    """Test Wealth page can load expenses data (Promise.allSettled fix)"""
    
    def test_wealth_related_apis(self):
        """All wealth-related APIs should return 200"""
        endpoints = [
            "/api/dashboard/networth",
            "/api/assets",
            "/api/investments",
            "/api/loans",
            "/api/insurances",
            "/api/accounts",
            "/api/credit-cards",
            "/api/income",
        ]
        
        for endpoint in endpoints:
            response = requests.get(
                f"{BASE_URL}{endpoint}",
                cookies={"session_token": MONEYSUTRA_SESSION}
            )
            assert response.status_code == 200, f"{endpoint} failed with {response.status_code}: {response.text}"
            print(f"PASS: {endpoint} returned 200")
        
        # Test expenses by month
        import datetime
        now = datetime.datetime.now()
        month_str = f"{now.year}-{str(now.month).zfill(2)}"
        expenses_response = requests.get(
            f"{BASE_URL}/api/expenses/by-month?month={month_str}",
            cookies={"session_token": MONEYSUTRA_SESSION}
        )
        assert expenses_response.status_code == 200, f"Expenses by month failed: {expenses_response.text}"
        print(f"PASS: /api/expenses/by-month?month={month_str} returned 200")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
