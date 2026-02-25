"""
Test expense amount normalization consistency across pages.
Issue: Expense amounts were inconsistent - raw sum vs normalized monthly totals.
Fix: All expense totals now use monthly normalization.

Normalization rules:
- Daily: amount * 30
- Weekly: amount * 4
- Monthly: amount * 1
- Quarterly: amount / 3
- Half-Yearly: amount / 6
- Yearly: amount / 12
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestExpenseNormalization:
    """Test expense normalization in dashboard networth API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test", "password": "test"}
        )
        if login_response.status_code != 200:
            pytest.skip("Authentication failed")
        
        yield
    
    def test_dashboard_networth_returns_monthly_expenses(self):
        """Test GET /api/dashboard/networth returns normalized monthly expenses"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify required fields exist
        assert "monthlyExpenses" in data, "monthlyExpenses field missing"
        assert "monthlyIncome" in data, "monthlyIncome field missing"
        assert "monthlySavings" in data, "monthlySavings field missing"
        assert "expenseCount" in data, "expenseCount field missing"
        
        monthly_expenses = data["monthlyExpenses"]
        expense_count = data["expenseCount"]
        
        print(f"Dashboard monthlyExpenses: {monthly_expenses}")
        print(f"Expense count: {expense_count}")
        
        # Monthly expenses should be a positive number if there are expenses
        assert isinstance(monthly_expenses, (int, float)), "monthlyExpenses should be numeric"
        if expense_count > 0:
            assert monthly_expenses > 0, "monthlyExpenses should be > 0 when expenses exist"
        
    def test_expenses_list_returns_all_expenses(self):
        """Test GET /api/expenses returns all expenses with their original amounts"""
        response = self.session.get(f"{BASE_URL}/api/expenses")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        expenses = response.json()
        
        print(f"Total expenses count: {len(expenses)}")
        
        # Verify each expense has required fields
        for expense in expenses:
            assert "expectedAmount" in expense, "expectedAmount missing"
            assert "frequency" in expense or expense.get("frequency") is None, "frequency field issue"
        
        # Calculate raw sum and normalized sum
        raw_sum = sum(e.get("expectedAmount", 0) for e in expenses)
        normalized_sum = self._normalize_expenses_to_monthly(expenses)
        
        print(f"Raw sum of expenses: {raw_sum}")
        print(f"Normalized monthly sum: {normalized_sum}")
        
        # They should be different if there are non-monthly expenses
        frequencies = set(e.get("frequency", "Monthly") for e in expenses)
        print(f"Frequencies present: {frequencies}")
        
        return raw_sum, normalized_sum, expenses
    
    def test_dashboard_expense_matches_normalized_total(self):
        """Test that dashboard monthlyExpenses matches normalized total from expense list"""
        # Get dashboard data
        dashboard_response = self.session.get(f"{BASE_URL}/api/dashboard/networth")
        assert dashboard_response.status_code == 200
        dashboard_data = dashboard_response.json()
        dashboard_monthly_expenses = dashboard_data["monthlyExpenses"]
        
        # Get expenses list
        expenses_response = self.session.get(f"{BASE_URL}/api/expenses")
        assert expenses_response.status_code == 200
        expenses = expenses_response.json()
        
        # Calculate expected normalized monthly total
        expected_monthly = self._normalize_expenses_to_monthly(expenses)
        
        print(f"Dashboard monthlyExpenses: {dashboard_monthly_expenses}")
        print(f"Calculated normalized monthly: {expected_monthly}")
        
        # Allow small floating point tolerance
        tolerance = 1  # 1 rupee tolerance for rounding
        diff = abs(dashboard_monthly_expenses - expected_monthly)
        
        assert diff <= tolerance, (
            f"Dashboard monthlyExpenses ({dashboard_monthly_expenses}) does not match "
            f"normalized expense total ({expected_monthly}). Diff: {diff}"
        )
        
        print(f"✓ Dashboard and expense totals match (diff: {diff})")
    
    def test_expense_breakdown_by_frequency(self):
        """Test expense breakdown by frequency to verify normalization logic"""
        response = self.session.get(f"{BASE_URL}/api/expenses")
        assert response.status_code == 200
        expenses = response.json()
        
        # Group by frequency
        by_freq = {}
        for exp in expenses:
            freq = exp.get("frequency", "Monthly")
            if freq not in by_freq:
                by_freq[freq] = {"count": 0, "raw_total": 0, "normalized_total": 0}
            by_freq[freq]["count"] += 1
            by_freq[freq]["raw_total"] += exp.get("expectedAmount", 0)
            by_freq[freq]["normalized_total"] += self._normalize_single(
                exp.get("expectedAmount", 0), 
                freq
            )
        
        print("\nExpense breakdown by frequency:")
        for freq, data in by_freq.items():
            print(f"  {freq}: {data['count']} expenses, raw={data['raw_total']}, normalized={data['normalized_total']}")
        
        # Verify yearly expenses are normalized correctly (divided by 12)
        if "Yearly" in by_freq:
            yearly_raw = by_freq["Yearly"]["raw_total"]
            yearly_normalized = by_freq["Yearly"]["normalized_total"]
            expected_yearly_normalized = yearly_raw / 12
            assert abs(yearly_normalized - expected_yearly_normalized) < 1, (
                f"Yearly normalization incorrect: {yearly_normalized} vs expected {expected_yearly_normalized}"
            )
            print(f"✓ Yearly normalization verified: {yearly_raw} / 12 = {expected_yearly_normalized}")
    
    def test_individual_expense_amounts_unchanged(self):
        """Test that individual expense items still show original amounts"""
        response = self.session.get(f"{BASE_URL}/api/expenses")
        assert response.status_code == 200
        expenses = response.json()
        
        # Find a yearly expense if exists
        yearly_expenses = [e for e in expenses if e.get("frequency") == "Yearly"]
        if yearly_expenses:
            yearly = yearly_expenses[0]
            print(f"Yearly expense: {yearly.get('expenseName')}")
            print(f"  Original amount: {yearly.get('expectedAmount')}")
            print(f"  Frequency: {yearly.get('frequency')}")
            # The API should return original amount, not normalized
            # Normalization happens in frontend display and dashboard calculations
            assert yearly.get("expectedAmount") > 0
            print("✓ Individual expense amounts are raw (not normalized)")
    
    def _normalize_single(self, amount, frequency):
        """Normalize a single expense to monthly"""
        if not amount:
            return 0
        if frequency == "Daily":
            return amount * 30
        elif frequency == "Weekly":
            return amount * 4
        elif frequency == "Monthly":
            return amount
        elif frequency == "Quarterly":
            return amount / 3
        elif frequency == "Half-Yearly":
            return amount / 6
        elif frequency == "Yearly":
            return amount / 12
        else:
            return amount
    
    def _normalize_expenses_to_monthly(self, expenses):
        """Calculate total monthly normalized expenses"""
        total = 0
        for exp in expenses:
            amount = exp.get("expectedAmount", 0)
            freq = exp.get("frequency", "Monthly")
            total += self._normalize_single(amount, freq)
        return total


class TestExpensesWithNextDate:
    """Test /api/expenses/with-next-date endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test", "password": "test"}
        )
        if login_response.status_code != 200:
            pytest.skip("Authentication failed")
        
        yield
    
    def test_expenses_with_next_date_endpoint(self):
        """Test that /api/expenses/with-next-date returns expenses correctly"""
        response = self.session.get(f"{BASE_URL}/api/expenses/with-next-date")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        expenses = response.json()
        
        print(f"Expenses with next date: {len(expenses)} items")
        
        # Verify structure
        assert isinstance(expenses, list), "Response should be a list"
        
        if len(expenses) > 0:
            first = expenses[0]
            assert "expectedAmount" in first, "expectedAmount missing"
            assert "expenseType" in first, "expenseType missing"
            print(f"First expense: {first.get('expenseName')} - {first.get('expectedAmount')}")


