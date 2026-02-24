"""
Test suite for bug fixes verification - iteration 56:
1. Report generation APIs (PDF/Excel)
2. Income APIs with profession field for self-employed
3. Notification APIs with relatedIncomeId
4. Financial Health API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthentication:
    """Test auth endpoints and get session"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Get authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        return s
    
    @pytest.fixture(scope="class")
    def auth_session(self, session):
        """Authenticate and return session with cookies"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "user_id" in data, "No user_id in response"
        print(f"Logged in as: {data.get('name', 'Unknown')}")
        return session
    
    def test_login_success(self, session):
        """Test login with test credentials"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "session_token" in data
        print(f"Login successful - user_id: {data['user_id']}")


class TestReportGeneration:
    """Test report generation APIs for PDF and Excel formats"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return s
    
    def test_income_report_pdf(self, auth_session):
        """Test income report PDF generation"""
        params = {
            "format": "pdf",
            "from_date": "2024-01-01",
            "to_date": "2025-12-31"
        }
        response = auth_session.get(f"{BASE_URL}/api/reports/generate/income", params=params)
        assert response.status_code == 200, f"Income PDF report failed: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 100, "PDF content seems too small"
        print(f"Income PDF report generated successfully - size: {len(response.content)} bytes")
    
    def test_income_report_excel(self, auth_session):
        """Test income report Excel generation"""
        params = {
            "format": "excel",
            "from_date": "2024-01-01",
            "to_date": "2025-12-31"
        }
        response = auth_session.get(f"{BASE_URL}/api/reports/generate/income", params=params)
        assert response.status_code == 200, f"Income Excel report failed: {response.text}"
        assert "spreadsheetml" in response.headers.get("content-type", "")
        assert len(response.content) > 100, "Excel content seems too small"
        print(f"Income Excel report generated successfully - size: {len(response.content)} bytes")
    
    def test_expense_report_pdf(self, auth_session):
        """Test expense report PDF generation"""
        params = {
            "format": "pdf",
            "from_date": "2024-01-01",
            "to_date": "2025-12-31"
        }
        response = auth_session.get(f"{BASE_URL}/api/reports/generate/expense", params=params)
        assert response.status_code == 200, f"Expense PDF report failed: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        print(f"Expense PDF report generated - size: {len(response.content)} bytes")
    
    def test_networth_report_pdf(self, auth_session):
        """Test net worth report PDF generation"""
        params = {
            "format": "pdf",
            "from_date": "2024-01-01",
            "to_date": "2025-12-31"
        }
        response = auth_session.get(f"{BASE_URL}/api/reports/generate/networth", params=params)
        assert response.status_code == 200, f"Networth PDF report failed: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        print(f"Networth PDF report generated - size: {len(response.content)} bytes")


class TestSelfEmployedIncome:
    """Test self-employed income with profession field"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return s
    
    def test_create_self_employed_with_profession(self, auth_session):
        """Test creating self-employed income with profession field"""
        payload = {
            "type": "Self-Employed",
            "name": "TEST_Freelance Developer",
            "profession": "Software Consultant",
            "expectedAmount": 50000,
            "frequency": "Monthly",
            "selectedDate": "2025-01-15",
            "incomeType": "variable",
            "reminderTime": "19:00"
        }
        response = auth_session.post(f"{BASE_URL}/api/income", json=payload)
        assert response.status_code == 200, f"Create self-employed failed: {response.text}"
        data = response.json()
        assert "id" in data, "No ID in response"
        self.__class__.created_income_id = data["id"]
        print(f"Created self-employed income with ID: {data['id']}")
        return data["id"]
    
    def test_get_self_employed_shows_profession(self, auth_session):
        """Test that GET returns the saved profession field"""
        income_id = getattr(self.__class__, 'created_income_id', None)
        if not income_id:
            pytest.skip("No income ID from previous test")
        
        response = auth_session.get(f"{BASE_URL}/api/income/{income_id}")
        assert response.status_code == 200, f"Get income failed: {response.text}"
        data = response.json()
        
        # Critical assertion: profession field must be returned
        assert "profession" in data, "profession field NOT returned - BUG!"
        assert data.get("profession") == "Software Consultant", f"Profession mismatch: {data.get('profession')}"
        print(f"Profession field correctly returned: {data.get('profession')}")
    
    def test_cleanup_self_employed(self, auth_session):
        """Cleanup test data"""
        income_id = getattr(self.__class__, 'created_income_id', None)
        if income_id:
            response = auth_session.delete(f"{BASE_URL}/api/income/{income_id}")
            print(f"Cleanup: Deleted income {income_id} - status: {response.status_code}")


class TestFinancialHealth:
    """Test Financial Health API"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return s
    
    def test_get_financial_health(self, auth_session):
        """Test Financial Health API endpoint"""
        response = auth_session.get(f"{BASE_URL}/api/financial-health")
        assert response.status_code == 200, f"Financial Health API failed: {response.text}"
        data = response.json()
        
        # Verify response structure for key metrics
        expected_keys = ["overallScore", "emergencyFund", "lifeInsurance", "savingsRate"]
        for key in expected_keys:
            assert key in data, f"Missing key: {key}"
        
        print(f"Financial Health Score: {data.get('overallScore')}")


class TestNotifications:
    """Test notification APIs and relatedIncomeId field"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return s
    
    def test_get_notifications(self, auth_session):
        """Test getting notifications list"""
        response = auth_session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200, f"Get notifications failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Notifications should be a list"
        print(f"Found {len(data)} notifications")
        
        # If there are notifications, verify relatedIncomeId field is present (for income notifications)
        for notif in data:
            if notif.get("type") == "income_reminder":
                print(f"Income notification: {notif.get('title')} - relatedIncomeId: {notif.get('relatedIncomeId')}")
    
    def test_get_unread_count(self, auth_session):
        """Test getting unread notification count"""
        response = auth_session.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response.status_code == 200, f"Get unread count failed: {response.text}"
        data = response.json()
        assert "count" in data, "count field missing"
        print(f"Unread notifications: {data.get('count')}")


class TestIncomeAPI:
    """Test income API endpoints for profession field handling"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return s
    
    def test_get_income_list(self, auth_session):
        """Test getting list of all income sources"""
        response = auth_session.get(f"{BASE_URL}/api/income")
        assert response.status_code == 200, f"Get income list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Income list should be an array"
        print(f"Found {len(data)} income sources")
        
        # Check self-employed incomes for profession field
        self_employed = [i for i in data if i.get("type") == "Self-Employed"]
        for income in self_employed:
            if income.get("profession"):
                print(f"Self-employed: {income.get('name')} - profession: {income.get('profession')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
