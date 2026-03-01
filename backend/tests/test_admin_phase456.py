"""
Backend Tests for Admin Command Center - Phase 4, 5, 6
- Phase 4: Support Intelligence (FAQ searches, help queries)
- Phase 5: Campaign Manager (Targeted Campaigns CRUD)
- Phase 6: Behavioral Insights (Churn prediction, activity patterns)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_EMAIL = "admin@moneyssutra.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="class")
def admin_session():
    """Get admin session with cookie-based auth."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login as admin
    response = session.post(f"{BASE_URL}/api/admin/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert data.get("success") == True
    assert data.get("email") == ADMIN_EMAIL
    
    return session


class TestAdminPhase4SupportIntelligence:
    """Phase 4: Support Intelligence - FAQ search analytics"""
    
    def test_support_intelligence_endpoint_returns_200(self, admin_session):
        """GET /api/admin/support-intelligence returns 200"""
        response = admin_session.get(f"{BASE_URL}/api/admin/support-intelligence")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_support_intelligence_response_structure(self, admin_session):
        """Verify response contains required fields"""
        response = admin_session.get(f"{BASE_URL}/api/admin/support-intelligence")
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "topSearches" in data, "Missing topSearches field"
        assert "topFaqPages" in data, "Missing topFaqPages field"
        assert "totalSearches" in data, "Missing totalSearches field"
        assert "uniqueSearchers" in data, "Missing uniqueSearchers field"
        assert "totalSearchTerms" in data, "Missing totalSearchTerms field"
        assert "searchEvents7d" in data, "Missing searchEvents7d field"
        
        # Verify types
        assert isinstance(data["topSearches"], list)
        assert isinstance(data["topFaqPages"], list)
        assert isinstance(data["totalSearches"], int)
        assert isinstance(data["uniqueSearchers"], int)
    
    def test_support_intelligence_empty_data_valid(self, admin_session):
        """Empty search data is a valid state (no search events yet)"""
        response = admin_session.get(f"{BASE_URL}/api/admin/support-intelligence")
        assert response.status_code == 200
        data = response.json()
        
        # Empty lists are valid
        assert data["totalSearches"] >= 0
        assert data["uniqueSearchers"] >= 0
    
    def test_support_intelligence_requires_auth(self):
        """Unauthenticated request returns 401"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/admin/support-intelligence")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"


class TestAdminPhase5CampaignsCRUD:
    """Phase 5: Campaign Manager - Full CRUD operations"""
    
    def test_list_campaigns_returns_200(self, admin_session):
        """GET /api/admin/campaigns returns 200"""
        response = admin_session.get(f"{BASE_URL}/api/admin/campaigns")
        assert response.status_code == 200
    
    def test_list_campaigns_structure(self, admin_session):
        """Campaigns list has proper structure"""
        response = admin_session.get(f"{BASE_URL}/api/admin/campaigns")
        assert response.status_code == 200
        data = response.json()
        
        assert "campaigns" in data
        assert isinstance(data["campaigns"], list)
    
    def test_existing_welcome_bonus_campaign(self, admin_session):
        """Verify pre-existing Welcome Bonus campaign"""
        response = admin_session.get(f"{BASE_URL}/api/admin/campaigns")
        assert response.status_code == 200
        data = response.json()
        
        # Find Welcome Bonus campaign
        welcome_campaigns = [c for c in data["campaigns"] if "Welcome" in c.get("title", "")]
        assert len(welcome_campaigns) >= 1, "Expected 'Welcome Bonus' campaign to exist"
        
        welcome = welcome_campaigns[0]
        assert welcome["status"] == "active", "Welcome Bonus should be active"
        assert welcome["priority"] == "high", "Welcome Bonus should have high priority"
    
    def test_create_campaign(self, admin_session):
        """POST /api/admin/campaigns creates a new campaign"""
        unique_title = f"TEST_Campaign_{uuid.uuid4().hex[:8]}"
        payload = {
            "title": unique_title,
            "message": "Test campaign message",
            "type": "banner",
            "priority": "normal",
            "targeting": {"audience": "all"},
            "ctaText": "Test CTA",
            "ctaUrl": "/test"
        }
        
        response = admin_session.post(f"{BASE_URL}/api/admin/campaigns", json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "campaign" in data
        campaign = data["campaign"]
        
        # Verify campaign fields
        assert campaign["title"] == unique_title
        assert campaign["message"] == "Test campaign message"
        assert campaign["type"] == "banner"
        assert campaign["status"] == "draft"  # New campaigns start as draft
        assert campaign["priority"] == "normal"
        assert "id" in campaign
        
        # Store for cleanup
        TestAdminPhase5CampaignsCRUD._test_campaign_id = campaign["id"]
        
        return campaign
    
    def test_campaign_has_all_required_fields(self, admin_session):
        """Created campaign has all required fields"""
        response = admin_session.get(f"{BASE_URL}/api/admin/campaigns")
        assert response.status_code == 200
        campaigns = response.json().get("campaigns", [])
        
        for campaign in campaigns:
            assert "id" in campaign
            assert "title" in campaign
            assert "message" in campaign
            assert "type" in campaign
            assert "status" in campaign
            assert "priority" in campaign
            assert "targeting" in campaign
            assert "startDate" in campaign
            assert "createdAt" in campaign
    
    def test_update_campaign(self, admin_session):
        """PUT /api/admin/campaigns/{id} updates a campaign"""
        # First create a campaign to update
        unique_title = f"TEST_Update_{uuid.uuid4().hex[:8]}"
        create_resp = admin_session.post(f"{BASE_URL}/api/admin/campaigns", json={
            "title": unique_title,
            "message": "Original message",
            "type": "notification",
            "priority": "low"
        })
        assert create_resp.status_code == 200
        campaign_id = create_resp.json()["campaign"]["id"]
        
        # Update the campaign
        update_payload = {
            "title": f"{unique_title}_updated",
            "message": "Updated message",
            "priority": "high"
        }
        response = admin_session.put(f"{BASE_URL}/api/admin/campaigns/{campaign_id}", json=update_payload)
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data["campaign"]["title"] == f"{unique_title}_updated"
        assert data["campaign"]["message"] == "Updated message"
        assert data["campaign"]["priority"] == "high"
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/admin/campaigns/{campaign_id}")
    
    def test_toggle_campaign_status(self, admin_session):
        """POST /api/admin/campaigns/{id}/toggle toggles active/paused"""
        # Create a test campaign
        unique_title = f"TEST_Toggle_{uuid.uuid4().hex[:8]}"
        create_resp = admin_session.post(f"{BASE_URL}/api/admin/campaigns", json={
            "title": unique_title,
            "message": "Toggle test",
            "type": "popup",
            "priority": "normal"
        })
        assert create_resp.status_code == 200
        campaign = create_resp.json()["campaign"]
        campaign_id = campaign["id"]
        initial_status = campaign["status"]  # Should be "draft"
        
        # Toggle to active
        toggle_resp = admin_session.post(f"{BASE_URL}/api/admin/campaigns/{campaign_id}/toggle")
        assert toggle_resp.status_code == 200
        data = toggle_resp.json()
        assert data.get("success") == True
        assert data["status"] == "active"  # Draft -> Active
        
        # Toggle back to paused
        toggle_resp2 = admin_session.post(f"{BASE_URL}/api/admin/campaigns/{campaign_id}/toggle")
        assert toggle_resp2.status_code == 200
        assert toggle_resp2.json()["status"] == "paused"  # Active -> Paused
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/admin/campaigns/{campaign_id}")
    
    def test_delete_campaign(self, admin_session):
        """DELETE /api/admin/campaigns/{id} removes a campaign"""
        # Create a campaign to delete
        unique_title = f"TEST_Delete_{uuid.uuid4().hex[:8]}"
        create_resp = admin_session.post(f"{BASE_URL}/api/admin/campaigns", json={
            "title": unique_title,
            "message": "To be deleted",
            "type": "banner",
            "priority": "low"
        })
        assert create_resp.status_code == 200
        campaign_id = create_resp.json()["campaign"]["id"]
        
        # Delete it
        delete_resp = admin_session.delete(f"{BASE_URL}/api/admin/campaigns/{campaign_id}")
        assert delete_resp.status_code == 200
        assert delete_resp.json().get("success") == True
        
        # Verify it's gone - try to delete again should fail
        delete_again = admin_session.delete(f"{BASE_URL}/api/admin/campaigns/{campaign_id}")
        assert delete_again.status_code == 404
    
    def test_campaigns_require_auth(self):
        """Campaign endpoints require admin authentication"""
        session = requests.Session()
        
        # List campaigns
        resp = session.get(f"{BASE_URL}/api/admin/campaigns")
        assert resp.status_code == 401
        
        # Create campaign
        resp = session.post(f"{BASE_URL}/api/admin/campaigns", json={"title": "test"})
        assert resp.status_code == 401


class TestAdminPhase6BehavioralInsights:
    """Phase 6: Behavioral Insights - Churn prediction and activity patterns"""
    
    def test_behavioral_insights_returns_200(self, admin_session):
        """GET /api/admin/behavioral-insights returns 200"""
        response = admin_session.get(f"{BASE_URL}/api/admin/behavioral-insights")
        assert response.status_code == 200
    
    def test_behavioral_insights_structure(self, admin_session):
        """Verify response structure"""
        response = admin_session.get(f"{BASE_URL}/api/admin/behavioral-insights")
        assert response.status_code == 200
        data = response.json()
        
        # Required top-level fields
        assert "totalUsers" in data
        assert "activeUsers" in data
        assert "dormantUsers" in data
        assert "churnDistribution" in data
        assert "improvingCount" in data
        assert "decliningCount" in data
        assert "users" in data
        assert "highChurnUsers" in data
        assert "improvingUsers" in data
        assert "decliningUsers" in data
    
    def test_churn_distribution_structure(self, admin_session):
        """Churn distribution has high/medium/low buckets"""
        response = admin_session.get(f"{BASE_URL}/api/admin/behavioral-insights")
        assert response.status_code == 200
        data = response.json()
        
        churn = data["churnDistribution"]
        assert "high" in churn
        assert "medium" in churn
        assert "low" in churn
        
        # Values should be integers
        assert isinstance(churn["high"], int)
        assert isinstance(churn["medium"], int)
        assert isinstance(churn["low"], int)
        
        # Total should match totalUsers
        total_churn = churn["high"] + churn["medium"] + churn["low"]
        assert total_churn == data["totalUsers"], "Churn distribution should sum to total users"
    
    def test_user_behavior_fields(self, admin_session):
        """Each user has required behavior fields"""
        response = admin_session.get(f"{BASE_URL}/api/admin/behavioral-insights")
        assert response.status_code == 200
        data = response.json()
        
        if data["users"]:
            user = data["users"][0]
            required_fields = [
                "userId", "email", "totalEvents30d", "eventsThisWeek", 
                "eventsLastWeek", "activityChange", "scoreTrend",
                "churnScore", "churnRisk"
            ]
            for field in required_fields:
                assert field in user, f"Missing field: {field}"
            
            # Verify churnRisk is valid value
            assert user["churnRisk"] in ["high", "medium", "low"]
            
            # Verify scoreTrend is valid
            assert user["scoreTrend"] in ["improving", "declining", "stable"]
    
    def test_active_user_has_low_churn(self, admin_session):
        """User with recent activity should have low churn score"""
        response = admin_session.get(f"{BASE_URL}/api/admin/behavioral-insights")
        assert response.status_code == 200
        data = response.json()
        
        # Find user with events (Rahul Sharma should have events)
        active_users = [u for u in data["users"] if u["totalEvents30d"] > 0 and u["eventsThisWeek"] > 0]
        
        if active_users:
            user = active_users[0]
            # Active users should have low churn risk
            assert user["churnRisk"] == "low" or user["churnScore"] < 60, \
                f"Active user {user['email']} has high churn risk unexpectedly"
    
    def test_high_churn_users_list(self, admin_session):
        """High churn users list contains only high/medium risk users"""
        response = admin_session.get(f"{BASE_URL}/api/admin/behavioral-insights")
        assert response.status_code == 200
        data = response.json()
        
        for user in data["highChurnUsers"]:
            assert user["churnRisk"] in ["high", "medium"], \
                f"User {user['email']} in highChurnUsers with risk {user['churnRisk']}"
    
    def test_behavioral_insights_requires_auth(self):
        """Endpoint requires admin authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/admin/behavioral-insights")
        assert response.status_code == 401


class TestAdminNavigation:
    """Test that all 10 nav items have corresponding working endpoints"""
    
    def test_overview_endpoint(self, admin_session):
        """Command center (overview) endpoint"""
        response = admin_session.get(f"{BASE_URL}/api/admin/command-center")
        assert response.status_code == 200
    
    def test_user_growth_endpoint(self, admin_session):
        """User growth endpoint"""
        response = admin_session.get(f"{BASE_URL}/api/admin/user-growth")
        assert response.status_code == 200
    
    def test_engagement_endpoint(self, admin_session):
        """Engagement analytics endpoint"""
        response = admin_session.get(f"{BASE_URL}/api/admin/engagement")
        assert response.status_code == 200
    
    def test_feature_usage_endpoint(self, admin_session):
        """Feature usage endpoint"""
        response = admin_session.get(f"{BASE_URL}/api/admin/feature-usage")
        assert response.status_code == 200
    
    def test_segmentation_endpoint(self, admin_session):
        """Segmentation lab endpoint"""
        response = admin_session.get(f"{BASE_URL}/api/admin/segmentation")
        assert response.status_code == 200
    
    def test_support_intelligence_endpoint(self, admin_session):
        """Support intelligence endpoint (Phase 4)"""
        response = admin_session.get(f"{BASE_URL}/api/admin/support-intelligence")
        assert response.status_code == 200
    
    def test_campaigns_endpoint(self, admin_session):
        """Campaigns endpoint (Phase 5)"""
        response = admin_session.get(f"{BASE_URL}/api/admin/campaigns")
        assert response.status_code == 200
    
    def test_behavioral_insights_endpoint(self, admin_session):
        """Behavioral insights endpoint (Phase 6)"""
        response = admin_session.get(f"{BASE_URL}/api/admin/behavioral-insights")
        assert response.status_code == 200
    
    def test_risk_radar_endpoint(self, admin_session):
        """Risk radar endpoint"""
        response = admin_session.get(f"{BASE_URL}/api/admin/risk-radar")
        assert response.status_code == 200


class TestCleanup:
    """Clean up test data"""
    
    def test_cleanup_test_campaigns(self, admin_session):
        """Remove any TEST_ prefixed campaigns"""
        response = admin_session.get(f"{BASE_URL}/api/admin/campaigns")
        assert response.status_code == 200
        campaigns = response.json().get("campaigns", [])
        
        for campaign in campaigns:
            if campaign["title"].startswith("TEST_"):
                delete_resp = admin_session.delete(f"{BASE_URL}/api/admin/campaigns/{campaign['id']}")
                print(f"Cleaned up test campaign: {campaign['title']}")
