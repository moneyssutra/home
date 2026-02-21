"""
Test suite for Notification and Cron API endpoints
Tests Variable Income feature: notifications, push notifications, and cron jobs
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
CRON_API_KEY = "moneyssutra_cron_secret_2026"


class TestVapidKeyEndpoint:
    """Test VAPID key endpoint for push notifications"""
    
    def test_get_vapid_public_key(self, auth_session):
        """Test /api/push/vapid-key returns VAPID public key"""
        response = auth_session.get(f"{BASE_URL}/api/push/vapid-key")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "public_key" in data, "Response should contain 'public_key'"
        assert data["public_key"] is not None, "VAPID public key should not be None"
        assert len(data["public_key"]) > 40, "VAPID public key should be a valid length"
        print(f"✓ VAPID public key retrieved: {data['public_key'][:40]}...")


class TestNotificationsEndpoints:
    """Test notification CRUD endpoints"""
    
    def test_get_notifications_list(self, auth_session):
        """Test /api/notifications returns notifications list"""
        response = auth_session.get(f"{BASE_URL}/api/notifications")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Retrieved {len(data)} notifications")
        
        # Verify notification structure if there are any
        if len(data) > 0:
            notification = data[0]
            assert "id" in notification, "Notification should have 'id'"
            assert "title" in notification, "Notification should have 'title'"
            assert "message" in notification, "Notification should have 'message'"
            assert "type" in notification, "Notification should have 'type'"
            assert "isRead" in notification, "Notification should have 'isRead'"
            assert "createdAt" in notification, "Notification should have 'createdAt'"
            print(f"  First notification: {notification['title'][:50]}...")
    
    def test_get_unread_count(self, auth_session):
        """Test /api/notifications/unread-count returns count"""
        response = auth_session.get(f"{BASE_URL}/api/notifications/unread-count")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "count" in data, "Response should contain 'count'"
        assert isinstance(data["count"], int), "Count should be an integer"
        assert data["count"] >= 0, "Count should be non-negative"
        print(f"✓ Unread notification count: {data['count']}")
    
    def test_notifications_unauthenticated(self):
        """Test notifications endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        
        # Should return 401 Unauthorized
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Notifications endpoint properly requires authentication")


