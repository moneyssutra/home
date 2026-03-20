"""
Test Credit Cards Overview API - CRED-style credit card page data
Tests for iteration 157: Credit Cards Experimental page
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
SESSION_TOKEN = "054eada9-d5ad-4c1c-88ae-d34b70d9dbb8"

class TestCCOverviewAPI:
    """Credit Cards Overview endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with auth cookie"""
        self.session = requests.Session()
        self.session.cookies.set("session_token", SESSION_TOKEN)
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_cc_overview_returns_200(self):
        """Test that /api/cc-overview returns 200 for authenticated user"""
        response = self.session.get(f"{BASE_URL}/api/cc-overview")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ /api/cc-overview returns 200")
    
    def test_cc_overview_returns_cards_array(self):
        """Test that response contains cards array"""
        response = self.session.get(f"{BASE_URL}/api/cc-overview")
        data = response.json()
        assert "cards" in data, "Response should contain 'cards' key"
        assert isinstance(data["cards"], list), "cards should be a list"
        print(f"✓ Response contains cards array with {len(data['cards'])} cards")
    
    def test_cc_overview_returns_payments_array(self):
        """Test that response contains payments array"""
        response = self.session.get(f"{BASE_URL}/api/cc-overview")
        data = response.json()
        assert "payments" in data, "Response should contain 'payments' key"
        assert isinstance(data["payments"], list), "payments should be a list"
        print(f"✓ Response contains payments array with {len(data['payments'])} payments")
    
    def test_cc_overview_returns_summary(self):
        """Test that response contains summary object"""
        response = self.session.get(f"{BASE_URL}/api/cc-overview")
        data = response.json()
        assert "summary" in data, "Response should contain 'summary' key"
        assert isinstance(data["summary"], dict), "summary should be a dict"
        print("✓ Response contains summary object")
    
    def test_cc_overview_summary_fields(self):
        """Test that summary contains required fields"""
        response = self.session.get(f"{BASE_URL}/api/cc-overview")
        data = response.json()
        summary = data["summary"]
        
        required_fields = ["totalOutstanding", "totalLimit", "totalAvailable", "overallUtilization", "cardCount"]
        for field in required_fields:
            assert field in summary, f"Summary should contain '{field}'"
        
        assert summary["cardCount"] == len(data["cards"]), "cardCount should match cards array length"
        print(f"✓ Summary contains all required fields: {required_fields}")
    
    def test_cc_overview_card_structure(self):
        """Test that each card has required fields"""
        response = self.session.get(f"{BASE_URL}/api/cc-overview")
        data = response.json()
        
        if len(data["cards"]) == 0:
            pytest.skip("No cards to test")
        
        card = data["cards"][0]
        required_fields = [
            "id", "cardName", "bankName", "creditLimit", "outstandingAmount",
            "availableCredit", "utilization", "dueInfo", "color", "gradient",
            "logo", "network", "cardholder"
        ]
        
        for field in required_fields:
            assert field in card, f"Card should contain '{field}'"
        
        print(f"✓ Card contains all required fields: {required_fields}")
    
    def test_cc_overview_card_styling(self):
        """Test that cards have proper styling (gradient, color, network)"""
        response = self.session.get(f"{BASE_URL}/api/cc-overview")
        data = response.json()
        
        if len(data["cards"]) == 0:
            pytest.skip("No cards to test")
        
        for card in data["cards"]:
            # Check gradient is a list of 2 colors
            assert isinstance(card["gradient"], list), "gradient should be a list"
            assert len(card["gradient"]) == 2, "gradient should have 2 colors"
            
            # Check color is a hex string
            assert card["color"].startswith("#"), "color should be a hex color"
            
            # Check network is valid
            assert card["network"] in ["VISA", "Mastercard", "RuPay"], f"Invalid network: {card['network']}"
            
            # Check logo is present
            assert len(card["logo"]) > 0, "logo should not be empty"
        
        print(f"✓ All {len(data['cards'])} cards have proper styling")
    
    def test_cc_overview_utilization_calculation(self):
        """Test that utilization is calculated correctly"""
        response = self.session.get(f"{BASE_URL}/api/cc-overview")
        data = response.json()
        
        if len(data["cards"]) == 0:
            pytest.skip("No cards to test")
        
        for card in data["cards"]:
            if card["creditLimit"] > 0:
                expected_util = round((card["outstandingAmount"] / card["creditLimit"]) * 100, 1)
                assert card["utilization"] == expected_util, f"Utilization mismatch: expected {expected_util}, got {card['utilization']}"
        
        # Check overall utilization
        summary = data["summary"]
        if summary["totalLimit"] > 0:
            expected_overall = round((summary["totalOutstanding"] / summary["totalLimit"]) * 100, 1)
            assert summary["overallUtilization"] == expected_overall, f"Overall utilization mismatch"
        
        print("✓ Utilization calculations are correct")
    
    def test_cc_overview_due_info_format(self):
        """Test that dueInfo is properly formatted"""
        response = self.session.get(f"{BASE_URL}/api/cc-overview")
        data = response.json()
        
        if len(data["cards"]) == 0:
            pytest.skip("No cards to test")
        
        for card in data["cards"]:
            due_info = card["dueInfo"]
            # dueInfo should be empty or match expected patterns
            if due_info:
                valid_patterns = ["DUE TODAY", "DUE TOMORROW", "DUE IN"]
                assert any(pattern in due_info for pattern in valid_patterns), f"Invalid dueInfo format: {due_info}"
        
        print("✓ Due info format is correct")
    
    def test_cc_overview_cardholder_name(self):
        """Test that cardholder name is present and uppercase"""
        response = self.session.get(f"{BASE_URL}/api/cc-overview")
        data = response.json()
        
        if len(data["cards"]) == 0:
            pytest.skip("No cards to test")
        
        for card in data["cards"]:
            cardholder = card["cardholder"]
            if cardholder:
                assert cardholder == cardholder.upper(), "Cardholder name should be uppercase"
        
        print("✓ Cardholder names are uppercase")
    
    def test_cc_overview_available_credit(self):
        """Test that available credit is calculated correctly"""
        response = self.session.get(f"{BASE_URL}/api/cc-overview")
        data = response.json()
        
        if len(data["cards"]) == 0:
            pytest.skip("No cards to test")
        
        for card in data["cards"]:
            expected_available = max(0, card["creditLimit"] - card["outstandingAmount"])
            assert card["availableCredit"] == expected_available, f"Available credit mismatch"
        
        # Check total available
        summary = data["summary"]
        expected_total_available = max(0, summary["totalLimit"] - summary["totalOutstanding"])
        assert summary["totalAvailable"] == expected_total_available, "Total available mismatch"
        
        print("✓ Available credit calculations are correct")
    
    def test_cc_overview_unauthenticated(self):
        """Test that unauthenticated request returns error"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/cc-overview")
        data = response.json()
        
        # Should return error for unauthenticated user
        assert "error" in data or response.status_code != 200, "Unauthenticated request should fail"
        print("✓ Unauthenticated request properly rejected")
    
    def test_cc_overview_icici_card_styling(self):
        """Test that ICICI cards have correct orange styling"""
        response = self.session.get(f"{BASE_URL}/api/cc-overview")
        data = response.json()
        
        icici_cards = [c for c in data["cards"] if "icici" in c["bankName"].lower()]
        
        if len(icici_cards) == 0:
            pytest.skip("No ICICI cards to test")
        
        for card in icici_cards:
            # ICICI should have orange gradient
            assert card["color"] == "#F97316", f"ICICI card should have orange color, got {card['color']}"
            assert card["gradient"][0] == "#FD7014", f"ICICI gradient start should be #FD7014"
            assert card["logo"] == "ICICI", f"ICICI logo should be 'ICICI', got {card['logo']}"
        
        print(f"✓ {len(icici_cards)} ICICI cards have correct orange styling")


