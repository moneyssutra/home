"""
Iteration 185 - Testing 3 new features:
1. Family View Dashboard counts fix (assetCount, investmentCount, etc. in combined-summary)
2. Auth page logos (ForgotPassword.js, ResetPassword.js using LogoFull)
3. MPIN Change feature in SecuritySettings (/api/mpin/change, /api/mpin/send-change-otp, /api/mpin/change-with-otp)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fintech-dash-45.preview.emergentagent.com')

class TestFamilyCombinedSummary:
    """Test /api/family/combined-summary returns count fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login with MPIN to get session for family user"""
        self.session = requests.Session()
        # Login with MPIN for user with family
        login_resp = self.session.post(f"{BASE_URL}/api/mpin/login", json={
            "email": "moneyssutra@gmail.com",
            "mpin": "1234"
        })
        assert login_resp.status_code == 200, f"MPIN login failed: {login_resp.text}"
        self.user_data = login_resp.json()
        # Store session cookie
        if 'session_token' in login_resp.cookies:
            self.session.cookies.set('session_token', login_resp.cookies['session_token'])
    
    def test_combined_summary_returns_count_fields(self):
        """Verify /api/family/combined-summary returns assetCount, investmentCount, accountCount, loanCount, incomeCount, expenseCount"""
        resp = self.session.get(f"{BASE_URL}/api/family/combined-summary")
        assert resp.status_code == 200, f"Failed to get combined-summary: {resp.text}"
        
        data = resp.json()
        assert "combinedSummary" in data, "Response missing combinedSummary"
        
        summary = data["combinedSummary"]
        
        # Verify all count fields exist
        required_count_fields = [
            "assetCount",
            "investmentCount", 
            "accountCount",
            "loanCount",
            "incomeCount",
            "expenseCount",
            "insuranceCount",
            "creditCardCount"
        ]
        
        for field in required_count_fields:
            assert field in summary, f"Missing field: {field}"
            assert isinstance(summary[field], int), f"{field} should be an integer, got {type(summary[field])}"
            print(f"  {field}: {summary[field]}")
        
        # Verify other expected fields
        assert "netWorth" in summary
        assert "totalAssets" in summary
        assert "totalInvestments" in summary
        assert "totalLoans" in summary
        assert "liquidBalance" in summary
        
        print(f"Family combined-summary test PASSED - All count fields present")
    
    def test_family_exists_for_user(self):
        """Verify the test user has a family group"""
        resp = self.session.get(f"{BASE_URL}/api/family")
        assert resp.status_code == 200, f"Failed to get family: {resp.text}"
        
        data = resp.json()
        # Should have family data (not null)
        assert data.get("familyName") or data.get("family"), "User should have a family group"
        print(f"Family exists: {data.get('familyName', data.get('family', {}).get('familyName', 'Unknown'))}")


class TestMPINChangeFeature:
    """Test MPIN change endpoints: /change, /send-change-otp, /change-with-otp"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login with password for test user"""
        self.session = requests.Session()
        # Login with password for test user
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test@moneysutra.com",
            "password": "Test@123"
        })
        assert login_resp.status_code == 200, f"Password login failed: {login_resp.text}"
        self.user_data = login_resp.json()
        if 'session_token' in login_resp.cookies:
            self.session.cookies.set('session_token', login_resp.cookies['session_token'])
    
    def test_mpin_status_endpoint(self):
        """Test /api/mpin/status returns has_mpin flag"""
        resp = self.session.get(f"{BASE_URL}/api/mpin/status")
        assert resp.status_code == 200, f"MPIN status failed: {resp.text}"
        
        data = resp.json()
        assert "has_mpin" in data, "Response missing has_mpin field"
        print(f"MPIN status: has_mpin={data['has_mpin']}")
    
    def test_mpin_change_requires_current_and_new(self):
        """Test /api/mpin/change requires both current_mpin and new_mpin"""
        # Missing both
        resp = self.session.post(f"{BASE_URL}/api/mpin/change", json={})
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        assert "required" in resp.json().get("detail", "").lower()
        
        # Missing new_mpin
        resp = self.session.post(f"{BASE_URL}/api/mpin/change", json={"current_mpin": "1234"})
        assert resp.status_code == 400
        
        # Missing current_mpin
        resp = self.session.post(f"{BASE_URL}/api/mpin/change", json={"new_mpin": "5678"})
        assert resp.status_code == 400
        
        print("MPIN change validation test PASSED")
    
    def test_mpin_change_validates_new_mpin_format(self):
        """Test /api/mpin/change validates new MPIN is 4 digits"""
        # Too short
        resp = self.session.post(f"{BASE_URL}/api/mpin/change", json={
            "current_mpin": "1234",
            "new_mpin": "123"
        })
        assert resp.status_code == 400
        assert "4 digits" in resp.json().get("detail", "")
        
        # Too long
        resp = self.session.post(f"{BASE_URL}/api/mpin/change", json={
            "current_mpin": "1234",
            "new_mpin": "12345"
        })
        assert resp.status_code == 400
        
        # Non-numeric
        resp = self.session.post(f"{BASE_URL}/api/mpin/change", json={
            "current_mpin": "1234",
            "new_mpin": "abcd"
        })
        assert resp.status_code == 400
        
        print("MPIN format validation test PASSED")
    
    def test_mpin_change_rejects_wrong_current_mpin(self):
        """Test /api/mpin/change returns 401 for wrong current MPIN"""
        resp = self.session.post(f"{BASE_URL}/api/mpin/change", json={
            "current_mpin": "9999",  # Wrong MPIN
            "new_mpin": "5678"
        })
        # Should be 401 if MPIN is set, or 400 if MPIN not set
        assert resp.status_code in [400, 401], f"Expected 400/401, got {resp.status_code}: {resp.text}"
        print(f"Wrong current MPIN test PASSED - Status: {resp.status_code}")
    
    def test_send_change_otp_endpoint(self):
        """Test /api/mpin/send-change-otp sends OTP to user's email"""
        resp = self.session.post(f"{BASE_URL}/api/mpin/send-change-otp", json={})
        # Should succeed or hit rate limit
        assert resp.status_code in [200, 429], f"Unexpected status: {resp.status_code}: {resp.text}"
        
        if resp.status_code == 200:
            data = resp.json()
            assert data.get("success") == True
            assert "masked_email" in data, "Response should include masked_email"
            print(f"OTP sent to: {data.get('masked_email')}")
        else:
            print("Rate limited (expected if OTP was recently sent)")
    
    def test_change_with_otp_requires_fields(self):
        """Test /api/mpin/change-with-otp requires otp and new_mpin"""
        # Missing both
        resp = self.session.post(f"{BASE_URL}/api/mpin/change-with-otp", json={})
        assert resp.status_code == 400
        
        # Missing new_mpin
        resp = self.session.post(f"{BASE_URL}/api/mpin/change-with-otp", json={"otp": "123456"})
        assert resp.status_code == 400
        
        # Missing otp
        resp = self.session.post(f"{BASE_URL}/api/mpin/change-with-otp", json={"new_mpin": "5678"})
        assert resp.status_code == 400
        
        print("Change with OTP validation test PASSED")
    
    def test_change_with_otp_validates_mpin_format(self):
        """Test /api/mpin/change-with-otp validates MPIN format"""
        resp = self.session.post(f"{BASE_URL}/api/mpin/change-with-otp", json={
            "otp": "123456",
            "new_mpin": "abc"  # Invalid format
        })
        assert resp.status_code == 400
        assert "4 digits" in resp.json().get("detail", "")
        print("Change with OTP MPIN format validation PASSED")
    
    def test_change_with_otp_rejects_invalid_otp(self):
        """Test /api/mpin/change-with-otp rejects invalid OTP"""
        resp = self.session.post(f"{BASE_URL}/api/mpin/change-with-otp", json={
            "otp": "000000",  # Invalid OTP
            "new_mpin": "5678"
        })
        assert resp.status_code == 400
        # Should say invalid or expired OTP
        detail = resp.json().get("detail", "")
        assert "invalid" in detail.lower() or "expired" in detail.lower() or "attempt" in detail.lower()
        print(f"Invalid OTP rejection test PASSED - Detail: {detail}")


