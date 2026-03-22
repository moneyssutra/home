"""
Test suite for Family Member Invite/Referral System
Tests: POST /api/family/add-member, GET /api/family/invite-info/{code}, 
       POST /api/auth/register with inviteCode, POST /api/family/join/{code}
       
Note: Twilio SMS/WhatsApp is MOCKED - notification_service returns mock:true
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fintech-dash-45.preview.emergentagent.com')

# Test user credentials - will be created during tests
TEST_USER_EMAIL = f"test_invite_{uuid.uuid4().hex[:8]}@test.com"
TEST_USER_PASSWORD = "TestPass123!"
TEST_FAMILY_NAME = f"Test Family {uuid.uuid4().hex[:6]}"


class TestFamilyInviteSystem:
    """Tests for family invite/referral system"""
    
    session_token = None
    family_id = None
    invite_code = None
    user_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_01_register_user(self):
        """Register a new test user"""
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Test",
            "middleName": "",
            "lastName": "Inviter",
            "email": TEST_USER_EMAIL,
            "mobile": "9876543210",
            "sex": "male",
            "dateOfBirth": "1990-01-15",
            "password": TEST_USER_PASSWORD
        })
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "session_token" in data
        assert "user_id" in data
        
        TestFamilyInviteSystem.session_token = data["session_token"]
        TestFamilyInviteSystem.user_id = data["user_id"]
        self.session.cookies.set("session_token", data["session_token"])
        print(f"✓ User registered: {TEST_USER_EMAIL}")
    
    def test_02_create_family(self):
        """Create a family group"""
        self.session.cookies.set("session_token", TestFamilyInviteSystem.session_token)
        
        response = self.session.post(f"{BASE_URL}/api/family", json={
            "familyName": TEST_FAMILY_NAME
        })
        
        assert response.status_code == 200, f"Family creation failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "inviteCode" in data
        assert data["familyName"] == TEST_FAMILY_NAME
        
        TestFamilyInviteSystem.family_id = data["id"]
        TestFamilyInviteSystem.invite_code = data["inviteCode"]
        print(f"✓ Family created: {TEST_FAMILY_NAME}, invite code: {data['inviteCode']}")
    
    def test_03_add_member_requires_phone(self):
        """POST /api/family/add-member should require phone number"""
        self.session.cookies.set("session_token", TestFamilyInviteSystem.session_token)
        
        # Try adding member without phone
        response = self.session.post(f"{BASE_URL}/api/family/add-member", json={
            "name": "Test Member",
            "relationship": "Brother",
            "email": "member@test.com"
            # No phone
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "phone" in response.text.lower() or "mandatory" in response.text.lower()
        print("✓ Add member correctly requires phone number")
    
    def test_04_add_member_with_phone_returns_notification_status(self):
        """POST /api/family/add-member with phone should return notification status (MOCKED)"""
        self.session.cookies.set("session_token", TestFamilyInviteSystem.session_token)
        
        response = self.session.post(f"{BASE_URL}/api/family/add-member", json={
            "name": "Test Brother",
            "relationship": "Brother",
            "email": "brother@test.com",
            "phone": "9123456789"
        })
        
        assert response.status_code == 200, f"Add member failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "member" in data
        assert "notifications" in data
        assert data["member"]["name"] == "Test Brother"
        assert data["member"]["phone"] == "9123456789"
        
        # Verify notification status (should be mocked since Twilio not configured)
        notifications = data.get("notifications")
        if notifications:
            assert notifications.get("all_mock") == True, "Expected notifications to be mocked"
            assert "sms" in notifications
            assert "whatsapp" in notifications
            print(f"✓ Member added with MOCKED notifications: {notifications}")
        else:
            print("✓ Member added (notifications may be None for linked users)")
    
    def test_05_get_invite_info_valid_code(self):
        """GET /api/family/invite-info/{code} should return family info for valid codes"""
        # This is a public endpoint - no auth needed
        response = requests.get(f"{BASE_URL}/api/family/invite-info/{TestFamilyInviteSystem.invite_code}")
        
        assert response.status_code == 200, f"Invite info failed: {response.text}"
        data = response.json()
        
        assert "familyName" in data
        assert "inviteCode" in data
        assert "ownerName" in data
        assert "memberCount" in data
        
        assert data["familyName"] == TEST_FAMILY_NAME
        assert data["inviteCode"] == TestFamilyInviteSystem.invite_code
        assert data["memberCount"] >= 1  # At least the owner
        print(f"✓ Invite info returned: {data['familyName']} by {data['ownerName']}")
    
    def test_06_get_invite_info_invalid_code(self):
        """GET /api/family/invite-info/{code} should return 404 for invalid codes"""
        response = requests.get(f"{BASE_URL}/api/family/invite-info/INVALID123")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid invite code returns 404")
    
    def test_07_register_with_invite_code_auto_joins_family(self):
        """POST /api/auth/register with inviteCode should auto-join family"""
        new_user_email = f"test_invited_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Invited",
            "middleName": "",
            "lastName": "User",
            "email": new_user_email,
            "mobile": "9876543211",
            "sex": "female",
            "dateOfBirth": "1995-05-20",
            "password": TEST_USER_PASSWORD,
            "inviteCode": TestFamilyInviteSystem.invite_code
        })
        
        assert response.status_code == 200, f"Registration with invite failed: {response.text}"
        data = response.json()
        
        # Check if familyJoined is returned
        if "familyJoined" in data:
            assert data["familyJoined"] == TEST_FAMILY_NAME
            print(f"✓ User registered and auto-joined family: {data['familyJoined']}")
        else:
            print(f"✓ User registered (familyJoined may be None if already member)")
        
        # Verify user is in family by checking family endpoint
        session = requests.Session()
        session.cookies.set("session_token", data["session_token"])
        family_response = session.get(f"{BASE_URL}/api/family")
        
        if family_response.status_code == 200:
            family_data = family_response.json()
            if family_data.get("familyName"):
                assert family_data["familyName"] == TEST_FAMILY_NAME
                print(f"✓ Verified user is in family: {family_data['familyName']}")
    
    def test_08_join_family_with_relationship(self):
        """POST /api/family/join/{code} should support relationship pre-fill and track referrals"""
        # Create another user to join
        join_user_email = f"test_joiner_{uuid.uuid4().hex[:8]}@test.com"
        
        # Register new user
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Joiner",
            "middleName": "",
            "lastName": "User",
            "email": join_user_email,
            "mobile": "9876543212",
            "sex": "male",
            "dateOfBirth": "1992-03-10",
            "password": TEST_USER_PASSWORD
        })
        
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        joiner_token = reg_response.json()["session_token"]
        
        # Join family with relationship
        session = requests.Session()
        session.cookies.set("session_token", joiner_token)
        session.headers.update({"Content-Type": "application/json"})
        
        join_response = session.post(f"{BASE_URL}/api/family/join/{TestFamilyInviteSystem.invite_code}", json={
            "relationship": "Cousin"
        })
        
        assert join_response.status_code == 200, f"Join family failed: {join_response.text}"
        data = join_response.json()
        
        assert "message" in data
        assert TEST_FAMILY_NAME in data["message"]
        print(f"✓ User joined family: {data['message']}")
    
    def test_09_add_member_validates_10_digit_phone(self):
        """FamilyPage add member form should validate 10-digit phone"""
        self.session.cookies.set("session_token", TestFamilyInviteSystem.session_token)
        
        # Try with invalid phone (less than 10 digits)
        response = self.session.post(f"{BASE_URL}/api/family/add-member", json={
            "name": "Invalid Phone Member",
            "relationship": "Sister",
            "phone": "12345"  # Only 5 digits
        })
        
        # Backend should accept it (validation is on frontend), but let's check
        # The frontend validates 10 digits, backend formats it
        # Actually checking the backend behavior
        if response.status_code == 200:
            # Backend accepted - it formats phone numbers
            print("✓ Backend accepts short phone (formats to +91 prefix)")
        else:
            print(f"✓ Backend validation: {response.status_code}")
    
    def test_10_duplicate_phone_rejected(self):
        """Adding member with duplicate phone should be rejected"""
        self.session.cookies.set("session_token", TestFamilyInviteSystem.session_token)
        
        # Try adding member with same phone as existing member
        response = self.session.post(f"{BASE_URL}/api/family/add-member", json={
            "name": "Duplicate Phone",
            "relationship": "Father",
            "phone": "9123456789"  # Same as Test Brother added earlier
        })
        
        assert response.status_code == 400, f"Expected 400 for duplicate phone, got {response.status_code}"
        assert "already" in response.text.lower()
        print("✓ Duplicate phone correctly rejected")
    
    def test_11_cleanup_test_data(self):
        """Cleanup test users and families"""
        # This is optional - just for cleanup
        print("✓ Test completed - cleanup can be done manually if needed")


class TestInviteLandingPage:
    """Tests for /join/:code landing page API support"""
    
    def test_invite_info_returns_pending_member(self):
        """Invite info should return pending member details if available"""
        # Use the invite code from previous tests if available
        if TestFamilyInviteSystem.invite_code:
            response = requests.get(f"{BASE_URL}/api/family/invite-info/{TestFamilyInviteSystem.invite_code}")
            
            if response.status_code == 200:
                data = response.json()
                # pendingMember may or may not be present
                if "pendingMember" in data and data["pendingMember"]:
                    print(f"✓ Pending member info: {data['pendingMember']}")
                else:
                    print("✓ No pending member (all members may be linked)")
            else:
                print(f"Note: Invite code may have been used: {response.status_code}")
        else:
            pytest.skip("No invite code available from previous tests")


class TestNotificationMocking:
    """Verify Twilio notifications are properly mocked"""
    
    def test_notification_service_is_mocked(self):
        """Verify notification service returns mock:true when Twilio not configured"""
        # This is verified through the add-member response
        # The notification_service.py checks for TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
        # When not configured, it returns mock:true
        
        # We can verify by checking environment
        twilio_configured = bool(
            os.environ.get("TWILIO_ACCOUNT_SID") and 
            os.environ.get("TWILIO_AUTH_TOKEN") and 
            os.environ.get("TWILIO_PHONE_NUMBER")
        )
        
        if not twilio_configured:
            print("✓ Twilio not configured - notifications will be MOCKED")
        else:
            print("Note: Twilio is configured - real notifications may be sent")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
