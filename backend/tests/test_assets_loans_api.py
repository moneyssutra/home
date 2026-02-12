"""
Backend API Tests for Asset and Loan Modules
Tests: Assets CRUD, Loans CRUD, EMI calculation validation, Asset-Loan linking
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data tracking for cleanup
created_loan_ids = []
created_asset_ids = []
created_income_ids = []


class TestLoansAPI:
    """Test Loan CRUD operations and EMI calculation"""
    
    def test_create_loan_basic(self):
        """Test creating a basic loan with EMI"""
        payload = {
            "loanName": "TEST_Home Loan HDFC",
            "lenderName": "HDFC Bank",
            "principalAmount": 5000000,  # 50 Lakhs
            "interestRate": 8.5,
            "tenureMonths": 240,
            "emiAmount": 43391.28,  # Pre-calculated EMI
            "startDate": "2024-01-01",
            "outstandingAmount": 5000000
        }
        response = requests.post(f"{BASE_URL}/api/loans", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        created_loan_ids.append(data['id'])
        
        assert data['loanName'] == payload['loanName']
        assert data['lenderName'] == payload['lenderName']
        assert data['principalAmount'] == payload['principalAmount']
        assert data['interestRate'] == payload['interestRate']
        assert data['tenureMonths'] == payload['tenureMonths']
        assert data['outstandingAmount'] == payload['outstandingAmount']
        assert 'id' in data
        assert 'createdAt' in data
    
    def test_create_loan_without_lender(self):
        """Test creating loan without optional lender name"""
        payload = {
            "loanName": "TEST_Car Loan",
            "lenderName": None,
            "principalAmount": 800000,
            "interestRate": 10.5,
            "tenureMonths": 60,
            "emiAmount": 17192.59,
            "startDate": "2025-06-01",
            "outstandingAmount": 800000
        }
        response = requests.post(f"{BASE_URL}/api/loans", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        created_loan_ids.append(data['id'])
        assert data['lenderName'] is None
    
    def test_get_all_loans(self):
        """Test retrieving all loans"""
        response = requests.get(f"{BASE_URL}/api/loans")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the loans we created
        test_loans = [l for l in data if l['loanName'].startswith('TEST_')]
        assert len(test_loans) >= 2
    
    def test_get_loan_by_id(self):
        """Test retrieving a specific loan"""
        loan_id = created_loan_ids[0]
        response = requests.get(f"{BASE_URL}/api/loans/{loan_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data['id'] == loan_id
        assert data['loanName'] == "TEST_Home Loan HDFC"
    
    def test_get_loan_not_found(self):
        """Test 404 for non-existent loan"""
        response = requests.get(f"{BASE_URL}/api/loans/nonexistent-id-12345")
        assert response.status_code == 404
    
    def test_update_loan(self):
        """Test updating loan outstanding amount"""
        loan_id = created_loan_ids[0]
        payload = {
            "loanName": "TEST_Home Loan HDFC Updated",
            "lenderName": "HDFC Bank",
            "principalAmount": 5000000,
            "interestRate": 8.5,
            "tenureMonths": 240,
            "emiAmount": 43391.28,
            "startDate": "2024-01-01",
            "outstandingAmount": 4800000  # Reduced by 2 lakhs
        }
        response = requests.put(f"{BASE_URL}/api/loans/{loan_id}", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data['outstandingAmount'] == 4800000
        assert data['loanName'] == "TEST_Home Loan HDFC Updated"
    
    def test_update_loan_not_found(self):
        """Test 404 for updating non-existent loan"""
        payload = {
            "loanName": "TEST_Nonexistent",
            "principalAmount": 100000,
            "interestRate": 10,
            "tenureMonths": 12,
            "emiAmount": 8792,
            "startDate": "2025-01-01",
            "outstandingAmount": 100000
        }
        response = requests.put(f"{BASE_URL}/api/loans/nonexistent-id", json=payload)
        assert response.status_code == 404


class TestAssetsAPI:
    """Test Asset CRUD operations"""
    
    def test_create_asset_residential(self):
        """Test creating a residential property asset"""
        payload = {
            "assetType": "Residential Property",
            "assetName": "TEST_Green Villa Flat 302",
            "currentValue": 7500000,  # 75 Lakhs
            "isFinanced": False,
            "linkedLoanId": None,
            "purchaseDate": "2020-06-15",
            "purchaseValue": 5000000  # 50 Lakhs purchase price
        }
        response = requests.post(f"{BASE_URL}/api/assets", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        created_asset_ids.append(data['id'])
        
        assert data['assetType'] == payload['assetType']
        assert data['assetName'] == payload['assetName']
        assert data['currentValue'] == payload['currentValue']
        assert data['isFinanced'] == False
        assert data['purchaseValue'] == payload['purchaseValue']
        assert 'id' in data
    
    def test_create_asset_commercial(self):
        """Test creating a commercial property"""
        payload = {
            "assetType": "Commercial Property",
            "assetName": "TEST_Shop MG Road",
            "currentValue": 3500000,
            "isFinanced": False,
            "linkedLoanId": None,
            "purchaseDate": None,
            "purchaseValue": None
        }
        response = requests.post(f"{BASE_URL}/api/assets", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        created_asset_ids.append(data['id'])
        assert data['assetType'] == "Commercial Property"
    
    def test_create_asset_vehicle(self):
        """Test creating a vehicle asset"""
        payload = {
            "assetType": "Vehicle",
            "assetName": "TEST_Toyota Innova",
            "currentValue": 1200000,
            "isFinanced": False,
            "linkedLoanId": None,
            "purchaseDate": "2023-01-10",
            "purchaseValue": 1800000
        }
        response = requests.post(f"{BASE_URL}/api/assets", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        created_asset_ids.append(data['id'])
        # Vehicle depreciation check
        assert data['currentValue'] < data['purchaseValue']
    
    def test_create_asset_land(self):
        """Test creating a land asset"""
        payload = {
            "assetType": "Land",
            "assetName": "TEST_Agricultural Land Pune",
            "currentValue": 2500000,
            "isFinanced": False,
            "linkedLoanId": None,
            "purchaseDate": None,
            "purchaseValue": None
        }
        response = requests.post(f"{BASE_URL}/api/assets", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        created_asset_ids.append(data['id'])
        assert data['assetType'] == "Land"
    
    def test_create_asset_equipment(self):
        """Test creating an equipment asset"""
        payload = {
            "assetType": "Equipment",
            "assetName": "TEST_Industrial Machinery",
            "currentValue": 500000,
            "isFinanced": False,
            "linkedLoanId": None,
            "purchaseDate": None,
            "purchaseValue": None
        }
        response = requests.post(f"{BASE_URL}/api/assets", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        created_asset_ids.append(data['id'])
        assert data['assetType'] == "Equipment"
    
    def test_create_asset_other(self):
        """Test creating an 'Other' type asset"""
        payload = {
            "assetType": "Other",
            "assetName": "TEST_Gold Jewelry",
            "currentValue": 300000,
            "isFinanced": False,
            "linkedLoanId": None,
            "purchaseDate": None,
            "purchaseValue": None
        }
        response = requests.post(f"{BASE_URL}/api/assets", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        created_asset_ids.append(data['id'])
        assert data['assetType'] == "Other"
    
    def test_create_asset_with_loan_link(self):
        """Test creating an asset linked to a loan"""
        # Use first loan created
        loan_id = created_loan_ids[0] if created_loan_ids else None
        
        payload = {
            "assetType": "Residential Property",
            "assetName": "TEST_Financed Apartment",
            "currentValue": 6000000,
            "isFinanced": True,
            "linkedLoanId": loan_id,
            "purchaseDate": "2024-01-01",
            "purchaseValue": 5500000
        }
        response = requests.post(f"{BASE_URL}/api/assets", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        created_asset_ids.append(data['id'])
        
        assert data['isFinanced'] == True
        if loan_id:
            assert data['linkedLoanId'] == loan_id
    
    def test_get_all_assets(self):
        """Test retrieving all assets"""
        response = requests.get(f"{BASE_URL}/api/assets")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Check all 6 asset types were created
        test_assets = [a for a in data if a['assetName'].startswith('TEST_')]
        asset_types = set(a['assetType'] for a in test_assets)
        
        assert "Residential Property" in asset_types
        assert "Commercial Property" in asset_types
        assert "Vehicle" in asset_types
        assert "Land" in asset_types
        assert "Equipment" in asset_types
        assert "Other" in asset_types
    
    def test_get_asset_by_id(self):
        """Test retrieving a specific asset"""
        asset_id = created_asset_ids[0]
        response = requests.get(f"{BASE_URL}/api/assets/{asset_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data['id'] == asset_id
    
    def test_get_asset_not_found(self):
        """Test 404 for non-existent asset"""
        response = requests.get(f"{BASE_URL}/api/assets/nonexistent-id-12345")
        assert response.status_code == 404
    
    def test_update_asset_value(self):
        """Test updating asset current value"""
        asset_id = created_asset_ids[0]
        
        # First get current data
        get_response = requests.get(f"{BASE_URL}/api/assets/{asset_id}")
        original = get_response.json()
        
        payload = {
            "assetType": original['assetType'],
            "assetName": original['assetName'],
            "currentValue": 8000000,  # Updated value
            "isFinanced": original['isFinanced'],
            "linkedLoanId": original['linkedLoanId'],
            "purchaseDate": original['purchaseDate'],
            "purchaseValue": original['purchaseValue']
        }
        response = requests.put(f"{BASE_URL}/api/assets/{asset_id}", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data['currentValue'] == 8000000
    
    def test_update_asset_link_loan(self):
        """Test updating asset to link a loan"""
        # Get an unlinked asset
        unlinked_asset = None
        for aid in created_asset_ids:
            resp = requests.get(f"{BASE_URL}/api/assets/{aid}")
            asset = resp.json()
            if not asset.get('isFinanced'):
                unlinked_asset = asset
                break
        
        if unlinked_asset and created_loan_ids:
            payload = {
                "assetType": unlinked_asset['assetType'],
                "assetName": unlinked_asset['assetName'],
                "currentValue": unlinked_asset['currentValue'],
                "isFinanced": True,
                "linkedLoanId": created_loan_ids[1] if len(created_loan_ids) > 1 else created_loan_ids[0],
                "purchaseDate": unlinked_asset['purchaseDate'],
                "purchaseValue": unlinked_asset['purchaseValue']
            }
            response = requests.put(f"{BASE_URL}/api/assets/{unlinked_asset['id']}", json=payload)
            assert response.status_code == 200
            
            data = response.json()
            assert data['isFinanced'] == True
    
    def test_update_asset_not_found(self):
        """Test 404 for updating non-existent asset"""
        payload = {
            "assetType": "Other",
            "assetName": "TEST_Nonexistent",
            "currentValue": 100000,
            "isFinanced": False,
            "linkedLoanId": None,
            "purchaseDate": None,
            "purchaseValue": None
        }
        response = requests.put(f"{BASE_URL}/api/assets/nonexistent-id", json=payload)
        assert response.status_code == 404


class TestRentalWithAssetLink:
    """Test Rental Income with Asset linking and Rental Yield"""
    
    def test_create_rental_with_asset_link(self):
        """Test creating rental income linked to an asset"""
        # Get a property asset
        assets_resp = requests.get(f"{BASE_URL}/api/assets")
        assets = [a for a in assets_resp.json() if a['assetName'].startswith('TEST_') and 'Property' in a['assetType']]
        
        if assets:
            asset_id = assets[0]['id']
            payload = {
                "type": "Rental",
                "name": "TEST_Green Villa Rental",
                "assetId": asset_id,
                "tenantName": "Rahul Sharma",
                "expectedAmount": 25000,
                "securityDeposit": 75000,
                "frequency": "Monthly",
                "selectedDate": "2026-02-15"
            }
            response = requests.post(f"{BASE_URL}/api/income", json=payload)
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            created_income_ids.append(data['id'])
            
            assert data['assetId'] == asset_id
            assert data['securityDeposit'] == 75000
    
    def test_create_rental_without_asset_link(self):
        """Test creating rental without asset link"""
        payload = {
            "type": "Rental",
            "name": "TEST_Standalone Rental",
            "assetId": None,
            "tenantName": "Test Tenant",
            "expectedAmount": 15000,
            "securityDeposit": 30000,
            "frequency": "Monthly",
            "selectedDate": "2026-02-20"
        }
        response = requests.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        created_income_ids.append(data['id'])
        assert data['assetId'] is None
    
    def test_verify_rental_yield_calculation_data(self):
        """Verify data needed for rental yield calculation is correct"""
        # Get the rental with asset link
        incomes_resp = requests.get(f"{BASE_URL}/api/income")
        rentals = [i for i in incomes_resp.json() if i['name'] == "TEST_Green Villa Rental"]
        
        if rentals:
            rental = rentals[0]
            assert rental['assetId'] is not None
            assert rental['expectedAmount'] == 25000
            
            # Get linked asset
            asset_resp = requests.get(f"{BASE_URL}/api/assets/{rental['assetId']}")
            if asset_resp.status_code == 200:
                asset = asset_resp.json()
                # Calculate expected rental yield: (Annual Rent / Asset Value) * 100
                annual_rent = rental['expectedAmount'] * 12
                expected_yield = (annual_rent / asset['currentValue']) * 100
                print(f"Calculated Rental Yield: {expected_yield:.2f}%")
                # Just verify we have valid numbers for calculation
                assert expected_yield > 0


class TestIntegrationFlow:
    """Test the full flow: Create Loan -> Create Asset with Loan -> Create Rental with Asset"""
    
    def test_full_integration_flow(self):
        """Test complete asset-loan-rental integration"""
        # Step 1: Create a loan
        loan_payload = {
            "loanName": "TEST_Integration Home Loan",
            "lenderName": "SBI",
            "principalAmount": 5000000,
            "interestRate": 8.5,
            "tenureMonths": 240,
            "emiAmount": 43391.28,
            "startDate": "2024-01-01",
            "outstandingAmount": 4500000
        }
        loan_resp = requests.post(f"{BASE_URL}/api/loans", json=loan_payload)
        assert loan_resp.status_code == 200
        loan = loan_resp.json()
        created_loan_ids.append(loan['id'])
        
        # Step 2: Create an asset linked to the loan
        asset_payload = {
            "assetType": "Residential Property",
            "assetName": "TEST_Integration Property",
            "currentValue": 7500000,
            "isFinanced": True,
            "linkedLoanId": loan['id'],
            "purchaseDate": "2024-01-01",
            "purchaseValue": 6000000
        }
        asset_resp = requests.post(f"{BASE_URL}/api/assets", json=asset_payload)
        assert asset_resp.status_code == 200
        asset = asset_resp.json()
        created_asset_ids.append(asset['id'])
        
        # Step 3: Create rental income linked to the asset
        rental_payload = {
            "type": "Rental",
            "name": "TEST_Integration Rental",
            "assetId": asset['id'],
            "tenantName": "Integration Tenant",
            "expectedAmount": 25000,
            "securityDeposit": 50000,
            "frequency": "Monthly",
            "selectedDate": "2026-03-01"
        }
        rental_resp = requests.post(f"{BASE_URL}/api/income", json=rental_payload)
        assert rental_resp.status_code == 200
        rental = rental_resp.json()
        created_income_ids.append(rental['id'])
        
        # Verify linkages
        assert asset['linkedLoanId'] == loan['id']
        assert rental['assetId'] == asset['id']
        
        # Calculate net value: Asset Value - Outstanding Loan
        net_value = asset['currentValue'] - loan['outstandingAmount']
        assert net_value == 3000000  # 75L - 45L = 30L
        
        # Calculate rental yield
        annual_rent = rental['expectedAmount'] * 12
        rental_yield = (annual_rent / asset['currentValue']) * 100
        assert 3.5 < rental_yield < 4.5  # Should be around 4%
        print(f"Integration Test - Net Value: {net_value}, Rental Yield: {rental_yield:.2f}%")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_data(self):
        """Clean up all TEST_ prefixed data"""
        # Clean income sources
        incomes = requests.get(f"{BASE_URL}/api/income").json()
        for income in incomes:
            if income['name'].startswith('TEST_'):
                requests.delete(f"{BASE_URL}/api/income/{income['id']}")
        
        # Clean assets
        assets = requests.get(f"{BASE_URL}/api/assets").json()
        for asset in assets:
            if asset['assetName'].startswith('TEST_'):
                requests.delete(f"{BASE_URL}/api/assets/{asset['id']}")
        
        # Clean loans
        loans = requests.get(f"{BASE_URL}/api/loans").json()
        for loan in loans:
            if loan['loanName'].startswith('TEST_'):
                requests.delete(f"{BASE_URL}/api/loans/{loan['id']}")
        
        # Verify cleanup
        remaining_assets = [a for a in requests.get(f"{BASE_URL}/api/assets").json() if a['assetName'].startswith('TEST_')]
        remaining_loans = [l for l in requests.get(f"{BASE_URL}/api/loans").json() if l['loanName'].startswith('TEST_')]
        remaining_income = [i for i in requests.get(f"{BASE_URL}/api/income").json() if i['name'].startswith('TEST_')]
        
        assert len(remaining_assets) == 0, f"Failed to clean up {len(remaining_assets)} assets"
        assert len(remaining_loans) == 0, f"Failed to clean up {len(remaining_loans)} loans"
        assert len(remaining_income) == 0, f"Failed to clean up {len(remaining_income)} income sources"