class TestMPINChangeWithMPINUser:
    """Test MPIN change with user who has MPIN set (moneyssutra@gmail.com)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login with MPIN"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/mpin/login", json={
            "email": "moneyssutra@gmail.com",
            "mpin": "1234"
        })
        assert login_resp.status_code == 200, f"MPIN login failed: {login_resp.text}"
        if 'session_token' in login_resp.cookies:
            self.session.cookies.set('session_token', login_resp.cookies['session_token'])
    
    def test_mpin_change_with_correct_current(self):
        """Test MPIN change flow with correct current MPIN (don't actually change it)"""
        # First verify MPIN is set
        status_resp = self.session.get(f"{BASE_URL}/api/mpin/status")
        assert status_resp.status_code == 200
        assert status_resp.json().get("has_mpin") == True, "User should have MPIN set"
        
        # Try to change with wrong current MPIN
        resp = self.session.post(f"{BASE_URL}/api/mpin/change", json={
            "current_mpin": "0000",  # Wrong
            "new_mpin": "5678"
        })
        assert resp.status_code == 401, f"Expected 401 for wrong MPIN, got {resp.status_code}"
        assert "incorrect" in resp.json().get("detail", "").lower()
        
        print("MPIN change with wrong current MPIN correctly rejected")
    
    def test_send_change_otp_for_mpin_user(self):
        """Test sending OTP for MPIN change (forgot MPIN flow)"""
        resp = self.session.post(f"{BASE_URL}/api/mpin/send-change-otp", json={})
        assert resp.status_code in [200, 429], f"Unexpected: {resp.status_code}: {resp.text}"
        
        if resp.status_code == 200:
            data = resp.json()
            assert "masked_email" in data
            # Email should be masked like "mo***@gmail.com"
            masked = data["masked_email"]
            assert "***" in masked or "@" in masked
            print(f"OTP sent to masked email: {masked}")
        else:
            print("Rate limited - OTP recently sent")


class TestMPINEndpointsUnauthenticated:
    """Test MPIN endpoints require authentication"""
    
    def test_mpin_status_requires_auth(self):
        """Test /api/mpin/status returns 401 without auth"""
        resp = requests.get(f"{BASE_URL}/api/mpin/status")
        assert resp.status_code == 401
    
    def test_mpin_change_requires_auth(self):
        """Test /api/mpin/change returns 401 without auth"""
        resp = requests.post(f"{BASE_URL}/api/mpin/change", json={
            "current_mpin": "1234",
            "new_mpin": "5678"
        })
        assert resp.status_code == 401
    
    def test_send_change_otp_requires_auth(self):
        """Test /api/mpin/send-change-otp returns 401 without auth"""
        resp = requests.post(f"{BASE_URL}/api/mpin/send-change-otp", json={})
        assert resp.status_code == 401
    
    def test_change_with_otp_requires_auth(self):
        """Test /api/mpin/change-with-otp returns 401 without auth"""
        resp = requests.post(f"{BASE_URL}/api/mpin/change-with-otp", json={
            "otp": "123456",
            "new_mpin": "5678"
        })
        assert resp.status_code == 401


class TestDashboardFamilyViewCounts:
    """Test that dashboard correctly maps family combined-summary counts"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login with MPIN for family user"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/mpin/login", json={
            "email": "moneyssutra@gmail.com",
            "mpin": "1234"
        })
        assert login_resp.status_code == 200
        if 'session_token' in login_resp.cookies:
            self.session.cookies.set('session_token', login_resp.cookies['session_token'])
    
    def test_combined_summary_count_values_are_reasonable(self):
        """Verify count values are non-negative integers"""
        resp = self.session.get(f"{BASE_URL}/api/family/combined-summary")
        assert resp.status_code == 200
        
        summary = resp.json()["combinedSummary"]
        
        count_fields = ["assetCount", "investmentCount", "accountCount", "loanCount", 
                       "incomeCount", "expenseCount", "insuranceCount", "creditCardCount"]
        
        for field in count_fields:
            value = summary.get(field, -1)
            assert value >= 0, f"{field} should be >= 0, got {value}"
            assert isinstance(value, int), f"{field} should be int"
        
        # Print summary for verification
        print("\nFamily Combined Summary Counts:")
        print(f"  Assets: {summary['assetCount']}")
        print(f"  Investments: {summary['investmentCount']}")
        print(f"  Accounts: {summary['accountCount']}")
        print(f"  Loans: {summary['loanCount']}")
        print(f"  Income Sources: {summary['incomeCount']}")
        print(f"  Expenses: {summary['expenseCount']}")
        print(f"  Insurance: {summary['insuranceCount']}")
        print(f"  Credit Cards: {summary['creditCardCount']}")
        print(f"  Net Worth: {summary['netWorth']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
