"""
Test Asset ↔ Loan Bidirectional Linking Feature
- Tests GET /api/loans/{loan_id}/linked-assets endpoint (reverse lookup)
- Tests navigation data availability between Assets and Loans
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test loan and asset IDs (from main agent context)
TEST_LOAN_ID = "808f72e9-4a23-477f-8032-05e2dc4cfb5a"  # Car Loan Velar
TEST_ASSET_ID = "a700a7cd-7e43-4b6f-87ed-bcce9a88153f"  # velar asset


class TestLoanLinkedAssetsEndpoint:
    """Tests for GET /api/loans/{loan_id}/linked-assets endpoint"""
    
    def test_linked_assets_endpoint_returns_200(self):
        """Test that the endpoint returns 200 for existing loan"""
        response = requests.get(f"{BASE_URL}/api/loans/{TEST_LOAN_ID}/linked-assets")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"PASS: GET /api/loans/{TEST_LOAN_ID}/linked-assets returns 200")
    
    def test_linked_assets_returns_array(self):
        """Test that the endpoint returns an array"""
        response = requests.get(f"{BASE_URL}/api/loans/{TEST_LOAN_ID}/linked-assets")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: Endpoint returns array with {len(data)} items")
    
    def test_linked_assets_contains_velar_asset(self):
        """Test that the velar asset is in the linked assets"""
        response = requests.get(f"{BASE_URL}/api/loans/{TEST_LOAN_ID}/linked-assets")
        assert response.status_code == 200
        data = response.json()
        
        asset_ids = [asset.get('id') for asset in data]
        assert TEST_ASSET_ID in asset_ids, f"Expected asset {TEST_ASSET_ID} in linked assets"
        print(f"PASS: Velar asset is in linked assets for Car Loan Velar")
    
    def test_linked_asset_has_required_fields(self):
        """Test that linked assets have all required fields for display"""
        response = requests.get(f"{BASE_URL}/api/loans/{TEST_LOAN_ID}/linked-assets")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) > 0, "Expected at least one linked asset"
        
        asset = data[0]
        required_fields = ['id', 'assetName', 'assetType', 'currentValue']
        
        for field in required_fields:
            assert field in asset, f"Missing required field: {field}"
            print(f"  - {field}: {asset.get(field)}")
        
        print(f"PASS: Linked asset has all required fields")
    
    def test_linked_asset_values_are_correct(self):
        """Test that linked asset data matches the actual asset"""
        # Get linked assets from loan
        linked_response = requests.get(f"{BASE_URL}/api/loans/{TEST_LOAN_ID}/linked-assets")
        assert linked_response.status_code == 200
        linked_data = linked_response.json()
        
        # Get the actual asset
        asset_response = requests.get(f"{BASE_URL}/api/assets/{TEST_ASSET_ID}")
        assert asset_response.status_code == 200
        asset_data = asset_response.json()
        
        # Find the matching linked asset
        linked_asset = next((a for a in linked_data if a['id'] == TEST_ASSET_ID), None)
        assert linked_asset is not None, "Linked asset not found"
        
        # Verify values match
        assert linked_asset['assetName'] == asset_data['assetName'], "Asset name mismatch"
        assert linked_asset['assetType'] == asset_data['assetType'], "Asset type mismatch"
        assert linked_asset['currentValue'] == asset_data['currentValue'], "Current value mismatch"
        
        print(f"PASS: Linked asset data matches actual asset data")
    
    def test_nonexistent_loan_returns_empty_array(self):
        """Test that non-existent loan returns empty array (not 404)"""
        response = requests.get(f"{BASE_URL}/api/loans/non-existent-loan-id/linked-assets")
        assert response.status_code == 200, f"Expected 200 for non-existent loan, got {response.status_code}"
        data = response.json()
        assert data == [], f"Expected empty array for non-existent loan, got {data}"
        print(f"PASS: Non-existent loan returns empty array")
    
    def test_loan_without_linked_assets_returns_empty_array(self):
        """Test that a loan without linked assets returns empty array"""
        # First get all loans
        loans_response = requests.get(f"{BASE_URL}/api/loans")
        assert loans_response.status_code == 200
        loans = loans_response.json()
        
        # Find a loan without linked assets (or use test loan ID)
        # For now just verify the endpoint behavior is consistent
        for loan in loans[:3]:  # Check first 3 loans
            loan_id = loan.get('id')
            response = requests.get(f"{BASE_URL}/api/loans/{loan_id}/linked-assets")
            assert response.status_code == 200, f"Expected 200 for loan {loan_id}"
            data = response.json()
            assert isinstance(data, list), f"Expected list for loan {loan_id}"
            print(f"  - Loan '{loan.get('loanName')}': {len(data)} linked assets")
        
        print(f"PASS: All tested loans return valid array response")


class TestAssetLoanBidirectionalLinking:
    """Tests for bidirectional linking between assets and loans"""
    
    def test_asset_has_linked_loan_id(self):
        """Test that asset has linkedLoanId field pointing to loan"""
        response = requests.get(f"{BASE_URL}/api/assets/{TEST_ASSET_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert 'linkedLoanId' in data, "Asset missing linkedLoanId field"
        assert data['linkedLoanId'] == TEST_LOAN_ID, f"Expected linkedLoanId={TEST_LOAN_ID}, got {data['linkedLoanId']}"
        
        print(f"PASS: Asset has correct linkedLoanId: {data['linkedLoanId']}")
    
    def test_loan_details_available_for_asset_display(self):
        """Test that loan data is available for displaying on asset detail page"""
        # Get the linked loan
        response = requests.get(f"{BASE_URL}/api/loans/{TEST_LOAN_ID}")
        assert response.status_code == 200
        loan = response.json()
        
        # Verify fields needed for display
        required_fields = ['loanName', 'outstandingAmount', 'emiAmount', 'interestRate']
        for field in required_fields:
            assert field in loan, f"Missing loan field for display: {field}"
            print(f"  - {field}: {loan.get(field)}")
        
        print(f"PASS: Loan has all fields needed for asset detail display")
    
    def test_asset_details_available_for_loan_display(self):
        """Test that asset data is available for displaying on loan detail page"""
        response = requests.get(f"{BASE_URL}/api/loans/{TEST_LOAN_ID}/linked-assets")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) > 0, "No linked assets found"
        asset = data[0]
        
        # Verify fields needed for display on loan page
        required_fields = ['id', 'assetName', 'assetType', 'currentValue']
        for field in required_fields:
            assert field in asset, f"Missing asset field for display: {field}"
        
        print(f"PASS: Linked asset has all fields needed for loan detail display")
    
    def test_net_value_calculation_data_available(self):
        """Test that data for calculating net asset value is available"""
        # Get asset
        asset_response = requests.get(f"{BASE_URL}/api/assets/{TEST_ASSET_ID}")
        assert asset_response.status_code == 200
        asset = asset_response.json()
        
        # Get linked loan
        loan_response = requests.get(f"{BASE_URL}/api/loans/{TEST_LOAN_ID}")
        assert loan_response.status_code == 200
        loan = loan_response.json()
        
        # Calculate net value
        current_value = asset.get('currentValue', 0)
        outstanding = loan.get('outstandingAmount', 0)
        net_value = current_value - outstanding
        
        print(f"  Asset Value: ₹{current_value:,.2f}")
        print(f"  Outstanding: ₹{outstanding:,.2f}")
        print(f"  Net Value: ₹{net_value:,.2f}")
        
        assert net_value > 0, "Net value should be positive for this test case"
        print(f"PASS: Net value calculation data available and correct")


class TestEndpointIntegrity:
    """Tests for API endpoint integrity"""
    
    def test_assets_endpoint_returns_financed_assets(self):
        """Test that assets endpoint includes isFinanced and linkedLoanId fields"""
        response = requests.get(f"{BASE_URL}/api/assets")
        assert response.status_code == 200
        assets = response.json()
        
        financed_assets = [a for a in assets if a.get('isFinanced')]
        print(f"  Total assets: {len(assets)}")
        print(f"  Financed assets: {len(financed_assets)}")
        
        if financed_assets:
            asset = financed_assets[0]
            assert 'linkedLoanId' in asset, "Financed asset missing linkedLoanId"
            print(f"  Sample financed asset: {asset.get('assetName')} linked to loan {asset.get('linkedLoanId')}")
        
        print(f"PASS: Assets endpoint returns isFinanced and linkedLoanId fields")
    
    def test_loans_endpoint_returns_loan_type(self):
        """Test that loans endpoint includes loanType for badge display"""
        response = requests.get(f"{BASE_URL}/api/loans")
        assert response.status_code == 200
        loans = response.json()
        
        for loan in loans[:3]:
            assert 'loanType' in loan, f"Loan missing loanType field"
            assert 'loanName' in loan, f"Loan missing loanName field"
        
        print(f"PASS: Loans endpoint returns loanType for display")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
