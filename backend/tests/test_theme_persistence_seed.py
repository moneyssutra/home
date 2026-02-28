"""
Test Theme Persistence and Test Account Seed Data
--------------------------------------------------
Tests:
1. Theme persistence: POST /api/settings/preferences saves theme correctly
2. Theme persistence: GET /api/settings/preferences returns the saved theme value
3. Test account seed: Login with test@moneyssutra.com populates assets, credit cards, loans, insurance
4. Wealth page data: /api/assets, /api/credit-cards, /api/insurance return data for test account
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestThemePersistence:
    """Theme preference persistence tests - POST/GET /api/settings/preferences"""

    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Setup authenticated session for test user"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login with test credentials
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test", "password": "test"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.session_token = login_response.json().get("session_token")
        # Session cookie is automatically stored in session
        yield
        # Cleanup - logout
        self.session.post(f"{BASE_URL}/api/auth/logout")

    def test_get_preferences_default(self):
        """Test GET /api/settings/preferences returns preferences"""
        response = self.session.get(f"{BASE_URL}/api/settings/preferences")
        assert response.status_code == 200, f"Get preferences failed: {response.text}"
        data = response.json()
        # Should have theme field (either default 'light' or previously set)
        assert "theme" in data, "Response should contain 'theme' field"
        assert data["theme"] in ["light", "dark"], f"Theme should be 'light' or 'dark', got {data['theme']}"
        print(f"Current theme preference: {data['theme']}")

    def test_save_theme_with_post(self):
        """Test POST /api/settings/preferences saves theme correctly"""
        # Save theme as 'dark'
        save_payload = {
            "theme": "dark",
            "currency": "INR",
            "language": "en",
            "date_format": "DD/MM/YYYY",
            "show_decimals": True,
            "default_view": "dashboard"
        }
        response = self.session.post(
            f"{BASE_URL}/api/settings/preferences",
            json=save_payload
        )
        assert response.status_code == 200, f"Save preferences failed: {response.text}"
        
        # Verify saved theme via GET
        get_response = self.session.get(f"{BASE_URL}/api/settings/preferences")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["theme"] == "dark", f"Theme should be 'dark' after saving, got {data['theme']}"
        print("Theme saved as 'dark' successfully")

    def test_toggle_theme_to_light(self):
        """Test toggling theme to 'light' persists correctly"""
        # Save theme as 'light'
        save_payload = {
            "theme": "light",
            "currency": "INR",
            "language": "en",
            "date_format": "DD/MM/YYYY",
            "show_decimals": True,
            "default_view": "dashboard"
        }
        response = self.session.post(
            f"{BASE_URL}/api/settings/preferences",
            json=save_payload
        )
        assert response.status_code == 200, f"Save preferences failed: {response.text}"
        
        # Verify theme is 'light'
        get_response = self.session.get(f"{BASE_URL}/api/settings/preferences")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["theme"] == "light", f"Theme should be 'light' after saving, got {data['theme']}"
        print("Theme saved as 'light' successfully")

    def test_put_method_not_allowed(self):
        """Test PUT method returns 405 (only POST is allowed now)"""
        save_payload = {
            "theme": "dark",
            "currency": "INR",
            "language": "en",
            "date_format": "DD/MM/YYYY",
            "show_decimals": True,
            "default_view": "dashboard"
        }
        response = self.session.put(
            f"{BASE_URL}/api/settings/preferences",
            json=save_payload
        )
        assert response.status_code == 405, f"PUT should return 405, got {response.status_code}"
        print("PUT method correctly returns 405 Method Not Allowed")


class TestSeedDataForTestAccount:
    """Test account seed data tests - login triggers _seed_test_account"""

    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Setup authenticated session for test user"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login with test credentials to trigger seed
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test", "password": "test"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        yield
        # Cleanup - logout
        self.session.post(f"{BASE_URL}/api/auth/logout")

    def test_assets_endpoint_returns_data(self):
        """Test /api/assets returns seed data for test account"""
        response = self.session.get(f"{BASE_URL}/api/assets")
        assert response.status_code == 200, f"Get assets failed: {response.text}"
        data = response.json()
        # Should be a list with at least 1 asset
        assert isinstance(data, list), "Assets response should be a list"
        assert len(data) >= 1, f"Test account should have at least 1 asset, got {len(data)}"
        
        # Verify asset structure - actual field names are assetName, assetType, currentValue
        first_asset = data[0]
        assert "assetName" in first_asset or "name" in first_asset, "Asset should have 'assetName' or 'name' field"
        assert "assetType" in first_asset or "type" in first_asset, "Asset should have 'assetType' or 'type' field"
        assert "currentValue" in first_asset or "value" in first_asset, "Asset should have 'currentValue' or 'value' field"
        print(f"Found {len(data)} assets for test account")
        for asset in data[:3]:  # Show first 3
            name = asset.get('assetName') or asset.get('name')
            value = asset.get('currentValue') or asset.get('value', 0)
            print(f"  - {name}: ₹{value:,.0f}")

    def test_credit_cards_endpoint_returns_data(self):
        """Test /api/credit-cards returns seed data for test account"""
        response = self.session.get(f"{BASE_URL}/api/credit-cards")
        assert response.status_code == 200, f"Get credit cards failed: {response.text}"
        data = response.json()
        # Should be a list with at least 1 credit card
        assert isinstance(data, list), "Credit cards response should be a list"
        assert len(data) >= 1, f"Test account should have at least 1 credit card, got {len(data)}"
        
        # Verify credit card structure - actual field names are cardName, bankName, creditLimit
        first_cc = data[0]
        assert "cardName" in first_cc or "name" in first_cc, "Credit card should have 'cardName' or 'name' field"
        assert "bankName" in first_cc or "bank" in first_cc, "Credit card should have 'bankName' or 'bank' field"
        print(f"Found {len(data)} credit cards for test account")
        for cc in data[:3]:
            name = cc.get('cardName') or cc.get('name')
            limit = cc.get('creditLimit', 0)
            print(f"  - {name}: Limit ₹{limit:,.0f}")

    def test_insurance_endpoint_returns_data(self):
        """Test /api/insurances returns seed data for test account"""
        response = self.session.get(f"{BASE_URL}/api/insurances")
        assert response.status_code == 200, f"Get insurance failed: {response.text}"
        data = response.json()
        # Should be a list with at least 1 insurance
        assert isinstance(data, list), "Insurance response should be a list"
        assert len(data) >= 1, f"Test account should have at least 1 insurance, got {len(data)}"
        
        # Verify insurance structure - actual field names are policyName, insuranceType, coverageAmount
        first_ins = data[0]
        assert "policyName" in first_ins or "name" in first_ins, "Insurance should have 'policyName' or 'name' field"
        assert "insuranceType" in first_ins or "type" in first_ins, "Insurance should have 'insuranceType' or 'type' field"
        print(f"Found {len(data)} insurance policies for test account")
        for ins in data[:2]:
            name = ins.get('policyName') or ins.get('name')
            cover = ins.get('coverageAmount') or ins.get('coverAmount', 0)
            print(f"  - {name}: Cover ₹{cover:,.0f}")

    def test_loans_endpoint_returns_data(self):
        """Test /api/loans returns loans for test account"""
        response = self.session.get(f"{BASE_URL}/api/loans")
        assert response.status_code == 200, f"Get loans failed: {response.text}"
        data = response.json()
        # Should be a list with at least 1 loan
        assert isinstance(data, list), "Loans response should be a list"
        assert len(data) >= 1, f"Test account should have at least 1 loan, got {len(data)}"
        print(f"Found {len(data)} loans for test account")
        for loan in data[:3]:
            name = loan.get('loanName') or loan.get('name')
            balance = loan.get('outstandingAmount') or loan.get('balance', 0)
            print(f"  - {name}: Balance ₹{balance:,.0f}")


class TestThemePersistenceFlow:
    """Full theme persistence flow - save, logout, login, verify"""

    def test_theme_persists_after_logout_login(self):
        """Test theme preference persists after logout and login"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Step 1: Login
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test", "password": "test"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        print("Step 1: Logged in successfully")
        
        # Step 2: Set theme to 'dark'
        save_payload = {
            "theme": "dark",
            "currency": "INR",
            "language": "en",
            "date_format": "DD/MM/YYYY",
            "show_decimals": True,
            "default_view": "dashboard"
        }
        save_response = session.post(
            f"{BASE_URL}/api/settings/preferences",
            json=save_payload
        )
        assert save_response.status_code == 200, f"Save theme failed: {save_response.text}"
        print("Step 2: Theme set to 'dark'")
        
        # Step 3: Logout
        session.post(f"{BASE_URL}/api/auth/logout")
        print("Step 3: Logged out")
        
        # Step 4: Login again with a NEW session
        session2 = requests.Session()
        session2.headers.update({"Content-Type": "application/json"})
        login_response2 = session2.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test", "password": "test"}
        )
        assert login_response2.status_code == 200, f"Re-login failed: {login_response2.text}"
        print("Step 4: Re-logged in successfully")
        
        # Step 5: Check theme is still 'dark'
        get_response = session2.get(f"{BASE_URL}/api/settings/preferences")
        assert get_response.status_code == 200, f"Get preferences failed: {get_response.text}"
        data = get_response.json()
        assert data["theme"] == "dark", f"Theme should be 'dark' after re-login, got {data['theme']}"
        print(f"Step 5: Theme is '{data['theme']}' after re-login - PERSISTENCE VERIFIED!")
        
        # Cleanup - set back to light
        session2.post(
            f"{BASE_URL}/api/settings/preferences",
            json={"theme": "light", "currency": "INR", "language": "en", "date_format": "DD/MM/YYYY", "show_decimals": True, "default_view": "dashboard"}
        )
        session2.post(f"{BASE_URL}/api/auth/logout")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
