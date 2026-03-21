"""
Test seed data verification for moneyssutra@gmail.com user.
Verifies all seeded data renders correctly across all API endpoints.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://money-sutra-dev.preview.emergentagent.com').rstrip('/')
SESSION_TOKEN = "499bab99-960a-49fe-934c-43f1b202872f"

@pytest.fixture
def auth_cookies():
    return {"session_token": SESSION_TOKEN}


class TestDashboardAPI:
    """Dashboard combined endpoint tests"""
    
    def test_dashboard_combined_returns_200(self, auth_cookies):
        response = requests.get(f"{BASE_URL}/api/dashboard/combined", cookies=auth_cookies)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "networth" in data
        print("Dashboard combined API returns 200 OK")
    
    def test_dashboard_networth_values(self, auth_cookies):
        response = requests.get(f"{BASE_URL}/api/dashboard/combined", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        nw = data.get("networth", {})
        
        # Net Worth should be around ₹2.34Cr (23,400,000)
        net_worth = nw.get("netWorth", 0)
        assert net_worth > 20000000, f"Net Worth {net_worth} should be > 2Cr"
        assert net_worth < 30000000, f"Net Worth {net_worth} should be < 3Cr"
        print(f"Net Worth: ₹{net_worth:,} (expected ~₹2.34Cr)")
        
        # Income received should be around ₹3L (300,000)
        income_received = nw.get("incomeReceived", 0)
        assert income_received >= 250000, f"Income received {income_received} should be >= 2.5L"
        print(f"Income Received: ₹{income_received:,} (expected ~₹3L)")
        
        # Expenses done should be around ₹87.7K
        expenses_done = nw.get("expensesDone", 0)
        assert expenses_done >= 80000, f"Expenses done {expenses_done} should be >= 80K"
        assert expenses_done <= 100000, f"Expenses done {expenses_done} should be <= 1L"
        print(f"Expenses Done: ₹{expenses_done:,} (expected ~₹87.7K)")


class TestIncomeAPI:
    """Income list and summary endpoint tests"""
    
    def test_income_list_summary_returns_10_sources(self, auth_cookies):
        response = requests.get(f"{BASE_URL}/api/income/list/summary", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 10, f"Expected 10 income sources, got {len(data)}"
        print(f"Income sources count: {len(data)} (expected 10)")
    
    def test_income_types_all_present(self, auth_cookies):
        response = requests.get(f"{BASE_URL}/api/income/list/summary", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        
        expected_types = {'Job', 'Business', 'Rental', 'Interest', 'Dividend', 'Pension', 'Commission', 'Royalty', 'Gift', 'Other'}
        actual_types = {item.get('type') for item in data}
        
        assert expected_types == actual_types, f"Missing types: {expected_types - actual_types}"
        print(f"All 10 income types present: {sorted(actual_types)}")
    
    def test_income_monthly_summary(self, auth_cookies):
        response = requests.get(f"{BASE_URL}/api/income/monthly-summary", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        
        total_income = data.get("totalIncome", 0)
        assert total_income > 0, "Total income should be > 0"
        print(f"Monthly income summary: Total ₹{total_income:,}")


class TestExpensesAPI:
    """Expenses endpoint tests"""
    
    def test_expenses_returns_15_items(self, auth_cookies):
        response = requests.get(f"{BASE_URL}/api/expenses", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 15, f"Expected 15 expenses, got {len(data)}"
        print(f"Expenses count: {len(data)} (expected 15)")


class TestWealthAPI:
    """Combined wealth endpoint tests"""
    
    def test_wealth_combined_returns_200(self, auth_cookies):
        response = requests.get(f"{BASE_URL}/api/combined/wealth", cookies=auth_cookies)
        assert response.status_code == 200
        print("Wealth combined API returns 200 OK")
    
    def test_wealth_assets_count(self, auth_cookies):
        response = requests.get(f"{BASE_URL}/api/combined/wealth", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        
        assets = data.get("assets", [])
        assert len(assets) == 10, f"Expected 10 assets, got {len(assets)}"
        print(f"Assets count: {len(assets)} (expected 10)")
    
    def test_wealth_investments_count(self, auth_cookies):
        response = requests.get(f"{BASE_URL}/api/combined/wealth", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        
        investments = data.get("investments", [])
        assert len(investments) == 16, f"Expected 16 investments, got {len(investments)}"
        print(f"Investments count: {len(investments)} (expected 16)")
    
    def test_wealth_loans_count(self, auth_cookies):
        response = requests.get(f"{BASE_URL}/api/combined/wealth", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        
        loans = data.get("loans", [])
        assert len(loans) == 10, f"Expected 10 loans, got {len(loans)}"
        print(f"Loans count: {len(loans)} (expected 10)")
    
    def test_wealth_insurances_count(self, auth_cookies):
        response = requests.get(f"{BASE_URL}/api/combined/wealth", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        
        insurances = data.get("insurances", [])
        assert len(insurances) == 4, f"Expected 4 insurances, got {len(insurances)}"
        print(f"Insurances count: {len(insurances)} (expected 4)")
    
    def test_wealth_accounts_count(self, auth_cookies):
        response = requests.get(f"{BASE_URL}/api/combined/wealth", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        
        accounts = data.get("accounts", [])
        assert len(accounts) == 5, f"Expected 5 accounts, got {len(accounts)}"
        print(f"Bank Accounts count: {len(accounts)} (expected 5)")
    
    def test_wealth_credit_cards_count(self, auth_cookies):
        response = requests.get(f"{BASE_URL}/api/combined/wealth", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        
        credit_cards = data.get("creditCards", [])
        assert len(credit_cards) == 3, f"Expected 3 credit cards, got {len(credit_cards)}"
        print(f"Credit Cards count: {len(credit_cards)} (expected 3)")


class TestFamilyAPI:
    """Family hub endpoint tests"""
    
    def test_family_returns_200(self, auth_cookies):
        response = requests.get(f"{BASE_URL}/api/family", cookies=auth_cookies)
        assert response.status_code == 200
        print("Family API returns 200 OK")
    
    def test_family_name_is_sharma(self, auth_cookies):
        response = requests.get(f"{BASE_URL}/api/family", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        
        family_name = data.get("familyName", "")
        assert family_name == "Sharma Family", f"Expected 'Sharma Family', got '{family_name}'"
        print(f"Family name: {family_name}")
    
    def test_family_has_4_members(self, auth_cookies):
        response = requests.get(f"{BASE_URL}/api/family", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        
        members = data.get("members", [])
        assert len(members) == 4, f"Expected 4 members, got {len(members)}"
        print(f"Family members count: {len(members)} (expected 4)")
    
    def test_family_members_names(self, auth_cookies):
        response = requests.get(f"{BASE_URL}/api/family", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        
        members = data.get("members", [])
        member_names = {m.get("name") for m in members}
        expected_names = {"Rahul Sharma", "Priya Sharma", "Aarav Sharma", "Ananya Sharma"}
        
        assert expected_names == member_names, f"Missing members: {expected_names - member_names}"
        print(f"All 4 family members present: {sorted(member_names)}")


class TestBankAccountsAPI:
    """Bank accounts endpoint tests"""
    
    def test_accounts_returns_5(self, auth_cookies):
        response = requests.get(f"{BASE_URL}/api/accounts", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 5, f"Expected 5 bank accounts, got {len(data)}"
        print(f"Bank accounts count: {len(data)} (expected 5)")


class TestCreditCardsAPI:
    """Credit cards endpoint tests"""
    
    def test_credit_cards_returns_3(self, auth_cookies):
        response = requests.get(f"{BASE_URL}/api/credit-cards", cookies=auth_cookies)
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 3, f"Expected 3 credit cards, got {len(data)}"
        print(f"Credit cards count: {len(data)} (expected 3)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