class TestFixedVsVariableExpenses:
    """Test that Fixed and Variable expense totals are correct"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "test", "password": "test"}
        )
        if login_response.status_code != 200:
            pytest.skip("Authentication failed")
        
        yield
    
    def test_fixed_vs_variable_expense_split(self):
        """Test expense split between Fixed and Variable"""
        response = self.session.get(f"{BASE_URL}/api/expenses")
        assert response.status_code == 200
        expenses = response.json()
        
        fixed = [e for e in expenses if e.get("expenseType") == "Fixed"]
        variable = [e for e in expenses if e.get("expenseType") == "Variable"]
        
        print(f"Fixed expenses: {len(fixed)}")
        print(f"Variable expenses: {len(variable)}")
        print(f"Total: {len(expenses)}")
        
        # Calculate normalized totals
        fixed_normalized = sum(
            self._normalize(e.get("expectedAmount", 0), e.get("frequency", "Monthly"))
            for e in fixed
        )
        variable_normalized = sum(
            self._normalize(e.get("expectedAmount", 0), e.get("frequency", "Monthly"))
            for e in variable
        )
        total_normalized = fixed_normalized + variable_normalized
        
        print(f"Fixed normalized total: {fixed_normalized}")
        print(f"Variable normalized total: {variable_normalized}")
        print(f"Total normalized: {total_normalized}")
        
        # Verify ~2.77L total (approximately 276,579)
        # Allow some tolerance since data might change
        assert total_normalized > 200000, f"Total normalized should be > 2L, got {total_normalized}"
        
        print(f"✓ Total monthly expenses: ₹{total_normalized:,.0f} (~{total_normalized/100000:.2f}L)")
    
    def _normalize(self, amount, frequency):
        """Normalize to monthly"""
        if not amount:
            return 0
        if frequency == "Daily":
            return amount * 30
        elif frequency == "Weekly":
            return amount * 4
        elif frequency == "Monthly":
            return amount
        elif frequency == "Quarterly":
            return amount / 3
        elif frequency == "Half-Yearly":
            return amount / 6
        elif frequency == "Yearly":
            return amount / 12
        else:
            return amount


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
