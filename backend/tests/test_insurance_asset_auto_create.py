"""
Test Insurance → Asset Auto-Creation Flow
Tests for:
1. Insurance with maturityType='Market Linked' should auto-create Asset
2. Insurance with maturityType='Returns on Maturity' should auto-create Asset
3. Pure protection insurances (Term, Health) should NOT create asset entries
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestInsuranceAssetAutoCreation:
    """Tests for Insurance → Asset auto-creation based on maturityType"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup and teardown for each test"""
        self.created_insurances = []
        self.created_assets = []
        yield
        # Cleanup: delete created test data
        for ins_id in self.created_insurances:
            try:
                requests.delete(f"{BASE_URL}/api/insurances/{ins_id}")
            except Exception:
                pass
        for asset_id in self.created_assets:
            try:
                requests.delete(f"{BASE_URL}/api/assets/{asset_id}")
            except Exception:
                pass
    
    def test_market_linked_insurance_creates_asset(self):
        """Insurance with maturityType='Market Linked' should auto-create an Asset"""
        test_id = str(uuid.uuid4())[:8]
        
        payload = {
            "insuranceType": "ULIP",
            "policyName": f"TEST_MarketLinked_{test_id}",
            "coverageAmount": 500000,
            "premiumAmount": 25000,
            "premiumFrequency": "Yearly",
            "startDate": "2025-01-15",
            "endDate": "2035-01-15",
            "maturityType": "Market Linked",
            "expectedMaturityAmount": 750000,
            "autoCreateExpense": False
        }
        
        # Create insurance
        response = requests.post(f"{BASE_URL}/api/insurances", json=payload)
        assert response.status_code == 200, f"Failed to create insurance: {response.text}"
        
        insurance_data = response.json()
        self.created_insurances.append(insurance_data['id'])
        
        # Verify Asset was auto-created
        assets_response = requests.get(f"{BASE_URL}/api/assets")
        assert assets_response.status_code == 200
        
        assets = assets_response.json()
        linked_asset = next(
            (a for a in assets if a.get('linkedInsuranceId') == insurance_data['id']),
            None
        )
        
        assert linked_asset is not None, "Asset should be auto-created for Market Linked insurance"
        self.created_assets.append(linked_asset['id'])
        
        # Verify asset fields
        assert linked_asset['assetType'] == "Insurance Asset"
        assert f"TEST_MarketLinked_{test_id}" in linked_asset['assetName']
        assert "(Maturity Value)" in linked_asset['assetName']
        assert linked_asset['currentValue'] == 750000  # expectedMaturityAmount
        assert linked_asset['purchaseValue'] == 25000  # premiumAmount
        assert linked_asset['isInsured'] == True
        print(f"PASS: Market Linked insurance created asset with ID: {linked_asset['id']}")
    
    def test_returns_on_maturity_insurance_creates_asset(self):
        """Insurance with maturityType='Returns on Maturity' should auto-create an Asset"""
        test_id = str(uuid.uuid4())[:8]
        
        payload = {
            "insuranceType": "Endowment",
            "policyName": f"TEST_ReturnsMaturity_{test_id}",
            "coverageAmount": 1000000,
            "premiumAmount": 50000,
            "premiumFrequency": "Yearly",
            "startDate": "2024-06-01",
            "endDate": "2039-06-01",
            "maturityType": "Returns on Maturity",
            "expectedMaturityAmount": 1500000,
            "autoCreateExpense": False
        }
        
        # Create insurance
        response = requests.post(f"{BASE_URL}/api/insurances", json=payload)
        assert response.status_code == 200, f"Failed to create insurance: {response.text}"
        
        insurance_data = response.json()
        self.created_insurances.append(insurance_data['id'])
        
        # Verify Asset was auto-created
        assets_response = requests.get(f"{BASE_URL}/api/assets")
        assert assets_response.status_code == 200
        
        assets = assets_response.json()
        linked_asset = next(
            (a for a in assets if a.get('linkedInsuranceId') == insurance_data['id']),
            None
        )
        
        assert linked_asset is not None, "Asset should be auto-created for Returns on Maturity insurance"
        self.created_assets.append(linked_asset['id'])
        
        # Verify asset fields
        assert linked_asset['assetType'] == "Insurance Asset"
        assert f"TEST_ReturnsMaturity_{test_id}" in linked_asset['assetName']
        assert linked_asset['currentValue'] == 1500000
        assert linked_asset['purchaseValue'] == 50000
        print(f"PASS: Returns on Maturity insurance created asset with ID: {linked_asset['id']}")
    
    def test_term_insurance_does_not_create_asset(self):
        """Pure protection Term insurance should NOT auto-create an Asset"""
        test_id = str(uuid.uuid4())[:8]
        
        payload = {
            "insuranceType": "Term Life",
            "policyName": f"TEST_TermLife_{test_id}",
            "coverageAmount": 10000000,
            "premiumAmount": 15000,
            "premiumFrequency": "Yearly",
            "startDate": "2025-01-01",
            "endDate": "2050-01-01",
            "maturityType": None,  # No maturity for pure term
            "autoCreateExpense": False
        }
        
        # Create insurance
        response = requests.post(f"{BASE_URL}/api/insurances", json=payload)
        assert response.status_code == 200, f"Failed to create insurance: {response.text}"
        
        insurance_data = response.json()
        self.created_insurances.append(insurance_data['id'])
        
        # Verify NO Asset was auto-created
        assets_response = requests.get(f"{BASE_URL}/api/assets")
        assert assets_response.status_code == 200
        
        assets = assets_response.json()
        linked_asset = next(
            (a for a in assets if a.get('linkedInsuranceId') == insurance_data['id']),
            None
        )
        
        assert linked_asset is None, "Asset should NOT be created for pure Term insurance"
        print(f"PASS: Term Life insurance did NOT create asset (as expected)")
    
    def test_health_insurance_does_not_create_asset(self):
        """Health insurance should NOT auto-create an Asset"""
        test_id = str(uuid.uuid4())[:8]
        
        payload = {
            "insuranceType": "Health",
            "policyName": f"TEST_Health_{test_id}",
            "coverageAmount": 500000,
            "premiumAmount": 12000,
            "premiumFrequency": "Yearly",
            "startDate": "2025-02-01",
            "maturityType": None,  # Health insurance has no maturity
            "autoCreateExpense": False
        }
        
        # Create insurance
        response = requests.post(f"{BASE_URL}/api/insurances", json=payload)
        assert response.status_code == 200, f"Failed to create insurance: {response.text}"
        
        insurance_data = response.json()
        self.created_insurances.append(insurance_data['id'])
        
        # Verify NO Asset was auto-created
        assets_response = requests.get(f"{BASE_URL}/api/assets")
        assert assets_response.status_code == 200
        
        assets = assets_response.json()
        linked_asset = next(
            (a for a in assets if a.get('linkedInsuranceId') == insurance_data['id']),
            None
        )
        
        assert linked_asset is None, "Asset should NOT be created for Health insurance"
        print(f"PASS: Health insurance did NOT create asset (as expected)")
    
    def test_insurance_without_maturity_type_does_not_create_asset(self):
        """Insurance without maturityType should NOT create an Asset"""
        test_id = str(uuid.uuid4())[:8]
        
        payload = {
            "insuranceType": "Motor",
            "policyName": f"TEST_Motor_{test_id}",
            "coverageAmount": 1000000,
            "premiumAmount": 8000,
            "premiumFrequency": "Yearly",
            "startDate": "2025-01-01",
            # maturityType not provided
            "autoCreateExpense": False
        }
        
        # Create insurance
        response = requests.post(f"{BASE_URL}/api/insurances", json=payload)
        assert response.status_code == 200, f"Failed to create insurance: {response.text}"
        
        insurance_data = response.json()
        self.created_insurances.append(insurance_data['id'])
        
        # Verify NO Asset was auto-created
        assets_response = requests.get(f"{BASE_URL}/api/assets")
        assert assets_response.status_code == 200
        
        assets = assets_response.json()
        linked_asset = next(
            (a for a in assets if a.get('linkedInsuranceId') == insurance_data['id']),
            None
        )
        
        assert linked_asset is None, "Asset should NOT be created for insurance without maturityType"
        print(f"PASS: Motor insurance without maturityType did NOT create asset")


