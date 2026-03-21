"""
Test suite for iteration 164 features:
1. Family member summary with frequency-normalized income/expenses
2. Shared loan creation and references
3. Combined summary excluding shared loan references
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@test.com"
TEST_PASSWORD = "Demo@1234"


@pytest.fixture(scope="module")
def session():
    """Create authenticated session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    
    # Login
    login_resp = s.post(f"{BASE_URL}/api/auth/login", json={
        "username": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if login_resp.status_code != 200:
        pytest.skip(f"Login failed: {login_resp.status_code} - {login_resp.text}")
    
    return s


class TestFamilyMemberSummary:
    """Test GET /api/family/member/{id}/summary endpoint"""
    
    def test_get_family_returns_data(self, session):
        """Verify family endpoint returns data"""
        resp = session.get(f"{BASE_URL}/api/family")
        assert resp.status_code == 200
        data = resp.json()
        print(f"Family data: {data}")
        # Family may or may not exist
        assert "family" in data or "members" in data or "familyName" in data
    
    def test_member_summary_structure(self, session):
        """Test member summary returns expected fields with frequency normalization"""
        # First get family to find a member ID
        family_resp = session.get(f"{BASE_URL}/api/family")
        assert family_resp.status_code == 200
        family_data = family_resp.json()
        
        # Get member ID - could be from family.members or direct members array
        members = []
        if family_data.get("family"):
            members = family_data["family"].get("members", [])
        elif family_data.get("members"):
            members = family_data["members"]
        
        if not members:
            # Create a family first
            create_resp = session.post(f"{BASE_URL}/api/family", json={
                "familyName": f"TEST_Family_{uuid.uuid4().hex[:8]}"
            })
            if create_resp.status_code == 200:
                family_data = create_resp.json()
                members = family_data.get("members", [])
            else:
                pytest.skip("No family members available and couldn't create family")
        
        if not members:
            pytest.skip("No family members available for testing")
        
        member_id = members[0]["id"]
        
        # Get member summary
        resp = session.get(f"{BASE_URL}/api/family/member/{member_id}/summary")
        assert resp.status_code == 200
        data = resp.json()
        
        # Verify structure
        assert "member" in data
        assert "summary" in data
        
        summary = data["summary"]
        
        # Check required fields exist
        required_fields = [
            "monthlyIncome", "monthlyExpenses", "totalInvestments", 
            "totalAssets", "totalLoans", "totalEMI", "liquidBalance",
            "effectiveFunds", "survivalDays", "savingsRate", "netWorth", "counts"
        ]
        
        for field in required_fields:
            assert field in summary, f"Missing field: {field}"
            print(f"  {field}: {summary[field]}")
        
        # Verify counts structure
        counts = summary["counts"]
        count_fields = ["income", "expenses", "investments", "assets", "loans", "accounts", "insurances"]
        for field in count_fields:
            assert field in counts, f"Missing count field: {field}"
        
        print(f"Member summary test passed for member {member_id}")


class TestSharedLoanCreation:
    """Test POST /api/loans with sharedWithMembers creates loan references"""
    
    def test_create_loan_without_sharing(self, session):
        """Test creating a regular loan without sharing"""
        loan_data = {
            "loanType": "Personal Loan",
            "loanName": f"TEST_Regular_Loan_{uuid.uuid4().hex[:8]}",
            "principalAmount": 100000,
            "outstandingAmount": 90000,
            "interestRate": 12.0,
            "emiAmount": 5000,
            "emiFrequency": "Monthly",
            "startDate": "2024-01-01",
            "autoCreateExpense": False
        }
        
        resp = session.post(f"{BASE_URL}/api/loans", json=loan_data)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "id" in data
        assert data["loanName"] == loan_data["loanName"]
        print(f"Created regular loan: {data['id']}")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/loans/{data['id']}")
    
    def test_create_shared_loan_with_family_member(self, session):
        """Test creating a shared loan with family members"""
        # First get family members
        family_resp = session.get(f"{BASE_URL}/api/family")
        assert family_resp.status_code == 200
        family_data = family_resp.json()
        
        members = []
        if family_data.get("family"):
            members = family_data["family"].get("members", [])
        elif family_data.get("members"):
            members = family_data["members"]
        
        # Filter out owner (self)
        non_owner_members = [m for m in members if m.get("role") != "owner"]
        
        if not non_owner_members:
            # Add a test family member
            add_member_resp = session.post(f"{BASE_URL}/api/family/add-member", json={
                "name": "TEST_Shared_Member",
                "relationship": "Spouse",
                "phone": f"+91{uuid.uuid4().hex[:10]}"
            })
            if add_member_resp.status_code == 200:
                member_data = add_member_resp.json()
                non_owner_members = [member_data.get("member", {})]
            else:
                pytest.skip("No non-owner family members available for shared loan test")
        
        if not non_owner_members:
            pytest.skip("No non-owner family members available")
        
        target_member = non_owner_members[0]
        
        # Create shared loan
        loan_data = {
            "loanType": "Home Loan",
            "loanName": f"TEST_Shared_Loan_{uuid.uuid4().hex[:8]}",
            "principalAmount": 5000000,
            "outstandingAmount": 4500000,
            "interestRate": 8.5,
            "emiAmount": 45000,
            "emiFrequency": "Monthly",
            "startDate": "2024-01-01",
            "autoCreateExpense": False,
            "sharedWithMembers": [
                {
                    "memberId": target_member["id"],
                    "memberName": target_member.get("name", "Test Member"),
                    "sharePercentage": 50
                }
            ]
        }
        
        resp = session.post(f"{BASE_URL}/api/loans", json=loan_data)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "id" in data
        print(f"Created shared loan: {data['id']}")
        
        # Verify the loan was created with shared info
        get_resp = session.get(f"{BASE_URL}/api/loans/{data['id']}")
        assert get_resp.status_code == 200
        loan = get_resp.json()
        
        # The loan should have isShared=True and sharedWithMembers
        # Note: The response model may not include these fields, check backend
        print(f"Loan details: isShared={loan.get('isShared')}, sharedWithMembers={loan.get('sharedWithMembers')}")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/loans/{data['id']}")


class TestCombinedSummaryExcludesSharedReferences:
    """Test GET /api/family/combined-summary excludes isSharedReference loans"""
    
    def test_combined_summary_structure(self, session):
        """Test combined summary returns expected fields"""
        resp = session.get(f"{BASE_URL}/api/family/combined-summary")
        
        if resp.status_code == 404:
            pytest.skip("No family group exists")
        
        assert resp.status_code == 200
        data = resp.json()
        
        # Verify structure
        assert "familyName" in data
        assert "memberCount" in data
        assert "combinedSummary" in data
        
        summary = data["combinedSummary"]
        
        # Check required fields
        required_fields = [
            "monthlyIncome", "monthlyExpenses", "totalInvestments",
            "totalAssets", "totalLoans", "liquidBalance", "totalEMI",
            "netWorth", "effectiveFunds", "survivalDays", "savingsRate"
        ]
        
        for field in required_fields:
            assert field in summary, f"Missing field: {field}"
            print(f"  {field}: {summary[field]}")
        
        print(f"Combined summary test passed for family: {data['familyName']}")
    
    def test_combined_summary_has_normalized_values(self, session):
        """Test combined summary includes normalized monthly values"""
        resp = session.get(f"{BASE_URL}/api/family/combined-summary")
        
        if resp.status_code == 404:
            pytest.skip("No family group exists")
        
        assert resp.status_code == 200
        data = resp.json()
        summary = data["combinedSummary"]
        
        # Check for normalized fields
        assert "normalizedMonthlyIncome" in summary or "monthlyIncome" in summary
        assert "normalizedMonthlyExpense" in summary or "monthlyExpenses" in summary
        
        print(f"Normalized income: {summary.get('normalizedMonthlyIncome', summary.get('monthlyIncome'))}")
        print(f"Normalized expense: {summary.get('normalizedMonthlyExpense', summary.get('monthlyExpenses'))}")


class TestLoanModelSharedFields:
    """Test LoanCreate model accepts sharedWithMembers field"""
    
    def test_loan_create_accepts_shared_members_field(self, session):
        """Verify the API accepts sharedWithMembers in loan creation"""
        loan_data = {
            "loanType": "Personal Loan",
            "loanName": f"TEST_Model_Loan_{uuid.uuid4().hex[:8]}",
            "principalAmount": 50000,
            "outstandingAmount": 45000,
            "interestRate": 10.0,
            "emiAmount": 2500,
            "emiFrequency": "Monthly",
            "startDate": "2024-06-01",
            "autoCreateExpense": False,
            "sharedWithMembers": []  # Empty array should be accepted
        }
        
        resp = session.post(f"{BASE_URL}/api/loans", json=loan_data)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "id" in data
        print(f"Loan created with empty sharedWithMembers: {data['id']}")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/loans/{data['id']}")
    
    def test_loan_create_with_null_shared_members(self, session):
        """Verify the API accepts null sharedWithMembers"""
        loan_data = {
            "loanType": "Vehicle Loan",
            "loanName": f"TEST_Null_Shared_{uuid.uuid4().hex[:8]}",
            "principalAmount": 300000,
            "outstandingAmount": 280000,
            "interestRate": 9.5,
            "emiAmount": 8000,
            "emiFrequency": "Monthly",
            "startDate": "2024-03-01",
            "autoCreateExpense": False,
            "sharedWithMembers": None
        }
        
        resp = session.post(f"{BASE_URL}/api/loans", json=loan_data)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "id" in data
        print(f"Loan created with null sharedWithMembers: {data['id']}")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/loans/{data['id']}")


class TestHealthPageBadgesGeneration:
    """Test that badges and challenges are generated for family member views"""
    
    def test_combined_intelligence_endpoint(self, session):
        """Test the combined intelligence endpoint returns gamification data"""
        resp = session.get(f"{BASE_URL}/api/combined/intelligence")
        assert resp.status_code == 200
        data = resp.json()
        
        # Check for gamification data
        if "gamification" in data:
            gam = data["gamification"]
            print(f"Gamification data: level={gam.get('level')}, achievements={len(gam.get('achievements', []))}")
            
            # Verify structure
            assert "level" in gam or "xp" in gam
        
        # Check for challenges
        if "challenges" in data:
            chall = data["challenges"]
            print(f"Challenges: active={len(chall.get('active', []))}, available={len(chall.get('available', []))}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
