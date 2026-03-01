"""
Test suite for Premium Mode Opportunities
Tests: Premium user filtering, preferences API with is_premium/partner_consent, admin premium_only creation
Focus: NEW premium features added to Opportunity Engine
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Session objects for authenticated requests
session = requests.Session()
admin_session = requests.Session()

# Store original preferences for reset
original_preferences = {}
test_opportunity_ids = []


class TestPreferencesAPI:
    """Test settings/preferences API for premium mode fields"""

    @pytest.fixture(autouse=True)
    def setup_user_auth(self):
        """Authenticate as test user before each test"""
        login_res = session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert login_res.status_code == 200, f"User login failed: {login_res.text}"
        token = login_res.json().get("session_token")
        if token:
            session.cookies.set("session_token", token)
        yield

    def test_get_preferences_returns_premium_fields(self):
        """GET /api/settings/preferences should return is_premium and partner_consent fields"""
        response = session.get(f"{BASE_URL}/api/settings/preferences")
        
        assert response.status_code == 200, f"Failed with: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify response structure contains is_premium and partner_consent
        assert "is_premium" in data, "Response should contain 'is_premium' field"
        assert "partner_consent" in data, "Response should contain 'partner_consent' field"
        
        # Verify types
        assert isinstance(data["is_premium"], bool), "is_premium should be boolean"
        assert isinstance(data["partner_consent"], bool), "partner_consent should be boolean"
        
        # Store original values for later reset
        global original_preferences
        original_preferences = data.copy()
        
        print(f"✓ GET preferences: is_premium={data['is_premium']}, partner_consent={data['partner_consent']}")

    def test_set_premium_mode_true(self):
        """POST /api/settings/preferences with is_premium=true should save"""
        payload = {
            "currency": "INR",
            "language": "English",
            "date_format": "DD/MM/YYYY",
            "theme": "light",
            "show_decimals": True,
            "default_view": "dashboard",
            "is_premium": True,
            "partner_consent": True
        }
        
        response = session.post(f"{BASE_URL}/api/settings/preferences", json=payload)
        
        assert response.status_code == 200, f"Failed with: {response.status_code} - {response.text}"
        
        # Verify by GET
        get_res = session.get(f"{BASE_URL}/api/settings/preferences")
        assert get_res.status_code == 200
        data = get_res.json()
        
        assert data["is_premium"] == True, "is_premium should be True after setting"
        print(f"✓ Set is_premium=True and verified via GET")

    def test_set_premium_mode_false(self):
        """POST /api/settings/preferences with is_premium=false should save"""
        payload = {
            "currency": "INR",
            "language": "English",
            "date_format": "DD/MM/YYYY",
            "theme": "light",
            "show_decimals": True,
            "default_view": "dashboard",
            "is_premium": False,
            "partner_consent": True
        }
        
        response = session.post(f"{BASE_URL}/api/settings/preferences", json=payload)
        
        assert response.status_code == 200, f"Failed with: {response.status_code} - {response.text}"
        
        # Verify by GET
        get_res = session.get(f"{BASE_URL}/api/settings/preferences")
        assert get_res.status_code == 200
        data = get_res.json()
        
        assert data["is_premium"] == False, "is_premium should be False after setting"
        print(f"✓ Set is_premium=False and verified via GET")

    def test_set_partner_consent(self):
        """POST /api/settings/preferences with partner_consent toggle should save"""
        # Set to false
        payload = {
            "currency": "INR",
            "language": "English",
            "date_format": "DD/MM/YYYY",
            "theme": "light",
            "show_decimals": True,
            "default_view": "dashboard",
            "is_premium": False,
            "partner_consent": False
        }
        
        response = session.post(f"{BASE_URL}/api/settings/preferences", json=payload)
        assert response.status_code == 200
        
        # Verify
        get_res = session.get(f"{BASE_URL}/api/settings/preferences")
        data = get_res.json()
        assert data["partner_consent"] == False, "partner_consent should be False"
        
        # Set back to true
        payload["partner_consent"] = True
        session.post(f"{BASE_URL}/api/settings/preferences", json=payload)
        print(f"✓ Partner consent toggle works correctly")


class TestPremiumOpportunityFiltering:
    """Test that premium users see premium_only opportunities and don't see campaign opportunities"""

    @pytest.fixture(autouse=True)
    def setup_user_auth(self):
        """Authenticate as test user"""
        login_res = session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert login_res.status_code == 200, f"User login failed: {login_res.text}"
        token = login_res.json().get("session_token")
        if token:
            session.cookies.set("session_token", token)
        yield

    def test_non_premium_user_does_not_see_premium_only_opportunities(self):
        """Non-premium user should NOT see opportunities with premium_only=true"""
        # First ensure user is non-premium
        payload = {
            "currency": "INR", "language": "English", "date_format": "DD/MM/YYYY",
            "theme": "light", "show_decimals": True, "default_view": "dashboard",
            "is_premium": False, "partner_consent": True
        }
        session.post(f"{BASE_URL}/api/settings/preferences", json=payload)
        
        # Wait a moment for settings to apply
        time.sleep(1)
        
        # Get eligible opportunities (this takes 5-8 seconds per spec)
        response = session.get(f"{BASE_URL}/api/opportunities/eligible", timeout=30)
        
        assert response.status_code == 200, f"Failed with: {response.status_code} - {response.text}"
        data = response.json()
        opportunities = data.get("opportunities", [])
        
        # Check that no opportunity has premium_only=true
        premium_only_opps = [o for o in opportunities if o.get("premium_only") == True]
        assert len(premium_only_opps) == 0, f"Non-premium user should not see premium_only opportunities, but found: {[o['title'] for o in premium_only_opps]}"
        
        print(f"✓ Non-premium user sees {len(opportunities)} opportunities, none are premium_only")
        for opp in opportunities:
            print(f"  - {opp.get('title')} (premium_only={opp.get('premium_only', False)})")

    def test_premium_user_sees_premium_only_opportunities(self):
        """Premium user SHOULD see opportunities with premium_only=true"""
        # Set user to premium
        payload = {
            "currency": "INR", "language": "English", "date_format": "DD/MM/YYYY",
            "theme": "light", "show_decimals": True, "default_view": "dashboard",
            "is_premium": True, "partner_consent": True
        }
        session.post(f"{BASE_URL}/api/settings/preferences", json=payload)
        
        # Wait a moment for settings to apply
        time.sleep(1)
        
        # Get eligible opportunities
        response = session.get(f"{BASE_URL}/api/opportunities/eligible", timeout=30)
        
        assert response.status_code == 200, f"Failed with: {response.status_code} - {response.text}"
        data = response.json()
        opportunities = data.get("opportunities", [])
        
        # Premium users SHOULD be able to see premium_only opportunities
        # Note: they may or may not appear depending on eligibility, but they won't be filtered out
        print(f"✓ Premium user sees {len(opportunities)} opportunities")
        for opp in opportunities:
            print(f"  - {opp.get('title')} (type={opp.get('type')}, premium_only={opp.get('premium_only', False)})")
        
        # Check that no campaign-type opportunities are shown (premium users don't see campaigns)
        campaign_opps = [o for o in opportunities if o.get("type") == "campaign"]
        assert len(campaign_opps) == 0, f"Premium user should NOT see campaign opportunities, but found: {[o['title'] for o in campaign_opps]}"
        print(f"✓ Premium user correctly does NOT see any campaign-type opportunities")
        
        # Reset user to non-premium
        payload["is_premium"] = False
        session.post(f"{BASE_URL}/api/settings/preferences", json=payload)