class TestInsuranceAssetLinkingFields:
    """Verify asset fields are correctly set when auto-created from insurance"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.created_insurances = []
        self.created_assets = []
        yield
        for ins_id in self.created_insurances:
            try:
                requests.delete(f"{BASE_URL}/api/insurances/{ins_id}")
            except Exception:
                pass
        for asset_id in self.created_assets:
            try:
                requests.delete(f"{BASE_URL}/api/assets/{asset_id}")
            except Exception:
                pass
    
    def test_asset_uses_expected_maturity_amount_as_current_value(self):
        """Asset currentValue should be expectedMaturityAmount"""
        test_id = str(uuid.uuid4())[:8]
        
        payload = {
            "insuranceType": "ULIP",
            "policyName": f"TEST_AssetValue_{test_id}",
            "coverageAmount": 500000,
            "premiumAmount": 30000,
            "premiumFrequency": "Yearly",
            "startDate": "2025-01-01",
            "maturityType": "Market Linked",
            "expectedMaturityAmount": 900000,
            "autoCreateExpense": False
        }
        
        response = requests.post(f"{BASE_URL}/api/insurances", json=payload)
        assert response.status_code == 200
        
        insurance_data = response.json()
        self.created_insurances.append(insurance_data['id'])
        
        assets_response = requests.get(f"{BASE_URL}/api/assets")
        assets = assets_response.json()
        linked_asset = next(
            (a for a in assets if a.get('linkedInsuranceId') == insurance_data['id']),
            None
        )
        
        assert linked_asset is not None
        self.created_assets.append(linked_asset['id'])
        
        # currentValue should be expectedMaturityAmount
        assert linked_asset['currentValue'] == 900000
        # purchaseValue should be premiumAmount
        assert linked_asset['purchaseValue'] == 30000
        print(f"PASS: Asset currentValue correctly set to expectedMaturityAmount: {linked_asset['currentValue']}")
    
    def test_asset_falls_back_to_premium_if_no_maturity_amount(self):
        """If expectedMaturityAmount not set, asset should use premiumAmount"""
        test_id = str(uuid.uuid4())[:8]
        
        payload = {
            "insuranceType": "Endowment",
            "policyName": f"TEST_FallbackValue_{test_id}",
            "coverageAmount": 500000,
            "premiumAmount": 40000,
            "premiumFrequency": "Yearly",
            "startDate": "2025-01-01",
            "maturityType": "Returns on Maturity",
            # expectedMaturityAmount not provided
            "autoCreateExpense": False
        }
        
        response = requests.post(f"{BASE_URL}/api/insurances", json=payload)
        assert response.status_code == 200
        
        insurance_data = response.json()
        self.created_insurances.append(insurance_data['id'])
        
        assets_response = requests.get(f"{BASE_URL}/api/assets")
        assets = assets_response.json()
        linked_asset = next(
            (a for a in assets if a.get('linkedInsuranceId') == insurance_data['id']),
            None
        )
        
        assert linked_asset is not None
        self.created_assets.append(linked_asset['id'])
        
        # currentValue should fallback to premiumAmount
        assert linked_asset['currentValue'] == 40000
        print(f"PASS: Asset currentValue correctly falls back to premiumAmount: {linked_asset['currentValue']}")
    
    def test_asset_notes_contain_insurance_info(self):
        """Asset notes should contain insurance type and maturity type info"""
        test_id = str(uuid.uuid4())[:8]
        
        payload = {
            "insuranceType": "Whole Life",
            "policyName": f"TEST_AssetNotes_{test_id}",
            "coverageAmount": 1000000,
            "premiumAmount": 35000,
            "premiumFrequency": "Yearly",
            "startDate": "2025-01-01",
            "maturityType": "Market Linked",
            "expectedMaturityAmount": 1200000,
            "autoCreateExpense": False
        }
        
        response = requests.post(f"{BASE_URL}/api/insurances", json=payload)
        assert response.status_code == 200
        
        insurance_data = response.json()
        self.created_insurances.append(insurance_data['id'])
        
        assets_response = requests.get(f"{BASE_URL}/api/assets")
        assets = assets_response.json()
        linked_asset = next(
            (a for a in assets if a.get('linkedInsuranceId') == insurance_data['id']),
            None
        )
        
        assert linked_asset is not None
        self.created_assets.append(linked_asset['id'])
        
        # Notes should contain policy info
        assert linked_asset['notes'] is not None
        assert "Whole Life" in linked_asset['notes']
        assert "Market Linked" in linked_asset['notes']
        print(f"PASS: Asset notes correctly contain insurance info: {linked_asset['notes']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
