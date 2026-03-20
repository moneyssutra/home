"""
Test iteration 156 bug fixes:
1. Investment cards '00' fix - verify principal > 0 check in MyInvestments.js
2. Expense due date format - verify parseDueDay and formatOrdinal helpers
3. Backend parse_due_day utility - test various input formats
4. Combined intelligence endpoint - verify gamification data structure
5. Expense sorting by due day within status groups
"""
import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Session tokens from previous iterations
USER_SESSION_CHANDRASHEKHAR = "9ec37623-73ff-43a1-908e-056a333e0bac"


class TestParseDueDayUtility:
    """Test the parse_due_day utility function logic"""
    
    def test_parse_due_day_simple_number(self):
        """Test parsing simple day numbers like '28', '5'"""
        # Import the utility function
        import sys
        sys.path.insert(0, '/app/backend')
        from routes.utils import parse_due_day
        
        # Simple numbers
        assert parse_due_day('28') == 28
        assert parse_due_day('5') == 5
        assert parse_due_day('1') == 1
        assert parse_due_day('31') == 31
        print("PASS: parse_due_day handles simple numbers correctly")
    
    def test_parse_due_day_full_date(self):
        """Test parsing full date formats like '2024-01-28'"""
        import sys
        sys.path.insert(0, '/app/backend')
        from routes.utils import parse_due_day
        
        # Full date formats
        assert parse_due_day('2024-01-28') == 28
        assert parse_due_day('2026-03-15') == 15
        assert parse_due_day('2025-12-01') == 1
        print("PASS: parse_due_day handles full date formats correctly")
    
    def test_parse_due_day_edge_cases(self):
        """Test edge cases: empty, None, invalid"""
        import sys
        sys.path.insert(0, '/app/backend')
        from routes.utils import parse_due_day
        
        # Edge cases
        assert parse_due_day('') == 0
        assert parse_due_day(None) == 0
        assert parse_due_day('abc') == 0
        assert parse_due_day('0') == 0  # 0 is not a valid day
        assert parse_due_day('32') == 0  # 32 is not a valid day
        print("PASS: parse_due_day handles edge cases correctly")
    
    def test_parse_due_day_whitespace(self):
        """Test parsing with whitespace"""
        import sys
        sys.path.insert(0, '/app/backend')
        from routes.utils import parse_due_day
        
        assert parse_due_day(' 28 ') == 28
        assert parse_due_day('  15  ') == 15
        print("PASS: parse_due_day handles whitespace correctly")


