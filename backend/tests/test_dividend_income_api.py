"""
Test Dividend Income API - Tests for Dividend Income module CRUD operations
Tests sourceCategory (Direct Stocks, Mutual Funds IDCW, REITs, InvITs, Others), 
units (optional decimal), frequency options (Quarterly, Half-Yearly, Yearly, Irregular)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDividendIncomeAPI:
    """Dividend Income endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup_method(self, request):
        """Setup and teardown for each test"""
        self.created_ids = []
        yield
        # Cleanup test data after each test
        for income_id in self.created_ids:
            try:
                requests.delete(f"{BASE_URL}/api/income/{income_id}")
            except:
                pass
    
    def test_create_dividend_direct_stocks_quarterly(self):
        """Test creating dividend income with Direct Stocks category and Quarterly frequency"""
        payload = {
            "type": "Dividend",
            "sourceCategory": "Direct Stocks",
            "name": "TEST_TCS_Dividend",
            "expectedAmount": 5000,
            "frequency": "Quarterly",
            "selectedQuarter": "Q1 (Jan–Mar)",
            "selectedDate": "15",
            "units": 100.5
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        self.created_ids.append(data['id'])
        
        # Validate response structure and values
        assert data['type'] == "Dividend"
        assert data['sourceCategory'] == "Direct Stocks"
        assert data['name'] == "TEST_TCS_Dividend"
        assert data['expectedAmount'] == 5000
        assert data['frequency'] == "Quarterly"
        assert data['selectedQuarter'] == "Q1 (Jan–Mar)"
        assert data['selectedDate'] == "15"
        assert data['units'] == 100.5
        assert 'id' in data
        
        # GET to verify persistence
        get_response = requests.get(f"{BASE_URL}/api/income/{data['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched['sourceCategory'] == "Direct Stocks"
        assert fetched['units'] == 100.5
    
    def test_create_dividend_mutual_funds_idcw_half_yearly(self):
        """Test creating dividend with Mutual Funds (IDCW) category and Half-Yearly frequency"""
        payload = {
            "type": "Dividend",
            "sourceCategory": "Mutual Funds (IDCW)",
            "name": "TEST_HDFC_IDCW_Fund",
            "expectedAmount": 10000,
            "frequency": "Half-Yearly",
            "selectedHalf": "Jan–Jun",
            "selectedDate": "20"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        self.created_ids.append(data['id'])
        
        assert data['sourceCategory'] == "Mutual Funds (IDCW)"
        assert data['frequency'] == "Half-Yearly"
        assert data['selectedHalf'] == "Jan–Jun"
        assert data['units'] is None  # Optional field not provided
    
    def test_create_dividend_reits_yearly(self):
        """Test creating dividend with REITs category (should show info note in UI) and Yearly frequency"""
        payload = {
            "type": "Dividend",
            "sourceCategory": "REITs",
            "name": "TEST_Embassy_REIT",
            "expectedAmount": 25000,
            "frequency": "Yearly",
            "selectedMonth": "March",
            "selectedDate": "31",
            "units": 500
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        self.created_ids.append(data['id'])
        
        assert data['sourceCategory'] == "REITs"
        assert data['frequency'] == "Yearly"
        assert data['selectedMonth'] == "March"
        assert data['units'] == 500
    
    def test_create_dividend_invits_irregular(self):
        """Test creating dividend with InvITs category and Irregular frequency"""
        payload = {
            "type": "Dividend",
            "sourceCategory": "InvITs",
            "name": "TEST_IRB_InvIT",
            "expectedAmount": 15000,
            "frequency": "Irregular",
            "customDate": "2026-04-15"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        self.created_ids.append(data['id'])
        
        assert data['sourceCategory'] == "InvITs"
        assert data['frequency'] == "Irregular"
        assert data['customDate'] == "2026-04-15"
    
    def test_create_dividend_others_category(self):
        """Test creating dividend with Others category"""
        payload = {
            "type": "Dividend",
            "sourceCategory": "Others",
            "name": "TEST_Other_Dividend",
            "expectedAmount": 3000,
            "frequency": "Quarterly",
            "selectedQuarter": "Q3 (Jul–Sep)",
            "selectedDate": "10"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        self.created_ids.append(data['id'])
        
        assert data['sourceCategory'] == "Others"
    
    def test_create_dividend_decimal_units(self):
        """Test creating dividend with decimal units value"""
        payload = {
            "type": "Dividend",
            "sourceCategory": "Direct Stocks",
            "name": "TEST_Decimal_Units_Stock",
            "expectedAmount": 7500,
            "frequency": "Quarterly",
            "selectedQuarter": "Q2 (Apr–Jun)",
            "selectedDate": "5",
            "units": 123.456
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        self.created_ids.append(data['id'])
        
        assert data['units'] == 123.456
        assert isinstance(data['units'], float)
    
    def test_create_dividend_without_units(self):
        """Test creating dividend without optional units field"""
        payload = {
            "type": "Dividend",
            "sourceCategory": "Direct Stocks",
            "name": "TEST_No_Units_Stock",
            "expectedAmount": 2000,
            "frequency": "Yearly",
            "selectedMonth": "June",
            "selectedDate": "1"
        }
        
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        self.created_ids.append(data['id'])
        
        assert data['units'] is None
    
    def test_get_all_income_and_filter_dividends(self):
        """Test getting all income and filtering dividend type"""
        # Create a test dividend
        payload = {
            "type": "Dividend",
            "sourceCategory": "Direct Stocks",
            "name": "TEST_Filter_Dividend",
            "expectedAmount": 1000,
            "frequency": "Quarterly",
            "selectedQuarter": "Q1 (Jan–Mar)",
            "selectedDate": "1"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert create_response.status_code == 200
        data = create_response.json()
        self.created_ids.append(data['id'])
        
        # Get all income and filter
        get_response = requests.get(f"{BASE_URL}/api/income")
        assert get_response.status_code == 200
        
        all_income = get_response.json()
        dividends = [item for item in all_income if item['type'] == 'Dividend']
        
        assert len(dividends) >= 1
        assert any(d['name'] == 'TEST_Filter_Dividend' for d in dividends)
    
    def test_update_dividend_change_category(self):
        """Test updating dividend - change category and frequency"""
        # Create initial dividend
        create_payload = {
            "type": "Dividend",
            "sourceCategory": "Direct Stocks",
            "name": "TEST_Update_Dividend",
            "expectedAmount": 5000,
            "frequency": "Quarterly",
            "selectedQuarter": "Q1 (Jan–Mar)",
            "selectedDate": "10"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/income", json=create_payload)
        assert create_response.status_code == 200
        created = create_response.json()
        self.created_ids.append(created['id'])
        
        # Update to different category and frequency
        update_payload = {
            "type": "Dividend",
            "sourceCategory": "REITs",
            "name": "TEST_Update_Dividend_Modified",
            "expectedAmount": 8000,
            "frequency": "Half-Yearly",
            "selectedHalf": "Jul–Dec",
            "selectedDate": "25",
            "units": 200
        }
        
        update_response = requests.put(f"{BASE_URL}/api/income/{created['id']}", json=update_payload)
        assert update_response.status_code == 200
        
        updated = update_response.json()
        assert updated['sourceCategory'] == "REITs"
        assert updated['name'] == "TEST_Update_Dividend_Modified"
        assert updated['expectedAmount'] == 8000
        assert updated['frequency'] == "Half-Yearly"
        assert updated['units'] == 200
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/income/{created['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched['sourceCategory'] == "REITs"
    
    def test_delete_dividend(self):
        """Test deleting a dividend income"""
        # Create dividend to delete
        payload = {
            "type": "Dividend",
            "sourceCategory": "Mutual Funds (IDCW)",
            "name": "TEST_Delete_Dividend",
            "expectedAmount": 3000,
            "frequency": "Yearly",
            "selectedMonth": "December",
            "selectedDate": "15"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert create_response.status_code == 200
        created = create_response.json()
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/income/{created['id']}")
        assert delete_response.status_code == 200
        
        # Verify deleted
        get_response = requests.get(f"{BASE_URL}/api/income/{created['id']}")
        assert get_response.status_code == 404
    
    def test_get_nonexistent_dividend_returns_404(self):
        """Test getting non-existent dividend returns 404"""
        response = requests.get(f"{BASE_URL}/api/income/nonexistent-uuid-12345")
        assert response.status_code == 404
    
    def test_all_source_categories(self):
        """Test all 5 source category options work correctly"""
        categories = [
            "Direct Stocks",
            "Mutual Funds (IDCW)",
            "REITs",
            "InvITs",
            "Others"
        ]
        
        for category in categories:
            payload = {
                "type": "Dividend",
                "sourceCategory": category,
                "name": f"TEST_Category_{category.replace(' ', '_').replace('(', '').replace(')', '')}",
                "expectedAmount": 1000,
                "frequency": "Quarterly",
                "selectedQuarter": "Q1 (Jan–Mar)",
                "selectedDate": "1"
            }
            
            response = requests.post(f"{BASE_URL}/api/income", json=payload)
            assert response.status_code == 200, f"Failed for category: {category}"
            
            data = response.json()
            self.created_ids.append(data['id'])
            assert data['sourceCategory'] == category
    
    def test_all_frequency_types_for_dividend(self):
        """Test all 4 frequency types: Quarterly, Half-Yearly, Yearly, Irregular"""
        test_cases = [
            {
                "frequency": "Quarterly",
                "selectedQuarter": "Q2 (Apr–Jun)",
                "selectedDate": "5"
            },
            {
                "frequency": "Half-Yearly",
                "selectedHalf": "Jan–Jun",
                "selectedDate": "10"
            },
            {
                "frequency": "Yearly",
                "selectedMonth": "September",
                "selectedDate": "20"
            },
            {
                "frequency": "Irregular",
                "customDate": "2026-06-30"
            }
        ]
        
        for i, freq_data in enumerate(test_cases):
            payload = {
                "type": "Dividend",
                "sourceCategory": "Direct Stocks",
                "name": f"TEST_Freq_{freq_data['frequency']}_{i}",
                "expectedAmount": 1000 * (i + 1),
                **freq_data
            }
            
            response = requests.post(f"{BASE_URL}/api/income", json=payload)
            assert response.status_code == 200, f"Failed for frequency: {freq_data['frequency']}"
            
            data = response.json()
            self.created_ids.append(data['id'])
            assert data['frequency'] == freq_data['frequency']


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
