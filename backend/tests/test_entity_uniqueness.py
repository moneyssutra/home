"""
Test suite for Entity Uniqueness Validation feature
Tests the /api/check-entity-uniqueness endpoint across different collections:
- assets, loans, expenses, credit_cards, insurances, income_sources
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

class TestEntityUniquenessAPI:
    """Test the entity uniqueness check endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get authenticated session
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test", "password": "test"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        print("Test: Login successful")
        yield
        
    def test_endpoint_exists(self):
        """Test that the check-entity-uniqueness endpoint exists"""
        response = self.session.post(
            f"{BASE_URL}/api/check-entity-uniqueness",
            json={
                "collection": "assets",
                "field": "assetName",
                "value": "Test Asset Name"
            }
        )
        assert response.status_code in [200, 400, 401], f"Unexpected status: {response.status_code}"
        print(f"Test: Endpoint exists - Status {response.status_code}")
    
    def test_check_uniqueness_assets_unique_name(self):
        """Test checking unique asset name returns available=True"""
        unique_name = f"TEST_UniqueAsset_{uuid.uuid4().hex[:8]}"
        response = self.session.post(
            f"{BASE_URL}/api/check-entity-uniqueness",
            json={
                "collection": "assets",
                "field": "assetName",
                "value": unique_name
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "available" in data, "Response missing 'available' field"
        assert data["available"] == True, f"Expected available=True for unique name, got {data}"
        assert "message" in data, "Response missing 'message' field"
        print(f"Test: Unique asset name check - available={data['available']}, message={data.get('message')}")
    
    def test_check_uniqueness_loans_unique_name(self):
        """Test checking unique loan name returns available=True"""
        unique_name = f"TEST_UniqueLoan_{uuid.uuid4().hex[:8]}"
        response = self.session.post(
            f"{BASE_URL}/api/check-entity-uniqueness",
            json={
                "collection": "loans",
                "field": "loanName",
                "value": unique_name
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["available"] == True, f"Expected available=True for unique name"
        print(f"Test: Unique loan name check - available={data['available']}")
    
    def test_check_uniqueness_expenses_unique_name(self):
        """Test checking unique expense name returns available=True"""
        unique_name = f"TEST_UniqueExpense_{uuid.uuid4().hex[:8]}"
        response = self.session.post(
            f"{BASE_URL}/api/check-entity-uniqueness",
            json={
                "collection": "expenses",
                "field": "expenseName",
                "value": unique_name
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["available"] == True, f"Expected available=True for unique name"
        print(f"Test: Unique expense name check - available={data['available']}")
    
    def test_check_uniqueness_credit_cards_unique_name(self):
        """Test checking unique credit card name returns available=True"""
        unique_name = f"TEST_UniqueCard_{uuid.uuid4().hex[:8]}"
        response = self.session.post(
            f"{BASE_URL}/api/check-entity-uniqueness",
            json={
                "collection": "credit_cards",
                "field": "cardName",
                "value": unique_name
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["available"] == True, f"Expected available=True for unique name"
        print(f"Test: Unique credit card name check - available={data['available']}")
    
    def test_check_uniqueness_insurances_unique_name(self):
        """Test checking unique insurance policy name returns available=True"""
        unique_name = f"TEST_UniqueInsurance_{uuid.uuid4().hex[:8]}"
        response = self.session.post(
            f"{BASE_URL}/api/check-entity-uniqueness",
            json={
                "collection": "insurances",
                "field": "policyName",
                "value": unique_name
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["available"] == True, f"Expected available=True for unique name"
        print(f"Test: Unique insurance name check - available={data['available']}")
    
    def test_check_uniqueness_invalid_collection(self):
        """Test that invalid collection name returns 400 error"""
        response = self.session.post(
            f"{BASE_URL}/api/check-entity-uniqueness",
            json={
                "collection": "invalid_collection",
                "field": "name",
                "value": "Test"
            }
        )
        assert response.status_code == 400, f"Expected 400 for invalid collection, got {response.status_code}"
        print(f"Test: Invalid collection returns 400")
    
    def test_check_uniqueness_empty_value(self):
        """Test that empty value is handled properly"""
        response = self.session.post(
            f"{BASE_URL}/api/check-entity-uniqueness",
            json={
                "collection": "assets",
                "field": "assetName",
                "value": "   "  # whitespace only
            }
        )
        # Should return available=True for empty/whitespace values or handle gracefully
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        print(f"Test: Empty value handling - Status {response.status_code}")
    
    def test_check_uniqueness_case_insensitive(self):
        """Test that uniqueness check is case-insensitive"""
        # First create an asset with a specific name
        test_name = f"TEST_CaseTest_{uuid.uuid4().hex[:8]}"
        
        # Create an asset
        create_response = self.session.post(
            f"{BASE_URL}/api/assets",
            json={
                "assetType": "Other",
                "assetName": test_name,
                "currentValue": 10000
            }
        )
        
        if create_response.status_code == 200:
            created_asset_id = create_response.json().get("id")
            
            # Check with same name (different case)
            check_response = self.session.post(
                f"{BASE_URL}/api/check-entity-uniqueness",
                json={
                    "collection": "assets",
                    "field": "assetName",
                    "value": test_name.upper()  # UPPERCASE
                }
            )
            assert check_response.status_code == 200
            data = check_response.json()
            # Should return available=False because case-insensitive match exists
            assert data["available"] == False, f"Expected case-insensitive match to be found"
            print(f"Test: Case-insensitive check works - available={data['available']}")
            
            # Cleanup - delete the created asset
            self.session.delete(f"{BASE_URL}/api/assets/{created_asset_id}")
        else:
            print(f"Test: Skipped (asset creation failed: {create_response.status_code})")
    
    def test_check_uniqueness_with_exclude_id(self):
        """Test that exclude_id parameter works (for edit mode)"""
        test_name = f"TEST_ExcludeTest_{uuid.uuid4().hex[:8]}"
        
        # Create an asset
        create_response = self.session.post(
            f"{BASE_URL}/api/assets",
            json={
                "assetType": "Other",
                "assetName": test_name,
                "currentValue": 10000
            }
        )
        
        if create_response.status_code == 200:
            created_asset_id = create_response.json().get("id")
            
            # Check without exclude_id - should be unavailable
            check_response = self.session.post(
                f"{BASE_URL}/api/check-entity-uniqueness",
                json={
                    "collection": "assets",
                    "field": "assetName",
                    "value": test_name
                }
            )
            assert check_response.status_code == 200
            data = check_response.json()
            assert data["available"] == False, "Expected name to be unavailable without exclude_id"
            
            # Check with exclude_id of the same entity - should be available
            check_response_with_exclude = self.session.post(
                f"{BASE_URL}/api/check-entity-uniqueness",
                json={
                    "collection": "assets",
                    "field": "assetName",
                    "value": test_name,
                    "exclude_id": created_asset_id
                }
            )
            assert check_response_with_exclude.status_code == 200
            data_with_exclude = check_response_with_exclude.json()
            assert data_with_exclude["available"] == True, "Expected name to be available with exclude_id"
            print(f"Test: exclude_id works - without={data['available']}, with={data_with_exclude['available']}")
            
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/assets/{created_asset_id}")
        else:
            print(f"Test: Skipped (asset creation failed)")


class TestDuplicateNamePrevention:
    """Test that duplicate names are properly detected"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test", "password": "test"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        yield
    
    def test_duplicate_asset_name_detected(self):
        """Test that duplicate asset name is detected as unavailable"""
        test_name = f"TEST_DuplicateAsset_{uuid.uuid4().hex[:8]}"
        
        # Create first asset
        response1 = self.session.post(
            f"{BASE_URL}/api/assets",
            json={
                "assetType": "Other",
                "assetName": test_name,
                "currentValue": 10000
            }
        )
        
        if response1.status_code == 200:
            asset_id = response1.json().get("id")
            
            # Check if same name is available
            check_response = self.session.post(
                f"{BASE_URL}/api/check-entity-uniqueness",
                json={
                    "collection": "assets",
                    "field": "assetName",
                    "value": test_name
                }
            )
            
            assert check_response.status_code == 200
            data = check_response.json()
            assert data["available"] == False, "Duplicate name should be unavailable"
            assert "message" in data, "Should have error message"
            print(f"Test: Duplicate detection works - message: {data.get('message')}")
            
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/assets/{asset_id}")
        else:
            pytest.skip("Could not create test asset")
    
    def test_duplicate_loan_name_detected(self):
        """Test that duplicate loan name is detected"""
        test_name = f"TEST_DuplicateLoan_{uuid.uuid4().hex[:8]}"
        
        # Create first loan
        response1 = self.session.post(
            f"{BASE_URL}/api/loans",
            json={
                "loanType": "Personal Loan",
                "loanName": test_name,
                "principalAmount": 100000,
                "outstandingAmount": 90000,
                "interestRate": 12,
                "emiAmount": 8500,
                "startDate": "2024-01-01"
            }
        )
        
        if response1.status_code == 200:
            loan_id = response1.json().get("id")
            
            # Check if same name is available
            check_response = self.session.post(
                f"{BASE_URL}/api/check-entity-uniqueness",
                json={
                    "collection": "loans",
                    "field": "loanName",
                    "value": test_name
                }
            )
            
            assert check_response.status_code == 200
            data = check_response.json()
            assert data["available"] == False, "Duplicate loan name should be unavailable"
            print(f"Test: Duplicate loan detection works")
            
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/loans/{loan_id}")
        else:
            pytest.skip("Could not create test loan")


class TestResponseStructure:
    """Test the response structure of the uniqueness API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test", "password": "test"}
        )
        assert login_response.status_code == 200
        yield
    
    def test_available_response_structure(self):
        """Test response structure when name is available"""
        response = self.session.post(
            f"{BASE_URL}/api/check-entity-uniqueness",
            json={
                "collection": "assets",
                "field": "assetName",
                "value": f"UniqueTest_{uuid.uuid4().hex}"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "available" in data, "Response must have 'available' field"
        assert "message" in data, "Response must have 'message' field"
        assert isinstance(data["available"], bool), "'available' must be boolean"
        assert isinstance(data["message"], str), "'message' must be string"
        print(f"Test: Available response structure valid - {data}")
    
    def test_unavailable_response_structure(self):
        """Test response structure when name is unavailable (duplicate exists)"""
        test_name = f"TEST_Structure_{uuid.uuid4().hex[:8]}"
        
        # Create an entity first
        create_response = self.session.post(
            f"{BASE_URL}/api/assets",
            json={
                "assetType": "Other",
                "assetName": test_name,
                "currentValue": 5000
            }
        )
        
        if create_response.status_code == 200:
            asset_id = create_response.json().get("id")
            
            # Check the name
            response = self.session.post(
                f"{BASE_URL}/api/check-entity-uniqueness",
                json={
                    "collection": "assets",
                    "field": "assetName",
                    "value": test_name
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert "available" in data
            assert "message" in data
            assert data["available"] == False
            # Should have existing_id when duplicate found
            if "existing_id" in data:
                print(f"Test: Unavailable response includes existing_id: {data['existing_id']}")
            
            print(f"Test: Unavailable response structure valid - available={data['available']}")
            
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/assets/{asset_id}")
        else:
            pytest.skip("Could not create test asset")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