class TestCronProcessVariableIncome:
    """Test cron job for processing variable income entries"""
    
    def test_cron_requires_api_key(self):
        """Test /api/cron/process-variable-income requires API key"""
        response = requests.post(f"{BASE_URL}/api/cron/process-variable-income")
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Cron endpoint requires API key")
    
    def test_cron_invalid_api_key(self):
        """Test /api/cron/process-variable-income rejects invalid API key"""
        response = requests.post(
            f"{BASE_URL}/api/cron/process-variable-income",
            params={"api_key": "invalid_key"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Cron endpoint rejects invalid API key")
    
    def test_cron_process_with_valid_key(self):
        """Test /api/cron/process-variable-income with valid API key"""
        response = requests.post(
            f"{BASE_URL}/api/cron/process-variable-income",
            params={"api_key": CRON_API_KEY}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response should contain 'success'"
        assert data["success"] == True, "Success should be True"
        assert "processed_entries" in data, "Response should contain 'processed_entries'"
        assert "notifications_created" in data, "Response should contain 'notifications_created'"
        assert "processed_date" in data, "Response should contain 'processed_date'"
        
        print(f"✓ Cron job executed successfully:")
        print(f"  - Processed entries: {data['processed_entries']}")
        print(f"  - Notifications created: {data['notifications_created']}")
        print(f"  - Processed date: {data['processed_date']}")


class TestCronSendReminderNotifications:
    """Test cron job for sending reminder notifications"""
    
    def test_reminder_cron_requires_api_key(self):
        """Test /api/cron/send-reminder-notifications requires API key"""
        response = requests.post(f"{BASE_URL}/api/cron/send-reminder-notifications")
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Reminder cron endpoint requires API key")
    
    def test_reminder_cron_invalid_api_key(self):
        """Test /api/cron/send-reminder-notifications rejects invalid API key"""
        response = requests.post(
            f"{BASE_URL}/api/cron/send-reminder-notifications",
            params={"api_key": "wrong_key"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Reminder cron endpoint rejects invalid API key")
    
    def test_reminder_cron_with_valid_key(self):
        """Test /api/cron/send-reminder-notifications with valid API key"""
        response = requests.post(
            f"{BASE_URL}/api/cron/send-reminder-notifications",
            params={"api_key": CRON_API_KEY}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response should contain 'success'"
        assert data["success"] == True, "Success should be True"
        assert "notifications_sent" in data, "Response should contain 'notifications_sent'"
        assert "push_sent" in data, "Response should contain 'push_sent'"
        
        print(f"✓ Reminder cron job executed successfully:")
        print(f"  - Notifications sent: {data['notifications_sent']}")
        print(f"  - Push notifications sent: {data['push_sent']}")


class TestNotificationActions:
    """Test notification action endpoints (mark read, delete)"""
    
    def test_mark_notification_read(self, auth_session):
        """Test marking a notification as read"""
        # First get notifications
        list_response = auth_session.get(f"{BASE_URL}/api/notifications")
        
        if list_response.status_code != 200:
            pytest.skip("Could not fetch notifications")
        
        notifications = list_response.json()
        if len(notifications) == 0:
            pytest.skip("No notifications to test with")
        
        # Find an unread notification or use first one
        notification_id = notifications[0]["id"]
        
        # Mark as read
        response = auth_session.patch(f"{BASE_URL}/api/notifications/{notification_id}/read")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success: true"
        print(f"✓ Notification {notification_id[:8]}... marked as read")
    
    def test_mark_all_read(self, auth_session):
        """Test marking all notifications as read"""
        response = auth_session.patch(f"{BASE_URL}/api/notifications/mark-all-read")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success: true"
        
        # Verify unread count is now 0
        count_response = auth_session.get(f"{BASE_URL}/api/notifications/unread-count")
        count_data = count_response.json()
        assert count_data["count"] == 0, "Unread count should be 0 after marking all read"
        print("✓ All notifications marked as read")


class TestVariableIncomeCreation:
    """Test creating variable income sources with reminder time"""
    
    def test_create_variable_job_income(self, auth_session):
        """Test creating a variable job income with reminder time"""
        payload = {
            "type": "Job",
            "name": "TEST_Variable_Job_" + datetime.now().strftime("%H%M%S"),
            "expectedAmount": 50000,
            "frequency": "Monthly",
            "selectedDate": "2026-01-15",
            "incomeType": "variable",
            "reminderTime": "19:00"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("incomeType") == "variable", "Income type should be 'variable'"
        assert data.get("reminderTime") == "19:00", "Reminder time should be '19:00'"
        
        # Clean up
        income_id = data.get("id")
        auth_session.delete(f"{BASE_URL}/api/income/{income_id}")
        
        print(f"✓ Variable job income created with reminder time")
    
    def test_create_fixed_income_no_reminder(self, auth_session):
        """Test that fixed income doesn't require reminder time"""
        payload = {
            "type": "Job",
            "name": "TEST_Fixed_Job_" + datetime.now().strftime("%H%M%S"),
            "expectedAmount": 60000,
            "frequency": "Monthly",
            "selectedDate": "2026-01-20",
            "incomeType": "fixed"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("incomeType") == "fixed", "Income type should be 'fixed'"
        
        # Clean up
        income_id = data.get("id")
        auth_session.delete(f"{BASE_URL}/api/income/{income_id}")
        
        print(f"✓ Fixed income created without reminder time")


class TestPushSubscription:
    """Test push notification subscription endpoints"""
    
    def test_subscribe_push_notifications(self, auth_session):
        """Test subscribing to push notifications"""
        subscription = {
            "endpoint": "https://test.pushservice.com/test-endpoint-123",
            "keys": {
                "p256dh": "test_p256dh_key_value",
                "auth": "test_auth_key_value"
            }
        }
        
        response = auth_session.post(f"{BASE_URL}/api/push/subscribe", json=subscription)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success: true"
        print("✓ Push subscription created successfully")
    
    def test_unsubscribe_push_notifications(self, auth_session):
        """Test unsubscribing from push notifications"""
        response = auth_session.delete(
            f"{BASE_URL}/api/push/unsubscribe",
            params={"endpoint": "https://test.pushservice.com/test-endpoint-123"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success: true"
        print("✓ Push subscription removed successfully")


# ============ FIXTURES ============

@pytest.fixture
def auth_session():
    """Create authenticated session for tests"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login with test credentials
    login_response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "test", "password": "test"}
    )
    
    if login_response.status_code != 200:
        pytest.skip("Could not authenticate - skipping test")
    
    # Get session token from response
    login_data = login_response.json()
    if "session_token" in login_data:
        session.headers.update({"Authorization": f"Bearer {login_data['session_token']}"})
    
    return session


@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup test data after all tests"""
    yield
    # Cleanup is handled in individual tests
    pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
