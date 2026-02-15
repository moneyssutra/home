"""
Test file for Goals Module API endpoints
Tests: Create Goal, Get Goals, Get Goal by ID, Update Goal, 
Update Progress, Mark Complete, Delete Goal, Dashboard Summary
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGoalsCRUD:
    """Test CRUD operations for Goals API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data IDs for cleanup"""
        self.created_goal_ids = []
        yield
        # Cleanup created goals
        for goal_id in self.created_goal_ids:
            try:
                requests.delete(f"{BASE_URL}/api/goals/{goal_id}")
            except:
                pass
    
    def test_create_wealth_creation_goal(self):
        """Test creating a Wealth Creation goal"""
        target_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        payload = {
            "goalName": "TEST_House Down Payment",
            "goalType": "Wealth Creation",
            "targetAmount": 2500000,
            "targetDate": target_date,
            "priority": 1,
            "linkedInvestmentIds": [],
            "linkedAccountIds": [],
            "autoCalculate": True,
            "manualOverride": False
        }
        
        response = requests.post(f"{BASE_URL}/api/goals", json=payload)
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data["goalName"] == payload["goalName"]
        assert data["goalType"] == "Wealth Creation"
        assert data["targetAmount"] == 2500000
        assert data["priority"] == 1
        assert "id" in data
        
        self.created_goal_ids.append(data["id"])
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/goals/{data['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["goalName"] == payload["goalName"]
        assert fetched["targetAmount"] == 2500000
        print(f"✓ Created Wealth Creation goal: {data['id']}")
    
    def test_create_debt_elimination_goal(self):
        """Test creating a Debt Elimination goal"""
        target_date = (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d")
        payload = {
            "goalName": "TEST_Pay Off Car Loan",
            "goalType": "Debt Elimination",
            "targetAmount": 500000,
            "targetDate": target_date,
            "priority": 1,
            "linkedLoanId": None,
            "linkedCreditCardId": None,
            "autoCalculate": True
        }
        
        response = requests.post(f"{BASE_URL}/api/goals", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["goalType"] == "Debt Elimination"
        assert data["targetAmount"] == 500000
        
        self.created_goal_ids.append(data["id"])
        print(f"✓ Created Debt Elimination goal: {data['id']}")
    
    def test_create_emergency_fund_goal(self):
        """Test creating an Emergency Fund goal"""
        target_date = (datetime.now() + timedelta(days=730)).strftime("%Y-%m-%d")
        payload = {
            "goalName": "TEST_6 Month Emergency Fund",
            "goalType": "Emergency Fund",
            "targetAmount": 600000,
            "targetDate": target_date,
            "priority": 2,
            "linkedAccountIds": [],
            "linkedInvestmentIds": [],
            "autoCalculate": True
        }
        
        response = requests.post(f"{BASE_URL}/api/goals", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["goalType"] == "Emergency Fund"
        assert data["priority"] == 2
        
        self.created_goal_ids.append(data["id"])
        print(f"✓ Created Emergency Fund goal: {data['id']}")
    
    def test_create_investment_target_goal(self):
        """Test creating an Investment Target goal"""
        target_date = (datetime.now() + timedelta(days=1825)).strftime("%Y-%m-%d")  # 5 years
        payload = {
            "goalName": "TEST_1 Crore Investment Portfolio",
            "goalType": "Investment Target",
            "targetAmount": 10000000,
            "targetDate": target_date,
            "priority": 2,
            "linkedInvestmentIds": [],
            "autoCalculate": True
        }
        
        response = requests.post(f"{BASE_URL}/api/goals", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["goalType"] == "Investment Target"
        assert data["targetAmount"] == 10000000
        
        self.created_goal_ids.append(data["id"])
        print(f"✓ Created Investment Target goal: {data['id']}")
    
    def test_create_custom_other_goal(self):
        """Test creating a Custom/Other goal with custom type name"""
        target_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        payload = {
            "goalName": "TEST_Kids Education Fund",
            "goalType": "Other",
            "customTypeName": "Education Savings",
            "targetAmount": 5000000,
            "targetDate": target_date,
            "priority": 3,
            "autoCalculate": True
        }
        
        response = requests.post(f"{BASE_URL}/api/goals", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["goalType"] == "Other"
        assert data["customTypeName"] == "Education Savings"
        
        self.created_goal_ids.append(data["id"])
        print(f"✓ Created Custom/Other goal: {data['id']}")
    
    def test_get_all_goals(self):
        """Test fetching all goals with progress"""
        response = requests.get(f"{BASE_URL}/api/goals")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Check that goals have calculated fields
        for goal in data:
            assert "id" in goal
            assert "goalName" in goal
            assert "goalType" in goal
            assert "targetAmount" in goal
            assert "progressPercent" in goal or goal.get('calculatedAmount') is not None
        
        print(f"✓ Fetched {len(data)} goals")
    
    def test_get_single_goal_with_details(self):
        """Test fetching a single goal with full details"""
        # First create a goal
        target_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        payload = {
            "goalName": "TEST_Get Single Goal Test",
            "goalType": "Wealth Creation",
            "targetAmount": 1000000,
            "targetDate": target_date,
            "priority": 1
        }
        create_response = requests.post(f"{BASE_URL}/api/goals", json=payload)
        assert create_response.status_code == 200
        goal_id = create_response.json()["id"]
        self.created_goal_ids.append(goal_id)
        
        # Fetch the single goal
        response = requests.get(f"{BASE_URL}/api/goals/{goal_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response contains all expected fields
        assert data["id"] == goal_id
        assert data["goalName"] == payload["goalName"]
        assert data["targetAmount"] == 1000000
        assert "progressPercent" in data
        assert "daysRemaining" in data
        assert "calculatedAmount" in data
        assert "calculationMethod" in data
        
        print(f"✓ Fetched goal detail with progress: {data['progressPercent']}%")
    
    def test_get_nonexistent_goal_returns_404(self):
        """Test that fetching non-existent goal returns 404"""
        response = requests.get(f"{BASE_URL}/api/goals/nonexistent-id-12345")
        assert response.status_code == 404
        print("✓ Non-existent goal returns 404")


class TestGoalProgressAndCompletion:
    """Test goal progress updates and completion"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create a goal for testing progress"""
        self.created_goal_ids = []
        
        # Create a test goal
        target_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        payload = {
            "goalName": "TEST_Progress Update Goal",
            "goalType": "Wealth Creation",
            "targetAmount": 100000,
            "targetDate": target_date,
            "priority": 1,
            "manualOverride": False
        }
        response = requests.post(f"{BASE_URL}/api/goals", json=payload)
        if response.status_code == 200:
            self.test_goal_id = response.json()["id"]
            self.created_goal_ids.append(self.test_goal_id)
        
        yield
        
        # Cleanup
        for goal_id in self.created_goal_ids:
            try:
                requests.delete(f"{BASE_URL}/api/goals/{goal_id}")
            except:
                pass
    
    def test_update_goal_progress_manual(self):
        """Test updating goal progress with manual amount"""
        response = requests.patch(
            f"{BASE_URL}/api/goals/{self.test_goal_id}/progress",
            params={"current_amount": 50000}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["currentAmount"] == 50000
        assert "message" in data
        
        # Verify progress persisted
        get_response = requests.get(f"{BASE_URL}/api/goals/{self.test_goal_id}")
        assert get_response.status_code == 200
        goal = get_response.json()
        # Note: manual override sets currentAmount, which is used if > calculated
        print(f"✓ Updated goal progress to ₹50,000")
    
    def test_update_progress_to_completion(self):
        """Test that updating progress to 100% marks goal complete"""
        response = requests.patch(
            f"{BASE_URL}/api/goals/{self.test_goal_id}/progress",
            params={"current_amount": 100000}  # Full target amount
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["currentAmount"] == 100000
        assert "completed" in data["message"].lower()
        
        # Verify goal is marked complete
        get_response = requests.get(f"{BASE_URL}/api/goals/{self.test_goal_id}")
        goal = get_response.json()
        assert goal["isCompleted"] == True
        assert goal.get("completedDate") is not None
        print("✓ Goal automatically marked complete at 100% progress")
    
    def test_mark_goal_complete_manually(self):
        """Test marking a goal as complete manually"""
        # Create a fresh goal
        target_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        payload = {
            "goalName": "TEST_Manual Complete Goal",
            "goalType": "Emergency Fund",
            "targetAmount": 200000,
            "targetDate": target_date,
            "priority": 2
        }
        create_response = requests.post(f"{BASE_URL}/api/goals", json=payload)
        goal_id = create_response.json()["id"]
        self.created_goal_ids.append(goal_id)
        
        # Mark complete
        response = requests.patch(f"{BASE_URL}/api/goals/{goal_id}/complete")
        
        assert response.status_code == 200
        data = response.json()
        assert "completed" in data["message"].lower()
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/goals/{goal_id}")
        goal = get_response.json()
        assert goal["isCompleted"] == True
        print("✓ Goal marked as complete manually")


class TestGoalUpdate:
    """Test goal update operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.created_goal_ids = []
        yield
        for goal_id in self.created_goal_ids:
            try:
                requests.delete(f"{BASE_URL}/api/goals/{goal_id}")
            except:
                pass
    
    def test_update_goal_details(self):
        """Test updating goal name, amount, and priority"""
        # Create goal
        target_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        payload = {
            "goalName": "TEST_Original Goal Name",
            "goalType": "Wealth Creation",
            "targetAmount": 500000,
            "targetDate": target_date,
            "priority": 2
        }
        create_response = requests.post(f"{BASE_URL}/api/goals", json=payload)
        goal_id = create_response.json()["id"]
        self.created_goal_ids.append(goal_id)
        
        # Update goal
        updated_payload = {
            "goalName": "TEST_Updated Goal Name",
            "goalType": "Wealth Creation",
            "targetAmount": 750000,
            "targetDate": target_date,
            "priority": 1,
            "notes": "Updated notes"
        }
        
        response = requests.put(f"{BASE_URL}/api/goals/{goal_id}", json=updated_payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["goalName"] == "TEST_Updated Goal Name"
        assert data["targetAmount"] == 750000
        assert data["priority"] == 1
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/goals/{goal_id}")
        goal = get_response.json()
        assert goal["goalName"] == "TEST_Updated Goal Name"
        assert goal["targetAmount"] == 750000
        print("✓ Goal details updated successfully")


class TestGoalDelete:
    """Test goal delete operations"""
    
    def test_delete_goal(self):
        """Test deleting a goal"""
        # Create goal
        target_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        payload = {
            "goalName": "TEST_Goal to Delete",
            "goalType": "Other",
            "customTypeName": "Test",
            "targetAmount": 100000,
            "targetDate": target_date
        }
        create_response = requests.post(f"{BASE_URL}/api/goals", json=payload)
        goal_id = create_response.json()["id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/goals/{goal_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "deleted" in data["message"].lower()
        
        # Verify deleted
        get_response = requests.get(f"{BASE_URL}/api/goals/{goal_id}")
        assert get_response.status_code == 404
        print("✓ Goal deleted successfully")
    
    def test_delete_nonexistent_goal(self):
        """Test deleting non-existent goal returns 404"""
        response = requests.delete(f"{BASE_URL}/api/goals/nonexistent-id-99999")
        assert response.status_code == 404
        print("✓ Delete non-existent goal returns 404")


class TestGoalsDashboardSummary:
    """Test dashboard summary endpoint"""
    
    def test_get_dashboard_summary(self):
        """Test fetching goals dashboard summary"""
        response = requests.get(f"{BASE_URL}/api/goals/summary/dashboard")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "totalActiveGoals" in data
        assert "completedGoals" in data
        assert "goals" in data
        assert isinstance(data["goals"], list)
        
        # Goals should have progress info
        for goal in data["goals"]:
            assert "goalName" in goal
            assert "progressPercent" in goal
        
        print(f"✓ Dashboard summary: {data['totalActiveGoals']} active, {data['completedGoals']} completed")


class TestGoalValidation:
    """Test goal validation and edge cases"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.created_goal_ids = []
        yield
        for goal_id in self.created_goal_ids:
            try:
                requests.delete(f"{BASE_URL}/api/goals/{goal_id}")
            except:
                pass
    
    def test_create_goal_with_all_priorities(self):
        """Test creating goals with all priority levels"""
        target_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        
        for priority in [1, 2, 3]:
            payload = {
                "goalName": f"TEST_Priority {priority} Goal",
                "goalType": "Wealth Creation",
                "targetAmount": 100000,
                "targetDate": target_date,
                "priority": priority
            }
            response = requests.post(f"{BASE_URL}/api/goals", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert data["priority"] == priority
            self.created_goal_ids.append(data["id"])
        
        print("✓ All priority levels (1, 2, 3) work correctly")
    
    def test_create_goal_with_manual_override(self):
        """Test creating goal with manual override enabled"""
        target_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        payload = {
            "goalName": "TEST_Manual Override Goal",
            "goalType": "Emergency Fund",
            "targetAmount": 500000,
            "currentAmount": 150000,
            "targetDate": target_date,
            "priority": 1,
            "manualOverride": True,
            "autoCalculate": False
        }
        
        response = requests.post(f"{BASE_URL}/api/goals", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["manualOverride"] == True
        assert data["currentAmount"] == 150000
        
        self.created_goal_ids.append(data["id"])
        print("✓ Manual override goal created with current amount")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
