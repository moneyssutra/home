"""
Admin Segmentation Lab API Tests - Phase 3
Tests the /api/admin/segmentation endpoint with various filters
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminSegmentationLab:
    """Test suite for Admin Segmentation Lab API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get admin cookie session"""
        self.session = requests.Session()
        # Login as admin
        login_resp = self.session.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": "admin@moneyssutra.com", "password": "admin123"}
        )
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        assert login_resp.json().get("success") == True
        yield
    
    def test_segmentation_endpoint_returns_proper_structure(self):
        """Test that /api/admin/segmentation returns all required fields"""
        resp = self.session.get(f"{BASE_URL}/api/admin/segmentation")
        assert resp.status_code == 200, f"API failed: {resp.text}"
        
        data = resp.json()
        # Check required top-level fields
        assert "totalUsers" in data, "Missing totalUsers"
        assert "filteredCount" in data, "Missing filteredCount"
        assert "page" in data, "Missing page"
        assert "pageSize" in data, "Missing pageSize"
        assert "totalPages" in data, "Missing totalPages"
        assert "summary" in data, "Missing summary"
        assert "users" in data, "Missing users"
        assert "filterOptions" in data, "Missing filterOptions"
        
        # Check summary structure
        summary = data["summary"]
        assert "avgSafetyDays" in summary, "Missing avgSafetyDays in summary"
        assert "avgHealthScore" in summary, "Missing avgHealthScore in summary"
        assert "avgWealthPct" in summary, "Missing avgWealthPct in summary"
        assert "avgAnnualIncome" in summary, "Missing avgAnnualIncome in summary"
        assert "avgAge" in summary, "Missing avgAge in summary"
        assert "riskDistribution" in summary, "Missing riskDistribution in summary"
        assert "cityDistribution" in summary, "Missing cityDistribution in summary"
        
        # Check filterOptions structure
        filterOptions = data["filterOptions"]
        assert "cities" in filterOptions, "Missing cities in filterOptions"
        assert "occupations" in filterOptions, "Missing occupations in filterOptions"
        assert "genders" in filterOptions, "Missing genders in filterOptions"
        
        print(f"SUCCESS: Segmentation API returns proper structure with {data['totalUsers']} total users")
    
    def test_segmentation_returns_user_data(self):
        """Test that users array contains proper user fields"""
        resp = self.session.get(f"{BASE_URL}/api/admin/segmentation")
        assert resp.status_code == 200
        
        data = resp.json()
        assert len(data["users"]) > 0, "No users returned"
        
        # Check first user has required fields
        user = data["users"][0]
        required_user_fields = [
            "userId", "email", "name", "age", "gender", "city", "occupation",
            "annualIncome", "safetyDays", "wealthPct", "emiPct", "healthScore",
            "riskLevel", "monetizationBucket", "incomeBand"
        ]
        for field in required_user_fields:
            assert field in user, f"Missing {field} in user data"
        
        print(f"SUCCESS: Users have all required fields. First user: {user.get('name') or user.get('email')}")
    
    def test_segmentation_has_rahul_sharma(self):
        """Test that Rahul Sharma (test user with profile) appears in results"""
        resp = self.session.get(f"{BASE_URL}/api/admin/segmentation")
        assert resp.status_code == 200
        
        data = resp.json()
        rahul = next((u for u in data["users"] if u["name"] == "Rahul Sharma"), None)
        assert rahul is not None, "Rahul Sharma not found in users"
        
        # Verify Rahul's profile data
        assert rahul["city"] == "Mumbai", f"Expected Mumbai, got {rahul['city']}"
        assert rahul["occupation"] == "Software Engineer", f"Expected Software Engineer, got {rahul['occupation']}"
        assert rahul["gender"] == "Male", f"Expected Male, got {rahul['gender']}"
        
        print(f"SUCCESS: Rahul Sharma found with city={rahul['city']}, occupation={rahul['occupation']}")
    
    def test_filter_by_gender_male(self):
        """Test filtering by gender=Male returns only Rahul Sharma"""
        resp = self.session.get(f"{BASE_URL}/api/admin/segmentation?gender=Male")
        assert resp.status_code == 200
        
        data = resp.json()
        assert data["filteredCount"] == 1, f"Expected 1 user for gender=Male, got {data['filteredCount']}"
        assert data["users"][0]["name"] == "Rahul Sharma", "Expected Rahul Sharma for gender=Male filter"
        
        print("SUCCESS: Gender filter (Male) returns only Rahul Sharma")
    
    def test_filter_by_risk_level_critical(self):
        """Test filtering by risk_level=critical returns all 5 users"""
        resp = self.session.get(f"{BASE_URL}/api/admin/segmentation?risk_level=critical")
        assert resp.status_code == 200
        
        data = resp.json()
        # All 5 users should be critical (low safety days)
        assert data["filteredCount"] == 5, f"Expected 5 critical users, got {data['filteredCount']}"
        
        # All returned users should have risk=critical
        for user in data["users"]:
            assert user["riskLevel"] == "critical", f"User {user.get('name')} has risk {user['riskLevel']}"
        
        print(f"SUCCESS: Risk level filter returns {data['filteredCount']} critical users")
    
    def test_filter_by_city_mumbai(self):
        """Test filtering by city=Mumbai"""
        resp = self.session.get(f"{BASE_URL}/api/admin/segmentation?city=Mumbai")
        assert resp.status_code == 200
        
        data = resp.json()
        assert data["filteredCount"] >= 1, "Expected at least 1 Mumbai user"
        
        # All returned users should have Mumbai city
        for user in data["users"]:
            assert "mumbai" in user["city"].lower(), f"User {user.get('name')} has city {user['city']}"
        
        print(f"SUCCESS: City filter (Mumbai) returns {data['filteredCount']} users")
    
    def test_filter_by_occupation(self):
        """Test filtering by occupation=Software Engineer"""
        resp = self.session.get(f"{BASE_URL}/api/admin/segmentation?occupation=Software")
        assert resp.status_code == 200
        
        data = resp.json()
        assert data["filteredCount"] >= 1, "Expected at least 1 Software Engineer"
        
        print(f"SUCCESS: Occupation filter returns {data['filteredCount']} users")
    
    def test_age_range_filter(self):
        """Test age range filter works"""
        # Test with wide range
        resp = self.session.get(f"{BASE_URL}/api/admin/segmentation?age_min=30&age_max=40")
        assert resp.status_code == 200
        
        data = resp.json()
        # Rahul Sharma is 33, should be included
        rahul = next((u for u in data["users"] if u["name"] == "Rahul Sharma"), None)
        assert rahul is not None, "Rahul Sharma (age 33) should be in age range 30-40"
        
        print(f"SUCCESS: Age range 30-40 returns {data['filteredCount']} users including Rahul Sharma")
    
    def test_income_range_filter(self):
        """Test income range filter works"""
        # Rahul has annualIncome of 2500000
        resp = self.session.get(f"{BASE_URL}/api/admin/segmentation?income_min=1000000&income_max=5000000")
        assert resp.status_code == 200
        
        data = resp.json()
        assert data["filteredCount"] >= 1, "Expected at least 1 user in income range 1M-5M"
        
        print(f"SUCCESS: Income range filter returns {data['filteredCount']} users")
    
    def test_safety_days_range_filter(self):
        """Test safety days range filter"""
        resp = self.session.get(f"{BASE_URL}/api/admin/segmentation?safety_min=0&safety_max=30")
        assert resp.status_code == 200
        
        data = resp.json()
        # All users have 0 safety days currently
        assert data["filteredCount"] >= 1, "Expected users with safety days 0-30"
        
        print(f"SUCCESS: Safety days filter returns {data['filteredCount']} users")
    
    def test_health_score_range_filter(self):
        """Test health score range filter"""
        resp = self.session.get(f"{BASE_URL}/api/admin/segmentation?health_min=0&health_max=50")
        assert resp.status_code == 200
        
        data = resp.json()
        assert data["filteredCount"] >= 1, "Expected users with health score 0-50"
        
        print(f"SUCCESS: Health score filter returns {data['filteredCount']} users")
    
    def test_wealth_percentage_filter(self):
        """Test wealth percentage filter"""
        resp = self.session.get(f"{BASE_URL}/api/admin/segmentation?wealth_min=0&wealth_max=20")
        assert resp.status_code == 200
        
        data = resp.json()
        assert data["filteredCount"] >= 1, "Expected users with wealth % 0-20"
        
        print(f"SUCCESS: Wealth % filter returns {data['filteredCount']} users")
    
    def test_emi_max_filter(self):
        """Test EMI max filter"""
        resp = self.session.get(f"{BASE_URL}/api/admin/segmentation?emi_max=50")
        assert resp.status_code == 200
        
        data = resp.json()
        # Users with emiPct <= 50 should be returned
        for user in data["users"]:
            assert user["emiPct"] <= 50, f"User {user.get('name')} has EMI {user['emiPct']}% > 50%"
        
        print(f"SUCCESS: EMI max filter returns {data['filteredCount']} users")
    
    def test_pagination_works(self):
        """Test pagination parameters"""
        resp = self.session.get(f"{BASE_URL}/api/admin/segmentation?page=1&page_size=2")
        assert resp.status_code == 200
        
        data = resp.json()
        assert data["page"] == 1, "Page should be 1"
        assert data["pageSize"] == 2, "Page size should be 2"
        assert len(data["users"]) <= 2, "Should return at most 2 users per page"
        
        print(f"SUCCESS: Pagination works - page {data['page']} of {data['totalPages']}, {len(data['users'])} users")
    
    def test_combined_filters(self):
        """Test multiple filters combined"""
        resp = self.session.get(f"{BASE_URL}/api/admin/segmentation?gender=Male&city=Mumbai&risk_level=critical")
        assert resp.status_code == 200
        
        data = resp.json()
        assert data["filteredCount"] >= 1, "Expected at least 1 user matching all filters"
        
        # Verify Rahul matches all filters
        if data["users"]:
            user = data["users"][0]
            assert user["gender"] == "Male"
            assert "Mumbai" in user["city"]
            assert user["riskLevel"] == "critical"
        
        print(f"SUCCESS: Combined filters work - {data['filteredCount']} users match")
    
    def test_summary_metrics_correct(self):
        """Test summary metrics are calculated correctly"""
        resp = self.session.get(f"{BASE_URL}/api/admin/segmentation")
        assert resp.status_code == 200
        
        data = resp.json()
        summary = data["summary"]
        
        # Summary should have numeric values
        assert isinstance(summary["avgSafetyDays"], (int, float)), "avgSafetyDays should be numeric"
        assert isinstance(summary["avgHealthScore"], (int, float)), "avgHealthScore should be numeric"
        assert isinstance(summary["avgWealthPct"], (int, float)), "avgWealthPct should be numeric"
        assert isinstance(summary["avgAnnualIncome"], (int, float)), "avgAnnualIncome should be numeric"
        
        # Risk distribution should exist
        assert len(summary["riskDistribution"]) > 0, "riskDistribution should have entries"
        
        print(f"SUCCESS: Summary metrics - Safety: {summary['avgSafetyDays']}d, Health: {summary['avgHealthScore']}, Wealth: {summary['avgWealthPct']}%")


class TestAdminSegmentationAuth:
    """Test authentication for segmentation endpoint"""
    
    def test_segmentation_requires_auth(self):
        """Test that segmentation endpoint requires admin authentication"""
        session = requests.Session()
        # Try without login
        resp = session.get(f"{BASE_URL}/api/admin/segmentation")
        assert resp.status_code == 401, f"Expected 401 without auth, got {resp.status_code}"
        
        print("SUCCESS: Segmentation endpoint requires admin authentication")
    
    def test_admin_login_works(self):
        """Test admin login with correct credentials"""
        session = requests.Session()
        resp = session.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": "admin@moneyssutra.com", "password": "admin123"}
        )
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        assert resp.json().get("success") == True
        
        print("SUCCESS: Admin login works with correct credentials")
    
    def test_admin_login_fails_with_wrong_password(self):
        """Test admin login fails with wrong password"""
        session = requests.Session()
        resp = session.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": "admin@moneyssutra.com", "password": "wrongpassword"}
        )
        assert resp.status_code == 401, f"Expected 401 for wrong password, got {resp.status_code}"
        
        print("SUCCESS: Admin login correctly rejects wrong password")