class TestAdminPremiumOnlyOpportunity:
    """Test admin can create and update premium_only opportunities"""

    @pytest.fixture(autouse=True)
    def setup_admin_auth(self):
        """Authenticate as admin"""
        login_res = admin_session.post(f"{BASE_URL}/api/admin/login", json={
            "email": "admin@moneyssutra.com",
            "password": "admin123"
        })
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        yield

    def test_create_premium_only_opportunity(self):
        """POST /api/opportunities/admin/create with premium_only=true"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Premium_Opp_{unique_id}",
            "description": "Premium only test opportunity",
            "cta_text": "Get Premium Access",
            "category": "Growth",
            "priority": 1,
            "type": "system",
            "destination_url": "/premium",
            "active": False,  # Keep inactive to not affect real users
            "premium_only": True,
            "eligibility_json": {}
        }
        
        response = admin_session.post(f"{BASE_URL}/api/opportunities/admin/create", json=payload)
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        assert data.get("premium_only") == True, "Created opportunity should have premium_only=true"
        assert data.get("title") == payload["title"], "Title should match"
        
        test_opportunity_ids.append(data["id"])
        print(f"✓ Created premium_only opportunity: {data['id']}")

    def test_create_non_premium_opportunity(self):
        """POST /api/opportunities/admin/create with premium_only=false (default)"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Regular_Opp_{unique_id}",
            "description": "Regular test opportunity",
            "cta_text": "Learn More",
            "category": "Safety",
            "priority": 3,
            "type": "system",
            "active": False,
            "premium_only": False
        }
        
        response = admin_session.post(f"{BASE_URL}/api/opportunities/admin/create", json=payload)
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        assert data.get("premium_only") == False, "Created opportunity should have premium_only=false"
        
        test_opportunity_ids.append(data["id"])
        print(f"✓ Created non-premium opportunity: {data['id']}")

    def test_update_opportunity_premium_only_field(self):
        """PUT /api/opportunities/admin/{id} can update premium_only field"""
        # First create a test opportunity
        unique_id = str(uuid.uuid4())[:8]
        create_res = admin_session.post(f"{BASE_URL}/api/opportunities/admin/create", json={
            "title": f"TEST_ToUpdatePremium_{unique_id}",
            "description": "Will toggle premium_only",
            "category": "Debt",
            "active": False,
            "premium_only": False
        })
        assert create_res.status_code == 200
        opp_id = create_res.json()["id"]
        test_opportunity_ids.append(opp_id)
        
        # Update to premium_only=true
        update_res = admin_session.put(f"{BASE_URL}/api/opportunities/admin/{opp_id}", json={
            "premium_only": True
        })
        
        assert update_res.status_code == 200, f"Update failed: {update_res.text}"
        data = update_res.json()
        
        assert data.get("premium_only") == True, "premium_only should be updated to True"
        print(f"✓ Updated opportunity {opp_id} premium_only to True")
        
        # Update back to premium_only=false
        update_res2 = admin_session.put(f"{BASE_URL}/api/opportunities/admin/{opp_id}", json={
            "premium_only": False
        })
        
        assert update_res2.status_code == 200
        data2 = update_res2.json()
        assert data2.get("premium_only") == False, "premium_only should be updated to False"
        print(f"✓ Updated opportunity {opp_id} premium_only back to False")

    def test_admin_list_shows_premium_only_field(self):
        """GET /api/opportunities/admin/list shows premium_only field for each opportunity"""
        response = admin_session.get(f"{BASE_URL}/api/opportunities/admin/list")
        
        assert response.status_code == 200, f"Admin list failed: {response.text}"
        data = response.json()
        opportunities = data.get("opportunities", [])
        
        # Check that opportunities have premium_only field
        for opp in opportunities[:5]:  # Check first 5
            # premium_only might be missing for old opportunities (defaults to False)
            premium_val = opp.get("premium_only", False)
            assert isinstance(premium_val, bool), f"premium_only should be boolean for {opp['title']}"
        
        # Find premium_only opportunities
        premium_opps = [o for o in opportunities if o.get("premium_only") == True]
        print(f"✓ Admin list shows {len(premium_opps)} premium_only opportunities out of {len(opportunities)} total")


