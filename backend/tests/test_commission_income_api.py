"""
Commission Income API Tests
Tests for the Commission Income module that uses /api/income endpoints with type='Commission'
Key features: isVariable field (Fixed/Variable toggle), 'Irregular' frequency option
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCommissionIncomeAPI:
    """Tests for Commission Income CRUD operations"""
    
    created_ids = []  # Track created IDs for cleanup

    @pytest.fixture(autouse=True)
    def setup_and_cleanup(self):
        """Setup before and cleanup after each test"""
        yield
        # Cleanup: Delete all test-created commission records
        for commission_id in self.created_ids:
            try:
                requests.delete(f"{BASE_URL}/api/income/{commission_id}")
            except:
                pass
        self.created_ids.clear()

    def test_create_commission_with_weekly_frequency_variable(self):
        """Test creating a commission with Weekly frequency and Variable type (default)"""
        payload = {
            "type": "Commission",
            "name": "TEST_Sales_Commission_Weekly",
            "expectedAmount": 50000,
            "isVariable": True,  # Default is Variable
            "frequency": "Weekly",
            "selectedDay": "Monday"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert data["type"] == "Commission"
        assert data["name"] == "TEST_Sales_Commission_Weekly"
        assert data["expectedAmount"] == 50000
        assert data["isVariable"] == True
        assert data["frequency"] == "Weekly"
        assert data["selectedDay"] == "Monday"
        assert "id" in data
        
        self.created_ids.append(data["id"])
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/income/{data['id']}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["name"] == "TEST_Sales_Commission_Weekly"
        assert get_data["isVariable"] == True
        print("✓ Created Weekly Variable commission successfully")

    def test_create_commission_with_daily_frequency_no_date(self):
        """Test creating a commission with Daily frequency (should have NO date field)"""
        payload = {
            "type": "Commission",
            "name": "TEST_Daily_Commission",
            "expectedAmount": 1000,
            "isVariable": False,  # Fixed
            "frequency": "Daily",
            # Note: Daily frequency has NO selectedDay or selectedDate
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["type"] == "Commission"
        assert data["name"] == "TEST_Daily_Commission"
        assert data["frequency"] == "Daily"
        assert data["isVariable"] == False
        # Daily should have no date fields set
        assert data.get("selectedDay") is None
        assert data.get("selectedDate") is None
        
        self.created_ids.append(data["id"])
        print("✓ Created Daily Fixed commission successfully (no date field)")

    def test_create_commission_with_irregular_frequency_full_date(self):
        """Test creating a commission with Irregular frequency (full date picker)"""
        payload = {
            "type": "Commission",
            "name": "TEST_Irregular_Commission",
            "expectedAmount": 75000,
            "isVariable": True,
            "frequency": "Irregular",
            "customDate": "2026-03-15"  # Irregular uses customDate
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["type"] == "Commission"
        assert data["name"] == "TEST_Irregular_Commission"
        assert data["frequency"] == "Irregular"
        assert data["customDate"] == "2026-03-15"
        assert data["isVariable"] == True
        
        self.created_ids.append(data["id"])
        print("✓ Created Irregular commission with full date successfully")

    def test_create_commission_fixed_type(self):
        """Test creating a commission with Fixed type (isVariable=False)"""
        payload = {
            "type": "Commission",
            "name": "TEST_Fixed_Commission",
            "expectedAmount": 100000,
            "isVariable": False,  # Fixed commission
            "frequency": "Monthly",
            "selectedDate": "15"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["type"] == "Commission"
        assert data["isVariable"] == False  # Fixed
        assert data["frequency"] == "Monthly"
        assert data["selectedDate"] == "15"
        
        self.created_ids.append(data["id"])
        print("✓ Created Fixed commission successfully")

    def test_create_commission_quarterly_frequency(self):
        """Test creating a commission with Quarterly frequency (quarter + date)"""
        payload = {
            "type": "Commission",
            "name": "TEST_Quarterly_Commission",
            "expectedAmount": 200000,
            "isVariable": True,
            "frequency": "Quarterly",
            "selectedQuarter": "Q1 (Jan–Mar)",
            "selectedDate": "10"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["frequency"] == "Quarterly"
        assert data["selectedQuarter"] == "Q1 (Jan–Mar)"
        assert data["selectedDate"] == "10"
        
        self.created_ids.append(data["id"])
        print("✓ Created Quarterly commission successfully")

    def test_create_commission_half_yearly_frequency(self):
        """Test creating a commission with Half-Yearly frequency (half + date)"""
        payload = {
            "type": "Commission",
            "name": "TEST_HalfYearly_Commission",
            "expectedAmount": 300000,
            "isVariable": False,
            "frequency": "Half-Yearly",
            "selectedHalf": "Jan–Jun",
            "selectedDate": "20"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["frequency"] == "Half-Yearly"
        assert data["selectedHalf"] == "Jan–Jun"
        assert data["selectedDate"] == "20"
        
        self.created_ids.append(data["id"])
        print("✓ Created Half-Yearly commission successfully")

    def test_create_commission_yearly_frequency(self):
        """Test creating a commission with Yearly frequency (month + date)"""
        payload = {
            "type": "Commission",
            "name": "TEST_Yearly_Commission",
            "expectedAmount": 500000,
            "isVariable": True,
            "frequency": "Yearly",
            "selectedMonth": "March",
            "selectedDate": "31"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["frequency"] == "Yearly"
        assert data["selectedMonth"] == "March"
        assert data["selectedDate"] == "31"
        
        self.created_ids.append(data["id"])
        print("✓ Created Yearly commission successfully")

    def test_get_all_income_and_filter_commissions(self):
        """Test getting all income sources and filtering for Commission type"""
        # First create a commission
        payload = {
            "type": "Commission",
            "name": "TEST_Filter_Commission",
            "expectedAmount": 25000,
            "isVariable": True,
            "frequency": "Monthly",
            "selectedDate": "5"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert create_response.status_code == 200
        created_data = create_response.json()
        self.created_ids.append(created_data["id"])
        
        # Get all income sources
        response = requests.get(f"{BASE_URL}/api/income")
        assert response.status_code == 200
        all_income = response.json()
        
        # Filter for Commission type
        commissions = [item for item in all_income if item["type"] == "Commission"]
        
        # Verify our created commission is in the list
        found = any(c["name"] == "TEST_Filter_Commission" for c in commissions)
        assert found, "Created commission should be in filtered list"
        print(f"✓ Found {len(commissions)} commissions in income list")

    def test_update_commission_change_variable_to_fixed(self):
        """Test updating a commission from Variable to Fixed type"""
        # Create a Variable commission
        create_payload = {
            "type": "Commission",
            "name": "TEST_Update_Commission",
            "expectedAmount": 50000,
            "isVariable": True,  # Variable
            "frequency": "Weekly",
            "selectedDay": "Friday"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/income", json=create_payload)
        assert create_response.status_code == 200
        created_data = create_response.json()
        commission_id = created_data["id"]
        self.created_ids.append(commission_id)
        
        # Update to Fixed
        update_payload = {
            "type": "Commission",
            "name": "TEST_Update_Commission_Fixed",
            "expectedAmount": 60000,
            "isVariable": False,  # Changed to Fixed
            "frequency": "Weekly",
            "selectedDay": "Wednesday"  # Changed day
        }
        
        update_response = requests.put(f"{BASE_URL}/api/income/{commission_id}", json=update_payload)
        assert update_response.status_code == 200
        updated_data = update_response.json()
        
        assert updated_data["name"] == "TEST_Update_Commission_Fixed"
        assert updated_data["expectedAmount"] == 60000
        assert updated_data["isVariable"] == False
        assert updated_data["selectedDay"] == "Wednesday"
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/income/{commission_id}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["isVariable"] == False
        print("✓ Updated commission from Variable to Fixed successfully")

    def test_delete_commission(self):
        """Test deleting a commission"""
        # Create a commission to delete
        payload = {
            "type": "Commission",
            "name": "TEST_Delete_Commission",
            "expectedAmount": 10000,
            "isVariable": True,
            "frequency": "Daily"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert create_response.status_code == 200
        created_data = create_response.json()
        commission_id = created_data["id"]
        
        # Delete the commission
        delete_response = requests.delete(f"{BASE_URL}/api/income/{commission_id}")
        assert delete_response.status_code == 200
        
        # Verify it's deleted
        get_response = requests.get(f"{BASE_URL}/api/income/{commission_id}")
        assert get_response.status_code == 404
        print("✓ Deleted commission successfully")

    def test_get_nonexistent_commission_returns_404(self):
        """Test that getting a non-existent commission returns 404"""
        response = requests.get(f"{BASE_URL}/api/income/nonexistent-id-12345")
        assert response.status_code == 404
        print("✓ Non-existent commission returns 404")


class TestCommissionIncomeValidation:
    """Tests for commission input validation"""
    
    created_ids = []

    @pytest.fixture(autouse=True)
    def cleanup(self):
        yield
        for commission_id in self.created_ids:
            try:
                requests.delete(f"{BASE_URL}/api/income/{commission_id}")
            except:
                pass
        self.created_ids.clear()

    def test_create_commission_without_required_fields(self):
        """Test that creating a commission without required fields fails"""
        # Missing name
        payload = {
            "type": "Commission",
            "expectedAmount": 50000,
            "frequency": "Weekly"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        # Should fail with 422 validation error
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✓ Missing name field returns 422")

    def test_create_commission_with_all_frequency_types(self):
        """Test creating commissions with all valid frequency types"""
        frequencies = [
            {"frequency": "Daily"},
            {"frequency": "Weekly", "selectedDay": "Tuesday"},
            {"frequency": "Monthly", "selectedDate": "15"},
            {"frequency": "Quarterly", "selectedQuarter": "Q2 (Apr–Jun)", "selectedDate": "1"},
            {"frequency": "Half-Yearly", "selectedHalf": "Jul–Dec", "selectedDate": "25"},
            {"frequency": "Yearly", "selectedMonth": "December", "selectedDate": "31"},
            {"frequency": "Irregular", "customDate": "2026-06-15"},
        ]
        
        for i, freq_data in enumerate(frequencies):
            payload = {
                "type": "Commission",
                "name": f"TEST_Freq_Commission_{i}",
                "expectedAmount": 10000 + (i * 1000),
                "isVariable": i % 2 == 0,  # Alternate Fixed/Variable
                **freq_data
            }
            
            response = requests.post(f"{BASE_URL}/api/income", json=payload)
            assert response.status_code == 200, f"Failed for frequency {freq_data['frequency']}: {response.text}"
            data = response.json()
            self.created_ids.append(data["id"])
            print(f"  ✓ {freq_data['frequency']} frequency works")
        
        print("✓ All 7 frequency types work correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