class TestCombinedIntelligenceEndpoint:
    """Test the combined/intelligence endpoint structure"""
    
    @pytest.fixture
    def auth_session(self):
        session = requests.Session()
        session.cookies.set('session_token', USER_SESSION_CHANDRASHEKHAR)
        session.headers.update({'Content-Type': 'application/json'})
        return session
    
    def test_combined_intelligence_returns_200(self, auth_session):
        """Test that combined/intelligence endpoint returns 200"""
        response = auth_session.get(f"{BASE_URL}/api/combined/intelligence")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/combined/intelligence returns 200")
    
    def test_combined_intelligence_has_gamification(self, auth_session):
        """Test that response includes gamification data"""
        response = auth_session.get(f"{BASE_URL}/api/combined/intelligence")
        assert response.status_code == 200
        data = response.json()
        
        assert 'gamification' in data, "Response missing 'gamification' key"
        gam = data['gamification']
        assert gam is not None, "gamification is None"
        print(f"PASS: gamification data present: {list(gam.keys()) if isinstance(gam, dict) else 'not a dict'}")
    
    def test_combined_intelligence_gamification_has_achievements(self, auth_session):
        """Test that gamification includes allAchievements array"""
        response = auth_session.get(f"{BASE_URL}/api/combined/intelligence")
        assert response.status_code == 200
        data = response.json()
        
        gam = data.get('gamification', {})
        assert 'allAchievements' in gam, "gamification missing 'allAchievements' key"
        achievements = gam['allAchievements']
        assert isinstance(achievements, list), "allAchievements should be a list"
        print(f"PASS: allAchievements is a list with {len(achievements)} items")
    
    def test_combined_intelligence_has_survival_clock(self, auth_session):
        """Test that response includes survivalClock data"""
        response = auth_session.get(f"{BASE_URL}/api/combined/intelligence")
        assert response.status_code == 200
        data = response.json()
        
        assert 'survivalClock' in data, "Response missing 'survivalClock' key"
        clock = data['survivalClock']
        assert clock is not None, "survivalClock is None"
        
        # Check key fields
        assert 'survivalDays' in clock, "survivalClock missing 'survivalDays'"
        assert 'effectiveFunds' in clock, "survivalClock missing 'effectiveFunds'"
        print(f"PASS: survivalClock present with survivalDays={clock.get('survivalDays')}")
    
    def test_combined_intelligence_has_control_score(self, auth_session):
        """Test that response includes controlScore data"""
        response = auth_session.get(f"{BASE_URL}/api/combined/intelligence")
        assert response.status_code == 200
        data = response.json()
        
        assert 'controlScore' in data, "Response missing 'controlScore' key"
        score = data['controlScore']
        assert score is not None, "controlScore is None"
        
        # Check key fields
        assert 'finalScore' in score, "controlScore missing 'finalScore'"
        assert 'grade' in score, "controlScore missing 'grade'"
        print(f"PASS: controlScore present with finalScore={score.get('finalScore')}, grade={score.get('grade')}")
    
    def test_combined_intelligence_has_challenges(self, auth_session):
        """Test that response includes challenges data"""
        response = auth_session.get(f"{BASE_URL}/api/combined/intelligence")
        assert response.status_code == 200
        data = response.json()
        
        assert 'challenges' in data, "Response missing 'challenges' key"
        challenges = data['challenges']
        assert challenges is not None, "challenges is None"
        print(f"PASS: challenges data present")


class TestExpensesByMonthEndpoint:
    """Test the expenses/by-month endpoint for selectedDate enrichment"""
    
    @pytest.fixture
    def auth_session(self):
        session = requests.Session()
        session.cookies.set('session_token', USER_SESSION_CHANDRASHEKHAR)
        session.headers.update({'Content-Type': 'application/json'})
        return session
    
    def test_expenses_by_month_returns_200(self, auth_session):
        """Test that expenses/by-month endpoint returns 200"""
        response = auth_session.get(f"{BASE_URL}/api/expenses/by-month")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/expenses/by-month returns 200")
    
    def test_expenses_by_month_returns_list(self, auth_session):
        """Test that response is a list of expenses"""
        response = auth_session.get(f"{BASE_URL}/api/expenses/by-month")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: expenses/by-month returns list with {len(data)} items")
    
    def test_expenses_have_display_status(self, auth_session):
        """Test that expenses have _displayStatus field"""
        response = auth_session.get(f"{BASE_URL}/api/expenses/by-month")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            for exp in data[:5]:  # Check first 5
                assert '_displayStatus' in exp, f"Expense {exp.get('id')} missing '_displayStatus'"
            print(f"PASS: Expenses have _displayStatus field")
        else:
            print("SKIP: No expenses to check")


