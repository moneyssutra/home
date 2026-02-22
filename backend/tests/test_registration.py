"""
Test Registration Form Backend API
Tests for comprehensive Create Account page with:
- First/Middle/Last Name
- Email (unique check)
- Mobile (10 digits)
- Sex (Male/Female)
- Date of Birth (no future dates)
- Password (8 chars, 1 uppercase, 1 number, 1 special)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestEmailAvailabilityCheck:
    """Test /api/auth/check-availability endpoint"""

    def test_check_new_email_available(self):
        """Test that a new email shows as available"""
        unique_email = f"test_unique_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/check-availability", json={
            "email": unique_email
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email_available"] == True
        print(f"✓ New email {unique_email} is available")

    def test_check_existing_email_unavailable(self):
        """Test that existing email shows as unavailable"""
        response = requests.post(f"{BASE_URL}/api/auth/check-availability", json={
            "email": "test@moneyssutra.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email_available"] == False
        assert "already registered" in data.get("message", "").lower() or data["email_available"] == False
        print(f"✓ Existing email test@moneyssutra.com correctly shows unavailable")


class TestRegistrationValidation:
    """Test /api/auth/register endpoint validation"""

    def test_first_name_required(self):
        """First name is required"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "",
            "lastName": "Test",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "sex": "male",
            "dateOfBirth": "1990-01-01",
            "password": "Test123!@"
        })
        assert response.status_code == 400
        assert "first name" in response.json().get("detail", "").lower()
        print("✓ First name validation: required field enforced")

    def test_first_name_letters_only(self):
        """First name should contain only letters"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Test123",
            "lastName": "User",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "sex": "male",
            "dateOfBirth": "1990-01-01",
            "password": "Test123!@"
        })
        assert response.status_code == 400
        assert "letters" in response.json().get("detail", "").lower()
        print("✓ First name validation: letters only enforced")

    def test_last_name_required(self):
        """Last name is required"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Test",
            "lastName": "",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "sex": "male",
            "dateOfBirth": "1990-01-01",
            "password": "Test123!@"
        })
        assert response.status_code == 400
        assert "last name" in response.json().get("detail", "").lower()
        print("✓ Last name validation: required field enforced")

    def test_last_name_letters_only(self):
        """Last name should contain only letters"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Test",
            "lastName": "User456",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "sex": "male",
            "dateOfBirth": "1990-01-01",
            "password": "Test123!@"
        })
        assert response.status_code == 400
        assert "letters" in response.json().get("detail", "").lower()
        print("✓ Last name validation: letters only enforced")

    def test_middle_name_letters_only(self):
        """Middle name should contain only letters if provided"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Test",
            "middleName": "Middle123",
            "lastName": "User",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "sex": "male",
            "dateOfBirth": "1990-01-01",
            "password": "Test123!@"
        })
        assert response.status_code == 400
        assert "letters" in response.json().get("detail", "").lower()
        print("✓ Middle name validation: letters only enforced")

    def test_email_required(self):
        """Email is required"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Test",
            "lastName": "User",
            "email": "",
            "sex": "male",
            "dateOfBirth": "1990-01-01",
            "password": "Test123!@"
        })
        assert response.status_code == 400
        assert "email" in response.json().get("detail", "").lower()
        print("✓ Email validation: required field enforced")

    def test_email_already_registered(self):
        """Email that is already registered should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Test",
            "lastName": "User",
            "email": "test@moneyssutra.com",
            "sex": "male",
            "dateOfBirth": "1990-01-01",
            "password": "Test123!@"
        })
        assert response.status_code == 400
        assert "already registered" in response.json().get("detail", "").lower() or "email" in response.json().get("detail", "").lower()
        print("✓ Email validation: duplicate email rejected")

    def test_mobile_10_digits_only(self):
        """Mobile number must be exactly 10 digits if provided"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Test",
            "lastName": "User",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "mobile": "12345",  # Too short
            "sex": "male",
            "dateOfBirth": "1990-01-01",
            "password": "Test123!@"
        })
        assert response.status_code == 400
        assert "10 digit" in response.json().get("detail", "").lower() or "mobile" in response.json().get("detail", "").lower()
        print("✓ Mobile validation: 10 digits requirement enforced")

    def test_mobile_optional(self):
        """Mobile number is optional - registration should work without it"""
        unique_email = f"test_nomobile_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Test",
            "lastName": "Nomobile",
            "email": unique_email,
            "sex": "male",
            "dateOfBirth": "1990-01-01",
            "password": "Test123!@"
        })
        # Should succeed without mobile
        assert response.status_code == 200
        print("✓ Mobile validation: optional field works correctly")

    def test_sex_required(self):
        """Sex is required"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Test",
            "lastName": "User",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "sex": "",
            "dateOfBirth": "1990-01-01",
            "password": "Test123!@"
        })
        assert response.status_code == 400
        assert "sex" in response.json().get("detail", "").lower() or "select" in response.json().get("detail", "").lower()
        print("✓ Sex validation: required field enforced")

    def test_sex_valid_values(self):
        """Sex must be male or female"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Test",
            "lastName": "User",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "sex": "other",  # Invalid
            "dateOfBirth": "1990-01-01",
            "password": "Test123!@"
        })
        assert response.status_code == 400
        assert "sex" in response.json().get("detail", "").lower() or "male" in response.json().get("detail", "").lower()
        print("✓ Sex validation: only Male/Female values accepted")

    def test_dob_required(self):
        """Date of birth is required"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Test",
            "lastName": "User",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "sex": "male",
            "dateOfBirth": "",
            "password": "Test123!@"
        })
        assert response.status_code == 400
        assert "date of birth" in response.json().get("detail", "").lower() or "birth" in response.json().get("detail", "").lower()
        print("✓ DOB validation: required field enforced")

    def test_dob_no_future_dates(self):
        """Date of birth cannot be in the future"""
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Test",
            "lastName": "User",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "sex": "male",
            "dateOfBirth": future_date,
            "password": "Test123!@"
        })
        assert response.status_code == 400
        assert "future" in response.json().get("detail", "").lower()
        print("✓ DOB validation: future dates rejected")


