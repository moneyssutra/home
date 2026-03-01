"""
Admin Phase 2 Tests: Event Tracking, Engagement Analytics, Feature Usage
Tests for: /api/events/track, /api/events/session, /api/admin/engagement, /api/admin/feature-usage
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def session():
    """Shared requests session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

@pytest.fixture(scope="module")
def admin_session(session):
    """Admin authenticated session"""
    response = session.post(f"{BASE_URL}/api/admin/login", json={
        "email": "admin@moneyssutra.com",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    assert response.json().get("success") == True
    return session

class TestEventTracking:
    """Test event tracking endpoints: /api/events/track and /api/events/session"""
    
    def test_track_event_page_view(self, session):
        """POST /api/events/track accepts page_view events"""
        test_session_id = f"test_sess_{uuid.uuid4().hex[:8]}"
        response = session.post(f"{BASE_URL}/api/events/track", json={
            "userId": "TEST_user_123",
            "sessionId": test_session_id,
            "eventType": "page_view",
            "pageName": "Home"
        })
        assert response.status_code == 200, f"Event track failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        print("PASS: POST /api/events/track (page_view) returns ok=True")
    
    def test_track_event_with_metadata(self, session):
        """POST /api/events/track accepts events with metadata"""
        test_session_id = f"test_sess_{uuid.uuid4().hex[:8]}"
        response = session.post(f"{BASE_URL}/api/events/track", json={
            "userId": "TEST_user_456",
            "sessionId": test_session_id,
            "eventType": "button_click",
            "pageName": "Goals",
            "metadata": {"buttonId": "add-goal", "position": "top"}
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        print("PASS: POST /api/events/track (with metadata) returns ok=True")
    
    def test_track_event_anonymous_user(self, session):
        """POST /api/events/track allows anonymous users"""
        response = session.post(f"{BASE_URL}/api/events/track", json={
            "sessionId": f"anon_sess_{uuid.uuid4().hex[:8]}",
            "eventType": "page_view",
            "pageName": "Wealth"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        print("PASS: POST /api/events/track (anonymous user) returns ok=True")


class TestSessionTracking:
    """Test session tracking: /api/events/session"""
    
    def test_session_start(self, session):
        """POST /api/events/session with action=start creates session"""
        test_session_id = f"test_sess_{uuid.uuid4().hex[:8]}"
        response = session.post(f"{BASE_URL}/api/events/session", json={
            "action": "start",
            "sessionId": test_session_id,
            "userId": "TEST_user_session"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        print("PASS: POST /api/events/session (start) returns ok=True")
        return test_session_id
    
    def test_session_page_tracking(self, session):
        """POST /api/events/session with action=page records page data"""
        test_session_id = f"test_sess_{uuid.uuid4().hex[:8]}"
        # Start session first
        session.post(f"{BASE_URL}/api/events/session", json={
            "action": "start",
            "sessionId": test_session_id,
            "userId": "TEST_user_pages"
        })
        # Track page
        response = session.post(f"{BASE_URL}/api/events/session", json={
            "action": "page",
            "sessionId": test_session_id,
            "userId": "TEST_user_pages",
            "pageName": "Expenses",
            "enteredAt": datetime.now(timezone.utc).isoformat(),
            "durationSec": 45
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        print("PASS: POST /api/events/session (page) returns ok=True")
    
    def test_session_end(self, session):
        """POST /api/events/session with action=end ends session"""
        test_session_id = f"test_sess_{uuid.uuid4().hex[:8]}"
        # Start session first
        session.post(f"{BASE_URL}/api/events/session", json={
            "action": "start",
            "sessionId": test_session_id,
            "userId": "TEST_user_end"
        })
        # End session
        response = session.post(f"{BASE_URL}/api/events/session", json={
            "action": "end",
            "sessionId": test_session_id,
            "userId": "TEST_user_end"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        print("PASS: POST /api/events/session (end) returns ok=True")


class TestAdminLogin:
    """Test admin login still works after Phase 2 changes"""
    
    def test_admin_login_valid(self, session):
        """POST /api/admin/login with valid credentials"""
        response = session.post(f"{BASE_URL}/api/admin/login", json={
            "email": "admin@moneyssutra.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("email") == "admin@moneyssutra.com"
        print("PASS: Admin login with valid credentials returns success=True")
    
    def test_admin_login_invalid(self, session):
        """POST /api/admin/login with invalid credentials returns 401"""
        response = session.post(f"{BASE_URL}/api/admin/login", json={
            "email": "admin@moneyssutra.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("PASS: Admin login with invalid credentials returns 401")


class TestEngagementAnalytics:
    """Test /api/admin/engagement endpoint"""
    
    def test_engagement_endpoint_exists(self, admin_session):
        """GET /api/admin/engagement returns data"""
        response = admin_session.get(f"{BASE_URL}/api/admin/engagement")
        assert response.status_code == 200, f"Engagement endpoint failed: {response.status_code} - {response.text}"
        data = response.json()
        print(f"Engagement data: {data}")
        
        # Validate structure
        assert "avgSessionToday" in data, "Missing avgSessionToday"
        assert "avgSession7d" in data, "Missing avgSession7d"
        assert "avgSession30d" in data, "Missing avgSession30d"
        assert "heatmap" in data, "Missing heatmap"
        assert "dayOfWeekChart" in data, "Missing dayOfWeekChart"
        assert "peakHours" in data, "Missing peakHours"
        print("PASS: GET /api/admin/engagement returns all expected fields")
    
    def test_engagement_heatmap_structure(self, admin_session):
        """Engagement heatmap is 7x24 array"""
        response = admin_session.get(f"{BASE_URL}/api/admin/engagement")
        assert response.status_code == 200
        data = response.json()
        heatmap = data.get("heatmap", [])
        
        # Validate 7x24 structure
        assert len(heatmap) == 7, f"Heatmap should have 7 rows (days), got {len(heatmap)}"
        for i, row in enumerate(heatmap):
            assert len(row) == 24, f"Heatmap row {i} should have 24 columns (hours), got {len(row)}"
        print("PASS: Heatmap is 7x24 2D array")
    
    def test_engagement_dow_chart_structure(self, admin_session):
        """Day of week chart has correct structure"""
        response = admin_session.get(f"{BASE_URL}/api/admin/engagement")
        assert response.status_code == 200
        data = response.json()
        dow_chart = data.get("dayOfWeekChart", [])
        
        # Should have 7 entries for Mon-Sun
        assert len(dow_chart) == 7, f"Expected 7 days, got {len(dow_chart)}"
        expected_days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        for i, entry in enumerate(dow_chart):
            assert "day" in entry, f"Missing 'day' in dow_chart[{i}]"
            assert "avgDuration" in entry, f"Missing 'avgDuration' in dow_chart[{i}]"
            assert entry["day"] == expected_days[i], f"Expected {expected_days[i]}, got {entry['day']}"
        print("PASS: Day of week chart has 7 entries with day and avgDuration")


class TestFeatureUsage:
    """Test /api/admin/feature-usage endpoint"""
    
    def test_feature_usage_endpoint_exists(self, admin_session):
        """GET /api/admin/feature-usage returns data"""
        response = admin_session.get(f"{BASE_URL}/api/admin/feature-usage")
        assert response.status_code == 200, f"Feature usage endpoint failed: {response.status_code} - {response.text}"
        data = response.json()
        print(f"Feature usage data: {data}")
        
        # Validate structure
        assert "pageTable" in data, "Missing pageTable"
        assert "funnel" in data, "Missing funnel"
        assert "totalTrackedUsers" in data, "Missing totalTrackedUsers"
        assert "totalSessions" in data, "Missing totalSessions"
        print("PASS: GET /api/admin/feature-usage returns all expected fields")
    
    def test_feature_usage_funnel_stages(self, admin_session):
        """Feature usage funnel has expected stages"""
        response = admin_session.get(f"{BASE_URL}/api/admin/feature-usage")
        assert response.status_code == 200
        data = response.json()
        funnel = data.get("funnel", [])
        
        # Validate funnel stages
        expected_stages = ["Home", "Wealth", "Health", "Goals", "Expenses"]
        assert len(funnel) == 5, f"Expected 5 funnel stages, got {len(funnel)}"
        for i, stage in enumerate(funnel):
            assert "stage" in stage, f"Missing 'stage' in funnel[{i}]"
            assert "users" in stage, f"Missing 'users' in funnel[{i}]"
            assert "pct" in stage, f"Missing 'pct' in funnel[{i}]"
            assert stage["stage"] == expected_stages[i], f"Expected {expected_stages[i]}, got {stage['stage']}"
        print("PASS: Feature usage funnel has 5 stages with correct structure")
    
    def test_feature_usage_page_table_structure(self, admin_session):
        """Page table entries have correct fields"""
        response = admin_session.get(f"{BASE_URL}/api/admin/feature-usage")
        assert response.status_code == 200
        data = response.json()
        page_table = data.get("pageTable", [])
        
        # If there's page data, validate structure
        if len(page_table) > 0:
            expected_fields = ["page", "avgTimeSec", "pctUsersVisited", "totalVisits", "uniqueUsers", "repeatVisits"]
            for i, page in enumerate(page_table):
                for field in expected_fields:
                    assert field in page, f"Missing '{field}' in pageTable[{i}]"
            print(f"PASS: Page table has {len(page_table)} entries with correct structure")
        else:
            print("INFO: Page table is empty (event tracking just started)")


class TestPreviousAdminEndpoints:
    """Verify previous admin endpoints still work"""
    
    def test_command_center_still_works(self, admin_session):
        """GET /api/admin/command-center still returns data"""
        response = admin_session.get(f"{BASE_URL}/api/admin/command-center")
        assert response.status_code == 200
        data = response.json()
        assert "totalUsers" in data
        assert "pfsi" in data
        print("PASS: /api/admin/command-center still works")
    
    def test_user_growth_still_works(self, admin_session):
        """GET /api/admin/user-growth still returns data"""
        response = admin_session.get(f"{BASE_URL}/api/admin/user-growth")
        assert response.status_code == 200
        data = response.json()
        assert "totalUsers" in data
        assert "dailyRegistrations" in data
        print("PASS: /api/admin/user-growth still works")
    
    def test_risk_radar_still_works(self, admin_session):
        """GET /api/admin/risk-radar still returns data"""
        response = admin_session.get(f"{BASE_URL}/api/admin/risk-radar")
        assert response.status_code == 200
        data = response.json()
        assert "riskBuckets" in data
        print("PASS: /api/admin/risk-radar still works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