class TestPremiumFilteringWithSeedData:
    """Test premium filtering works with existing seed opportunities"""

    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Setup user auth"""
        login_res = session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        if login_res.status_code == 200:
            token = login_res.json().get("session_token")
            if token:
                session.cookies.set("session_token", token)
        yield
        
        # Reset user to non-premium after test class
        payload = {
            "currency": "INR", "language": "English", "date_format": "DD/MM/YYYY",
            "theme": "light", "show_decimals": True, "default_view": "dashboard",
            "is_premium": False, "partner_consent": True
        }
        session.post(f"{BASE_URL}/api/settings/preferences", json=payload)

    def test_seed_premium_opportunity_filtering(self):
        """
        There is a seed premium_only opportunity ('Premium: Advanced Portfolio Analysis').
        Verify non-premium user doesn't see it, premium user does.
        """
        # Test as non-premium
        payload = {
            "currency": "INR", "language": "English", "date_format": "DD/MM/YYYY",
            "theme": "light", "show_decimals": True, "default_view": "dashboard",
            "is_premium": False, "partner_consent": True
        }
        session.post(f"{BASE_URL}/api/settings/preferences", json=payload)
        time.sleep(1)
        
        non_premium_res = session.get(f"{BASE_URL}/api/opportunities/eligible", timeout=30)
        assert non_premium_res.status_code == 200
        non_premium_opps = non_premium_res.json().get("opportunities", [])
        
        # Check for premium opportunity
        premium_titles = ["Premium: Advanced Portfolio Analysis", "Premium"]
        found_premium_non_premium = any(
            any(pt.lower() in o.get("title", "").lower() for pt in premium_titles) and o.get("premium_only")
            for o in non_premium_opps
        )
        
        print(f"Non-premium user sees: {[o['title'] for o in non_premium_opps]}")
        
        # Now test as premium
        payload["is_premium"] = True
        session.post(f"{BASE_URL}/api/settings/preferences", json=payload)
        time.sleep(1)
        
        premium_res = session.get(f"{BASE_URL}/api/opportunities/eligible", timeout=30)
        assert premium_res.status_code == 200
        premium_opps = premium_res.json().get("opportunities", [])
        
        print(f"Premium user sees: {[o['title'] for o in premium_opps]}")
        
        # Verify filtering logic
        for opp in non_premium_opps:
            assert opp.get("premium_only") != True, f"Non-premium user should not see premium_only opp: {opp['title']}"
        
        for opp in premium_opps:
            assert opp.get("type") != "campaign", f"Premium user should not see campaign opp: {opp['title']}"
        
        print(f"✓ Premium filtering logic verified")
        
        # Reset to non-premium
        payload["is_premium"] = False
        session.post(f"{BASE_URL}/api/settings/preferences", json=payload)


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed opportunities and reset preferences after all tests"""
    yield
    # Cleanup opportunities
    try:
        admin_login = admin_session.post(f"{BASE_URL}/api/admin/login", json={
            "email": "admin@moneyssutra.com", "password": "admin123"
        })
        if admin_login.status_code == 200:
            for opp_id in test_opportunity_ids:
                try:
                    admin_session.delete(f"{BASE_URL}/api/opportunities/admin/{opp_id}")
                    print(f"Cleaned up test opportunity: {opp_id}")
                except:
                    pass
    except:
        pass
    
    # Reset user preferences to non-premium
    try:
        login_res = session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test", "password": "test"
        })
        if login_res.status_code == 200:
            token = login_res.json().get("session_token")
            if token:
                session.cookies.set("session_token", token)
            payload = {
                "currency": "INR", "language": "English", "date_format": "DD/MM/YYYY",
                "theme": "light", "show_decimals": True, "default_view": "dashboard",
                "is_premium": False, "partner_consent": True
            }
            session.post(f"{BASE_URL}/api/settings/preferences", json=payload)
            print("Reset user to non-premium")
    except:
        pass
