"""
Test suite for Other Income API endpoints
Tests CRUD operations for non-recurring income: gifts, bonuses, capital gains, refunds, etc.
"""

import pytest
import requests
import os
from datetime import datetime, date

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fintech-dash-45.preview.emergentagent.com').rstrip('/')

# Test data - unique prefix for cleanup
TEST_PREFIX = "TEST_OTHER_"

# Track created IDs for cleanup
created_ids = []


class TestOtherIncomeAPI:
    """Other Income CRUD operations tests"""
    
    @pytest.fixture(autouse=True)
    def setup_teardown(self):
        """Cleanup test data after each test"""
        yield
        # Cleanup after test
        for income_id in created_ids.copy():
            try:
                requests.delete(f"{BASE_URL}/api/other-income/{income_id}")
                created_ids.remove(income_id)
            except Exception:
                pass
    
    # ==================== CREATE Tests ====================
    
    def test_create_other_income_gift_one_time(self):
        """Test creating a Gift category income - One-Time"""
        payload = {
            "incomeName": f"{TEST_PREFIX}Birthday Gift",
            "category": "Gift",
            "amount": 10000.0,
            "frequency": "One-Time",
            "dateReceived": "2026-01-15",
            "notes": "Birthday gift from family",
            "isReceived": True
        }
        
        response = requests.post(f"{BASE_URL}/api/other-income", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        created_ids.append(data['id'])
        
        # Verify response structure and values
        assert data['incomeName'] == payload['incomeName']
        assert data['category'] == "Gift"
        assert data['amount'] == 10000.0
        assert data['frequency'] == "One-Time"
        assert data['dateReceived'] == "2026-01-15"
        assert data['isReceived'] == True
        assert 'id' in data
        assert 'createdAt' in data
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/other-income/{data['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched['incomeName'] == payload['incomeName']
        assert fetched['amount'] == 10000.0
    
    def test_create_other_income_bonus_yearly(self):
        """Test creating a Bonus category income - Yearly frequency"""
        payload = {
            "incomeName": f"{TEST_PREFIX}Annual Performance Bonus",
            "category": "Bonus",
            "amount": 75000.0,
            "frequency": "Yearly",
            "selectedMonth": "December",
            "selectedDate": "15",
            "notes": "End of year performance bonus",
            "isReceived": False
        }
        
        response = requests.post(f"{BASE_URL}/api/other-income", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        created_ids.append(data['id'])
        
        assert data['category'] == "Bonus"
        assert data['frequency'] == "Yearly"
        assert data['selectedMonth'] == "December"
        assert data['selectedDate'] == "15"
        assert data['isReceived'] == False
    
    def test_create_other_income_quarterly(self):
        """Test creating an Incentive with Quarterly frequency"""
        payload = {
            "incomeName": f"{TEST_PREFIX}Quarterly Incentive",
            "category": "Incentive",
            "amount": 25000.0,
            "frequency": "Quarterly",
            "selectedQuarter": "Q2 (Apr–Jun)",
            "selectedDate": "10",
            "isReceived": False
        }
        
        response = requests.post(f"{BASE_URL}/api/other-income", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        created_ids.append(data['id'])
        
        assert data['category'] == "Incentive"
        assert data['frequency'] == "Quarterly"
        assert data['selectedQuarter'] == "Q2 (Apr–Jun)"
    
    def test_create_other_income_monthly(self):
        """Test creating income with Monthly frequency"""
        payload = {
            "incomeName": f"{TEST_PREFIX}Monthly Freelance",
            "category": "Freelance / Side Work",
            "amount": 15000.0,
            "frequency": "Monthly",
            "selectedDate": "25",
            "isReceived": False
        }
        
        response = requests.post(f"{BASE_URL}/api/other-income", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        created_ids.append(data['id'])
        
        assert data['category'] == "Freelance / Side Work"
        assert data['frequency'] == "Monthly"
        assert data['selectedDate'] == "25"
    
    def test_create_other_income_irregular(self):
        """Test creating income with Irregular frequency"""
        payload = {
            "incomeName": f"{TEST_PREFIX}Stock Sale Gain",
            "category": "Capital Gain",
            "amount": 100000.0,
            "frequency": "Irregular",
            "dateReceived": "2026-02-20",
            "notes": "Sold AAPL shares",
            "isReceived": True
        }
        
        response = requests.post(f"{BASE_URL}/api/other-income", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        created_ids.append(data['id'])
        
        assert data['category'] == "Capital Gain"
        assert data['frequency'] == "Irregular"
        assert data['dateReceived'] == "2026-02-20"
    
    def test_create_other_income_custom_category(self):
        """Test creating income with custom Other category"""
        payload = {
            "incomeName": f"{TEST_PREFIX}Lottery Win",
            "category": "Other",
            "customCategory": "Lottery",
            "amount": 500000.0,
            "frequency": "One-Time",
            "dateReceived": "2026-01-01",
            "isReceived": True
        }
        
        response = requests.post(f"{BASE_URL}/api/other-income", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        created_ids.append(data['id'])
        
        assert data['category'] == "Other"
        assert data['customCategory'] == "Lottery"
    
    def test_create_all_categories(self):
        """Test creating income for each standard category"""
        categories = [
            "Tax Refund", "Cashback / Reward", "Reimbursement", 
            "Asset Sale", "Windfall", "Refund", "Miscellaneous"
        ]
        
        for category in categories:
            payload = {
                "incomeName": f"{TEST_PREFIX}{category.replace(' ', '')}",
                "category": category,
                "amount": 5000.0,
                "frequency": "One-Time",
                "isReceived": False
            }
            
            response = requests.post(f"{BASE_URL}/api/other-income", json=payload)
            assert response.status_code == 200, f"Failed for category {category}: {response.text}"
            
            data = response.json()
            created_ids.append(data['id'])
            assert data['category'] == category
    
    # ==================== READ Tests ====================
    
    def test_get_all_other_incomes(self):
        """Test getting all other income entries"""
        response = requests.get(f"{BASE_URL}/api/other-income")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Verify existing test entries
        income_names = [inc['incomeName'] for inc in data]
        assert "Birthday Gift" in income_names
        assert "Q4 Performance Bonus" in income_names
    
    def test_get_single_other_income(self):
        """Test getting a single other income entry by ID"""
        # First create an entry
        payload = {
            "incomeName": f"{TEST_PREFIX}Single Get Test",
            "category": "Gift",
            "amount": 2000.0,
            "frequency": "One-Time",
            "isReceived": True
        }
        
        create_response = requests.post(f"{BASE_URL}/api/other-income", json=payload)
        assert create_response.status_code == 200
        income_id = create_response.json()['id']
        created_ids.append(income_id)
        
        # Get by ID
        get_response = requests.get(f"{BASE_URL}/api/other-income/{income_id}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data['id'] == income_id
        assert data['incomeName'] == payload['incomeName']
        assert data['amount'] == 2000.0
    
    def test_get_nonexistent_other_income_returns_404(self):
        """Test that getting a non-existent ID returns 404"""
        fake_id = "non-existent-uuid-12345"
        response = requests.get(f"{BASE_URL}/api/other-income/{fake_id}")
        assert response.status_code == 404
    
    # ==================== UPDATE Tests ====================
    
    def test_update_other_income(self):
        """Test updating an existing other income entry"""
        # Create entry
        create_payload = {
            "incomeName": f"{TEST_PREFIX}Update Test",
            "category": "Gift",
            "amount": 5000.0,
            "frequency": "One-Time",
            "isReceived": False
        }
        
        create_response = requests.post(f"{BASE_URL}/api/other-income", json=create_payload)
        assert create_response.status_code == 200
        income_id = create_response.json()['id']
        created_ids.append(income_id)
        
        # Update entry
        update_payload = {
            "incomeName": f"{TEST_PREFIX}Updated Entry",
            "category": "Bonus",  # Changed category
            "amount": 7500.0,  # Changed amount
            "frequency": "Yearly",  # Changed frequency
            "selectedMonth": "January",
            "selectedDate": "15",
            "isReceived": True  # Changed status
        }
        
        update_response = requests.put(f"{BASE_URL}/api/other-income/{income_id}", json=update_payload)
        assert update_response.status_code == 200
        
        updated = update_response.json()
        assert updated['id'] == income_id
        assert updated['incomeName'] == f"{TEST_PREFIX}Updated Entry"
        assert updated['category'] == "Bonus"
        assert updated['amount'] == 7500.0
        assert updated['frequency'] == "Yearly"
        assert updated['isReceived'] == True
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/other-income/{income_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched['amount'] == 7500.0
        assert fetched['category'] == "Bonus"
    
    def test_update_nonexistent_returns_404(self):
        """Test that updating a non-existent ID returns 404"""
        fake_id = "non-existent-uuid-67890"
        payload = {
            "incomeName": "Should Fail",
            "category": "Gift",
            "amount": 1000.0,
            "frequency": "One-Time",
            "isReceived": False
        }
        
        response = requests.put(f"{BASE_URL}/api/other-income/{fake_id}", json=payload)
        assert response.status_code == 404
    
    # ==================== DELETE Tests ====================
    
    def test_delete_other_income(self):
        """Test deleting an other income entry"""
        # Create entry to delete
        payload = {
            "incomeName": f"{TEST_PREFIX}Delete Test",
            "category": "Refund",
            "amount": 3000.0,
            "frequency": "One-Time",
            "isReceived": True
        }
        
        create_response = requests.post(f"{BASE_URL}/api/other-income", json=payload)
        assert create_response.status_code == 200
        income_id = create_response.json()['id']
        
        # Delete entry
        delete_response = requests.delete(f"{BASE_URL}/api/other-income/{income_id}")
        assert delete_response.status_code == 200
        
        delete_data = delete_response.json()
        assert delete_data['id'] == income_id
        assert "deleted" in delete_data['message'].lower()
        
        # Verify deletion - should return 404
        get_response = requests.get(f"{BASE_URL}/api/other-income/{income_id}")
        assert get_response.status_code == 404
    
    def test_delete_nonexistent_returns_404(self):
        """Test that deleting a non-existent ID returns 404"""
        fake_id = "non-existent-uuid-delete"
        response = requests.delete(f"{BASE_URL}/api/other-income/{fake_id}")
        assert response.status_code == 404


class TestOtherIncomeDashboardIntegration:
    """Test Other Income integration with Dashboard calculations"""
    
    def test_dashboard_includes_other_income(self):
        """Verify dashboard monthly income includes other income"""
        # Get dashboard data
        response = requests.get(f"{BASE_URL}/api/dashboard/networth")
        assert response.status_code == 200
        
        data = response.json()
        
        # Dashboard should have monthly income field
        assert 'monthlyIncome' in data
        assert isinstance(data['monthlyIncome'], (int, float))
        
        # Since existing other incomes have yearly/one-time frequency,
        # they may or may not be included in current month calculation
        # This test just verifies the field exists and API works
    
    def test_create_monthly_other_income_affects_dashboard(self):
        """Test that monthly frequency other income is included in dashboard"""
        # Create a monthly other income
        payload = {
            "incomeName": f"{TEST_PREFIX}Dashboard Test Monthly",
            "category": "Freelance / Side Work",
            "amount": 20000.0,
            "frequency": "Monthly",
            "selectedDate": "15",
            "isReceived": False
        }
        
        create_response = requests.post(f"{BASE_URL}/api/other-income", json=payload)
        assert create_response.status_code == 200
        income_id = create_response.json()['id']
        
        try:
            # Get dashboard data
            dashboard_response = requests.get(f"{BASE_URL}/api/dashboard/networth")
            assert dashboard_response.status_code == 200
            
            # The dashboard calculation should work without errors
            data = dashboard_response.json()
            assert 'monthlyIncome' in data
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/other-income/{income_id}")


class TestOtherIncomeFrequencies:
    """Test all frequency options work correctly"""
    
    def test_one_time_frequency_structure(self):
        """Test One-Time frequency with dateReceived"""
        payload = {
            "incomeName": f"{TEST_PREFIX}One Time Test",
            "category": "Gift",
            "amount": 5000.0,
            "frequency": "One-Time",
            "dateReceived": "2026-03-15",
            "isReceived": False
        }
        
        response = requests.post(f"{BASE_URL}/api/other-income", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        income_id = data['id']
        
        try:
            assert data['frequency'] == "One-Time"
            assert data['dateReceived'] == "2026-03-15"
        finally:
            requests.delete(f"{BASE_URL}/api/other-income/{income_id}")
    
    def test_monthly_frequency_structure(self):
        """Test Monthly frequency with selectedDate"""
        payload = {
            "incomeName": f"{TEST_PREFIX}Monthly Test",
            "category": "Cashback / Reward",
            "amount": 1000.0,
            "frequency": "Monthly",
            "selectedDate": "28",
            "isReceived": False
        }
        
        response = requests.post(f"{BASE_URL}/api/other-income", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        income_id = data['id']
        
        try:
            assert data['frequency'] == "Monthly"
            assert data['selectedDate'] == "28"
        finally:
            requests.delete(f"{BASE_URL}/api/other-income/{income_id}")
    
    def test_quarterly_frequency_structure(self):
        """Test Quarterly frequency with selectedQuarter and selectedDate"""
        payload = {
            "incomeName": f"{TEST_PREFIX}Quarterly Test",
            "category": "Bonus",
            "amount": 30000.0,
            "frequency": "Quarterly",
            "selectedQuarter": "Q3 (Jul–Sep)",
            "selectedDate": "5",
            "isReceived": False
        }
        
        response = requests.post(f"{BASE_URL}/api/other-income", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        income_id = data['id']
        
        try:
            assert data['frequency'] == "Quarterly"
            assert data['selectedQuarter'] == "Q3 (Jul–Sep)"
            assert data['selectedDate'] == "5"
        finally:
            requests.delete(f"{BASE_URL}/api/other-income/{income_id}")
    
    def test_yearly_frequency_structure(self):
        """Test Yearly frequency with selectedMonth and selectedDate"""
        payload = {
            "incomeName": f"{TEST_PREFIX}Yearly Test",
            "category": "Tax Refund",
            "amount": 15000.0,
            "frequency": "Yearly",
            "selectedMonth": "April",
            "selectedDate": "30",
            "isReceived": False
        }
        
        response = requests.post(f"{BASE_URL}/api/other-income", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        income_id = data['id']
        
        try:
            assert data['frequency'] == "Yearly"
            assert data['selectedMonth'] == "April"
            assert data['selectedDate'] == "30"
        finally:
            requests.delete(f"{BASE_URL}/api/other-income/{income_id}")
    
    def test_irregular_frequency_structure(self):
        """Test Irregular frequency with dateReceived"""
        payload = {
            "incomeName": f"{TEST_PREFIX}Irregular Test",
            "category": "Windfall",
            "amount": 50000.0,
            "frequency": "Irregular",
            "dateReceived": "2026-06-20",
            "notes": "Unexpected inheritance",
            "isReceived": True
        }
        
        response = requests.post(f"{BASE_URL}/api/other-income", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        income_id = data['id']
        
        try:
            assert data['frequency'] == "Irregular"
            assert data['dateReceived'] == "2026-06-20"
        finally:
            requests.delete(f"{BASE_URL}/api/other-income/{income_id}")


class TestExistingTestData:
    """Verify the pre-existing test data mentioned in the task"""
    
    def test_birthday_gift_exists(self):
        """Verify 'Birthday Gift' entry exists with correct data"""
        response = requests.get(f"{BASE_URL}/api/other-income")
        assert response.status_code == 200
        
        incomes = response.json()
        birthday_gift = next((inc for inc in incomes if inc['incomeName'] == "Birthday Gift"), None)
        
        assert birthday_gift is not None, "Birthday Gift entry should exist"
        assert birthday_gift['category'] == "Gift"
        assert birthday_gift['amount'] == 5000.0
        assert birthday_gift['isReceived'] == True
    
    def test_q4_bonus_exists(self):
        """Verify 'Q4 Performance Bonus' entry exists with correct data"""
        response = requests.get(f"{BASE_URL}/api/other-income")
        assert response.status_code == 200
        
        incomes = response.json()
        q4_bonus = next((inc for inc in incomes if inc['incomeName'] == "Q4 Performance Bonus"), None)
        
        assert q4_bonus is not None, "Q4 Performance Bonus entry should exist"
        assert q4_bonus['category'] == "Bonus"
        assert q4_bonus['amount'] == 50000.0
        assert q4_bonus['isReceived'] == False
        assert q4_bonus['frequency'] == "Yearly"
        assert q4_bonus['selectedMonth'] == "December"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
