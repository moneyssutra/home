"""
Test Family Quick Summary API and Email Service Configuration
Tests for iteration 180:
1. GET /api/family/quick-summary endpoint
2. Email service branding verification
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@moneysutra.com"
TEST_PASSWORD = "Test@123"


class TestFamilyQuickSummary:
    """Tests for /api/family/quick-summary endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login with password (uses username field)
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
        
        return session
    
    def test_quick_summary_returns_200(self, auth_session):
        """Test that /api/family/quick-summary returns 200 status"""
        response = auth_session.get(f"{BASE_URL}/api/family/quick-summary")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"PASS: /api/family/quick-summary returns 200")
    
    def test_quick_summary_has_required_fields(self, auth_session):
        """Test that response contains memberCount and combinedNetworth fields"""
        response = auth_session.get(f"{BASE_URL}/api/family/quick-summary")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields exist
        assert "memberCount" in data, "Response missing 'memberCount' field"
        assert "combinedNetworth" in data, "Response missing 'combinedNetworth' field"
        
        # Verify field types
        assert isinstance(data["memberCount"], int), f"memberCount should be int, got {type(data['memberCount'])}"
        assert isinstance(data["combinedNetworth"], (int, float)), f"combinedNetworth should be numeric, got {type(data['combinedNetworth'])}"
        
        print(f"PASS: Response has memberCount={data['memberCount']}, combinedNetworth={data['combinedNetworth']}")
    
    def test_quick_summary_returns_zeros_for_no_family(self, auth_session):
        """Test that user without family gets {memberCount:0, combinedNetworth:0}"""
        # First check if user has a family
        family_response = auth_session.get(f"{BASE_URL}/api/family")
        family_data = family_response.json()
        
        # Get quick summary
        response = auth_session.get(f"{BASE_URL}/api/family/quick-summary")
        assert response.status_code == 200
        data = response.json()
        
        # If user has no family, expect zeros
        has_family = family_data.get("family") is not None or family_data.get("id") is not None
        
        if not has_family:
            assert data["memberCount"] == 0, f"Expected memberCount=0 for no family, got {data['memberCount']}"
            assert data["combinedNetworth"] == 0, f"Expected combinedNetworth=0 for no family, got {data['combinedNetworth']}"
            print("PASS: User without family gets {memberCount:0, combinedNetworth:0}")
        else:
            # User has family, memberCount should be >= 1
            assert data["memberCount"] >= 1, f"User with family should have memberCount >= 1, got {data['memberCount']}"
            print(f"PASS: User with family has memberCount={data['memberCount']}, combinedNetworth={data['combinedNetworth']}")
    
    def test_quick_summary_unauthenticated_returns_401(self):
        """Test that unauthenticated request returns 401"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/family/quick-summary")
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated, got {response.status_code}"
        print("PASS: Unauthenticated request returns 401")


class TestEmailServiceConfiguration:
    """Tests for email service branding configuration"""
    
    def test_sender_email_env_var(self):
        """Verify SENDER_EMAIL is set to noreply@moneyssutra.com"""
        sender_email = os.environ.get("SENDER_EMAIL", "")
        
        # Check .env file directly if env var not loaded
        if not sender_email:
            try:
                with open("/app/backend/.env", "r") as f:
                    for line in f:
                        if line.startswith("SENDER_EMAIL="):
                            sender_email = line.split("=", 1)[1].strip()
                            break
            except FileNotFoundError:
                pytest.skip("Backend .env file not found")
        
        assert sender_email == "noreply@moneyssutra.com", f"Expected SENDER_EMAIL='noreply@moneyssutra.com', got '{sender_email}'"
        print(f"PASS: SENDER_EMAIL={sender_email}")
    
    def test_sender_name_env_var(self):
        """Verify SENDER_NAME is set to 'MoneySSutra Support'"""
        sender_name = os.environ.get("SENDER_NAME", "")
        
        # Check .env file directly if env var not loaded
        if not sender_name:
            try:
                with open("/app/backend/.env", "r") as f:
                    for line in f:
                        if line.startswith("SENDER_NAME="):
                            sender_name = line.split("=", 1)[1].strip()
                            break
            except FileNotFoundError:
                pytest.skip("Backend .env file not found")
        
        assert sender_name == "MoneySSutra Support", f"Expected SENDER_NAME='MoneySSutra Support', got '{sender_name}'"
        print(f"PASS: SENDER_NAME={sender_name}")
    
    def test_email_templates_use_correct_branding(self):
        """Verify email templates use 'MoneySSutra' not 'Moneyssutra' in user-facing content"""
        try:
            with open("/app/backend/email_service.py", "r") as f:
                content = f.read()
        except FileNotFoundError:
            pytest.skip("email_service.py not found")
        
        # Check for incorrect branding in user-facing content (excluding comments/docstrings)
        lines = content.split("\n")
        issues = []
        
        in_docstring = False
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            
            # Track docstring state
            if '"""' in stripped or "'''" in stripped:
                # Toggle docstring state (simple heuristic)
                if stripped.count('"""') == 1 or stripped.count("'''") == 1:
                    in_docstring = not in_docstring
                continue
            
            # Skip comment lines and lines inside docstrings
            if stripped.startswith("#") or in_docstring:
                continue
            
            # Check for incorrect casing in HTML content or subject lines
            if "Moneyssutra" in line and "MoneySSutra" not in line:
                # This would be incorrect - should be MoneySSutra
                issues.append(f"Line {i}: Found 'Moneyssutra' instead of 'MoneySSutra'")
        
        assert len(issues) == 0, f"Found incorrect branding: {issues}"
        
        # Verify correct branding exists
        assert "MoneySSutra" in content, "Email templates should contain 'MoneySSutra' branding"
        assert "Team MoneySSutra" in content, "Email footer should contain 'Team MoneySSutra'"
        
        print("PASS: Email templates use correct 'MoneySSutra' branding")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
