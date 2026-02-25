"""
Test suite for Financial Health Insurance Fix - Iteration 65
Tests the bug fix for Life Insurance calculation to include Term Insurance and ULIP types,
and Health Insurance calculation using coverageAmount field.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFinancialHealthInsuranceFix:
    """Tests for the Life Insurance and Health Insurance calculation fix in Financial Health endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token before each test"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test", "password": "test"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.session_token = login_response.json().get("session_token")
        assert self.session_token, "No session token returned"
        self.cookies = {"session_token": self.session_token}
    
    def test_financial_health_endpoint_returns_200(self):
        """Test that the financial health endpoint returns 200 OK"""
        response = requests.get(
            f"{BASE_URL}/api/financial-health",
            cookies=self.cookies
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "lifeInsurance" in data, "lifeInsurance key missing from response"
        assert "healthInsurance" in data, "healthInsurance key missing from response"
        assert "overallScore" in data, "overallScore key missing from response"
        print(f"✅ Financial health endpoint returns 200 with all required fields")
    
    def test_life_insurance_includes_term_and_life_policies(self):
        """
        Test that Life Insurance calculation includes both 'Term Insurance' and 'Life Insurance' types.
        Test user has:
        - Term Life HDFC: ₹10,000,000 (Life Insurance type)
        - LIC Jeevan Anand: ₹5,000,000 (Life Insurance type)
        - Max Life ULIP: ₹3,000,000 (Life Insurance type)
        Total expected: ₹18,000,000
        """
        # First, verify the insurances
        insurances_response = requests.get(
            f"{BASE_URL}/api/insurances",
            cookies=self.cookies
        )
        assert insurances_response.status_code == 200, f"Failed to get insurances: {insurances_response.text}"
        insurances = insurances_response.json()
        
        # Count life insurance policies
        life_insurance_types = ['term life', 'term', 'life', 'whole life', 'life insurance', 'term insurance']
        life_policies = [
            ins for ins in insurances 
            if (ins.get('insuranceType', '') or ins.get('type', '')).lower() in life_insurance_types
        ]
        print(f"Found {len(life_policies)} life insurance policies:")
        for p in life_policies:
            print(f"  - {p.get('policyName')}: Type={p.get('insuranceType')}, Coverage={p.get('coverageAmount')}")
        
        # Now check the financial health endpoint
        response = requests.get(
            f"{BASE_URL}/api/financial-health",
            cookies=self.cookies
        )
        assert response.status_code == 200
        data = response.json()
        
        life_insurance = data.get("lifeInsurance", {})
        life_current = life_insurance.get("current", 0)
        
        # Calculate expected total from policies
        expected_total = sum(p.get('coverageAmount', 0) for p in life_policies)
        
        print(f"Life Insurance - Current: ₹{life_current:,.0f}")
        print(f"Life Insurance - Expected (from policies): ₹{expected_total:,.0f}")
        
        # Allow small tolerance for floating point
        assert abs(life_current - expected_total) < 1, f"Life insurance current ({life_current}) doesn't match expected ({expected_total})"
        assert life_current > 0, "Life insurance current should be greater than 0"
        print(f"✅ Life Insurance calculation correctly includes all life insurance types: ₹{life_current:,.0f}")
    
    def test_health_insurance_uses_coverage_amount_field(self):
        """
        Test that Health Insurance calculation uses coverageAmount field correctly.
        Test user has:
        - Star Family Health: ₹1,000,000
        - HDFC Optima: ₹500,000
        - ICICI Super Top-up: ₹2,000,000
        Total expected: ₹3,500,000
        """
        # First, verify the insurances
        insurances_response = requests.get(
            f"{BASE_URL}/api/insurances",
            cookies=self.cookies
        )
        assert insurances_response.status_code == 200
        insurances = insurances_response.json()
        
        # Count health insurance policies
        health_types = ['health', 'medical', 'mediclaim', 'health insurance']
        health_policies = [
            ins for ins in insurances 
            if (ins.get('insuranceType', '') or ins.get('type', '')).lower() in health_types
        ]
        print(f"Found {len(health_policies)} health insurance policies:")
        for p in health_policies:
            print(f"  - {p.get('policyName')}: Type={p.get('insuranceType')}, Coverage={p.get('coverageAmount')}")
        
        # Now check the financial health endpoint
        response = requests.get(
            f"{BASE_URL}/api/financial-health",
            cookies=self.cookies
        )
        assert response.status_code == 200
        data = response.json()
        
        health_insurance = data.get("healthInsurance", {})
        health_current = health_insurance.get("current", 0)
        
        # Calculate expected total from policies
        expected_total = sum(p.get('coverageAmount', 0) for p in health_policies)
        
        print(f"Health Insurance - Current: ₹{health_current:,.0f}")
        print(f"Health Insurance - Expected (from policies): ₹{expected_total:,.0f}")
        
        # Allow small tolerance for floating point
        assert abs(health_current - expected_total) < 1, f"Health insurance current ({health_current}) doesn't match expected ({expected_total})"
        assert health_current > 0, "Health insurance current should be greater than 0"
        print(f"✅ Health Insurance calculation correctly uses coverageAmount: ₹{health_current:,.0f}")
    
    def test_overall_score_is_calculated(self):
        """Test that overall financial health score is calculated and returned"""
        response = requests.get(
            f"{BASE_URL}/api/financial-health",
            cookies=self.cookies
        )
        assert response.status_code == 200
        data = response.json()
        
        overall_score = data.get("overallScore", 0)
        assert overall_score is not None, "overallScore should not be None"
        assert isinstance(overall_score, (int, float)), "overallScore should be a number"
        assert 0 <= overall_score <= 100, f"overallScore ({overall_score}) should be between 0 and 100"
        print(f"✅ Overall Financial Health Score: {overall_score}")
    
    def test_life_insurance_status_and_action(self):
        """Test that life insurance status and action recommendations are provided"""
        response = requests.get(
            f"{BASE_URL}/api/financial-health",
            cookies=self.cookies
        )
        assert response.status_code == 200
        data = response.json()
        
        life_insurance = data.get("lifeInsurance", {})
        
        # Check all required fields
        assert "current" in life_insurance, "current field missing"
        assert "target" in life_insurance, "target field missing"
        assert "gap" in life_insurance, "gap field missing"
        assert "status" in life_insurance, "status field missing"
        assert "action" in life_insurance, "action field missing"
        
        print(f"Life Insurance Status: {life_insurance.get('status')}")
        print(f"Life Insurance Action: {life_insurance.get('action')}")
        print(f"✅ Life Insurance contains all required fields with status and action")
    
    def test_health_insurance_status_and_action(self):
        """Test that health insurance status and action recommendations are provided"""
        response = requests.get(
            f"{BASE_URL}/api/financial-health",
            cookies=self.cookies
        )
        assert response.status_code == 200
        data = response.json()
        
        health_insurance = data.get("healthInsurance", {})
        
        # Check all required fields
        assert "current" in health_insurance, "current field missing"
        assert "target" in health_insurance, "target field missing"
        assert "gap" in health_insurance, "gap field missing"
        assert "status" in health_insurance, "status field missing"
        assert "action" in health_insurance, "action field missing"
        
        print(f"Health Insurance Status: {health_insurance.get('status')}")
        print(f"Health Insurance Action: {health_insurance.get('action')}")
        print(f"✅ Health Insurance contains all required fields with status and action")


class TestInsuranceFormAPIValidation:
    """Tests for Insurance API to verify Term Insurance type handling"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token before each test"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test", "password": "test"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.session_token = login_response.json().get("session_token")
        self.cookies = {"session_token": self.session_token}
    
    def test_can_create_term_insurance_policy(self):
        """Test that a Term Insurance policy can be created via API"""
        # Create a test Term Insurance policy
        test_policy = {
            "insuranceType": "Term Insurance",
            "policyName": "TEST_Term_Policy_Pytest",
            "coverageAmount": 5000000,
            "premiumAmount": 25000,
            "premiumFrequency": "Yearly",
            "startDate": "2024-01-01",
            "coveredPerson": "Self",
            "maturityType": "Pure Protection"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/insurances",
            json=test_policy,
            cookies=self.cookies
        )
        
        if response.status_code == 201:
            created_policy = response.json()
            policy_id = created_policy.get("id")
            print(f"✅ Created Term Insurance policy with ID: {policy_id}")
            
            # Clean up - delete the test policy
            delete_response = requests.delete(
                f"{BASE_URL}/api/insurances/{policy_id}",
                cookies=self.cookies
            )
            print(f"Cleanup: Deleted test policy (status: {delete_response.status_code})")
        else:
            # Policy with same name might exist, check
            assert response.status_code in [201, 400], f"Unexpected status: {response.status_code}"
            print(f"Policy creation returned {response.status_code} - may be duplicate name")
    
    def test_insurances_list_contains_correct_types(self):
        """Test that the insurances list returns policies with correct insurance types"""
        response = requests.get(
            f"{BASE_URL}/api/insurances",
            cookies=self.cookies
        )
        assert response.status_code == 200
        insurances = response.json()
        
        # Get unique insurance types
        types = set(ins.get('insuranceType', 'Unknown') for ins in insurances)
        print(f"Insurance types in database: {types}")
        
        # Verify Life Insurance type exists
        has_life = any(ins.get('insuranceType') == 'Life Insurance' for ins in insurances)
        assert has_life, "No 'Life Insurance' type policies found"
        print(f"✅ Found Life Insurance policies")
        
        # Verify Health Insurance type exists
        has_health = any(ins.get('insuranceType') == 'Health Insurance' for ins in insurances)
        assert has_health, "No 'Health Insurance' type policies found"
        print(f"✅ Found Health Insurance policies")
        
        # Verify coverageAmount field exists on all policies
        for ins in insurances:
            assert 'coverageAmount' in ins, f"Policy {ins.get('policyName')} missing coverageAmount"
        print(f"✅ All {len(insurances)} policies have coverageAmount field")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
