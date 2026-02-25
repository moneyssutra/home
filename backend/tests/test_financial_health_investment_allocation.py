"""
Test file for Financial Health API bug fixes - Iteration 66
Tests:
1. Investment Allocation - actualEquity should be > 0 (was 0% before fix, now ~41.4%)
2. Retirement Readiness - currentCorpus should correctly identify NPS/PF investments  
3. Premium Payment Term field in Insurance API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFinancialHealthBugFixes:
    """Tests for financial health API bug fixes - investmentCategory field fix"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.session_token = response.json().get("session_token")
        self.cookies = {"session_token": self.session_token}
    
    def test_investment_allocation_actual_equity_not_zero(self):
        """Test that actualEquity is > 0 after fixing investmentCategory field name bug"""
        response = requests.get(
            f"{BASE_URL}/api/financial-health",
            cookies=self.cookies
        )
        assert response.status_code == 200, f"Financial health API failed: {response.text}"
        
        data = response.json()
        
        # Verify investmentAllocation section exists
        assert "investmentAllocation" in data, "investmentAllocation missing from response"
        
        investment_allocation = data["investmentAllocation"]
        actual_equity = investment_allocation.get("actualEquity", 0)
        
        # Before fix: actualEquity was 0.0 because code used 'category' instead of 'investmentCategory'
        # After fix: actualEquity should be ~41.4% based on test user's investments
        print(f"Actual Equity: {actual_equity}%")
        assert actual_equity > 0, f"actualEquity should be > 0, got {actual_equity}"
        assert actual_equity > 40, f"actualEquity should be > 40% for test user, got {actual_equity}"
        assert actual_equity < 50, f"actualEquity should be < 50% for test user, got {actual_equity}"
        
    def test_retirement_readiness_corpus_calculation(self):
        """Test that retirementReadiness correctly identifies NPS/PF investments"""
        response = requests.get(
            f"{BASE_URL}/api/financial-health",
            cookies=self.cookies
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify retirementReadiness section exists
        assert "retirementReadiness" in data, "retirementReadiness missing from response"
        
        retirement = data["retirementReadiness"]
        current_corpus = retirement.get("currentCorpus", 0)
        
        # Test user has: NPS Tier 1 (380,000) + NPS Tier 2 (115,000) + EPF/PF (980,000) + PPF (520,000) = 1,995,000
        print(f"Current Retirement Corpus: ₹{current_corpus:,.0f}")
        assert current_corpus > 0, f"currentCorpus should be > 0, got {current_corpus}"
        # Should be approximately 1,995,000
        assert current_corpus >= 1900000, f"currentCorpus should be >= 1,900,000, got {current_corpus}"
        assert current_corpus <= 2100000, f"currentCorpus should be <= 2,100,000, got {current_corpus}"
    
    def test_overall_score_calculation(self):
        """Test that overall score is calculated correctly"""
        response = requests.get(
            f"{BASE_URL}/api/financial-health",
            cookies=self.cookies
        )
        assert response.status_code == 200
        
        data = response.json()
        
        assert "overallScore" in data, "overallScore missing from response"
        overall_score = data["overallScore"]
        
        print(f"Overall Financial Health Score: {overall_score}")
        assert isinstance(overall_score, int), f"overallScore should be int, got {type(overall_score)}"
        assert 0 <= overall_score <= 100, f"overallScore should be 0-100, got {overall_score}"
        # Test user should have a reasonable score (not too low due to the fix)
        assert overall_score >= 50, f"overallScore should be >= 50 for test user, got {overall_score}"
    
    def test_liquid_funds_classification(self):
        """Test that liquid funds correctly identify FD investments using investmentCategory"""
        response = requests.get(
            f"{BASE_URL}/api/financial-health",
            cookies=self.cookies
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify emergencyFund (which uses liquid_funds) has current > 0
        assert "emergencyFund" in data
        emergency_current = data["emergencyFund"].get("current", 0)
        
        # Test user has FDs and bank accounts which should contribute to liquid funds
        print(f"Emergency Fund Current (includes liquid investments): ₹{emergency_current:,.0f}")
        assert emergency_current > 0, f"Emergency fund current should be > 0"


class TestInsurancePremiumPaymentTerm:
    """Tests for Insurance API premiumPaymentTerm field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert response.status_code == 200
        self.session_token = response.json().get("session_token")
        self.cookies = {"session_token": self.session_token}
        self.created_insurance_ids = []
    
    def teardown_method(self):
        """Cleanup test insurance records"""
        for insurance_id in self.created_insurance_ids:
            try:
                requests.delete(
                    f"{BASE_URL}/api/insurances/{insurance_id}",
                    cookies=self.cookies
                )
            except:
                pass
    
    def test_create_term_insurance_with_premium_payment_term(self):
        """Test creating Term Insurance with premiumPaymentTerm field"""
        payload = {
            "insuranceType": "Term Insurance",
            "policyName": "TEST_Term_Insurance_PPT",
            "coverageAmount": 10000000,
            "premiumAmount": 25000,
            "premiumFrequency": "Yearly",
            "startDate": "2024-01-15",
            "premiumPaymentTerm": "25 Years"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/insurances",
            json=payload,
            cookies=self.cookies
        )
        
        assert response.status_code == 200 or response.status_code == 201
        data = response.json()
        
        # Store for cleanup
        self.created_insurance_ids.append(data["id"])
        
        # Verify premiumPaymentTerm was saved
        assert data.get("premiumPaymentTerm") == "25 Years", \
            f"premiumPaymentTerm should be '25 Years', got {data.get('premiumPaymentTerm')}"
        assert data.get("insuranceType") == "Term Insurance"
        
        # Verify by fetching
        get_response = requests.get(
            f"{BASE_URL}/api/insurances/{data['id']}",
            cookies=self.cookies
        )
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched.get("premiumPaymentTerm") == "25 Years"
    
    def test_create_life_insurance_with_premium_payment_term(self):
        """Test creating Life Insurance with premiumPaymentTerm field"""
        payload = {
            "insuranceType": "Life Insurance",
            "policyName": "TEST_Life_Insurance_PPT",
            "coverageAmount": 5000000,
            "premiumAmount": 50000,
            "premiumFrequency": "Yearly",
            "startDate": "2023-06-01",
            "premiumPaymentTerm": "10 Years"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/insurances",
            json=payload,
            cookies=self.cookies
        )
        
        assert response.status_code == 200 or response.status_code == 201
        data = response.json()
        
        self.created_insurance_ids.append(data["id"])
        
        assert data.get("premiumPaymentTerm") == "10 Years"
        assert data.get("insuranceType") == "Life Insurance"
    
    def test_all_premium_payment_term_options(self):
        """Test that all expected premium payment term options are valid"""
        expected_options = [
            "1 Year", "2 Years", "3 Years", "5 Years", "10 Years",
            "15 Years", "20 Years", "25 Years", "30 Years", "Till Maturity"
        ]
        
        for term in expected_options:
            payload = {
                "insuranceType": "Term Insurance",
                "policyName": f"TEST_PPT_{term.replace(' ', '_')}",
                "coverageAmount": 1000000,
                "premiumAmount": 10000,
                "premiumFrequency": "Yearly",
                "startDate": "2024-01-01",
                "premiumPaymentTerm": term
            }
            
            response = requests.post(
                f"{BASE_URL}/api/insurances",
                json=payload,
                cookies=self.cookies
            )
            
            assert response.status_code == 200 or response.status_code == 201, \
                f"Failed to create insurance with premiumPaymentTerm={term}"
            
            data = response.json()
            self.created_insurance_ids.append(data["id"])
            assert data.get("premiumPaymentTerm") == term


class TestInvestmentsData:
    """Tests to verify investments data structure"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert response.status_code == 200
        self.session_token = response.json().get("session_token")
        self.cookies = {"session_token": self.session_token}
    
    def test_investments_have_investment_category_field(self):
        """Verify that investments use investmentCategory field (not category)"""
        response = requests.get(
            f"{BASE_URL}/api/investments",
            cookies=self.cookies
        )
        assert response.status_code == 200
        
        investments = response.json()
        assert len(investments) > 0, "Test user should have investments"
        
        # Check that at least some investments have investmentCategory
        investments_with_category = [
            inv for inv in investments 
            if inv.get("investmentCategory")
        ]
        
        print(f"Investments with investmentCategory: {len(investments_with_category)}/{len(investments)}")
        assert len(investments_with_category) > 0, "Investments should have investmentCategory field"
        
        # Print categories for verification
        categories = set(inv.get("investmentCategory") for inv in investments if inv.get("investmentCategory"))
        print(f"Unique investment categories: {categories}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
