"""
Test suite for Opportunity Engine APIs
Tests: /api/opportunities/* endpoints for user-facing and admin functionality
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

# Store test data for cleanup
test_opportunity_ids = []


class TestOpportunityEngineUserAPIs:
    """User-facing opportunity endpoints tests"""

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

    def test_get_eligible_opportunities(self):
        """Test GET /api/opportunities/eligible - should return max 2 opportunities"""
        # This endpoint needs time to compute metrics from multiple collections
        response = session.get(f"{BASE_URL}/api/opportunities/eligible")
        
        assert response.status_code == 200, f"Failed with: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "opportunities" in data, "Response should contain 'opportunities' key"
        opportunities = data["opportunities"]
        
        # Max 2 opportunities per requirement
        assert len(opportunities) <= 2, f"Should return max 2 opportunities, got {len(opportunities)}"
        
        # If opportunities exist, verify structure
        if len(opportunities) > 0:
            opp = opportunities[0]
            assert "id" in opp, "Opportunity should have 'id'"
            assert "title" in opp, "Opportunity should have 'title'"
            assert "description" in opp, "Opportunity should have 'description'"
            assert "category" in opp, "Opportunity should have 'category'"
            assert "cta_text" in opp, "Opportunity should have 'cta_text'"
            print(f"✓ Found {len(opportunities)} eligible opportunities")
            print(f"  First opportunity: {opp.get('title')} ({opp.get('category')})")

    def test_dismiss_opportunity(self):
        """Test POST /api/opportunities/dismiss - dismisses for 30 days"""
        # First get eligible opportunities
        eligible_res = session.get(f"{BASE_URL}/api/opportunities/eligible")
        assert eligible_res.status_code == 200
        opportunities = eligible_res.json().get("opportunities", [])
        
        if len(opportunities) == 0:
            pytest.skip("No eligible opportunities to dismiss")
        
        opp_id = opportunities[0]["id"]
        
        # Dismiss the opportunity
        dismiss_res = session.post(f"{BASE_URL}/api/opportunities/dismiss", json={
            "opportunity_id": opp_id
        })
        
        assert dismiss_res.status_code == 200, f"Dismiss failed: {dismiss_res.text}"
        data = dismiss_res.json()
        assert data.get("success") == True, "Dismiss should return success: true"
        assert "dismissed_until" in data, "Should return dismissed_until timestamp"
        print(f"✓ Dismissed opportunity {opp_id}, until: {data.get('dismissed_until')}")

    def test_track_opportunity_click(self):
        """Test POST /api/opportunities/track - tracks click event"""
        # First get eligible opportunities
        eligible_res = session.get(f"{BASE_URL}/api/opportunities/eligible")
        assert eligible_res.status_code == 200
        opportunities = eligible_res.json().get("opportunities", [])
        
        if len(opportunities) == 0:
            pytest.skip("No eligible opportunities to track")
        
        opp_id = opportunities[0]["id"]
        
        # Track click event
        track_res = session.post(f"{BASE_URL}/api/opportunities/track", json={
            "opportunity_id": opp_id,
            "event": "opportunity_clicked"
        })
        
        assert track_res.status_code == 200, f"Track failed: {track_res.text}"
        data = track_res.json()
        assert data.get("success") == True, "Track should return success: true"
        print(f"✓ Tracked click event for opportunity {opp_id}")

    def test_eligible_unauthenticated(self):
        """Test GET /api/opportunities/eligible without auth - should return 401"""
        unauth_session = requests.Session()
        response = unauth_session.get(f"{BASE_URL}/api/opportunities/eligible")
        assert response.status_code == 401, "Unauthenticated request should return 401"

    def test_dismiss_missing_opportunity_id(self):
        """Test POST /api/opportunities/dismiss without opportunity_id - should return 400"""
        response = session.post(f"{BASE_URL}/api/opportunities/dismiss", json={})
        assert response.status_code == 400, "Missing opportunity_id should return 400"

    def test_track_missing_fields(self):
        """Test POST /api/opportunities/track without required fields - should return 400"""
        response = session.post(f"{BASE_URL}/api/opportunities/track", json={
            "opportunity_id": "test-id"
            # Missing 'event' field
        })
        assert response.status_code == 400, "Missing event field should return 400"


class TestOpportunityEngineAdminAPIs:
    """Admin opportunity management endpoints tests"""

    @pytest.fixture(autouse=True)
    def setup_admin_auth(self):
        """Authenticate as admin before each test"""
        login_res = admin_session.post(f"{BASE_URL}/api/admin/login", json={
            "email": "admin@moneyssutra.com",
            "password": "admin123"
        })
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        yield

    def test_admin_list_opportunities(self):
        """Test GET /api/opportunities/admin/list - returns all opportunities with stats"""
        response = admin_session.get(f"{BASE_URL}/api/opportunities/admin/list")
        
        assert response.status_code == 200, f"Admin list failed: {response.text}"
        data = response.json()
        
        assert "opportunities" in data, "Response should contain 'opportunities' key"
        opportunities = data["opportunities"]
        print(f"✓ Found {len(opportunities)} total opportunities")
        
        # Verify each opportunity has stats attached
        if len(opportunities) > 0:
            opp = opportunities[0]
            assert "stats" in opp, "Each opportunity should have 'stats' attached"
            stats = opp["stats"]
            assert "shown" in stats, "Stats should have 'shown' count"
            assert "clicked" in stats, "Stats should have 'clicked' count"
            assert "dismissed" in stats, "Stats should have 'dismissed' count"
            print(f"  Sample opportunity: {opp.get('title')}, stats: {stats}")

    def test_admin_create_opportunity(self):
        """Test POST /api/opportunities/admin/create - creates new opportunity"""
        unique_id = str(uuid.uuid4())[:8]
        new_opp = {
            "title": f"TEST_Opportunity_{unique_id}",
            "description": "Test opportunity created by automated tests",
            "cta_text": "Test CTA",
            "category": "Growth",
            "priority": 5,
            "type": "system",
            "destination_url": "/test",
            "active": False,  # Keep inactive to not affect real users
            "eligibility_json": {"days_of_safety": {"op": "lt", "value": 30}}
        }
        
        response = admin_session.post(f"{BASE_URL}/api/opportunities/admin/create", json=new_opp)
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        assert "id" in data, "Created opportunity should have 'id'"
        assert data["title"] == new_opp["title"], "Title should match"
        assert data["category"] == "Growth", "Category should be Growth"
        assert data["active"] == False, "Should be inactive"
        
        # Store for cleanup
        test_opportunity_ids.append(data["id"])
        print(f"✓ Created test opportunity: {data['id']}")

    def test_admin_update_opportunity(self):
        """Test PUT /api/opportunities/admin/{id} - updates opportunity"""
        # First create a test opportunity
        unique_id = str(uuid.uuid4())[:8]
        create_res = admin_session.post(f"{BASE_URL}/api/opportunities/admin/create", json={
            "title": f"TEST_ToUpdate_{unique_id}",
            "description": "Will be updated",
            "category": "Safety",
            "active": False
        })
        assert create_res.status_code == 200
        opp_id = create_res.json()["id"]
        test_opportunity_ids.append(opp_id)
        
        # Update it
        update_res = admin_session.put(f"{BASE_URL}/api/opportunities/admin/{opp_id}", json={
            "title": f"TEST_Updated_{unique_id}",
            "active": True  # Toggle active
        })
        
        assert update_res.status_code == 200, f"Update failed: {update_res.text}"
        data = update_res.json()
        
        assert f"TEST_Updated_{unique_id}" in data["title"], "Title should be updated"
        assert data["active"] == True, "Active should be toggled to true"
        print(f"✓ Updated opportunity {opp_id}")
        
        # Set back to inactive
        admin_session.put(f"{BASE_URL}/api/opportunities/admin/{opp_id}", json={"active": False})

    def test_admin_delete_opportunity(self):
        """Test DELETE /api/opportunities/admin/{id} - deletes opportunity"""
        # First create a test opportunity to delete
        unique_id = str(uuid.uuid4())[:8]
        create_res = admin_session.post(f"{BASE_URL}/api/opportunities/admin/create", json={
            "title": f"TEST_ToDelete_{unique_id}",
            "description": "Will be deleted",
            "category": "Debt",
            "active": False
        })
        assert create_res.status_code == 200
        opp_id = create_res.json()["id"]
        
        # Delete it
        delete_res = admin_session.delete(f"{BASE_URL}/api/opportunities/admin/{opp_id}")
        
        assert delete_res.status_code == 200, f"Delete failed: {delete_res.text}"
        data = delete_res.json()
        assert data.get("success") == True, "Delete should return success: true"
        assert data.get("deleted_id") == opp_id, "Should return deleted_id"
        print(f"✓ Deleted opportunity {opp_id}")
        
        # Verify it's gone - should return 404
        verify_res = admin_session.delete(f"{BASE_URL}/api/opportunities/admin/{opp_id}")
        assert verify_res.status_code == 404, "Deleted opportunity should return 404"

    def test_admin_stats(self):
        """Test GET /api/opportunities/admin/stats - returns aggregate stats with CTR"""
        response = admin_session.get(f"{BASE_URL}/api/opportunities/admin/stats")
        
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        
        assert "opportunities" in data, "Response should have 'opportunities'"
        assert "totals" in data, "Response should have 'totals'"
        
        totals = data["totals"]
        assert "shown" in totals, "Totals should have 'shown'"
        assert "clicked" in totals, "Totals should have 'clicked'"
        assert "dismissed" in totals, "Totals should have 'dismissed'"
        assert "converted" in totals, "Totals should have 'converted'"
        assert "ctr" in totals, "Totals should have 'ctr' (click-through rate)"
        
        print(f"✓ Stats totals: shown={totals['shown']}, clicked={totals['clicked']}, CTR={totals['ctr']}%")

    def test_admin_unauthenticated(self):
        """Test admin endpoints without auth - should return 401/403"""
        unauth_session = requests.Session()
        
        # Test admin list
        list_res = unauth_session.get(f"{BASE_URL}/api/opportunities/admin/list")
        assert list_res.status_code in [401, 403], "Unauthenticated admin list should fail"
        
        # Test admin stats
        stats_res = unauth_session.get(f"{BASE_URL}/api/opportunities/admin/stats")
        assert stats_res.status_code in [401, 403], "Unauthenticated admin stats should fail"

    def test_admin_update_nonexistent(self):
        """Test PUT /api/opportunities/admin/{id} for nonexistent - should return 404"""
        response = admin_session.put(f"{BASE_URL}/api/opportunities/admin/nonexistent-id-12345", json={
            "title": "This should fail"
        })
        assert response.status_code == 404, "Update nonexistent should return 404"


class TestOpportunityEngineIntegration:
    """Integration tests for opportunity workflow"""

    @pytest.fixture(autouse=True)
    def setup_all_auth(self):
        """Setup both user and admin auth"""
        # User auth
        user_login = session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test", "password": "test"
        })
        if user_login.status_code == 200:
            token = user_login.json().get("session_token")
            if token:
                session.cookies.set("session_token", token)
        
        # Admin auth
        admin_login = admin_session.post(f"{BASE_URL}/api/admin/login", json={
            "email": "admin@moneyssutra.com", "password": "admin123"
        })
        yield

    def test_dismiss_then_check_eligible(self):
        """Test that dismissed opportunity is no longer returned by eligible endpoint"""
        # Get initial eligible opportunities
        initial_res = session.get(f"{BASE_URL}/api/opportunities/eligible")
        assert initial_res.status_code == 200
        initial_opps = initial_res.json().get("opportunities", [])
        
        if len(initial_opps) == 0:
            pytest.skip("No eligible opportunities available for dismiss test")
        
        # Dismiss one
        dismissed_id = initial_opps[0]["id"]
        dismiss_res = session.post(f"{BASE_URL}/api/opportunities/dismiss", json={
            "opportunity_id": dismissed_id
        })
        assert dismiss_res.status_code == 200
        
        # Wait a moment then check eligible again
        time.sleep(1)
        after_res = session.get(f"{BASE_URL}/api/opportunities/eligible")
        assert after_res.status_code == 200
        after_opps = after_res.json().get("opportunities", [])
        
        # Dismissed opportunity should not be in the list
        after_ids = [o["id"] for o in after_opps]
        assert dismissed_id not in after_ids, f"Dismissed opportunity {dismissed_id} should not be in eligible list"
        print(f"✓ Dismissed opportunity {dismissed_id} correctly excluded from eligible list")


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_opportunities():
    """Cleanup TEST_ prefixed opportunities after all tests"""
    yield
    # Cleanup
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