class TestFrontendCodeVerification:
    """Verify frontend code fixes are in place"""
    
    def test_my_investments_principal_check(self):
        """Verify MyInvestments.js uses 'principal > 0' instead of 'principal &&'"""
        with open('/app/frontend/src/MyInvestments.js', 'r') as f:
            content = f.read()
        
        # Check that the fix is in place (principal > 0)
        assert 'investment.principal > 0' in content, "MyInvestments.js should use 'investment.principal > 0'"
        
        # Check that the old pattern is NOT present (investment.principal && followed by display)
        # The old pattern was: {investment.principal && (
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'investment.principal &&' in line and 'investment.principal > 0' not in line:
                # This is the old buggy pattern
                pytest.fail(f"Line {i+1} still has old pattern: {line.strip()}")
        
        print("PASS: MyInvestments.js uses 'principal > 0' check correctly")
    
    def test_my_expenses_has_parse_due_day(self):
        """Verify MyExpenses.js has parseDueDay helper function"""
        with open('/app/frontend/src/MyExpenses.js', 'r') as f:
            content = f.read()
        
        assert 'const parseDueDay' in content, "MyExpenses.js should have parseDueDay function"
        assert 'const formatOrdinal' in content, "MyExpenses.js should have formatOrdinal function"
        print("PASS: MyExpenses.js has parseDueDay and formatOrdinal helpers")
    
    def test_my_expenses_uses_format_ordinal(self):
        """Verify MyExpenses.js uses formatOrdinal for due date display"""
        with open('/app/frontend/src/MyExpenses.js', 'r') as f:
            content = f.read()
        
        # Check that formatOrdinal is used for displaying due dates
        assert 'formatOrdinal(dueDay)' in content, "MyExpenses.js should use formatOrdinal for due date display"
        assert 'Due:' in content, "MyExpenses.js should show 'Due:' label"
        print("PASS: MyExpenses.js uses formatOrdinal for due date display")
    
    def test_my_expenses_sorts_by_due_day(self):
        """Verify MyExpenses.js sorts expenses by due day within status groups"""
        with open('/app/frontend/src/MyExpenses.js', 'r') as f:
            content = f.read()
        
        # Check that sorting uses parseDueDay
        assert 'parseDueDay(a.selectedDate)' in content, "MyExpenses.js should sort using parseDueDay"
        assert 'parseDueDay(b.selectedDate)' in content, "MyExpenses.js should sort using parseDueDay"
        print("PASS: MyExpenses.js sorts expenses by due day")
    
    def test_my_expenses_card_alignment(self):
        """Verify MyExpenses.js uses items-start for card alignment"""
        with open('/app/frontend/src/MyExpenses.js', 'r') as f:
            content = f.read()
        
        # Check for items-start in expense card button
        assert 'items-start' in content, "MyExpenses.js should use items-start for card alignment"
        print("PASS: MyExpenses.js uses items-start for card alignment")
    
    def test_insights_challenges_widget_keys(self):
        """Verify Insights.js ChallengesWidget uses correct keys (title, code, difficulty)"""
        with open('/app/frontend/src/Insights.js', 'r') as f:
            content = f.read()
        
        # Check that ChallengesWidget uses the correct keys
        assert 'c.title' in content, "Insights.js ChallengesWidget should use c.title"
        assert 'c.code' in content or 'c.id' in content, "Insights.js ChallengesWidget should use c.code or c.id"
        assert 'c.difficulty' in content, "Insights.js ChallengesWidget should use c.difficulty"
        print("PASS: Insights.js ChallengesWidget uses correct keys")


class TestBackendUtilsIntegration:
    """Test backend utils integration in expense routes"""
    
    def test_expenses_route_imports_parse_due_day(self):
        """Verify expenses.py imports parse_due_day from utils"""
        with open('/app/backend/routes/expenses.py', 'r') as f:
            content = f.read()
        
        assert 'from routes.utils import' in content, "expenses.py should import from routes.utils"
        assert 'parse_due_day' in content, "expenses.py should import parse_due_day"
        print("PASS: expenses.py imports parse_due_day from utils")
    
    def test_expenses_route_uses_parse_due_day(self):
        """Verify expenses.py uses parse_due_day for selectedDate parsing"""
        with open('/app/backend/routes/expenses.py', 'r') as f:
            content = f.read()
        
        # Check that parse_due_day is used instead of int(selectedDate)
        assert 'parse_due_day(expense.get' in content or 'parse_due_day(exp.get' in content, \
            "expenses.py should use parse_due_day for parsing selectedDate"
        print("PASS: expenses.py uses parse_due_day for selectedDate parsing")
    
    def test_combined_route_calls_gamification_profile(self):
        """Verify combined.py calls get_gamification_profile"""
        with open('/app/backend/routes/combined.py', 'r') as f:
            content = f.read()
        
        assert 'get_gamification_profile' in content, "combined.py should call get_gamification_profile"
        print("PASS: combined.py calls get_gamification_profile")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