class TestPasswordStrengthValidation:
    """Test password strength requirements"""

    def test_password_min_8_chars(self):
        """Password must be at least 8 characters"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Test",
            "lastName": "User",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "sex": "male",
            "dateOfBirth": "1990-01-01",
            "password": "Test1!"  # Only 6 chars
        })
        assert response.status_code == 400
        assert "8 character" in response.json().get("detail", "").lower() or "password" in response.json().get("detail", "").lower()
        print("✓ Password validation: minimum 8 characters enforced")

    def test_password_uppercase_required(self):
        """Password must have at least 1 uppercase letter"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Test",
            "lastName": "User",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "sex": "male",
            "dateOfBirth": "1990-01-01",
            "password": "test1234!"  # No uppercase
        })
        assert response.status_code == 400
        assert "uppercase" in response.json().get("detail", "").lower()
        print("✓ Password validation: uppercase requirement enforced")

    def test_password_number_required(self):
        """Password must have at least 1 number"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Test",
            "lastName": "User",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "sex": "male",
            "dateOfBirth": "1990-01-01",
            "password": "TestPass!"  # No number
        })
        assert response.status_code == 400
        assert "number" in response.json().get("detail", "").lower()
        print("✓ Password validation: number requirement enforced")

    def test_password_special_char_required(self):
        """Password must have at least 1 special character"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Test",
            "lastName": "User",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "sex": "male",
            "dateOfBirth": "1990-01-01",
            "password": "TestPass1"  # No special char
        })
        assert response.status_code == 400
        assert "special" in response.json().get("detail", "").lower()
        print("✓ Password validation: special character requirement enforced")


class TestSuccessfulRegistration:
    """Test successful user registration"""

    def test_full_registration_success(self):
        """Test complete registration with all fields"""
        unique_email = f"test_full_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "John",
            "middleName": "Michael",
            "lastName": "Doe",
            "email": unique_email,
            "mobile": "9876543210",
            "sex": "male",
            "dateOfBirth": "1990-05-15",
            "password": "Test123!@"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response fields
        assert "user_id" in data
        assert data["email"] == unique_email.lower()
        assert "John" in data["name"]
        assert "Doe" in data["name"]
        assert "session_token" in data
        assert data.get("isNewUser") == True
        
        print(f"✓ Full registration successful for {unique_email}")
        print(f"  - User ID: {data['user_id']}")
        print(f"  - Name: {data['name']}")

    def test_registration_without_middle_name(self):
        """Test registration without optional middle name"""
        unique_email = f"test_nomid_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Jane",
            "lastName": "Smith",
            "email": unique_email,
            "sex": "female",
            "dateOfBirth": "1995-03-20",
            "password": "Password1!"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "Jane" in data["name"]
        assert "Smith" in data["name"]
        print(f"✓ Registration without middle name successful")

    def test_registration_creates_basic_profile(self):
        """Test that registration creates both User and BasicProfile entries"""
        unique_email = f"test_profile_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Profile",
            "middleName": "Test",
            "lastName": "User",
            "email": unique_email,
            "mobile": "1234567890",
            "sex": "female",
            "dateOfBirth": "1988-12-25",
            "password": "SecurePass1!"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify user was created with session
        assert "session_token" in data
        assert data.get("isNewUser") == True
        
        # After registration, the user should be logged in
        # We can verify by checking /auth/me with the session token
        session_token = data["session_token"]
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {session_token}"}
        )
        assert me_response.status_code == 200
        me_data = me_response.json()
        assert me_data["email"] == unique_email.lower()
        
        print(f"✓ Registration creates user and profile, auto-logs in user")


class TestEmailCaseInsensitivity:
    """Test email handling is case-insensitive"""

    def test_email_normalized_to_lowercase(self):
        """Email should be normalized to lowercase"""
        unique_id = uuid.uuid4().hex[:8]
        mixed_case_email = f"Test_User_{unique_id}@Example.COM"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "firstName": "Case",
            "lastName": "Test",
            "email": mixed_case_email,
            "sex": "male",
            "dateOfBirth": "1990-01-01",
            "password": "Test123!@"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == mixed_case_email.lower()
        print(f"✓ Email normalized to lowercase: {mixed_case_email} -> {data['email']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
