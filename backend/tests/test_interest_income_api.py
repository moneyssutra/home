"""
Test Suite for Interest Income API
Tests all CRUD operations and Interest-specific fields:
- principal, rate, interestType, compoundingFrequency, manualOverride
- Auto-calculation of expectedAmount
- All frequency options (Monthly, Quarterly, Half-Yearly, Yearly, Others)
"""

import pytest
import requests
import os
import uuid

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
    """Cleanup TEST_ prefixed Interest data after each test"""
    yield
    # Teardown: Delete all test-created Interest data
    try:
        response = api_client.get(f"{BASE_URL}/api/income")
        if response.status_code == 200:
            for item in response.json():
                if item.get('type') == 'Interest' and item.get('name', '').startswith('TEST_'):
                    api_client.delete(f"{BASE_URL}/api/income/{item['id']}")
    except Exception as e:
        print(f"Cleanup error: {e}")

# =====================
# API Health Tests
# =====================

class TestAPIHealth:
    """Basic API health checks - run first"""
    
    def test_api_root_accessible(self, api_client):
        """Verify API root endpoint is accessible"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"API root response: {data}")
    
    def test_income_list_endpoint(self, api_client):
        """Verify income list endpoint is accessible"""
        response = api_client.get(f"{BASE_URL}/api/income")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"Found {len(response.json())} income sources")

# =====================
# Interest Income CRUD Tests
# =====================

class TestInterestIncomeCreate:
    """Test Interest income creation with all variations"""
    
    def test_create_simple_interest_monthly(self, api_client):
        """Create Simple Interest with Monthly frequency"""
        payload = {
            "type": "Interest",
            "name": f"TEST_FD_HDFC_{uuid.uuid4().hex[:6]}",
            "principal": 100000,
            "rate": 7.5,
            "interestType": "Simple Interest",
            "compoundingFrequency": None,
            "expectedAmount": 625.00,  # 100000 * 7.5% / 12
            "frequency": "Monthly",
            "selectedDate": "2026-03-15",
            "manualOverride": False
        }
        
        response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        
        # Status assertions
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data['type'] == "Interest"
        assert data['name'] == payload['name']
        assert data['principal'] == 100000
        assert data['rate'] == 7.5
        assert data['interestType'] == "Simple Interest"
        assert data['frequency'] == "Monthly"
        assert data['manualOverride'] == False
        assert 'id' in data
        
        # Verify persistence with GET
        get_response = api_client.get(f"{BASE_URL}/api/income/{data['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched['name'] == payload['name']
        assert fetched['principal'] == 100000
        print(f"Created Simple Interest Monthly: {data['id']}")
    
    def test_create_compound_interest_quarterly(self, api_client):
        """Create Compound Interest with Quarterly frequency and compounding"""
        payload = {
            "type": "Interest",
            "name": f"TEST_RD_SBI_{uuid.uuid4().hex[:6]}",
            "principal": 500000,
            "rate": 8.0,
            "interestType": "Compound Interest",
            "compoundingFrequency": "Quarterly",
            "expectedAmount": 10206.04,  # Compound interest formula result / 4
            "frequency": "Quarterly",
            "selectedQuarter": "Q2 (Apr–Jun)",
            "selectedMonth": "May",
            "selectedDate": "2026-05-10",
            "manualOverride": False
        }
        
        response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['interestType'] == "Compound Interest"
        assert data['compoundingFrequency'] == "Quarterly"
        assert data['frequency'] == "Quarterly"
        assert data['selectedQuarter'] == "Q2 (Apr–Jun)"
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/income/{data['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched['compoundingFrequency'] == "Quarterly"
        print(f"Created Compound Interest Quarterly: {data['id']}")
    
    def test_create_interest_half_yearly(self, api_client):
        """Create Interest with Half-Yearly frequency"""
        payload = {
            "type": "Interest",
            "name": f"TEST_Bond_{uuid.uuid4().hex[:6]}",
            "principal": 200000,
            "rate": 9.0,
            "interestType": "Simple Interest",
            "expectedAmount": 9000.00,  # 200000 * 9% / 2
            "frequency": "Half-Yearly",
            "selectedHalf": "Jan–Jun",
            "selectedMonth": "March",
            "selectedDate": "2026-03-25",
            "manualOverride": False
        }
        
        response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['frequency'] == "Half-Yearly"
        assert data['selectedHalf'] == "Jan–Jun"
        print(f"Created Half-Yearly Interest: {data['id']}")
    
    def test_create_interest_yearly(self, api_client):
        """Create Interest with Yearly frequency"""
        payload = {
            "type": "Interest",
            "name": f"TEST_PPF_{uuid.uuid4().hex[:6]}",
            "principal": 150000,
            "rate": 7.1,
            "interestType": "Compound Interest",
            "compoundingFrequency": "Yearly",
            "expectedAmount": 10650.00,  # 150000 * 7.1%
            "frequency": "Yearly",
            "selectedMonth": "April",
            "selectedDate": "2026-04-01",
            "manualOverride": False
        }
        
        response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['frequency'] == "Yearly"
        assert data['selectedMonth'] == "April"
        print(f"Created Yearly Interest: {data['id']}")
    
    def test_create_interest_with_manual_override(self, api_client):
        """Create Interest with manual override enabled"""
        payload = {
            "type": "Interest",
            "name": f"TEST_Loan_{uuid.uuid4().hex[:6]}",
            "principal": 300000,
            "rate": 12.0,
            "interestType": "Simple Interest",
            "expectedAmount": 5000.00,  # Manually overridden value
            "frequency": "Monthly",
            "selectedDate": "2026-02-28",
            "manualOverride": True
        }
        
        response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['manualOverride'] == True
        assert data['expectedAmount'] == 5000.00
        print(f"Created Interest with Manual Override: {data['id']}")
    
    def test_create_interest_others_frequency(self, api_client):
        """Create Interest with Others (custom) frequency"""
        payload = {
            "type": "Interest",
            "name": f"TEST_Custom_{uuid.uuid4().hex[:6]}",
            "principal": 50000,
            "rate": 6.5,
            "interestType": "Simple Interest",
            "expectedAmount": 3250.00,
            "frequency": "Others",
            "customFrequency": "Every 2 months",
            "customDate": "2026-04-15",
            "manualOverride": True
        }
        
        response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['frequency'] == "Others"
        assert data['customFrequency'] == "Every 2 months"
        assert data['customDate'] == "2026-04-15"
        print(f"Created Interest with Custom Frequency: {data['id']}")

# =====================
# Interest Income Read Tests
# =====================

class TestInterestIncomeRead:
    """Test reading Interest income entries"""
    
    def test_get_all_income_includes_interest(self, api_client):
        """Verify Interest type entries are included in list"""
        # First create an interest entry
        payload = {
            "type": "Interest",
            "name": f"TEST_Read_{uuid.uuid4().hex[:6]}",
            "principal": 100000,
            "rate": 8.0,
            "interestType": "Simple Interest",
            "expectedAmount": 666.67,
            "frequency": "Monthly",
            "selectedDate": "2026-03-01"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        assert create_response.status_code == 200
        created_id = create_response.json()['id']
        
        # Get all income sources
        response = api_client.get(f"{BASE_URL}/api/income")
        assert response.status_code == 200
        
        data = response.json()
        interest_entries = [item for item in data if item['type'] == 'Interest']
        assert len(interest_entries) >= 1, "Should have at least one Interest entry"
        
        # Find our created entry
        found = next((item for item in interest_entries if item['id'] == created_id), None)
        assert found is not None, "Created Interest entry not found in list"
        print(f"Found {len(interest_entries)} Interest entries")
    
    def test_get_single_interest_by_id(self, api_client):
        """Verify getting single Interest entry by ID"""
        # Create an entry
        payload = {
            "type": "Interest",
            "name": f"TEST_Single_{uuid.uuid4().hex[:6]}",
            "principal": 75000,
            "rate": 6.0,
            "interestType": "Compound Interest",
            "compoundingFrequency": "Monthly",
            "expectedAmount": 4635.00,
            "frequency": "Yearly",
            "selectedMonth": "December",
            "selectedDate": "2026-12-31"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        assert create_response.status_code == 200
        created_id = create_response.json()['id']
        
        # Get single entry
        response = api_client.get(f"{BASE_URL}/api/income/{created_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data['id'] == created_id
        assert data['type'] == "Interest"
        assert data['principal'] == 75000
        assert data['rate'] == 6.0
        assert data['interestType'] == "Compound Interest"
        assert data['compoundingFrequency'] == "Monthly"
        print(f"Successfully retrieved Interest by ID: {created_id}")
    
    def test_get_nonexistent_interest_returns_404(self, api_client):
        """Verify 404 for non-existent Interest ID"""
        fake_id = f"nonexistent-{uuid.uuid4().hex}"
        response = api_client.get(f"{BASE_URL}/api/income/{fake_id}")
        assert response.status_code == 404
        print("404 returned for non-existent ID as expected")

# =====================
# Interest Income Update Tests
# =====================

class TestInterestIncomeUpdate:
    """Test updating Interest income entries"""
    
    def test_update_interest_principal_and_rate(self, api_client):
        """Update principal and rate, verify persistence"""
        # Create entry
        payload = {
            "type": "Interest",
            "name": f"TEST_Update_{uuid.uuid4().hex[:6]}",
            "principal": 100000,
            "rate": 7.0,
            "interestType": "Simple Interest",
            "expectedAmount": 583.33,
            "frequency": "Monthly",
            "selectedDate": "2026-03-01"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        assert create_response.status_code == 200
        created_id = create_response.json()['id']
        
        # Update with new values
        update_payload = {
            "type": "Interest",
            "name": payload['name'],
            "principal": 150000,  # Updated
            "rate": 8.5,  # Updated
            "interestType": "Simple Interest",
            "expectedAmount": 1062.50,  # Updated calculation
            "frequency": "Monthly",
            "selectedDate": "2026-03-01"
        }
        
        update_response = api_client.put(f"{BASE_URL}/api/income/{created_id}", json=update_payload)
        assert update_response.status_code == 200
        
        updated_data = update_response.json()
        assert updated_data['principal'] == 150000
        assert updated_data['rate'] == 8.5
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/income/{created_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched['principal'] == 150000
        assert fetched['rate'] == 8.5
        print(f"Successfully updated Interest: {created_id}")
    
    def test_update_interest_type_to_compound(self, api_client):
        """Update from Simple to Compound Interest"""
        # Create Simple Interest entry
        payload = {
            "type": "Interest",
            "name": f"TEST_TypeChange_{uuid.uuid4().hex[:6]}",
            "principal": 200000,
            "rate": 7.5,
            "interestType": "Simple Interest",
            "compoundingFrequency": None,
            "expectedAmount": 1250.00,
            "frequency": "Monthly",
            "selectedDate": "2026-03-15"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        assert create_response.status_code == 200
        created_id = create_response.json()['id']
        
        # Update to Compound Interest
        update_payload = {
            "type": "Interest",
            "name": payload['name'],
            "principal": 200000,
            "rate": 7.5,
            "interestType": "Compound Interest",  # Changed
            "compoundingFrequency": "Monthly",  # Added
            "expectedAmount": 1295.22,  # Recalculated
            "frequency": "Monthly",
            "selectedDate": "2026-03-15"
        }
        
        update_response = api_client.put(f"{BASE_URL}/api/income/{created_id}", json=update_payload)
        assert update_response.status_code == 200
        
        updated_data = update_response.json()
        assert updated_data['interestType'] == "Compound Interest"
        assert updated_data['compoundingFrequency'] == "Monthly"
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/income/{created_id}")
        fetched = get_response.json()
        assert fetched['interestType'] == "Compound Interest"
        assert fetched['compoundingFrequency'] == "Monthly"
        print(f"Successfully changed Interest type to Compound: {created_id}")
    
    def test_update_nonexistent_returns_404(self, api_client):
        """Update non-existent Interest returns 404"""
        fake_id = f"nonexistent-{uuid.uuid4().hex}"
        update_payload = {
            "type": "Interest",
            "name": "Test",
            "principal": 100000,
            "rate": 5.0,
            "interestType": "Simple Interest",
            "expectedAmount": 416.67,
            "frequency": "Monthly",
            "selectedDate": "2026-03-01"
        }
        
        response = api_client.put(f"{BASE_URL}/api/income/{fake_id}", json=update_payload)
        assert response.status_code == 404
        print("404 returned for update of non-existent ID as expected")

# =====================
# Interest Income Delete Tests
# =====================

class TestInterestIncomeDelete:
    """Test deleting Interest income entries"""
    
    def test_delete_interest_and_verify_removal(self, api_client):
        """Delete Interest entry and verify it's removed"""
        # Create entry
        payload = {
            "type": "Interest",
            "name": f"TEST_Delete_{uuid.uuid4().hex[:6]}",
            "principal": 50000,
            "rate": 6.0,
            "interestType": "Simple Interest",
            "expectedAmount": 250.00,
            "frequency": "Monthly",
            "selectedDate": "2026-03-01"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        assert create_response.status_code == 200
        created_id = create_response.json()['id']
        
        # Verify it exists
        get_response = api_client.get(f"{BASE_URL}/api/income/{created_id}")
        assert get_response.status_code == 200
        
        # Delete it
        delete_response = api_client.delete(f"{BASE_URL}/api/income/{created_id}")
        assert delete_response.status_code == 200
        
        # Verify it's gone
        verify_response = api_client.get(f"{BASE_URL}/api/income/{created_id}")
        assert verify_response.status_code == 404
        print(f"Successfully deleted Interest: {created_id}")
    
    def test_delete_nonexistent_returns_404(self, api_client):
        """Delete non-existent Interest returns 404"""
        fake_id = f"nonexistent-{uuid.uuid4().hex}"
        response = api_client.delete(f"{BASE_URL}/api/income/{fake_id}")
        assert response.status_code == 404
        print("404 returned for delete of non-existent ID as expected")

# =====================
# Interest-Specific Field Validation Tests
# =====================

class TestInterestFieldValidation:
    """Test Interest-specific field handling"""
    
    def test_interest_fields_persisted_correctly(self, api_client):
        """Verify all Interest-specific fields are persisted"""
        payload = {
            "type": "Interest",
            "name": f"TEST_AllFields_{uuid.uuid4().hex[:6]}",
            "principal": 250000,
            "rate": 8.25,
            "interestType": "Compound Interest",
            "compoundingFrequency": "Half-Yearly",
            "expectedAmount": 10584.77,
            "frequency": "Quarterly",
            "selectedQuarter": "Q3 (Jul–Sep)",
            "selectedMonth": "August",
            "selectedDate": "2026-08-15",
            "manualOverride": True
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        assert create_response.status_code == 200
        created_id = create_response.json()['id']
        
        # Verify all fields persisted
        get_response = api_client.get(f"{BASE_URL}/api/income/{created_id}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data['principal'] == 250000
        assert data['rate'] == 8.25
        assert data['interestType'] == "Compound Interest"
        assert data['compoundingFrequency'] == "Half-Yearly"
        assert data['manualOverride'] == True
        assert data['selectedQuarter'] == "Q3 (Jul–Sep)"
        assert data['selectedMonth'] == "August"
        assert data['selectedDate'] == "2026-08-15"
        print(f"All Interest fields verified for: {created_id}")
    
    def test_simple_interest_no_compounding_frequency(self, api_client):
        """Simple Interest should not have compounding frequency"""
        payload = {
            "type": "Interest",
            "name": f"TEST_NoCompound_{uuid.uuid4().hex[:6]}",
            "principal": 100000,
            "rate": 7.0,
            "interestType": "Simple Interest",
            "compoundingFrequency": None,  # Should be null for simple
            "expectedAmount": 583.33,
            "frequency": "Monthly",
            "selectedDate": "2026-03-01"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/income", json=payload)
        assert create_response.status_code == 200
        created_id = create_response.json()['id']
        
        get_response = api_client.get(f"{BASE_URL}/api/income/{created_id}")
        data = get_response.json()
        assert data['compoundingFrequency'] is None
        print("Verified Simple Interest has no compounding frequency")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
