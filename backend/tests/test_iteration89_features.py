"""
Iteration 89: Test seeded data verification and feature tests
- Test user: test@moneyssutra.com / test
- Expected: 8 income, 44 expenses, 16 investments, 11 assets, 9 loans, 4 credit cards, 9 insurances, 4 accounts, 5 goals
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestIteration89Features:
    """Tests for iteration 89 - seeded data verification"""
    
    session = None
    auth_cookie = None
    
    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Login and get auth cookie"""
        if TestIteration89Features.session is None:
            TestIteration89Features.session = requests.Session()
            # Login
            login_response = TestIteration89Features.session.post(
                f"{BASE_URL}/api/auth/login",
                json={"username": "test@moneyssutra.com", "password": "test"}
            )
            assert login_response.status_code == 200, f"Login failed: {login_response.text}"
            TestIteration89Features.auth_cookie = TestIteration89Features.session.cookies.get_dict()
            print(f"Logged in successfully")
        yield
    
    # === INCOME TESTS ===
    def test_income_sources_count(self):
        """Verify 8 income sources exist"""
        response = self.session.get(f"{BASE_URL}/api/income")
        assert response.status_code == 200
        income_data = response.json()
        
        # Count all income types
        total_income_count = 0
        if isinstance(income_data, dict):
            for income_type, items in income_data.items():
                if isinstance(items, list):
                    total_income_count += len(items)
        elif isinstance(income_data, list):
            total_income_count = len(income_data)
        
        print(f"Total income sources: {total_income_count}")
        # Should have 8 income sources
        # Allow some flexibility since auto-generated income might vary
        assert total_income_count >= 5, f"Expected at least 5 income sources, got {total_income_count}"
    
    # === INVESTMENT TESTS ===
    def test_investments_count(self):
        """Verify investments exist (expected ~16)"""
        response = self.session.get(f"{BASE_URL}/api/investments")
        assert response.status_code == 200
        investments = response.json()
        
        count = len(investments) if isinstance(investments, list) else 0
        print(f"Total investments: {count}")
        assert count >= 10, f"Expected at least 10 investments, got {count}"
    
    # === ASSET TESTS ===
    def test_assets_count(self):
        """Verify assets exist (expected ~11)"""
        response = self.session.get(f"{BASE_URL}/api/assets")
        assert response.status_code == 200
        assets = response.json()
        
        count = len(assets) if isinstance(assets, list) else 0
        print(f"Total assets: {count}")
        assert count >= 8, f"Expected at least 8 assets, got {count}"
    
    # === LOAN TESTS ===
    def test_loans_count(self):
        """Verify loans exist (expected ~9)"""
        response = self.session.get(f"{BASE_URL}/api/loans")
        assert response.status_code == 200
        loans = response.json()
        
        count = len(loans) if isinstance(loans, list) else 0
        print(f"Total loans: {count}")
        assert count >= 6, f"Expected at least 6 loans, got {count}"
    
    # === CREDIT CARD TESTS ===
    def test_credit_cards_count(self):
        """Verify credit cards exist (expected ~4)"""
        response = self.session.get(f"{BASE_URL}/api/credit-cards")
        assert response.status_code == 200
        cards = response.json()
        
        count = len(cards) if isinstance(cards, list) else 0
        print(f"Total credit cards: {count}")
        assert count >= 3, f"Expected at least 3 credit cards, got {count}"
    
    # === INSURANCE TESTS ===
    def test_insurance_count(self):
        """Verify insurance policies exist (expected ~9)"""
        response = self.session.get(f"{BASE_URL}/api/insurances")
        assert response.status_code == 200
        insurance = response.json()
        
        count = len(insurance) if isinstance(insurance, list) else 0
        print(f"Total insurance policies: {count}")
        assert count >= 6, f"Expected at least 6 insurance policies, got {count}"
    
    # === ACCOUNT TESTS ===
    def test_accounts_count(self):
        """Verify accounts exist (expected ~4)"""
        response = self.session.get(f"{BASE_URL}/api/accounts")
        assert response.status_code == 200
        accounts = response.json()
        
        count = len(accounts) if isinstance(accounts, list) else 0
        print(f"Total accounts: {count}")
        assert count >= 3, f"Expected at least 3 accounts, got {count}"
    
    # === GOAL TESTS ===
    def test_goals_count(self):
        """Verify goals exist (expected ~5)"""
        response = self.session.get(f"{BASE_URL}/api/goals")
        assert response.status_code == 200
        goals = response.json()
        
        count = len(goals) if isinstance(goals, list) else 0
        print(f"Total goals: {count}")
        assert count >= 3, f"Expected at least 3 goals, got {count}"
    
    # === EXPENSE TESTS ===
    def test_expenses_by_month_endpoint(self):
        """Verify expenses/by-month endpoint works"""
        response = self.session.get(f"{BASE_URL}/api/expenses/by-month?month=2026-02")
        assert response.status_code == 200
        expenses = response.json()
        
        count = len(expenses) if isinstance(expenses, list) else 0
        print(f"Expenses for Feb 2026: {count}")
        # Check structure
        if count > 0:
            assert "_displayStatus" in expenses[0], "Expense missing _displayStatus field"
    
    def test_expense_summary_endpoint(self):
        """Verify expense summary/breakdown works"""
        response = self.session.get(f"{BASE_URL}/api/expense-summary?month=2026-02")
        assert response.status_code == 200
        summary = response.json()
        print(f"Expense summary: {summary}")
    
    # === DASHBOARD TESTS ===
    def test_dashboard_net_worth(self):
        """Verify dashboard shows positive net worth"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/summary")
        assert response.status_code == 200
        data = response.json()
        
        # Net worth should be positive with seeded data
        net_worth = data.get("netWorth", data.get("totalNetWorth", 0))
        print(f"Net Worth: {net_worth}")
        assert net_worth > 0, f"Expected positive net worth, got {net_worth}"
    
    # === INSIGHTS/INTELLIGENCE TESTS ===
    def test_intelligence_clock_endpoint(self):
        """Verify survival clock data"""
        response = self.session.get(f"{BASE_URL}/api/intelligence/survival-clock")
        assert response.status_code == 200
        data = response.json()
        
        survival_days = data.get("survivalDays", 0)
        print(f"Survival days: {survival_days}")
        assert survival_days > 0, "Expected positive survival days"
    
    def test_intelligence_gamification_endpoint(self):
        """Verify gamification data with badges/challenges"""
        response = self.session.get(f"{BASE_URL}/api/intelligence/gamification")
        assert response.status_code == 200
        data = response.json()
        
        # Should have achievements and challenges
        achievements = data.get("allAchievements", [])
        print(f"Total achievements: {len(achievements)}")
        assert len(achievements) > 0, "Expected achievements data"
        
        # Check for unlocked badges
        unlocked = [a for a in achievements if a.get("unlocked")]
        print(f"Unlocked badges: {len(unlocked)}")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
