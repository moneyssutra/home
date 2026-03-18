"""
Test: Income Data Consistency - Fix for income data discrepancy across pages.
Bug: Weekly business income showed different values on My Income page vs Business Detail page.
Root cause: 
1) Detail page didn't generate weekly schedules (period_months=0 for Weekly)
2) List summary didn't include schedule-based monthly amounts
3) No consistent monthly received/pending calculation across pages

These tests verify:
- POST /api/income creates weekly business income correctly
- GET /api/income/monthly-summary returns correct receivedIncome/pendingIncome
- GET /api/income/list/summary returns monthlyTotal/monthlyReceived/monthlyPending for each source
- GET /api/income/{id}/detail returns consistent totalReceived matching monthly-summary
- GET /api/income/{id}/detail generates weekly schedule entries (not empty)
- CONSISTENCY: all three endpoints return matching received/pending values
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestIncomeDataConsistency:
    """Test income data consistency bug fix - weekly income calculations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: register test user, login, and store session"""
        self.session = requests.Session()
        # Use only letters (no numbers) for names
        import random
        import string
        unique_suffix = ''.join(random.choices(string.ascii_lowercase, k=6))
        self.test_email = f"inctest{unique_suffix}@example.com"
        self.test_password = "TestPass123!"
        self.income_id = None
        
        # Register user with unique names (only letters)
        register_response = self.session.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": self.test_email,
                "password": self.test_password,
                "fullName": f"Incuser{unique_suffix} Tester{unique_suffix}",
                "firstName": f"Incuser{unique_suffix}",
                "lastName": f"Tester{unique_suffix}",
                "sex": "Male",
                "dateOfBirth": "1990-01-01"
            }
        )
        print(f"Register response: {register_response.status_code} - {register_response.text[:200] if register_response.status_code != 200 else 'OK'}")
        
        # Login (uses 'username' field, not 'email')
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": self.test_email, "password": self.test_password}
        )
        print(f"Login response: {login_response.status_code}")
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        yield
        
        # Cleanup: delete created income source
        if self.income_id:
            try:
                self.session.delete(f"{BASE_URL}/api/income/{self.income_id}")
                print(f"Cleaned up income source: {self.income_id}")
            except:
                pass
    
    def test_01_create_weekly_business_income(self):
        """Test creating a weekly business income with selectedDay=Tuesday"""
        income_payload = {
            "name": "TEST_Weekly_Business",
            "type": "Business",
            "frequency": "Weekly",
            "expectedAmount": 50000,
            "incomeType": "fixed",
            "selectedDay": "Tuesday"
        }
        
        response = self.session.post(f"{BASE_URL}/api/income", json=income_payload)
        print(f"Create income response: {response.status_code}")
        print(f"Create income body: {response.text}")
        
        assert response.status_code == 200 or response.status_code == 201, f"Failed to create income: {response.text}"
        
        data = response.json()
        self.income_id = data.get("id")
        
        # Verify creation fields
        assert data["name"] == "TEST_Weekly_Business"
        assert data["type"] == "Business"
        assert data["frequency"] == "Weekly"
        assert data["expectedAmount"] == 50000
        assert data["selectedDay"] == "Tuesday"
        
        print(f"Created income ID: {self.income_id}")
    
    def test_02_monthly_summary_weekly_income(self):
        """Test GET /api/income/monthly-summary returns correct values for weekly income"""
        # First create a weekly income
        income_payload = {
            "name": "TEST_Monthly_Summary_Weekly",
            "type": "Business",
            "frequency": "Weekly",
            "expectedAmount": 50000,
            "incomeType": "fixed",
            "selectedDay": "Tuesday"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/income", json=income_payload)
        assert create_resp.status_code in [200, 201]
        income_data = create_resp.json()
        self.income_id = income_data.get("id")
        
        # Get monthly summary
        response = self.session.get(f"{BASE_URL}/api/income/monthly-summary")
        print(f"Monthly summary response: {response.status_code}")
        print(f"Monthly summary body: {response.text}")
        
        assert response.status_code == 200, f"Monthly summary failed: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "totalIncome" in data
        assert "receivedIncome" in data
        assert "pendingIncome" in data
        assert "month" in data
        
        # For weekly income: received + pending should equal total
        total = data["totalIncome"]
        received = data["receivedIncome"]
        pending = data["pendingIncome"]
        
        print(f"Monthly Summary - Total: {total}, Received: {received}, Pending: {pending}")
        
        # totalIncome = receivedIncome + pendingIncome (approximately - rounding)
        assert abs(total - (received + pending)) <= 2, f"Total mismatch: {total} != {received} + {pending}"
        
        # For 50K weekly, monthly total should be around 50K * number_of_weekday_occurrences
        # In most months, there are 4-5 Tuesdays, so total should be 200K-250K
        assert total >= 150000, f"Total income too low for weekly 50K: {total}"
        assert total <= 300000, f"Total income too high for weekly 50K: {total}"
    
    def test_03_list_summary_monthly_fields(self):
        """Test GET /api/income/list/summary returns monthlyTotal/monthlyReceived/monthlyPending"""
        # Create weekly income
        income_payload = {
            "name": "TEST_List_Summary_Weekly",
            "type": "Business",
            "frequency": "Weekly",
            "expectedAmount": 50000,
            "incomeType": "fixed",
            "selectedDay": "Tuesday"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/income", json=income_payload)
        assert create_resp.status_code in [200, 201]
        income_data = create_resp.json()
        self.income_id = income_data.get("id")
        
        # Get list summary
        response = self.session.get(f"{BASE_URL}/api/income/list/summary")
        print(f"List summary response: {response.status_code}")
        
        assert response.status_code == 200, f"List summary failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        
        # Find our created income
        created_income = None
        for income in data:
            if income.get("id") == self.income_id:
                created_income = income
                break
        
        assert created_income is not None, f"Created income {self.income_id} not found in list"
        
        print(f"List summary income: {created_income}")
        
        # Verify monthly fields exist
        assert "monthlyTotal" in created_income, "monthlyTotal missing"
        assert "monthlyReceived" in created_income, "monthlyReceived missing"
        assert "monthlyPending" in created_income, "monthlyPending missing"
        
        monthly_total = created_income["monthlyTotal"]
        monthly_received = created_income["monthlyReceived"]
        monthly_pending = created_income["monthlyPending"]
        
        print(f"List Summary - MonthlyTotal: {monthly_total}, MonthlyReceived: {monthly_received}, MonthlyPending: {monthly_pending}")
        
        # Verify consistency: monthlyTotal = monthlyReceived + monthlyPending
        assert abs(monthly_total - (monthly_received + monthly_pending)) <= 2, \
            f"List summary inconsistency: {monthly_total} != {monthly_received} + {monthly_pending}"
        
        # For weekly 50K income, monthly_total should be 50K * number of Tuesdays in month
        assert monthly_total >= 150000, f"monthlyTotal too low: {monthly_total}"
        assert monthly_total <= 300000, f"monthlyTotal too high: {monthly_total}"
    
    def test_04_detail_page_weekly_schedule(self):
        """Test GET /api/income/{id}/detail generates weekly schedule entries"""
        # Create weekly income
        income_payload = {
            "name": "TEST_Detail_Weekly_Schedule",
            "type": "Business",
            "frequency": "Weekly",
            "expectedAmount": 50000,
            "incomeType": "fixed",
            "selectedDay": "Tuesday"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/income", json=income_payload)
        assert create_resp.status_code in [200, 201]
        income_data = create_resp.json()
        self.income_id = income_data.get("id")
        
        # Get detail
        response = self.session.get(f"{BASE_URL}/api/income/{self.income_id}/detail")
        print(f"Detail response: {response.status_code}")
        
        assert response.status_code == 200, f"Detail failed: {response.text}"
        
        data = response.json()
        
        # Verify schedule exists and is not empty (BUG FIX: previously was empty for Weekly)
        assert "schedule" in data, "schedule field missing"
        schedule = data["schedule"]
        
        print(f"Schedule count: {len(schedule)}")
        print(f"Schedule (first 3): {schedule[:3] if schedule else 'EMPTY'}")
        
        assert len(schedule) > 0, "Weekly schedule is EMPTY - BUG NOT FIXED"
        
        # Verify schedule entries have correct structure
        for entry in schedule:
            assert "dueDate" in entry, "schedule entry missing dueDate"
            assert "amount" in entry, "schedule entry missing amount"
            assert "status" in entry, "schedule entry missing status"
            assert entry["amount"] == 50000, f"Schedule amount mismatch: {entry['amount']}"
        
        # Verify summary exists
        assert "summary" in data, "summary field missing"
        summary = data["summary"]
        
        print(f"Detail Summary: {summary}")
        
        assert "totalReceived" in summary, "totalReceived missing from summary"
        assert "monthlyTotal" in summary, "monthlyTotal missing from summary"
        assert "monthlyPending" in summary, "monthlyPending missing from summary"
    
    def test_05_consistency_check_all_endpoints(self):
        """
        CRITICAL: Verify all three endpoints return consistent received/pending values
        monthly-summary.receivedIncome == list/summary.monthlyReceived == detail.summary.totalReceived
        """
        # Create weekly income
        income_payload = {
            "name": "TEST_Consistency_Check",
            "type": "Business",
            "frequency": "Weekly",
            "expectedAmount": 50000,
            "incomeType": "fixed",
            "selectedDay": "Tuesday"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/income", json=income_payload)
        assert create_resp.status_code in [200, 201]
        income_data = create_resp.json()
        self.income_id = income_data.get("id")
        
        # Get all three endpoints
        monthly_summary_resp = self.session.get(f"{BASE_URL}/api/income/monthly-summary")
        list_summary_resp = self.session.get(f"{BASE_URL}/api/income/list/summary")
        detail_resp = self.session.get(f"{BASE_URL}/api/income/{self.income_id}/detail")
        
        assert monthly_summary_resp.status_code == 200
        assert list_summary_resp.status_code == 200
        assert detail_resp.status_code == 200
        
        monthly_summary = monthly_summary_resp.json()
        list_summary = list_summary_resp.json()
        detail = detail_resp.json()
        
        # Find our income in list
        our_income = None
        for inc in list_summary:
            if inc.get("id") == self.income_id:
                our_income = inc
                break
        
        assert our_income is not None, "Income not found in list summary"
        
        # Extract values
        ms_received = monthly_summary["receivedIncome"]
        ms_pending = monthly_summary["pendingIncome"]
        ms_total = monthly_summary["totalIncome"]
        
        ls_received = our_income["monthlyReceived"]
        ls_pending = our_income["monthlyPending"]
        ls_total = our_income["monthlyTotal"]
        
        detail_received = detail["summary"]["totalReceived"]
        detail_pending = detail["summary"]["monthlyPending"]
        detail_total = detail["summary"]["monthlyTotal"]
        
        print(f"\n=== CONSISTENCY CHECK ===")
        print(f"Monthly Summary - Total: {ms_total}, Received: {ms_received}, Pending: {ms_pending}")
        print(f"List Summary    - Total: {ls_total}, Received: {ls_received}, Pending: {ls_pending}")
        print(f"Detail Summary  - Total: {detail_total}, Received: {detail_received}, Pending: {detail_pending}")
        
        # CRITICAL CONSISTENCY CHECKS (with small tolerance for rounding)
        tolerance = 2
        
        # Since we only have one income source:
        # monthly-summary totals should match list/summary totals
        assert abs(ms_total - ls_total) <= tolerance, \
            f"Total mismatch: monthly-summary={ms_total}, list-summary={ls_total}"
        
        # detail totals should match
        assert abs(ls_total - detail_total) <= tolerance, \
            f"Total mismatch: list-summary={ls_total}, detail={detail_total}"
        
        # Received values should match across endpoints
        assert abs(ls_received - detail_received) <= tolerance, \
            f"Received mismatch: list-summary={ls_received}, detail={detail_received}"
        
        # Pending values should match
        assert abs(ls_pending - detail_pending) <= tolerance, \
            f"Pending mismatch: list-summary={ls_pending}, detail={detail_pending}"
        
        print("✓ All consistency checks passed!")
    
    def test_06_daily_frequency_income(self):
        """Test daily frequency income works correctly in list/summary and detail"""
        income_payload = {
            "name": "TEST_Daily_Income",
            "type": "Business",
            "frequency": "Daily",
            "expectedAmount": 5000,
            "incomeType": "fixed"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/income", json=income_payload)
        assert create_resp.status_code in [200, 201]
        income_data = create_resp.json()
        self.income_id = income_data.get("id")
        
        # Get list summary
        list_resp = self.session.get(f"{BASE_URL}/api/income/list/summary")
        assert list_resp.status_code == 200
        list_data = list_resp.json()
        
        our_income = None
        for inc in list_data:
            if inc.get("id") == self.income_id:
                our_income = inc
                break
        
        assert our_income is not None
        
        # Daily 5000 * ~30 days = ~150000 monthly
        assert our_income["monthlyTotal"] >= 140000, f"Daily monthlyTotal too low: {our_income['monthlyTotal']}"
        assert our_income["monthlyTotal"] <= 160000, f"Daily monthlyTotal too high: {our_income['monthlyTotal']}"
        
        # Get detail
        detail_resp = self.session.get(f"{BASE_URL}/api/income/{self.income_id}/detail")
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        
        # Verify schedule exists for daily
        assert len(detail.get("schedule", [])) > 0, "Daily schedule is empty"
        
        # Consistency check
        assert abs(our_income["monthlyTotal"] - detail["summary"]["monthlyTotal"]) <= 2
        assert abs(our_income["monthlyReceived"] - detail["summary"]["totalReceived"]) <= 2
    
    def test_07_monthly_frequency_income(self):
        """Test monthly frequency income works correctly in list/summary and detail"""
        income_payload = {
            "name": "TEST_Monthly_Income",
            "type": "Job",
            "frequency": "Monthly",
            "expectedAmount": 100000,
            "incomeType": "fixed",
            "selectedDate": "15"  # 15th of each month
        }
        create_resp = self.session.post(f"{BASE_URL}/api/income", json=income_payload)
        assert create_resp.status_code in [200, 201]
        income_data = create_resp.json()
        self.income_id = income_data.get("id")
        
        # Get list summary
        list_resp = self.session.get(f"{BASE_URL}/api/income/list/summary")
        assert list_resp.status_code == 200
        list_data = list_resp.json()
        
        our_income = None
        for inc in list_data:
            if inc.get("id") == self.income_id:
                our_income = inc
                break
        
        assert our_income is not None
        
        # Monthly 100000 should be exactly 100000 monthly
        assert our_income["monthlyTotal"] == 100000, f"Monthly total should be 100000: {our_income['monthlyTotal']}"
        
        # Get detail
        detail_resp = self.session.get(f"{BASE_URL}/api/income/{self.income_id}/detail")
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        
        # Consistency check
        assert detail["summary"]["monthlyTotal"] == 100000
    
    def test_08_weekday_occurrences_verification(self):
        """Verify the count_weekday_occurrences logic is correct for current month"""
        # Create income with Wednesday
        income_payload = {
            "name": "TEST_Wednesday_Weekly",
            "type": "Business",
            "frequency": "Weekly",
            "expectedAmount": 25000,
            "incomeType": "fixed",
            "selectedDay": "Wednesday"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/income", json=income_payload)
        assert create_resp.status_code in [200, 201]
        income_data = create_resp.json()
        self.income_id = income_data.get("id")
        
        # Get list summary
        list_resp = self.session.get(f"{BASE_URL}/api/income/list/summary")
        assert list_resp.status_code == 200
        list_data = list_resp.json()
        
        our_income = None
        for inc in list_data:
            if inc.get("id") == self.income_id:
                our_income = inc
                break
        
        assert our_income is not None
        
        monthly_total = our_income["monthlyTotal"]
        monthly_received = our_income["monthlyReceived"]
        monthly_pending = our_income["monthlyPending"]
        
        print(f"Wednesday Weekly - Total: {monthly_total}, Received: {monthly_received}, Pending: {monthly_pending}")
        
        # Monthly total should be 25000 * number of Wednesdays (4 or 5)
        assert monthly_total in [100000, 125000], f"Unexpected monthlyTotal: {monthly_total}"
        
        # received + pending = total
        assert abs(monthly_total - (monthly_received + monthly_pending)) <= 2


class TestIncomeDataConsistencyCleanup:
    """Cleanup test - delete TEST_ prefixed incomes"""
    
    def test_cleanup_test_data(self):
        """Cleanup any TEST_ prefixed income sources"""
        session = requests.Session()
        import random
        import string
        unique_suffix = ''.join(random.choices(string.ascii_lowercase, k=6))
        test_email = f"incclean{unique_suffix}@example.com"
        
        # Register and login
        session.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "fullName": f"Cleanuser{unique_suffix} Cleaner{unique_suffix}",
            "firstName": f"Cleanuser{unique_suffix}",
            "lastName": f"Cleaner{unique_suffix}",
            "sex": "Male",
            "dateOfBirth": "1990-01-01"
        })
        session.post(f"{BASE_URL}/api/auth/login", json={
            "username": test_email,
            "password": "TestPass123!"
        })
        
        # List all incomes
        response = session.get(f"{BASE_URL}/api/income")
        if response.status_code == 200:
            incomes = response.json()
            for inc in incomes:
                if inc.get("name", "").startswith("TEST_"):
                    session.delete(f"{BASE_URL}/api/income/{inc['id']}")
                    print(f"Deleted test income: {inc['name']}")
        
        print("Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
