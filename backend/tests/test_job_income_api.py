"""
Backend API Tests for Job Income Module
Tests all CRUD operations for Job income entries
"""

import pytest
import requests
import os
import uuid

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAPIHealth:
    """Health check tests"""
    
    def test_api_root_endpoint(self):
        """Test that API root is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"API root response: {data}")


class TestJobIncomeCRUD:
    """Job Income CRUD operations tests"""
    
    def test_create_job_income_monthly(self):
        """Test creating a job income with monthly frequency"""
        payload = {
            "type": "Job",
            "name": f"TEST_Monthly_Job_{uuid.uuid4().hex[:8]}",
            "expectedAmount": 50000,
            "frequency": "Monthly",
            "selectedDate": "2026-02-15"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["type"] == "Job"
        assert data["name"] == payload["name"]
        assert data["expectedAmount"] == 50000
        assert data["frequency"] == "Monthly"
        assert data["selectedDate"] == "2026-02-15"
        assert "id" in data
        print(f"Created job income: {data['id']}")
        
        # Return ID for cleanup
        return data["id"]
    
    def test_create_job_income_weekly(self):
        """Test creating a job income with weekly frequency"""
        payload = {
            "type": "Job",
            "name": f"TEST_Weekly_Job_{uuid.uuid4().hex[:8]}",
            "expectedAmount": 25000,
            "frequency": "Weekly",
            "selectedDay": "Friday"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["type"] == "Job"
        assert data["frequency"] == "Weekly"
        assert data["selectedDay"] == "Friday"
        print(f"Created weekly job income: {data['id']}")
        return data["id"]
    
    def test_create_job_income_quarterly(self):
        """Test creating a job income with quarterly frequency"""
        payload = {
            "type": "Job",
            "name": f"TEST_Quarterly_Job_{uuid.uuid4().hex[:8]}",
            "expectedAmount": 150000,
            "frequency": "Quarterly",
            "selectedQuarter": "Q1 (Jan–Mar)",
            "selectedMonth": "February",
            "selectedDate": "2026-02-15"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["frequency"] == "Quarterly"
        assert data["selectedQuarter"] == "Q1 (Jan–Mar)"
        assert data["selectedMonth"] == "February"
        print(f"Created quarterly job income: {data['id']}")
        return data["id"]
    
    def test_get_all_income_sources(self):
        """Test getting all income sources"""
        response = requests.get(f"{BASE_URL}/api/income")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Total income sources: {len(data)}")
        
        # Check if Job type entries exist
        job_entries = [item for item in data if item.get("type") == "Job"]
        print(f"Job entries: {len(job_entries)}")
    
    def test_create_and_get_job_income(self):
        """Test create + GET verification pattern"""
        # Create a new job
        payload = {
            "type": "Job",
            "name": f"TEST_Verify_Job_{uuid.uuid4().hex[:8]}",
            "expectedAmount": 75000,
            "frequency": "Monthly",
            "selectedDate": "2026-03-01"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert create_response.status_code == 200
        created = create_response.json()
        job_id = created["id"]
        
        # GET to verify persistence
        get_response = requests.get(f"{BASE_URL}/api/income/{job_id}")
        assert get_response.status_code == 200
        
        fetched = get_response.json()
        assert fetched["id"] == job_id
        assert fetched["name"] == payload["name"]
        assert fetched["expectedAmount"] == payload["expectedAmount"]
        assert fetched["frequency"] == payload["frequency"]
        print(f"Verified job income persisted: {job_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/income/{job_id}")
        return job_id
    
    def test_update_job_income(self):
        """Test updating a job income entry"""
        # First create a job
        create_payload = {
            "type": "Job",
            "name": f"TEST_Update_Job_{uuid.uuid4().hex[:8]}",
            "expectedAmount": 40000,
            "frequency": "Monthly",
            "selectedDate": "2026-02-10"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/income", json=create_payload)
        assert create_response.status_code == 200
        job_id = create_response.json()["id"]
        
        # Update the job
        update_payload = {
            "type": "Job",
            "name": create_payload["name"],
            "expectedAmount": 60000,  # Updated amount
            "frequency": "Weekly",    # Changed frequency
            "selectedDay": "Monday"
        }
        
        update_response = requests.put(f"{BASE_URL}/api/income/{job_id}", json=update_payload)
        assert update_response.status_code == 200
        
        updated = update_response.json()
        assert updated["expectedAmount"] == 60000
        assert updated["frequency"] == "Weekly"
        assert updated["selectedDay"] == "Monday"
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/income/{job_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["expectedAmount"] == 60000
        assert fetched["frequency"] == "Weekly"
        
        print(f"Successfully updated job income: {job_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/income/{job_id}")
        return job_id
    
    def test_delete_job_income(self):
        """Test deleting a job income entry"""
        # First create a job
        create_payload = {
            "type": "Job",
            "name": f"TEST_Delete_Job_{uuid.uuid4().hex[:8]}",
            "expectedAmount": 30000,
            "frequency": "Daily"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/income", json=create_payload)
        assert create_response.status_code == 200
        job_id = create_response.json()["id"]
        
        # Delete the job
        delete_response = requests.delete(f"{BASE_URL}/api/income/{job_id}")
        assert delete_response.status_code == 200
        
        delete_data = delete_response.json()
        assert "message" in delete_data
        assert delete_data["id"] == job_id
        
        # Verify deletion with GET (should return 404)
        get_response = requests.get(f"{BASE_URL}/api/income/{job_id}")
        assert get_response.status_code == 404
        
        print(f"Successfully deleted job income: {job_id}")
    
    def test_get_nonexistent_job_returns_404(self):
        """Test getting a non-existent job returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/income/{fake_id}")
        assert response.status_code == 404
        print("Correctly returned 404 for non-existent job")
    
    def test_update_nonexistent_job_returns_404(self):
        """Test updating a non-existent job returns 404"""
        fake_id = str(uuid.uuid4())
        payload = {
            "type": "Job",
            "name": "Non-existent Job",
            "expectedAmount": 10000,
            "frequency": "Monthly"
        }
        response = requests.put(f"{BASE_URL}/api/income/{fake_id}", json=payload)
        assert response.status_code == 404
        print("Correctly returned 404 for updating non-existent job")
    
    def test_delete_nonexistent_job_returns_404(self):
        """Test deleting a non-existent job returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/income/{fake_id}")
        assert response.status_code == 404
        print("Correctly returned 404 for deleting non-existent job")


class TestJobIncomeValidation:
    """Validation tests for job income entries"""
    
    def test_create_job_with_all_frequencies(self):
        """Test creating jobs with all frequency options"""
        frequencies = [
            {"frequency": "Daily"},
            {"frequency": "Weekly", "selectedDay": "Monday"},
            {"frequency": "Monthly", "selectedDate": "2026-02-15"},
            {"frequency": "Quarterly", "selectedQuarter": "Q1 (Jan–Mar)", "selectedMonth": "January", "selectedDate": "2026-01-15"},
            {"frequency": "Half-Yearly", "selectedHalf": "Jan–Jun", "selectedMonth": "March", "selectedDate": "2026-03-15"},
            {"frequency": "Yearly", "selectedMonth": "December", "selectedDate": "2026-12-25"},
            {"frequency": "Others", "customFrequency": "Every 2 weeks", "customDate": "2026-02-20"}
        ]
        
        created_ids = []
        for freq_config in frequencies:
            payload = {
                "type": "Job",
                "name": f"TEST_{freq_config['frequency']}_Job_{uuid.uuid4().hex[:6]}",
                "expectedAmount": 10000,
                **freq_config
            }
            
            response = requests.post(f"{BASE_URL}/api/income", json=payload)
            assert response.status_code == 200, f"Failed for frequency: {freq_config['frequency']}"
            
            data = response.json()
            assert data["frequency"] == freq_config["frequency"]
            created_ids.append(data["id"])
            print(f"Created job with frequency: {freq_config['frequency']}")
        
        # Cleanup all created jobs
        for job_id in created_ids:
            requests.delete(f"{BASE_URL}/api/income/{job_id}")
        
        print(f"All {len(frequencies)} frequency types tested and cleaned up")


# Cleanup fixture
@pytest.fixture(autouse=True, scope="module")
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests complete"""
    yield
    # Teardown: Delete all test-created data
    try:
        response = requests.get(f"{BASE_URL}/api/income")
        if response.status_code == 200:
            all_income = response.json()
            test_entries = [item for item in all_income if item.get("name", "").startswith("TEST_")]
            for entry in test_entries:
                requests.delete(f"{BASE_URL}/api/income/{entry['id']}")
            if test_entries:
                print(f"Cleaned up {len(test_entries)} test entries")
    except Exception as e:
        print(f"Cleanup error: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
