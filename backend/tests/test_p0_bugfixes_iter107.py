"""P0 Bug Fixes Testing - Iteration 107
Tests:
1. Expense Data Consistency - Dashboard vs Monthly Summary totals
2. Income Data Consistency - Dashboard vs Income Monthly Summary totals
3. User Profile Switching - FamilyToggle functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@moneyssutra.com"
TEST_PASSWORD = "test"
SESSION_COOKIE = "session_token=63ccd2bc-7749-48fd-89ac-50a341fe7dd1"


@pytest.fixture(scope="module")
def session():
    """Shared requests session with auth cookie."""
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Cookie": SESSION_COOKIE
    })
    return s


class TestExpenseDataConsistency:
    """BUG FIX 1: Dashboard monthlyExpenses should match expenses/monthly-summary total"""

    def test_dashboard_networth_returns_expense_fields(self, session):
        """Verify dashboard returns expensesDone + upcomingExpenses fields."""
        resp = session.get(f"{BASE_URL}/api/dashboard/networth?tz_offset=-330")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        # Required expense fields
        assert "monthlyExpenses" in data, "Missing monthlyExpenses"
        assert "expensesDone" in data, "Missing expensesDone"
        assert "upcomingExpenses" in data, "Missing upcomingExpenses"
        print(f"Dashboard expenses: monthly={data['monthlyExpenses']}, done={data['expensesDone']}, upcoming={data['upcomingExpenses']}")

    def test_expense_monthly_summary_returns_totals(self, session):
        """Verify expense monthly-summary returns total/spentSoFar/upcoming."""
        resp = session.get(f"{BASE_URL}/api/expenses/monthly-summary?tz_offset=-330")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        # Get current month data
        assert "months" in data, "Missing months array"
        months = data["months"]
        assert len(months) > 0, "No monthly data returned"
        
        # Get current month (last in array)
        current = months[-1]
        assert "total" in current, "Missing total in monthly data"
        assert "spentSoFar" in current, "Missing spentSoFar in monthly data"
        assert "upcoming" in current, "Missing upcoming in monthly data"
        print(f"Monthly summary: total={current['total']}, spentSoFar={current['spentSoFar']}, upcoming={current['upcoming']}")
        return current

    def test_dashboard_monthly_expenses_equals_summary_total(self, session):
        """CRITICAL: Dashboard monthlyExpenses should equal monthly-summary total."""
        # Get dashboard data with IST timezone
        dash_resp = session.get(f"{BASE_URL}/api/dashboard/networth?tz_offset=-330")
        assert dash_resp.status_code == 200
        dash_data = dash_resp.json()
        
        # Get monthly summary with same timezone
        summary_resp = session.get(f"{BASE_URL}/api/expenses/monthly-summary?tz_offset=-330")
        assert summary_resp.status_code == 200
        summary_data = summary_resp.json()
        current_month = summary_data["months"][-1]
        
        dashboard_monthly = dash_data["monthlyExpenses"]
        summary_total = current_month["total"]
        
        print(f"Dashboard monthlyExpenses: {dashboard_monthly}")
        print(f"Summary total: {summary_total}")
        
        # Allow small rounding differences (within 1)
        assert abs(dashboard_monthly - summary_total) <= 1, \
            f"MISMATCH: Dashboard monthlyExpenses ({dashboard_monthly}) != Summary total ({summary_total})"

    def test_expenses_done_plus_upcoming_equals_monthly(self, session):
        """CRITICAL: expensesDone + upcomingExpenses should equal monthlyExpenses."""
        resp = session.get(f"{BASE_URL}/api/dashboard/networth?tz_offset=-330")
        assert resp.status_code == 200
        data = resp.json()
        
        monthly = data["monthlyExpenses"]
        done = data["expensesDone"]
        upcoming = data["upcomingExpenses"]
        calculated_total = done + upcoming
        
        print(f"Monthly: {monthly}, Done: {done}, Upcoming: {upcoming}, Sum: {calculated_total}")
        
        # Allow small rounding differences (within 1)
        assert abs(monthly - calculated_total) <= 1, \
            f"MISMATCH: monthlyExpenses ({monthly}) != expensesDone ({done}) + upcomingExpenses ({upcoming})"


class TestIncomeDataConsistency:
    """BUG FIX 2: Dashboard monthlyIncome should match income/monthly-summary totalIncome"""

    def test_dashboard_networth_returns_income_fields(self, session):
        """Verify dashboard returns income received/expected fields."""
        resp = session.get(f"{BASE_URL}/api/dashboard/networth?tz_offset=-330")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        # Required income fields
        assert "monthlyIncome" in data, "Missing monthlyIncome"
        assert "incomeReceived" in data, "Missing incomeReceived"
        assert "expectedIncome" in data, "Missing expectedIncome"
        print(f"Dashboard income: monthly={data['monthlyIncome']}, received={data['incomeReceived']}, expected={data['expectedIncome']}")

    def test_income_monthly_summary_returns_totals(self, session):
        """Verify income monthly-summary endpoint exists and returns totals."""
        resp = session.get(f"{BASE_URL}/api/income/monthly-summary?tz_offset=-330")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        # Required fields
        assert "totalIncome" in data, "Missing totalIncome"
        assert "receivedIncome" in data, "Missing receivedIncome"
        assert "pendingIncome" in data, "Missing pendingIncome"
        print(f"Income summary: total={data['totalIncome']}, received={data['receivedIncome']}, pending={data['pendingIncome']}")
        return data

    def test_dashboard_monthly_income_equals_summary_total(self, session):
        """CRITICAL: Dashboard monthlyIncome should equal income/monthly-summary totalIncome."""
        # Get dashboard data
        dash_resp = session.get(f"{BASE_URL}/api/dashboard/networth?tz_offset=-330")
        assert dash_resp.status_code == 200
        dash_data = dash_resp.json()
        
        # Get income summary with same timezone
        summary_resp = session.get(f"{BASE_URL}/api/income/monthly-summary?tz_offset=-330")
        assert summary_resp.status_code == 200
        summary_data = summary_resp.json()
        
        dashboard_monthly = dash_data["monthlyIncome"]
        summary_total = summary_data["totalIncome"]
        
        print(f"Dashboard monthlyIncome: {dashboard_monthly}")
        print(f"Income Summary totalIncome: {summary_total}")
        
        # Allow small rounding differences (within 1)
        assert abs(dashboard_monthly - summary_total) <= 1, \
            f"MISMATCH: Dashboard monthlyIncome ({dashboard_monthly}) != Income Summary totalIncome ({summary_total})"

    def test_income_received_matches_dashboard(self, session):
        """CRITICAL: Dashboard incomeReceived should match income/monthly-summary receivedIncome."""
        dash_resp = session.get(f"{BASE_URL}/api/dashboard/networth?tz_offset=-330")
        assert dash_resp.status_code == 200
        dash_data = dash_resp.json()
        
        summary_resp = session.get(f"{BASE_URL}/api/income/monthly-summary?tz_offset=-330")
        assert summary_resp.status_code == 200
        summary_data = summary_resp.json()
        
        dashboard_received = dash_data["incomeReceived"]
        summary_received = summary_data["receivedIncome"]
        
        print(f"Dashboard incomeReceived: {dashboard_received}")
        print(f"Income Summary receivedIncome: {summary_received}")
        
        # Allow small rounding differences (within 1)
        assert abs(dashboard_received - summary_received) <= 1, \
            f"MISMATCH: Dashboard incomeReceived ({dashboard_received}) != Summary receivedIncome ({summary_received})"

    def test_income_expected_matches_pending(self, session):
        """CRITICAL: Dashboard expectedIncome should match income/monthly-summary pendingIncome."""
        dash_resp = session.get(f"{BASE_URL}/api/dashboard/networth?tz_offset=-330")
        assert dash_resp.status_code == 200
        dash_data = dash_resp.json()
        
        summary_resp = session.get(f"{BASE_URL}/api/income/monthly-summary?tz_offset=-330")
        assert summary_resp.status_code == 200
        summary_data = summary_resp.json()
        
        dashboard_expected = dash_data["expectedIncome"]
        summary_pending = summary_data["pendingIncome"]
        
        print(f"Dashboard expectedIncome: {dashboard_expected}")
        print(f"Income Summary pendingIncome: {summary_pending}")
        
        # Allow small rounding differences (within 1)
        assert abs(dashboard_expected - summary_pending) <= 1, \
            f"MISMATCH: Dashboard expectedIncome ({dashboard_expected}) != Summary pendingIncome ({summary_pending})"


class TestFamilyProfileSwitching:
    """BUG FIX 3: FamilyToggle switching should work correctly"""

    def test_family_endpoint_returns_data(self, session):
        """Verify family endpoint works."""
        resp = session.get(f"{BASE_URL}/api/family")
        # It's okay if no family exists (404 or empty) - just verify endpoint works
        assert resp.status_code in [200, 404], f"Failed: {resp.status_code} {resp.text}"
        if resp.status_code == 200:
            data = resp.json()
            print(f"Family data: {data}")
        else:
            print("No family exists for this user (expected for new users)")

    def test_dashboard_works_without_family_context(self, session):
        """Verify dashboard works in personal mode (no family member selected)."""
        resp = session.get(f"{BASE_URL}/api/dashboard/networth?tz_offset=-330")
        assert resp.status_code == 200, f"Dashboard failed: {resp.text}"
        data = resp.json()
        assert "netWorth" in data
        print(f"Dashboard in personal mode: netWorth={data['netWorth']}")


class TestTimezoneConsistency:
    """Additional tests to verify timezone offset handling"""

    def test_same_tz_offset_gives_consistent_results(self, session):
        """Verify same tz_offset gives consistent results across endpoints."""
        tz_offset = -330  # IST
        
        # Get all three endpoints with same timezone
        dash = session.get(f"{BASE_URL}/api/dashboard/networth?tz_offset={tz_offset}").json()
        exp_summary = session.get(f"{BASE_URL}/api/expenses/monthly-summary?tz_offset={tz_offset}").json()
        inc_summary = session.get(f"{BASE_URL}/api/income/monthly-summary?tz_offset={tz_offset}").json()
        
        # Verify consistency
        current_month = exp_summary["months"][-1]
        
        print(f"\n=== Consistency Check (tz_offset={tz_offset}) ===")
        print(f"Dashboard monthlyExpenses: {dash['monthlyExpenses']}")
        print(f"Expense Summary total: {current_month['total']}")
        print(f"Dashboard monthlyIncome: {dash['monthlyIncome']}")
        print(f"Income Summary totalIncome: {inc_summary['totalIncome']}")
        
        # All should match
        assert abs(dash['monthlyExpenses'] - current_month['total']) <= 1
        assert abs(dash['monthlyIncome'] - inc_summary['totalIncome']) <= 1

    def test_utc_timezone_also_consistent(self, session):
        """Verify UTC timezone also gives consistent results."""
        tz_offset = 0  # UTC
        
        dash = session.get(f"{BASE_URL}/api/dashboard/networth?tz_offset={tz_offset}").json()
        exp_summary = session.get(f"{BASE_URL}/api/expenses/monthly-summary?tz_offset={tz_offset}").json()
        inc_summary = session.get(f"{BASE_URL}/api/income/monthly-summary?tz_offset={tz_offset}").json()
        
        current_month = exp_summary["months"][-1]
        
        print(f"\n=== Consistency Check (tz_offset={tz_offset} - UTC) ===")
        print(f"Dashboard monthlyExpenses: {dash['monthlyExpenses']}")
        print(f"Expense Summary total: {current_month['total']}")
        print(f"Dashboard monthlyIncome: {dash['monthlyIncome']}")
        print(f"Income Summary totalIncome: {inc_summary['totalIncome']}")
        
        assert abs(dash['monthlyExpenses'] - current_month['total']) <= 1
        assert abs(dash['monthlyIncome'] - inc_summary['totalIncome']) <= 1
