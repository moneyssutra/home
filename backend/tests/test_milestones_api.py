"""
Test suite for Goal Milestone Notifications feature
Tests the GET /api/goals/{id}/milestones endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestMilestonesAPI:
    """Tests for GET /api/goals/{goal_id}/milestones endpoint"""
    
    def test_milestones_endpoint_exists(self):
        """Test that the milestones endpoint exists and is accessible"""
        # First get a goal ID
        goals_response = requests.get(f"{BASE_URL}/api/goals")
        assert goals_response.status_code == 200
        goals = goals_response.json()
        assert len(goals) > 0, "Need at least one goal to test milestones"
        
        goal_id = goals[0]['id']
        response = requests.get(f"{BASE_URL}/api/goals/{goal_id}/milestones")
        assert response.status_code == 200
        print(f"PASS: Milestones endpoint accessible for goal {goal_id}")

    def test_milestones_response_structure(self):
        """Test that milestones endpoint returns correct response structure"""
        goals_response = requests.get(f"{BASE_URL}/api/goals")
        goals = goals_response.json()
        goal_id = goals[0]['id']
        
        response = requests.get(f"{BASE_URL}/api/goals/{goal_id}/milestones")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check required fields exist
        assert "goalId" in data, "Missing goalId in response"
        assert "goalName" in data, "Missing goalName in response"
        assert "progressPercent" in data, "Missing progressPercent in response"
        assert "currentAmount" in data, "Missing currentAmount in response"
        assert "targetAmount" in data, "Missing targetAmount in response"
        assert "reachedMilestones" in data, "Missing reachedMilestones in response"
        assert "newlyReached" in data, "Missing newlyReached in response"
        assert "isCompleted" in data, "Missing isCompleted in response"
        
        # Check data types
        assert isinstance(data["reachedMilestones"], list), "reachedMilestones should be a list"
        assert isinstance(data["newlyReached"], list), "newlyReached should be a list"
        assert isinstance(data["progressPercent"], (int, float)), "progressPercent should be numeric"
        
        print(f"PASS: Milestones response structure correct")
        print(f"  - Goal: {data['goalName']}")
        print(f"  - Progress: {data['progressPercent']}%")
        print(f"  - Reached Milestones: {data['reachedMilestones']}")
        print(f"  - Newly Reached: {data['newlyReached']}")

    def test_cc_closure_goal_milestones(self):
        """Test CC Closure goal which has 30% progress and 25% milestone already reached"""
        goals_response = requests.get(f"{BASE_URL}/api/goals")
        goals = goals_response.json()
        
        # Find CC Closure goal
        cc_closure = None
        for goal in goals:
            if goal.get('goalName') == 'CC Closure':
                cc_closure = goal
                break
        
        assert cc_closure is not None, "CC Closure goal not found"
        goal_id = cc_closure['id']
        
        response = requests.get(f"{BASE_URL}/api/goals/{goal_id}/milestones")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify 25% milestone is already reached
        assert 25 in data['reachedMilestones'], "25% milestone should be reached for CC Closure (30% progress)"
        
        # Since milestone was already stored, newlyReached should be empty
        assert data['newlyReached'] == [], "newlyReached should be empty since 25% was already stored"
        
        # Verify progress percentage is around 30%
        assert data['progressPercent'] >= 25, f"Progress should be >= 25%, got {data['progressPercent']}%"
        
        print(f"PASS: CC Closure goal milestones correct")
        print(f"  - Progress: {data['progressPercent']}%")
        print(f"  - Reached: {data['reachedMilestones']}")
        print(f"  - Newly Reached (should be empty): {data['newlyReached']}")

    def test_milestones_not_reached_for_low_progress_goal(self):
        """Test goal with <25% progress has no milestones reached"""
        goals_response = requests.get(f"{BASE_URL}/api/goals")
        goals = goals_response.json()
        
        # Find a goal with 0% progress (Pay off Car Loan has 0%)
        low_progress_goal = None
        for goal in goals:
            if goal.get('progressPercent', 100) < 25:
                low_progress_goal = goal
                break
        
        if not low_progress_goal:
            pytest.skip("No low-progress goal found for testing")
        
        goal_id = low_progress_goal['id']
        response = requests.get(f"{BASE_URL}/api/goals/{goal_id}/milestones")
        assert response.status_code == 200
        
        data = response.json()
        
        # No milestones should be reached for <25% progress
        assert len(data['reachedMilestones']) == 0, f"No milestones should be reached for {data['progressPercent']}% progress"
        assert len(data['newlyReached']) == 0, "No newly reached for low progress"
        
        print(f"PASS: Low progress goal ({data['goalName']}) has no milestones")
        print(f"  - Progress: {data['progressPercent']}%")
        print(f"  - Reached: {data['reachedMilestones']}")

    def test_milestones_invalid_goal_id(self):
        """Test milestones endpoint with invalid goal ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/goals/invalid-goal-id-12345/milestones")
        assert response.status_code == 404
        print("PASS: Invalid goal ID returns 404")

    def test_milestones_persistence(self):
        """Test that milestones persist after being reached"""
        goals_response = requests.get(f"{BASE_URL}/api/goals")
        goals = goals_response.json()
        
        # Find CC Closure goal (has 25% milestone stored)
        cc_closure = None
        for goal in goals:
            if goal.get('goalName') == 'CC Closure':
                cc_closure = goal
                break
        
        if not cc_closure:
            pytest.skip("CC Closure goal not found")
        
        goal_id = cc_closure['id']
        
        # Call milestones endpoint twice
        response1 = requests.get(f"{BASE_URL}/api/goals/{goal_id}/milestones")
        response2 = requests.get(f"{BASE_URL}/api/goals/{goal_id}/milestones")
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        data1 = response1.json()
        data2 = response2.json()
        
        # Both should have same reached milestones
        assert data1['reachedMilestones'] == data2['reachedMilestones'], "Reached milestones should be consistent"
        
        # Second call should not have newly reached (already stored)
        assert data2['newlyReached'] == [], "Second call should not have newly reached milestones"
        
        print("PASS: Milestones persistence verified")
        print(f"  - First call reached: {data1['reachedMilestones']}")
        print(f"  - Second call reached: {data2['reachedMilestones']}")

    def test_goal_model_has_reached_milestones_field(self):
        """Test that Goal model includes reachedMilestones field"""
        goals_response = requests.get(f"{BASE_URL}/api/goals")
        goals = goals_response.json()
        
        # Check at least one goal has reachedMilestones field
        found_field = False
        for goal in goals:
            if 'reachedMilestones' in goal:
                found_field = True
                assert isinstance(goal['reachedMilestones'], list), "reachedMilestones should be a list"
                print(f"PASS: Goal '{goal['goalName']}' has reachedMilestones: {goal['reachedMilestones']}")
                break
        
        # The field should exist at least in CC Closure goal
        cc_goal = next((g for g in goals if g.get('goalName') == 'CC Closure'), None)
        if cc_goal:
            assert 'reachedMilestones' in cc_goal, "CC Closure should have reachedMilestones field"
            assert 25 in cc_goal['reachedMilestones'], "CC Closure should have 25% milestone reached"
            print(f"PASS: CC Closure reachedMilestones: {cc_goal['reachedMilestones']}")


class TestMilestoneCalculation:
    """Tests for milestone calculation logic"""
    
    def test_milestones_calculated_based_on_progress(self):
        """Verify milestones are correctly identified based on progress percentage"""
        goals_response = requests.get(f"{BASE_URL}/api/goals")
        goals = goals_response.json()
        
        for goal in goals:
            goal_id = goal['id']
            progress = goal.get('progressPercent', 0)
            
            response = requests.get(f"{BASE_URL}/api/goals/{goal_id}/milestones")
            if response.status_code == 200:
                data = response.json()
                reached = data['reachedMilestones']
                
                # Verify logic: milestones should only be reached if progress >= milestone
                if progress >= 25:
                    assert 25 in reached or data['newlyReached'], f"25% should be reached for {progress}% progress"
                if progress >= 50:
                    assert 50 in reached or 50 in data['newlyReached'], f"50% should be reached for {progress}% progress"
                if progress >= 75:
                    assert 75 in reached or 75 in data['newlyReached'], f"75% should be reached for {progress}% progress"
                if progress >= 100:
                    assert 100 in reached or 100 in data['newlyReached'], f"100% should be reached for {progress}% progress"
                
                print(f"PASS: {goal.get('goalName')} - Progress: {progress}%, Milestones: {reached}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