class TestCCOverviewDataIntegrity:
    """Data integrity tests for CC Overview"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with auth cookie"""
        self.session = requests.Session()
        self.session.cookies.set("session_token", SESSION_TOKEN)
    
    def test_user_has_expected_cards(self):
        """Test that user chandrashekhar has 2 credit cards"""
        response = self.session.get(f"{BASE_URL}/api/cc-overview")
        data = response.json()
        
        assert len(data["cards"]) == 2, f"Expected 2 cards, got {len(data['cards'])}"
        print("✓ User has expected 2 credit cards")
    
    def test_card_names_match_expected(self):
        """Test that card names match expected values"""
        response = self.session.get(f"{BASE_URL}/api/cc-overview")
        data = response.json()
        
        card_names = [c["cardName"] for c in data["cards"]]
        expected_names = ["ICICI Credit Card 3008", "ICICI Amazon Pay"]
        
        for name in expected_names:
            assert name in card_names, f"Expected card '{name}' not found"
        
        print(f"✓ Card names match expected: {expected_names}")
    
    def test_summary_totals_match_cards(self):
        """Test that summary totals match sum of card values"""
        response = self.session.get(f"{BASE_URL}/api/cc-overview")
        data = response.json()
        
        cards = data["cards"]
        summary = data["summary"]
        
        total_outstanding = sum(c["outstandingAmount"] for c in cards)
        total_limit = sum(c["creditLimit"] for c in cards)
        
        assert summary["totalOutstanding"] == total_outstanding, "Total outstanding mismatch"
        assert summary["totalLimit"] == total_limit, "Total limit mismatch"
        
        print(f"✓ Summary totals match card sums: Outstanding={total_outstanding}, Limit={total_limit}")
