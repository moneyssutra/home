"""
Test Goal Achievements API endpoint
Tests the /api/goals/achievements endpoint for completed goals with milestone history
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestGoalAchievements:
    """Test suite for /api/goals/achievements endpoint"""

    def test_achievements_endpoint_returns_200(self):
        """Test that achievements endpoint returns 200 status code"""
        response = requests.get(f"{BASE_URL}/api/goals/achievements")
        assert response.status_code == 200
        print("PASS: Achievements endpoint returns 200")

    def test_achievements_response_structure(self):
        """Test that achievements response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/goals/achievements")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check top-level structure
        assert "totalCompleted" in data
        assert "totalAmountAchieved" in data
        assert "averageDurationDays" in data
        assert "achievements" in data
        
        # totalCompleted should be a number
        assert isinstance(data["totalCompleted"], int)
        assert data["totalCompleted"] >= 0
        
        # totalAmountAchieved should be a number
        assert isinstance(data["totalAmountAchieved"], (int, float))
        
        # averageDurationDays should be a number
        assert isinstance(data["averageDurationDays"], (int, float))
        
        # achievements should be a list
        assert isinstance(data["achievements"], list)
        
        print("PASS: Response structure is correct")

    def test_achievement_item_structure(self):
        """Test that each achievement has correct structure"""
        response = requests.get(f"{BASE_URL}/api/goals/achievements")
        assert response.status_code == 200
        
        data = response.json()
        achievements = data.get("achievements", [])
        
        if len(achievements) == 0:
            pytest.skip("No completed goals to test achievement structure")
        
        # Test first achievement
        achievement = achievements[0]
        
        # Required fields
        required_fields = [
            "id", "goalName", "goalType", "targetAmount", "finalAmount",
            "targetDate", "completedDate", "createdAt", "milestoneHistory",
            "reachedMilestones", "durationDays", "priority"
        ]
        
        for field in required_fields:
            assert field in achievement, f"Missing required field: {field}"
        
        # Verify milestone history structure
        milestone_history = achievement.get("milestoneHistory", [])
        assert len(milestone_history) == 4, "milestoneHistory should have 4 entries"
        
        for milestone in milestone_history:
            assert "milestone" in milestone
            assert "reached" in milestone
            assert "label" in milestone
        
        # Check milestone values are 25, 50, 75, 100
        milestone_values = [m["milestone"] for m in milestone_history]
        assert milestone_values == [25, 50, 75, 100], "Milestones should be 25, 50, 75, 100"
        
        # Check reachedMilestones is a list
        assert isinstance(achievement.get("reachedMilestones"), list)
        
        print("PASS: Achievement item structure is correct")

    def test_specific_test_goal_exists(self):
        """Test that the specific test goal created by main agent exists"""
        response = requests.get(f"{BASE_URL}/api/goals/achievements")
        assert response.status_code == 200
        
        data = response.json()
        achievements = data.get("achievements", [])
        
        # Find the test goal by ID
        test_goal_id = "91898baa-5497-44d2-8048-8c7269c7da2d"
        test_goal = next((a for a in achievements if a.get("id") == test_goal_id), None)
        
        if test_goal is None:
            # Try to find by name instead
            test_goal = next((a for a in achievements if "Test Achievement" in a.get("goalName", "")), None)
        
        assert test_goal is not None, "Test goal should exist in achievements"
        
        # Verify the test goal has all milestones reached
        reached = test_goal.get("reachedMilestones", [])
        assert 25 in reached, "25% milestone should be reached"
        assert 50 in reached, "50% milestone should be reached"
        assert 75 in reached, "75% milestone should be reached"
        assert 100 in reached, "100% milestone should be reached"
        
        # Verify it's completed
        assert test_goal.get("completedDate") is not None, "Goal should have completedDate"
        
        print(f"PASS: Test goal found with all milestones: {test_goal.get('goalName')}")

    def test_summary_stats_calculation(self):
        """Test that summary stats are calculated correctly"""
        response = requests.get(f"{BASE_URL}/api/goals/achievements")
        assert response.status_code == 200
        
        data = response.json()
        achievements = data.get("achievements", [])
        
        # Verify totalCompleted matches achievements count
        assert data["totalCompleted"] == len(achievements)
        
        # Verify totalAmountAchieved is sum of finalAmounts
        expected_total = sum(a.get("finalAmount", 0) for a in achievements)
        assert data["totalAmountAchieved"] == expected_total, f"Expected {expected_total}, got {data['totalAmountAchieved']}"
        
        print("PASS: Summary stats are calculated correctly")

    def test_achievements_sorted_by_completion_date(self):
        """Test that achievements are sorted by completion date (most recent first)"""
        response = requests.get(f"{BASE_URL}/api/goals/achievements")
        assert response.status_code == 200
        
        data = response.json()
        achievements = data.get("achievements", [])
        
        if len(achievements) < 2:
            pytest.skip("Need at least 2 achievements to test sorting")
        
        # Check dates are in descending order
        for i in range(len(achievements) - 1):
            date1 = achievements[i].get("completedDate", "")
            date2 = achievements[i + 1].get("completedDate", "")
            if date1 and date2:
                assert date1 >= date2, "Achievements should be sorted by completedDate descending"
        
        print("PASS: Achievements are sorted by completion date")


class TestMilestoneHistoryDisplay:
    """Test milestone history in achievements"""

    def test_milestone_reached_status(self):
        """Test that milestone reached status matches reachedMilestones array"""
        response = requests.get(f"{BASE_URL}/api/goals/achievements")
        assert response.status_code == 200
        
        data = response.json()
        achievements = data.get("achievements", [])
        
        for achievement in achievements:
            reached_milestones = achievement.get("reachedMilestones", [])
            milestone_history = achievement.get("milestoneHistory", [])
            
            for milestone_entry in milestone_history:
                milestone_value = milestone_entry.get("milestone")
                is_reached = milestone_entry.get("reached")
                
                # Verify consistency between milestoneHistory and reachedMilestones
                if milestone_value in reached_milestones:
                    assert is_reached is True, f"Milestone {milestone_value} should be marked as reached"
                else:
                    assert is_reached is False, f"Milestone {milestone_value} should not be marked as reached"
        
        print("PASS: Milestone reached status is consistent")
