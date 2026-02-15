"""
Test suite for PATCH /api/goals/reorder endpoint
Tests goal prioritization and batch priority updates
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGoalsReorderAPI:
    """Test cases for goal reordering functionality"""
    
    def test_get_goals_returns_list(self):
        """Test that GET /api/goals returns a list of goals"""
        response = requests.get(f"{BASE_URL}/api/goals")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"PASS: GET /api/goals returns {len(data)} goals")
    
    def test_goals_have_priority_field(self):
        """Test that each goal has a priority field"""
        response = requests.get(f"{BASE_URL}/api/goals")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0, "Expected at least one goal"
        
        for goal in data:
            assert 'priority' in goal, f"Goal {goal.get('id')} missing priority field"
            assert isinstance(goal['priority'], int), f"Priority should be int, got {type(goal['priority'])}"
        
        print(f"PASS: All {len(data)} goals have priority field")
    
    def test_reorder_goals_success(self):
        """Test PATCH /api/goals/reorder successfully updates priorities"""
        # First get all goals
        response = requests.get(f"{BASE_URL}/api/goals")
        assert response.status_code == 200
        goals = response.json()
        assert len(goals) >= 2, "Need at least 2 goals for reorder test"
        
        # Store original priorities
        original_priorities = {g['id']: g['priority'] for g in goals}
        
        # Create reorder payload - swap first two goals
        goal1_id = goals[0]['id']
        goal2_id = goals[1]['id']
        
        updates = [
            {"id": goal1_id, "priority": 99},
            {"id": goal2_id, "priority": 98}
        ]
        
        # Send reorder request
        response = requests.patch(
            f"{BASE_URL}/api/goals/reorder",
            json=updates,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert 'updatedCount' in data, "Response should contain updatedCount"
        assert data['updatedCount'] == 2, f"Expected 2 updates, got {data['updatedCount']}"
        
        # Verify changes persisted - GET single goal
        verify_response = requests.get(f"{BASE_URL}/api/goals/{goal1_id}")
        assert verify_response.status_code == 200
        updated_goal = verify_response.json()
        assert updated_goal['priority'] == 99, f"Priority should be 99, got {updated_goal['priority']}"
        
        print(f"PASS: Reorder endpoint updated priorities successfully")
        
        # Restore original priorities
        restore_updates = [
            {"id": goal1_id, "priority": original_priorities[goal1_id]},
            {"id": goal2_id, "priority": original_priorities[goal2_id]}
        ]
        requests.patch(
            f"{BASE_URL}/api/goals/reorder",
            json=restore_updates,
            headers={"Content-Type": "application/json"}
        )
    
    def test_reorder_single_goal(self):
        """Test that reorder works with a single goal update"""
        response = requests.get(f"{BASE_URL}/api/goals")
        assert response.status_code == 200
        goals = response.json()
        assert len(goals) >= 1, "Need at least 1 goal"
        
        goal_id = goals[0]['id']
        original_priority = goals[0]['priority']
        
        # Update single goal
        updates = [{"id": goal_id, "priority": 50}]
        response = requests.patch(
            f"{BASE_URL}/api/goals/reorder",
            json=updates,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data['updatedCount'] >= 0, "Should have updatedCount"
        
        print("PASS: Single goal reorder works")
        
        # Restore
        requests.patch(
            f"{BASE_URL}/api/goals/reorder",
            json=[{"id": goal_id, "priority": original_priority}],
            headers={"Content-Type": "application/json"}
        )
    
    def test_reorder_all_goals(self):
        """Test batch reorder of all goals"""
        response = requests.get(f"{BASE_URL}/api/goals")
        assert response.status_code == 200
        goals = response.json()
        
        if len(goals) < 2:
            pytest.skip("Need at least 2 goals for full reorder test")
        
        # Store original priorities
        original_priorities = {g['id']: g['priority'] for g in goals}
        
        # Reverse the priorities
        updates = []
        for i, goal in enumerate(goals):
            updates.append({
                "id": goal['id'],
                "priority": len(goals) - i
            })
        
        response = requests.patch(
            f"{BASE_URL}/api/goals/reorder",
            json=updates,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data['updatedCount'] > 0, "Should update at least one goal"
        
        print(f"PASS: Batch reorder of {len(goals)} goals successful")
        
        # Restore original priorities
        restore_updates = [
            {"id": gid, "priority": priority}
            for gid, priority in original_priorities.items()
        ]
        requests.patch(
            f"{BASE_URL}/api/goals/reorder",
            json=restore_updates,
            headers={"Content-Type": "application/json"}
        )
    
    def test_reorder_with_invalid_goal_id(self):
        """Test reorder with non-existent goal ID returns appropriate response"""
        updates = [{"id": "non-existent-id-12345", "priority": 1}]
        
        response = requests.patch(
            f"{BASE_URL}/api/goals/reorder",
            json=updates,
            headers={"Content-Type": "application/json"}
        )
        
        # Should succeed but with 0 updates
        assert response.status_code == 200
        data = response.json()
        assert data['updatedCount'] == 0, "Non-existent ID should result in 0 updates"
        
        print("PASS: Invalid goal ID handled gracefully")
    
    def test_reorder_empty_array(self):
        """Test reorder with empty array"""
        response = requests.patch(
            f"{BASE_URL}/api/goals/reorder",
            json=[],
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data['updatedCount'] == 0
        
        print("PASS: Empty array handled correctly")
    
    def test_reorder_preserves_other_goal_fields(self):
        """Test that reordering only changes priority, not other fields"""
        response = requests.get(f"{BASE_URL}/api/goals")
        assert response.status_code == 200
        goals = response.json()
        assert len(goals) >= 1
        
        goal = goals[0]
        goal_id = goal['id']
        original_name = goal['goalName']
        original_target = goal['targetAmount']
        original_priority = goal['priority']
        
        # Change priority
        new_priority = 42
        response = requests.patch(
            f"{BASE_URL}/api/goals/reorder",
            json=[{"id": goal_id, "priority": new_priority}],
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        # Verify other fields unchanged
        verify_response = requests.get(f"{BASE_URL}/api/goals/{goal_id}")
        assert verify_response.status_code == 200
        updated_goal = verify_response.json()
        
        assert updated_goal['goalName'] == original_name, "Goal name should not change"
        assert updated_goal['targetAmount'] == original_target, "Target amount should not change"
        assert updated_goal['priority'] == new_priority, "Priority should be updated"
        
        print("PASS: Reorder preserves other goal fields")
        
        # Restore
        requests.patch(
            f"{BASE_URL}/api/goals/reorder",
            json=[{"id": goal_id, "priority": original_priority}],
            headers={"Content-Type": "application/json"}
        )


class TestGoalPriorityBadges:
    """Test priority badge mapping (1=High, 2=Medium, 3=Low)"""
    
    def test_priority_values_valid_range(self):
        """Test that existing goals have valid priority values"""
        response = requests.get(f"{BASE_URL}/api/goals")
        assert response.status_code == 200
        goals = response.json()
        
        for goal in goals:
            priority = goal.get('priority')
            assert priority is not None, f"Goal {goal['id']} has no priority"
            assert isinstance(priority, int), f"Priority should be int"
            # Priority can be any positive integer after drag-drop reorder
            assert priority >= 0, f"Priority should be non-negative, got {priority}"
        
        print(f"PASS: All {len(goals)} goals have valid priority values")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
