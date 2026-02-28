"""
Test suite for Workspace API endpoints.
Tests workspace CRUD operations, member management, and invite functionality.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://credential-check-14.preview.emergentagent.com').rstrip('/')


class TestWorkspaceAPI:
    """Workspace API endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.session_token = data.get("session_token")
        self.cookies = {"session_token": self.session_token}
        self.user_id = data.get("user_id")
        yield
    
    def test_login_with_test_credentials(self):
        """Test login with test/test credentials returns valid session"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "user_id" in data
        assert "email" in data
        assert "name" in data
        assert "session_token" in data
        
        # Verify test user data
        assert data["email"] == "test@moneyssutra.com"
        assert data["name"] == "Test User"
        print(f"Login successful: user_id={data['user_id']}")
    
    def test_get_workspaces_list(self):
        """Test GET /api/workspaces returns user's workspaces"""
        response = requests.get(f"{BASE_URL}/api/workspaces", cookies=self.cookies)
        assert response.status_code == 200
        
        workspaces = response.json()
        assert isinstance(workspaces, list)
        assert len(workspaces) >= 1, "User should have at least one workspace"
        
        # Verify workspace structure
        ws = workspaces[0]
        assert "id" in ws
        assert "name" in ws
        assert "type" in ws
        assert "owner_id" in ws
        assert "role" in ws
        print(f"Found {len(workspaces)} workspace(s): {[w['name'] for w in workspaces]}")
    
    def test_get_current_workspace(self):
        """Test GET /api/workspaces/current returns current workspace with permissions"""
        response = requests.get(f"{BASE_URL}/api/workspaces/current", cookies=self.cookies)
        assert response.status_code == 200
        
        ws = response.json()
        
        # Verify workspace structure
        assert "id" in ws
        assert "name" in ws
        assert "type" in ws
        assert "owner_id" in ws
        assert "role" in ws
        assert "permissions" in ws
        assert "member_count" in ws
        
        # Verify permissions structure
        permissions = ws["permissions"]
        assert "view" in permissions
        assert "add" in permissions
        assert "edit" in permissions
        assert "delete" in permissions
        assert "invite" in permissions
        
        # Test user should be owner with full permissions
        if ws["role"] == "owner":
            assert permissions["view"] == True
            assert permissions["add"] == True
            assert permissions["edit"] == True
            assert permissions["delete"] == True
            assert permissions["invite"] == True
        
        print(f"Current workspace: {ws['name']} (role: {ws['role']}, members: {ws['member_count']})")
    
    def test_get_workspace_by_id(self):
        """Test GET /api/workspaces/{id} returns specific workspace"""
        # First get the list to get a valid workspace ID
        response = requests.get(f"{BASE_URL}/api/workspaces", cookies=self.cookies)
        assert response.status_code == 200
        workspaces = response.json()
        
        workspace_id = workspaces[0]["id"]
        
        # Now get specific workspace
        response = requests.get(f"{BASE_URL}/api/workspaces/{workspace_id}", cookies=self.cookies)
        assert response.status_code == 200
        
        ws = response.json()
        assert ws["id"] == workspace_id
        assert "permissions" in ws
        print(f"Got workspace by ID: {ws['name']}")
    
    def test_get_workspace_members(self):
        """Test GET /api/workspaces/{id}/members returns member list"""
        # Get workspace ID first
        response = requests.get(f"{BASE_URL}/api/workspaces/current", cookies=self.cookies)
        workspace_id = response.json()["id"]
        
        # Get members
        response = requests.get(f"{BASE_URL}/api/workspaces/{workspace_id}/members", cookies=self.cookies)
        assert response.status_code == 200
        
        members = response.json()
        assert isinstance(members, list)
        assert len(members) >= 1, "Workspace should have at least the owner"
        
        # Verify member structure
        member = members[0]
        assert "id" in member
        assert "workspace_id" in member
        assert "user_id" in member
        assert "user_email" in member
        assert "user_name" in member
        assert "role" in member
        assert "status" in member
        
        # Find the owner
        owners = [m for m in members if m["role"] == "owner"]
        assert len(owners) == 1, "Workspace should have exactly one owner"
        print(f"Found {len(members)} member(s) in workspace")
    
    def test_workspace_invite_code_exists(self):
        """Test that workspace has an invite code"""
        response = requests.get(f"{BASE_URL}/api/workspaces/current", cookies=self.cookies)
        assert response.status_code == 200
        
        ws = response.json()
        assert "invite_code" in ws
        assert ws["invite_code"] is not None
        assert len(ws["invite_code"]) == 8, "Invite code should be 8 characters"
        print(f"Workspace invite code: {ws['invite_code']}")
    
    def test_create_workspace(self):
        """Test POST /api/workspaces creates new workspace"""
        test_workspace_name = "TEST_Integration_Workspace"
        
        response = requests.post(f"{BASE_URL}/api/workspaces", 
            json={"name": test_workspace_name, "type": "Business"},
            cookies=self.cookies
        )
        assert response.status_code == 200
        
        ws = response.json()
        assert ws["name"] == test_workspace_name
        assert ws["type"] == "Business"
        assert "id" in ws
        assert "invite_code" in ws
        assert ws["role"] == "owner"
        
        print(f"Created workspace: {ws['name']} (ID: {ws['id']})")
        
        # Store for cleanup
        self.created_workspace_id = ws["id"]
    
    def test_get_pending_invitations(self):
        """Test GET /api/workspaces/invitations/pending returns user's pending invitations"""
        response = requests.get(f"{BASE_URL}/api/workspaces/invitations/pending", cookies=self.cookies)
        assert response.status_code == 200
        
        invitations = response.json()
        assert isinstance(invitations, list)
        print(f"Found {len(invitations)} pending invitation(s)")
    
    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated requests are denied"""
        response = requests.get(f"{BASE_URL}/api/workspaces")
        assert response.status_code == 401
        
        response = requests.get(f"{BASE_URL}/api/workspaces/current")
        assert response.status_code == 401
        
        print("Unauthenticated access correctly denied")
    
    def test_auth_me_endpoint(self):
        """Test GET /api/auth/me returns current user data"""
        response = requests.get(f"{BASE_URL}/api/auth/me", cookies=self.cookies)
        assert response.status_code == 200
        
        user = response.json()
        assert "user_id" in user
        assert "email" in user
        assert "name" in user
        assert user["email"] == "test@moneyssutra.com"
        print(f"Current user: {user['name']} ({user['email']})")
    
    def test_auth_me_without_token(self):
        """Test GET /api/auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("Auth /me correctly returns 401 without token")


class TestGoalDetailPage:
    """Tests for Goal Detail page API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert response.status_code == 200
        data = response.json()
        self.session_token = data.get("session_token")
        self.cookies = {"session_token": self.session_token}
        yield
    
    def test_get_goal_by_id(self):
        """Test GET /api/goals/{id} returns goal with detail data"""
        goal_id = "c37e1081-85b9-4263-b58c-b36b3d0bea7a"
        
        response = requests.get(f"{BASE_URL}/api/goals/{goal_id}", cookies=self.cookies)
        
        if response.status_code == 404:
            print(f"Goal {goal_id} not found - may have been deleted")
            pytest.skip("Test goal not found")
        
        assert response.status_code == 200
        
        goal = response.json()
        assert "id" in goal
        assert "goalName" in goal
        assert "targetAmount" in goal
        assert "targetDate" in goal
        
        print(f"Goal: {goal['goalName']} - Target: {goal['targetAmount']}")
    
    def test_get_all_goals(self):
        """Test GET /api/goals returns all user goals"""
        response = requests.get(f"{BASE_URL}/api/goals", cookies=self.cookies)
        assert response.status_code == 200
        
        goals = response.json()
        assert isinstance(goals, list)
        print(f"Found {len(goals)} goal(s)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
