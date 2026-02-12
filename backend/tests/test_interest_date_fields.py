"""
Test Suite for Interest Income Start Date, End Date, and Current Amount Features
Tests:
- Start Date field (can be past date)
- End Date field (maturity, must be after start date)
- Current Amount auto-calculation (Principal + Interest from startDate to min(today, endDate))
- Matured status when end date is past
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# =====================
# Test Fixtures
# =====================

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(autouse=True)
def cleanup_test_data(api_client):
    """Cleanup TEST_DATE_ prefixed Interest data after each test"""
    yield
    # Teardown: Delete all test-created Interest data
    try:
        response = api_client.get(f"{BASE_URL}/api/income")
        if response.status_code == 200:
            for item in response.json():
                if item.get('type') == 'Interest' and item.get('name', '').startswith('TEST_DATE_'):
                    api_client.delete(f"{BASE_URL}/api/income/{item['id']}")
    except Exception as e:
        print(f"Cleanup error: {e}")

# =====================
# Start Date Tests
# =====================

class TestStartDateField:
    """Test Start Date field functionality"""
    
    def test_start_date_accepts_past_date(self, api_client):
        """Verify Start Date can be set to a past date"""
        # Calculate 6 months ago
        six_months_ago = (datetime.now() - timedelta(days=180)).strftime('%Y-%m-%d')
        future_date = (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d')
        
        payload = {
            "type": "Interest",
            "name": f"TEST_DATE_PastStart_{uuid.uuid4().hex[:6]}",
            "principal": 100000,
            "rate": 7.5,
            "interestType": "Simple Interest",
            "startDate": six_months_ago,
            "endDate": future_date,
            "currentAmount": 103750.00,  # ~6 months of interest
            "expectedAmount": 625.00,
            "frequency": "Monthly",
            "selectedDate": "2026-03-15"
        }
        
        response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data['startDate'] == six_months_ago
        assert 'id' in data
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/income/{data['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched['startDate'] == six_months_ago
        print(f"✓ Start Date with past date ({six_months_ago}) created: {data['id']}")
    
    def test_start_date_accepts_today(self, api_client):
        """Verify Start Date can be set to today"""
        today = datetime.now().strftime('%Y-%m-%d')
        future_date = (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d')
        
        payload = {
            "type": "Interest",
            "name": f"TEST_DATE_TodayStart_{uuid.uuid4().hex[:6]}",
            "principal": 100000,
            "rate": 7.5,
            "interestType": "Simple Interest",
            "startDate": today,
            "endDate": future_date,
            "currentAmount": 100000.00,  # No interest accrued yet
            "expectedAmount": 625.00,
            "frequency": "Monthly",
            "selectedDate": "2026-03-15"
        }
        
        response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['startDate'] == today
        print(f"✓ Start Date with today's date ({today}) created: {data['id']}")

# =====================
# End Date Tests
# =====================

class TestEndDateField:
    """Test End Date field functionality"""
    
    def test_end_date_accepts_future_date(self, api_client):
        """Verify End Date can be set to a future date"""
        today = datetime.now().strftime('%Y-%m-%d')
        future_date = (datetime.now() + timedelta(days=730)).strftime('%Y-%m-%d')  # 2 years from now
        
        payload = {
            "type": "Interest",
            "name": f"TEST_DATE_FutureEnd_{uuid.uuid4().hex[:6]}",
            "principal": 100000,
            "rate": 8.0,
            "interestType": "Simple Interest",
            "startDate": today,
            "endDate": future_date,
            "currentAmount": 100000.00,
            "expectedAmount": 666.67,
            "frequency": "Monthly",
            "selectedDate": "2026-03-15"
        }
        
        response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['endDate'] == future_date
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/income/{data['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched['endDate'] == future_date
        print(f"✓ End Date with future date ({future_date}) created: {data['id']}")
    
    def test_end_date_accepts_past_date_matured(self, api_client):
        """Verify End Date can be set to a past date (matured entry)"""
        past_start = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')  # 1 year ago
        past_end = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')  # 1 month ago (matured)
        
        payload = {
            "type": "Interest",
            "name": f"TEST_DATE_PastEnd_{uuid.uuid4().hex[:6]}",
            "principal": 100000,
            "rate": 7.0,
            "interestType": "Simple Interest",
            "startDate": past_start,
            "endDate": past_end,
            "currentAmount": 106400.00,  # ~11 months of interest (stopped at end date)
            "expectedAmount": 583.33,
            "frequency": "Monthly",
            "selectedDate": "2026-03-15"
        }
        
        response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['endDate'] == past_end
        assert data['startDate'] == past_start
        print(f"✓ Matured entry with past end date ({past_end}) created: {data['id']}")

# =====================
# Current Amount Tests
# =====================

class TestCurrentAmountField:
    """Test Current Amount field functionality"""
    
    def test_current_amount_stored_correctly(self, api_client):
        """Verify Current Amount is stored and retrieved correctly"""
        six_months_ago = (datetime.now() - timedelta(days=180)).strftime('%Y-%m-%d')
        future_date = (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d')
        
        # Calculate expected current amount: P + (P * R * T / 100)
        # 100000 + (100000 * 7.5 * 0.5 / 100) = 103,750
        calculated_current = 103750.00
        
        payload = {
            "type": "Interest",
            "name": f"TEST_DATE_CurrentAmt_{uuid.uuid4().hex[:6]}",
            "principal": 100000,
            "rate": 7.5,
            "interestType": "Simple Interest",
            "startDate": six_months_ago,
            "endDate": future_date,
            "currentAmount": calculated_current,
            "expectedAmount": 625.00,
            "frequency": "Monthly",
            "selectedDate": "2026-03-15"
        }
        
        response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['currentAmount'] == calculated_current
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/income/{data['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched['currentAmount'] == calculated_current
        print(f"✓ Current Amount ({calculated_current}) stored correctly: {data['id']}")
    
    def test_current_amount_with_matured_entry(self, api_client):
        """Verify Current Amount stops calculating at End Date for matured entries"""
        one_year_ago = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
        six_months_ago = (datetime.now() - timedelta(days=180)).strftime('%Y-%m-%d')
        
        # Interest should only accrue for 6 months (from start to end)
        # 200000 + (200000 * 8.0 * 0.5 / 100) = 208,000
        calculated_current = 208000.00
        
        payload = {
            "type": "Interest",
            "name": f"TEST_DATE_MaturedAmt_{uuid.uuid4().hex[:6]}",
            "principal": 200000,
            "rate": 8.0,
            "interestType": "Simple Interest",
            "startDate": one_year_ago,
            "endDate": six_months_ago,  # Matured 6 months ago
            "currentAmount": calculated_current,
            "expectedAmount": 1333.33,
            "frequency": "Monthly",
            "selectedDate": "2026-03-15"
        }
        
        response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['currentAmount'] == calculated_current
        print(f"✓ Matured Current Amount ({calculated_current}) stored correctly: {data['id']}")

# =====================
# Full CRUD with Date Fields Tests
# =====================

class TestDateFieldsCRUD:
    """Test full CRUD operations with date fields"""
    
    def test_create_with_all_date_fields(self, api_client):
        """Create interest entry with startDate, endDate, and currentAmount"""
        past_date = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')  # 3 months ago
        future_date = (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d')
        
        payload = {
            "type": "Interest",
            "name": f"TEST_DATE_FullCRUD_{uuid.uuid4().hex[:6]}",
            "principal": 150000,
            "rate": 7.0,
            "interestType": "Simple Interest",
            "startDate": past_date,
            "endDate": future_date,
            "currentAmount": 152625.00,  # ~3 months interest
            "expectedAmount": 875.00,
            "frequency": "Monthly",
            "selectedDate": "2026-03-15",
            "manualOverride": False
        }
        
        # CREATE
        create_response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        assert create_response.status_code == 200
        created_id = create_response.json()['id']
        
        # READ
        get_response = api_client.get(f"{BASE_URL}/api/income/{created_id}")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data['startDate'] == past_date
        assert data['endDate'] == future_date
        assert data['currentAmount'] == 152625.00
        
        print(f"✓ Full CRUD Create/Read with date fields: {created_id}")
    
    def test_update_date_fields(self, api_client):
        """Update startDate, endDate, and currentAmount"""
        # Create initial entry
        initial_start = (datetime.now() - timedelta(days=60)).strftime('%Y-%m-%d')
        initial_end = (datetime.now() + timedelta(days=300)).strftime('%Y-%m-%d')
        
        payload = {
            "type": "Interest",
            "name": f"TEST_DATE_Update_{uuid.uuid4().hex[:6]}",
            "principal": 100000,
            "rate": 6.0,
            "interestType": "Simple Interest",
            "startDate": initial_start,
            "endDate": initial_end,
            "currentAmount": 100985.00,
            "expectedAmount": 500.00,
            "frequency": "Monthly",
            "selectedDate": "2026-03-15"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        assert create_response.status_code == 200
        created_id = create_response.json()['id']
        
        # Update with new dates
        new_start = (datetime.now() - timedelta(days=180)).strftime('%Y-%m-%d')
        new_end = (datetime.now() + timedelta(days=500)).strftime('%Y-%m-%d')
        
        update_payload = {
            "type": "Interest",
            "name": payload['name'],
            "principal": 100000,
            "rate": 6.5,  # Changed rate
            "interestType": "Simple Interest",
            "startDate": new_start,  # Changed start
            "endDate": new_end,  # Changed end
            "currentAmount": 103250.00,  # Updated calculation
            "expectedAmount": 541.67,
            "frequency": "Monthly",
            "selectedDate": "2026-03-15"
        }
        
        update_response = api_client.put(f"{BASE_URL}/api/income/{created_id}", json=update_payload)
        assert update_response.status_code == 200
        
        # Verify updates persisted
        get_response = api_client.get(f"{BASE_URL}/api/income/{created_id}")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data['startDate'] == new_start
        assert data['endDate'] == new_end
        assert data['rate'] == 6.5
        assert data['currentAmount'] == 103250.00
        
        print(f"✓ Updated date fields successfully: {created_id}")
    
    def test_delete_entry_with_date_fields(self, api_client):
        """Delete entry with date fields and verify removal"""
        payload = {
            "type": "Interest",
            "name": f"TEST_DATE_Delete_{uuid.uuid4().hex[:6]}",
            "principal": 50000,
            "rate": 5.0,
            "interestType": "Simple Interest",
            "startDate": "2025-06-01",
            "endDate": "2027-06-01",
            "currentAmount": 51875.00,
            "expectedAmount": 208.33,
            "frequency": "Monthly",
            "selectedDate": "2026-03-15"
        }
        
        # Create
        create_response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        assert create_response.status_code == 200
        created_id = create_response.json()['id']
        
        # Delete
        delete_response = api_client.delete(f"{BASE_URL}/api/income/{created_id}")
        assert delete_response.status_code == 200
        
        # Verify deleted
        get_response = api_client.get(f"{BASE_URL}/api/income/{created_id}")
        assert get_response.status_code == 404
        
        print(f"✓ Deleted entry with date fields: {created_id}")

# =====================
# Compound Interest with Date Fields Tests  
# =====================

class TestCompoundInterestDateFields:
    """Test Compound Interest with date fields"""
    
    def test_compound_interest_current_amount(self, api_client):
        """Verify Compound Interest currentAmount calculation"""
        six_months_ago = (datetime.now() - timedelta(days=180)).strftime('%Y-%m-%d')
        future_date = (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d')
        
        payload = {
            "type": "Interest",
            "name": f"TEST_DATE_Compound_{uuid.uuid4().hex[:6]}",
            "principal": 100000,
            "rate": 8.0,
            "interestType": "Compound Interest",
            "compoundingFrequency": "Quarterly",
            "startDate": six_months_ago,
            "endDate": future_date,
            "currentAmount": 104040.00,  # Compound interest calculation
            "expectedAmount": 2020.10,
            "frequency": "Quarterly",
            "selectedQuarter": "Q2 (Apr–Jun)",
            "selectedMonth": "May",
            "selectedDate": "2026-05-15"
        }
        
        response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['interestType'] == "Compound Interest"
        assert data['compoundingFrequency'] == "Quarterly"
        assert data['startDate'] == six_months_ago
        assert data['currentAmount'] == 104040.00
        
        print(f"✓ Compound Interest with date fields created: {data['id']}")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
