"""
Test cases for Rental Income Module API
Tests: CRUD operations, tenantName field, frequency options
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestRentalIncomeCRUD:
    """Test Create, Read, Update, Delete for Rental Income type"""
    
    created_rental_ids = []  # Track created items for cleanup
    
    def test_create_rental_income_monthly(self):
        """Create a rental income with Monthly frequency"""
        payload = {
            "type": "Rental",
            "name": "TEST_Green Villa - Flat 302",
            "tenantName": "Rahul Sharma",
            "expectedAmount": 25000,
            "frequency": "Monthly",
            "selectedDay": None,
            "selectedDate": "2026-02-15",
            "selectedQuarter": None,
            "selectedHalf": None,
            "selectedMonth": None,
            "customFrequency": None,
            "customDate": None
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["type"] == "Rental"
        assert data["name"] == "TEST_Green Villa - Flat 302"
        assert data["tenantName"] == "Rahul Sharma"
        assert data["expectedAmount"] == 25000
        assert data["frequency"] == "Monthly"
        assert data["selectedDate"] == "2026-02-15"
        assert "id" in data
        
        self.__class__.created_rental_ids.append(data["id"])
        print(f"Created rental with ID: {data['id']}")
    
    def test_create_rental_income_without_tenant(self):
        """Create a rental income without tenant name (optional field)"""
        payload = {
            "type": "Rental",
            "name": "TEST_Sunrise Apartment",
            "tenantName": None,  # Optional field
            "expectedAmount": 18000,
            "frequency": "Monthly",
            "selectedDate": "2026-03-01"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["type"] == "Rental"
        assert data["name"] == "TEST_Sunrise Apartment"
        assert data["tenantName"] is None  # Confirm optional field is null
        assert data["expectedAmount"] == 18000
        assert "id" in data
        
        self.__class__.created_rental_ids.append(data["id"])
        print(f"Created rental without tenant with ID: {data['id']}")
    
    def test_create_rental_income_quarterly(self):
        """Create a rental income with Quarterly frequency"""
        payload = {
            "type": "Rental",
            "name": "TEST_Commercial Space",
            "tenantName": "Tech Corp Pvt Ltd",
            "expectedAmount": 75000,
            "frequency": "Quarterly",
            "selectedQuarter": "Q1 (Jan–Mar)",
            "selectedMonth": "February",
            "selectedDate": "2026-02-28"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["type"] == "Rental"
        assert data["frequency"] == "Quarterly"
        assert data["selectedQuarter"] == "Q1 (Jan–Mar)"
        assert data["selectedMonth"] == "February"
        assert "id" in data
        
        self.__class__.created_rental_ids.append(data["id"])
        print(f"Created quarterly rental with ID: {data['id']}")
    
    def test_create_rental_income_half_yearly(self):
        """Create a rental income with Half-Yearly frequency"""
        payload = {
            "type": "Rental",
            "name": "TEST_Office Building",
            "tenantName": "ABC Solutions",
            "expectedAmount": 150000,
            "frequency": "Half-Yearly",
            "selectedHalf": "Jan–Jun",
            "selectedMonth": "March",
            "selectedDate": "2026-03-15"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["type"] == "Rental"
        assert data["frequency"] == "Half-Yearly"
        assert data["selectedHalf"] == "Jan–Jun"
        assert data["selectedMonth"] == "March"
        assert "id" in data
        
        self.__class__.created_rental_ids.append(data["id"])
        print(f"Created half-yearly rental with ID: {data['id']}")
    
    def test_create_rental_income_yearly(self):
        """Create a rental income with Yearly frequency"""
        payload = {
            "type": "Rental",
            "name": "TEST_Vacation House",
            "tenantName": "Holiday Rentals",
            "expectedAmount": 300000,
            "frequency": "Yearly",
            "selectedMonth": "June",
            "selectedDate": "2026-06-01"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["type"] == "Rental"
        assert data["frequency"] == "Yearly"
        assert data["selectedMonth"] == "June"
        assert "id" in data
        
        self.__class__.created_rental_ids.append(data["id"])
        print(f"Created yearly rental with ID: {data['id']}")
    
    def test_create_rental_income_others(self):
        """Create a rental income with Others (custom) frequency"""
        payload = {
            "type": "Rental",
            "name": "TEST_Warehouse",
            "tenantName": "Logistics Ltd",
            "expectedAmount": 50000,
            "frequency": "Others",
            "customFrequency": "Every 2 months",
            "customDate": "2026-04-15"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["type"] == "Rental"
        assert data["frequency"] == "Others"
        assert data["customFrequency"] == "Every 2 months"
        assert data["customDate"] == "2026-04-15"
        assert "id" in data
        
        self.__class__.created_rental_ids.append(data["id"])
        print(f"Created custom frequency rental with ID: {data['id']}")


class TestRentalIncomeRead:
    """Test GET operations for Rental Income"""
    
    created_id = None
    
    @classmethod
    def setup_class(cls):
        """Create a rental income for read tests"""
        payload = {
            "type": "Rental",
            "name": "TEST_Read Test Property",
            "tenantName": "Test Tenant",
            "expectedAmount": 20000,
            "frequency": "Monthly",
            "selectedDate": "2026-01-20"
        }
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        if response.status_code == 200:
            cls.created_id = response.json()["id"]
    
    @classmethod
    def teardown_class(cls):
        """Clean up test data"""
        if cls.created_id:
            requests.delete(f"{BASE_URL}/api/income/{cls.created_id}")
    
    def test_get_all_income_sources(self):
        """Verify GET /api/income returns list including Rental type"""
        response = requests.get(f"{BASE_URL}/api/income")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Filter for Rental type entries
        rentals = [item for item in data if item.get("type") == "Rental"]
        assert len(rentals) >= 1, "Should have at least one Rental type income"
        print(f"Found {len(rentals)} rental income entries")
    
    def test_get_single_rental_by_id(self):
        """Verify GET /api/income/{id} returns the correct rental"""
        if not self.__class__.created_id:
            pytest.skip("No rental ID available for testing")
        
        response = requests.get(f"{BASE_URL}/api/income/{self.__class__.created_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == self.__class__.created_id
        assert data["type"] == "Rental"
        assert data["name"] == "TEST_Read Test Property"
        assert data["tenantName"] == "Test Tenant"
        assert data["expectedAmount"] == 20000
        print(f"Successfully retrieved rental by ID: {data['id']}")
    
    def test_get_nonexistent_rental(self):
        """Verify 404 returned for non-existent rental ID"""
        response = requests.get(f"{BASE_URL}/api/income/nonexistent-id-12345")
        assert response.status_code == 404
        print("Correctly returns 404 for non-existent ID")


class TestRentalIncomeUpdate:
    """Test PUT operations for Rental Income"""
    
    created_id = None
    
    @classmethod
    def setup_class(cls):
        """Create a rental income for update tests"""
        payload = {
            "type": "Rental",
            "name": "TEST_Update Test Property",
            "tenantName": "Original Tenant",
            "expectedAmount": 15000,
            "frequency": "Monthly",
            "selectedDate": "2026-01-10"
        }
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        if response.status_code == 200:
            cls.created_id = response.json()["id"]
    
    @classmethod
    def teardown_class(cls):
        """Clean up test data"""
        if cls.created_id:
            requests.delete(f"{BASE_URL}/api/income/{cls.created_id}")
    
    def test_update_rental_amount(self):
        """Update rental amount and verify persistence"""
        if not self.__class__.created_id:
            pytest.skip("No rental ID available for testing")
        
        update_payload = {
            "type": "Rental",
            "name": "TEST_Update Test Property",
            "tenantName": "Original Tenant",
            "expectedAmount": 18000,  # Changed from 15000
            "frequency": "Monthly",
            "selectedDate": "2026-01-10"
        }
        
        response = requests.put(f"{BASE_URL}/api/income/{self.__class__.created_id}", json=update_payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["expectedAmount"] == 18000
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/income/{self.__class__.created_id}")
        assert get_response.status_code == 200
        assert get_response.json()["expectedAmount"] == 18000
        print("Successfully updated rental amount")
    
    def test_update_tenant_name(self):
        """Update tenant name and verify persistence"""
        if not self.__class__.created_id:
            pytest.skip("No rental ID available for testing")
        
        update_payload = {
            "type": "Rental",
            "name": "TEST_Update Test Property",
            "tenantName": "New Tenant Name",  # Changed
            "expectedAmount": 18000,
            "frequency": "Monthly",
            "selectedDate": "2026-01-10"
        }
        
        response = requests.put(f"{BASE_URL}/api/income/{self.__class__.created_id}", json=update_payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["tenantName"] == "New Tenant Name"
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/income/{self.__class__.created_id}")
        assert get_response.status_code == 200
        assert get_response.json()["tenantName"] == "New Tenant Name"
        print("Successfully updated tenant name")
    
    def test_update_frequency_to_quarterly(self):
        """Update frequency from Monthly to Quarterly"""
        if not self.__class__.created_id:
            pytest.skip("No rental ID available for testing")
        
        update_payload = {
            "type": "Rental",
            "name": "TEST_Update Test Property",
            "tenantName": "New Tenant Name",
            "expectedAmount": 18000,
            "frequency": "Quarterly",  # Changed from Monthly
            "selectedQuarter": "Q2 (Apr–Jun)",
            "selectedMonth": "May",
            "selectedDate": "2026-05-15"
        }
        
        response = requests.put(f"{BASE_URL}/api/income/{self.__class__.created_id}", json=update_payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["frequency"] == "Quarterly"
        assert data["selectedQuarter"] == "Q2 (Apr–Jun)"
        assert data["selectedMonth"] == "May"
        print("Successfully updated frequency to Quarterly")
    
    def test_update_nonexistent_rental(self):
        """Verify 404 returned for updating non-existent rental"""
        payload = {
            "type": "Rental",
            "name": "Test",
            "expectedAmount": 10000,
            "frequency": "Monthly"
        }
        response = requests.put(f"{BASE_URL}/api/income/nonexistent-id-12345", json=payload)
        assert response.status_code == 404
        print("Correctly returns 404 for non-existent ID on update")


class TestRentalIncomeDelete:
    """Test DELETE operations for Rental Income"""
    
    def test_delete_rental_income(self):
        """Create and delete a rental income"""
        # First create a rental
        payload = {
            "type": "Rental",
            "name": "TEST_Delete Test Property",
            "tenantName": "Temp Tenant",
            "expectedAmount": 12000,
            "frequency": "Monthly",
            "selectedDate": "2026-01-05"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert create_response.status_code == 200
        
        rental_id = create_response.json()["id"]
        print(f"Created rental for deletion: {rental_id}")
        
        # Delete the rental
        delete_response = requests.delete(f"{BASE_URL}/api/income/{rental_id}")
        assert delete_response.status_code == 200
        
        data = delete_response.json()
        assert data["id"] == rental_id
        assert "message" in data
        print("Successfully deleted rental")
        
        # Verify deletion with GET
        get_response = requests.get(f"{BASE_URL}/api/income/{rental_id}")
        assert get_response.status_code == 404
        print("Verified rental no longer exists")
    
    def test_delete_nonexistent_rental(self):
        """Verify 404 returned for deleting non-existent rental"""
        response = requests.delete(f"{BASE_URL}/api/income/nonexistent-id-12345")
        assert response.status_code == 404
        print("Correctly returns 404 for non-existent ID on delete")


class TestRentalTenantNameField:
    """Test specific scenarios for tenantName field"""
    
    created_ids = []
    
    @classmethod
    def teardown_class(cls):
        """Clean up test data"""
        for rental_id in cls.created_ids:
            requests.delete(f"{BASE_URL}/api/income/{rental_id}")
    
    def test_tenant_name_with_value(self):
        """Create rental with tenant name set"""
        payload = {
            "type": "Rental",
            "name": "TEST_Tenant Property",
            "tenantName": "John Doe",
            "expectedAmount": 22000,
            "frequency": "Monthly",
            "selectedDate": "2026-02-10"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["tenantName"] == "John Doe"
        
        self.__class__.created_ids.append(data["id"])
        print(f"Created rental with tenant name: {data['tenantName']}")
    
    def test_tenant_name_null(self):
        """Create rental with tenant name as null"""
        payload = {
            "type": "Rental",
            "name": "TEST_No Tenant Property",
            "tenantName": None,
            "expectedAmount": 19000,
            "frequency": "Monthly",
            "selectedDate": "2026-02-12"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["tenantName"] is None
        
        self.__class__.created_ids.append(data["id"])
        print("Created rental with null tenant name")
    
    def test_tenant_name_empty_string(self):
        """Create rental with tenant name as empty string"""
        payload = {
            "type": "Rental",
            "name": "TEST_Empty Tenant Property",
            "tenantName": "",  # Empty string
            "expectedAmount": 17000,
            "frequency": "Monthly",
            "selectedDate": "2026-02-14"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        # Empty string should be stored as empty string
        assert data["tenantName"] == ""
        
        self.__class__.created_ids.append(data["id"])
        print("Created rental with empty string tenant name")


class TestCleanup:
    """Cleanup all TEST_ prefixed rentals at the end"""
    
    def test_cleanup_test_data(self):
        """Clean up all TEST_ prefixed rental entries"""
        response = requests.get(f"{BASE_URL}/api/income")
        if response.status_code != 200:
            pytest.skip("Could not fetch income sources for cleanup")
        
        data = response.json()
        test_rentals = [
            item for item in data 
            if item.get("type") == "Rental" and item.get("name", "").startswith("TEST_")
        ]
        
        deleted_count = 0
        for rental in test_rentals:
            delete_response = requests.delete(f"{BASE_URL}/api/income/{rental['id']}")
            if delete_response.status_code == 200:
                deleted_count += 1
        
        print(f"Cleaned up {deleted_count} TEST_ prefixed rental entries")
