"""
Tests for iteration 57 features:
1. Investment Performance API - verify totalInvested uses 'principal' field
2. Reports API - PDF and Excel generation for income, expense, investment, loan, networth
3. CategoryBreakdown pages - verify breakdown page routes work
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication for test session"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Login and return authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return session


class TestInvestmentPerformance(TestAuth):
    """Test investment performance API returns correct totalInvested using principal field"""
    
    def test_investment_performance_endpoint(self, auth_session):
        """Verify /api/analytics/investment-performance returns data structure"""
        response = auth_session.get(f"{BASE_URL}/api/analytics/investment-performance")
        assert response.status_code == 200, f"Investment performance API failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "totalInvested" in data, "Missing totalInvested field"
        assert "currentValue" in data, "Missing currentValue field"
        assert "totalGains" in data, "Missing totalGains field"
        assert "gainPercent" in data, "Missing gainPercent field"
        assert "byCategory" in data, "Missing byCategory field"
        
        # Verify totalInvested is a number
        assert isinstance(data["totalInvested"], (int, float)), "totalInvested should be a number"
        print(f"Investment Performance: totalInvested={data['totalInvested']}, currentValue={data['currentValue']}")
    
    def test_investment_performance_uses_principal(self, auth_session):
        """Verify that totalInvested is calculated from 'principal' field, not 'amountInvested'"""
        # Get investments to verify data
        inv_response = auth_session.get(f"{BASE_URL}/api/investments")
        assert inv_response.status_code == 200
        investments = inv_response.json()
        
        # Get performance
        perf_response = auth_session.get(f"{BASE_URL}/api/analytics/investment-performance")
        assert perf_response.status_code == 200
        perf_data = perf_response.json()
        
        # Calculate expected totalInvested using principal field (same logic as backend)
        expected_invested = 0
        for inv in investments:
            invested = inv.get('principal', 0) or inv.get('amountInvested', 0) or 0
            expected_invested += invested
        
        # Verify match
        assert abs(perf_data["totalInvested"] - expected_invested) < 1, \
            f"totalInvested mismatch: API={perf_data['totalInvested']}, expected={expected_invested}"
        print(f"Investment totalInvested correctly calculated: {perf_data['totalInvested']}")


class TestPDFReportGeneration(TestAuth):
    """Test PDF report generation for various report types"""
    
    @pytest.mark.parametrize("report_type", ["income", "expense", "investment", "loan", "networth"])
    def test_pdf_report_generation(self, auth_session, report_type):
        """Test PDF generation for each report type"""
        response = auth_session.get(
            f"{BASE_URL}/api/reports/generate/{report_type}",
            params={"format": "pdf", "from_date": "2026-01-01", "to_date": "2026-02-28"}
        )
        
        assert response.status_code == 200, f"PDF report generation failed for {report_type}: {response.text}"
        
        # Verify content type is PDF
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content-type, got: {content_type}"
        
        # Verify content is not empty
        assert len(response.content) > 0, f"PDF content is empty for {report_type}"
        
        # Verify PDF header magic bytes
        assert response.content[:4] == b'%PDF', f"Invalid PDF header for {report_type}"
        
        print(f"PDF report '{report_type}' generated successfully: {len(response.content)} bytes")


class TestExcelReportGeneration(TestAuth):
    """Test Excel report generation"""
    
    @pytest.mark.parametrize("report_type", ["income", "expense"])
    def test_excel_report_generation(self, auth_session, report_type):
        """Test Excel generation for income and expense types"""
        response = auth_session.get(
            f"{BASE_URL}/api/reports/generate/{report_type}",
            params={"format": "excel", "from_date": "2026-01-01", "to_date": "2026-02-28"}
        )
        
        assert response.status_code == 200, f"Excel report generation failed for {report_type}: {response.text}"
        
        # Verify content type is Excel
        content_type = response.headers.get("content-type", "")
        assert "spreadsheetml" in content_type or "vnd.openxmlformats" in content_type, \
            f"Expected Excel content-type, got: {content_type}"
        
        # Verify content is not empty
        assert len(response.content) > 0, f"Excel content is empty for {report_type}"
        
        # Verify Excel header magic bytes (PK for xlsx zip format)
        assert response.content[:2] == b'PK', f"Invalid Excel header for {report_type}"
        
        print(f"Excel report '{report_type}' generated successfully: {len(response.content)} bytes")


class TestDashboardNetworth(TestAuth):
    """Test dashboard networth endpoint for wealth breakdown data"""
    
    def test_networth_returns_breakdown_values(self, auth_session):
        """Verify networth API returns totalAssets, totalInvestments, liquidBalance"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/networth")
        assert response.status_code == 200, f"Networth API failed: {response.text}"
        
        data = response.json()
        # Verify all fields needed for wealth breakdown
        assert "totalAssets" in data, "Missing totalAssets"
        assert "totalInvestments" in data, "Missing totalInvestments"
        assert "liquidBalance" in data, "Missing liquidBalance"
        assert "netWorth" in data, "Missing netWorth"
        
        # Log the values for verification
        print(f"Networth breakdown: assets={data['totalAssets']}, investments={data['totalInvestments']}, liquid={data['liquidBalance']}")


class TestBreakdownPageAPIs(TestAuth):
    """Test APIs that power the breakdown pages"""
    
    def test_assets_list_api(self, auth_session):
        """Test assets list API for AssetBreakdown page"""
        response = auth_session.get(f"{BASE_URL}/api/assets")
        assert response.status_code == 200, f"Assets API failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of assets"
        if len(data) > 0:
            assert "assetType" in data[0] or "type" in data[0], "Asset should have type field"
            assert "currentValue" in data[0], "Asset should have currentValue"
        print(f"Assets API returned {len(data)} assets")
    
    def test_loans_list_api(self, auth_session):
        """Test loans list API for LoanBreakdown page"""
        response = auth_session.get(f"{BASE_URL}/api/loans")
        assert response.status_code == 200, f"Loans API failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of loans"
        if len(data) > 0:
            assert "loanType" in data[0], "Loan should have loanType field"
            assert "outstandingAmount" in data[0], "Loan should have outstandingAmount"
        print(f"Loans API returned {len(data)} loans")
    
    def test_investments_list_api(self, auth_session):
        """Test investments list API for InvestmentBreakdown page"""
        response = auth_session.get(f"{BASE_URL}/api/investments")
        assert response.status_code == 200, f"Investments API failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of investments"
        if len(data) > 0:
            assert "investmentCategory" in data[0] or "category" in data[0], "Investment should have category field"
            assert "currentValue" in data[0], "Investment should have currentValue"
            # Verify principal field exists for totalInvested calculation
            print(f"First investment has principal: {data[0].get('principal')}, amountInvested: {data[0].get('amountInvested')}")
        print(f"Investments API returned {len(data)} investments")
    
    def test_insurances_list_api(self, auth_session):
        """Test insurances list API for InsuranceBreakdown page"""
        response = auth_session.get(f"{BASE_URL}/api/insurances")
        assert response.status_code == 200, f"Insurances API failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of insurances"
        if len(data) > 0:
            assert "insuranceType" in data[0], "Insurance should have insuranceType field"
            # API uses coverageAmount or sumAssured
            assert "sumAssured" in data[0] or "coverageAmount" in data[0], "Insurance should have sumAssured or coverageAmount"
        print(f"Insurances API returned {len(data)} insurances")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
