"""
Test suite for Iteration 138: Loan Given features
- Cascade delete of income source when Loan Given investment deleted
- Auto-deduction scheduler for loan repayments
- Confirm/Reject repayment notification UI endpoints

FEATURES TESTED:
1. POST /api/investments - Create Loan Given with fixed repayment creates linked income source
2. DELETE /api/investments/{id} - Cascade deletes income source and transactions
3. POST /api/investments/confirm-repayment/{notification_id} - Confirm/Reject flows
4. Scheduler: auto_process_loan_repayments exists in scheduler.py
"""

import pytest
import requests
import os
import uuid
import sys
import asyncio
from datetime import datetime, timezone, timedelta

# Add backend path for database access
sys.path.insert(0, '/app/backend')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://onboarding-v2-2.preview.emergentagent.com').rstrip('/')


def create_test_session():
    """Create a test user and session in MongoDB via Python driver"""
    os.environ['REACT_APP_BACKEND_URL'] = BASE_URL
    from database import db
    
    user_id = 'test_user_iter138_' + str(uuid.uuid4())[:8]
    session_token = 'test_session_iter138_' + str(uuid.uuid4())[:8]
    
    async def _create():
        # Insert user
        await db.users.insert_one({
            'user_id': user_id,
            'email': f'{user_id}@test.com',
            'name': 'Test User For Cascade Delete Iter138',
            'auth_type': 'test',
            'created_at': datetime.now(timezone.utc).isoformat()
        })
        
        # Insert session
        await db.user_sessions.insert_one({
            'session_id': 'session_' + str(uuid.uuid4())[:8],
            'user_id': user_id,
            'session_token': session_token,
            'expires_at': (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            'created_at': datetime.now(timezone.utc).isoformat()
        })
        
        return session_token, user_id
    
    return asyncio.get_event_loop().run_until_complete(_create())


def cleanup_test_data(user_id):
    """Clean up test data after tests"""
    os.environ['REACT_APP_BACKEND_URL'] = BASE_URL
    from database import db
    
    async def _cleanup():
        await db.investments.delete_many({'userId': user_id})
        await db.investment_transactions.delete_many({'userId': user_id})
        await db.income_sources.delete_many({'userId': user_id})
        await db.income_received.delete_many({'userId': user_id})
        await db.notifications.delete_many({'userId': user_id})
        await db.user_sessions.delete_many({'user_id': user_id})
        await db.users.delete_many({'user_id': user_id})
    
    asyncio.get_event_loop().run_until_complete(_cleanup())


def get_db_document(collection_name, query):
    """Fetch document directly from MongoDB"""
    os.environ['REACT_APP_BACKEND_URL'] = BASE_URL
    from database import db
    
    async def _fetch():
        collection = getattr(db, collection_name)
        return await collection.find_one(query, {'_id': 0})
    
    return asyncio.get_event_loop().run_until_complete(_fetch())


def insert_db_document(collection_name, doc):
    """Insert document directly into MongoDB"""
    os.environ['REACT_APP_BACKEND_URL'] = BASE_URL
    from database import db
    
    async def _insert():
        collection = getattr(db, collection_name)
        await collection.insert_one(doc)
    
    return asyncio.get_event_loop().run_until_complete(_insert())


def update_db_document(collection_name, query, update):
    """Update document in MongoDB"""
    os.environ['REACT_APP_BACKEND_URL'] = BASE_URL
    from database import db
    
    async def _update():
        collection = getattr(db, collection_name)
        await collection.update_one(query, update)
    
    return asyncio.get_event_loop().run_until_complete(_update())


def delete_db_document(collection_name, query):
    """Delete document from MongoDB"""
    os.environ['REACT_APP_BACKEND_URL'] = BASE_URL
    from database import db
    
    async def _delete():
        collection = getattr(db, collection_name)
        await collection.delete_one(query)
    
    return asyncio.get_event_loop().run_until_complete(_delete())


class TestLoanGivenCascadeDeleteAndConfirm:
    """Tests for Loan Given cascade delete and confirm-repayment features"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session_token, self.user_id = create_test_session()
        self.session = requests.Session()
        self.session.cookies.set('session_token', self.session_token)
        self.test_prefix = f"TEST_{uuid.uuid4().hex[:8]}"
        self.created_investment_ids = []
        
        yield
        
        # Cleanup - delete remaining investments via API
        for inv_id in self.created_investment_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/investments/{inv_id}")
            except:
                pass
        
        # Full cleanup
        cleanup_test_data(self.user_id)

    def test_01_create_loan_given_fixed_creates_income_source(self):
        """Create Loan Given with fixed monthly repayment creates income source and sets linkedIncomeSourceId"""
        payload = {
            "name": f"{self.test_prefix}_Loan_Fixed",
            "investmentCategory": "Loan Given",
            "principal": 100000,
            "borrowerName": "Test Borrower",
            "borrowerContact": "9876543210",
            "interestType": "none",
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
            "paymentDay": "15",
            "installmentAmount": 10000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "investmentMode": "Fixed"
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Failed to create loan: {response.text}"
        
        data = response.json()
        assert "linkedIncomeSourceId" in data, "linkedIncomeSourceId not set on investment"
        assert data["linkedIncomeSourceId"] is not None, "linkedIncomeSourceId is None"
        
        self.created_investment_ids.append(data["id"])
        
        # Verify income source exists in DB
        income_source = get_db_document('income_sources', {"id": data["linkedIncomeSourceId"]})
        assert income_source is not None, f"Income source with id {data['linkedIncomeSourceId']} not found in DB"
        assert income_source["sourceCategory"] == "loan_repayment"
        assert income_source["expectedAmount"] == 10000, f"Expected 10000, got {income_source.get('expectedAmount')}"
        assert income_source["frequency"] == "Monthly"
        
        print(f"PASSED: Loan Given created with linkedIncomeSourceId={data['linkedIncomeSourceId']}")

    def test_02_create_loan_with_interest_creates_income_source(self):
        """Create Loan Given WITH interest also creates income source with interest label"""
        payload = {
            "name": f"{self.test_prefix}_Loan_Interest",
            "investmentCategory": "Loan Given",
            "principal": 50000,
            "agreedReturnAmount": 55000,
            "borrowerName": "Interest Borrower",
            "interestType": "custom",
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
            "paymentDay": "20",
            "installmentAmount": 5500,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "investmentMode": "Variable"
        }
        
        response = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("linkedIncomeSourceId") is not None
        
        self.created_investment_ids.append(data["id"])
        
        # Verify income source name contains 'interest'
        income_source = get_db_document('income_sources', {"id": data["linkedIncomeSourceId"]})
        assert income_source is not None
        assert "interest" in income_source.get("name", "").lower(), f"Name should contain 'interest': {income_source.get('name')}"
        
        print(f"PASSED: Loan with interest created with income source name: {income_source.get('name')}")

    def test_03_delete_loan_given_cascades_income_source(self):
        """Delete Loan Given investment should also delete linked income source"""
        # First create a loan
        payload = {
            "name": f"{self.test_prefix}_Loan_Cascade",
            "investmentCategory": "Loan Given",
            "principal": 25000,
            "borrowerName": "Cascade Test Borrower",
            "interestType": "none",
            "repaymentType": "fixed",
            "repaymentFrequency": "Weekly",
            "paymentDay": "Monday",
            "installmentAmount": 2500,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "investmentMode": "Fixed"
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200
        investment = create_resp.json()
        investment_id = investment["id"]
        linked_income_id = investment.get("linkedIncomeSourceId")
        
        assert linked_income_id is not None, "Linked income source not created"
        
        # Verify income source exists before delete
        income_before = get_db_document('income_sources', {"id": linked_income_id})
        assert income_before is not None, "Income source should exist before delete"
        
        # Add a test repayment (creates investment_transactions and income_received)
        repay_resp = self.session.post(f"{BASE_URL}/api/investments/{investment_id}/add-repayment", json={
            "amount": 2500,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Test repayment for cascade test"
        })
        assert repay_resp.status_code == 200, f"Add repayment failed: {repay_resp.text}"
        
        # Verify transactions exist
        txn_before = get_db_document('investment_transactions', {"investmentId": investment_id})
        assert txn_before is not None, "Transaction should exist after repayment"
        
        # Now DELETE the investment
        delete_resp = self.session.delete(f"{BASE_URL}/api/investments/{investment_id}")
        assert delete_resp.status_code == 200, f"Delete failed: {delete_resp.text}"
        
        # Verify income source is DELETED
        income_after = get_db_document('income_sources', {"id": linked_income_id})
        assert income_after is None, f"Income source should be deleted but still exists"
        
        # Verify investment_transactions are DELETED
        txn_after = get_db_document('investment_transactions', {"investmentId": investment_id})
        assert txn_after is None, f"Investment transactions should be deleted but still exist"
        
        # Verify income_received for linked income source is DELETED
        income_received_after = get_db_document('income_received', {"entityId": linked_income_id})
        assert income_received_after is None, f"Income received entries should be deleted"
        
        print(f"PASSED: CASCADE DELETE - income source, transactions, and income_received all deleted")

    def test_04_delete_loan_given_without_repayments(self):
        """Delete Loan Given with no repayments still deletes income source"""
        payload = {
            "name": f"{self.test_prefix}_Loan_NoRepay",
            "investmentCategory": "Loan Given",
            "principal": 15000,
            "borrowerName": "No Repay Borrower",
            "interestType": "none",
            "repaymentType": "lump_sum",
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "investmentMode": "Fixed"
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200
        investment = create_resp.json()
        investment_id = investment["id"]
        linked_income_id = investment.get("linkedIncomeSourceId")
        
        # Delete without adding repayments
        delete_resp = self.session.delete(f"{BASE_URL}/api/investments/{investment_id}")
        assert delete_resp.status_code == 200
        
        # Verify income source deleted
        income_after = get_db_document('income_sources', {"id": linked_income_id})
        assert income_after is None, "Income source should be deleted"
        
        print("PASSED: Delete loan without repayments - income source deleted")

    def test_05_confirm_repayment_marks_transaction_confirmed(self):
        """action=confirm marks transaction as confirmed and notification as read"""
        # Create a test loan
        payload = {
            "name": f"{self.test_prefix}_Loan_Confirm",
            "investmentCategory": "Loan Given",
            "principal": 30000,
            "borrowerName": "Confirm Test Borrower",
            "interestType": "none",
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
            "paymentDay": str(datetime.now().day),
            "installmentAmount": 5000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "investmentMode": "Fixed"
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200
        investment = create_resp.json()
        investment_id = investment["id"]
        self.created_investment_ids.append(investment_id)
        
        # Manually create a test transaction (simulating auto-recorded by scheduler)
        txn_id = str(uuid.uuid4())
        insert_db_document('investment_transactions', {
            "id": txn_id,
            "userId": self.user_id,
            "investmentId": investment_id,
            "investmentName": investment["name"],
            "amount": 5000,
            "type": "repayment",
            "transactionDate": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Auto-recorded scheduled repayment",
            "autoRecorded": True,
            "confirmed": False,
            "createdAt": datetime.now(timezone.utc).isoformat()
        })
        
        # Create test notification
        notification_id = str(uuid.uuid4())
        insert_db_document('notifications', {
            "id": notification_id,
            "userId": self.user_id,
            "title": f"Loan repayment due from {payload['borrowerName']}",
            "message": "Test notification for confirm test",
            "type": "loan_repayment_due",
            "relatedInvestmentId": investment_id,
            "relatedTransactionId": txn_id,
            "isRead": False,
            "requiresConfirmation": True,
            "createdAt": datetime.now(timezone.utc).isoformat()
        })
        
        # Call confirm endpoint with action=confirm
        confirm_resp = self.session.post(
            f"{BASE_URL}/api/investments/confirm-repayment/{notification_id}",
            json={"action": "confirm"}
        )
        assert confirm_resp.status_code == 200, f"Confirm failed: {confirm_resp.text}"
        
        data = confirm_resp.json()
        assert data["success"] is True
        assert data["action"] == "confirmed"
        
        # Verify transaction is confirmed
        txn = get_db_document('investment_transactions', {"id": txn_id})
        assert txn is not None
        assert txn.get("confirmed") is True, f"Transaction should be confirmed, got: {txn.get('confirmed')}"
        
        # Verify notification is read
        notif = get_db_document('notifications', {"id": notification_id})
        assert notif is not None
        assert notif.get("isRead") is True
        assert notif.get("confirmedAction") == "confirmed"
        
        # Cleanup notification
        delete_db_document('notifications', {"id": notification_id})
        
        print("PASSED: action=confirm marks transaction confirmed and notification read")

    def test_06_reject_repayment_rolls_back(self):
        """action=reject rolls back auto-recorded repayment"""
        # Create a test loan
        payload = {
            "name": f"{self.test_prefix}_Loan_Reject",
            "investmentCategory": "Loan Given",
            "principal": 40000,
            "borrowerName": "Reject Test Borrower",
            "interestType": "none",
            "repaymentType": "fixed",
            "repaymentFrequency": "Monthly",
            "paymentDay": str(datetime.now().day),
            "installmentAmount": 8000,
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "investmentMode": "Fixed"
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/investments", json=payload)
        assert create_resp.status_code == 200
        investment = create_resp.json()
        investment_id = investment["id"]
        self.created_investment_ids.append(investment_id)
        linked_income_id = investment.get("linkedIncomeSourceId")
        
        # Simulate auto-recorded repayment by scheduler
        repay_amount = 8000
        original_received = investment.get("amountReceived", 0)
        original_outstanding = investment.get("outstandingAmount", 40000)
        
        # Manually update investment as if scheduler ran
        update_db_document(
            'investments',
            {"id": investment_id},
            {"$set": {
                "amountReceived": original_received + repay_amount,
                "outstandingAmount": max(original_outstanding - repay_amount, 0),
                "currentValue": max(original_outstanding - repay_amount, 0),
                "loanStatus": "partial"
            }}
        )
        
        # Create auto-recorded transaction
        txn_id = str(uuid.uuid4())
        insert_db_document('investment_transactions', {
            "id": txn_id,
            "userId": self.user_id,
            "investmentId": investment_id,
            "investmentName": investment["name"],
            "amount": repay_amount,
            "type": "repayment",
            "transactionDate": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Auto-recorded scheduled repayment",
            "outstandingBefore": original_outstanding,
            "outstandingAfter": max(original_outstanding - repay_amount, 0),
            "autoRecorded": True,
            "confirmed": False,
            "createdAt": datetime.now(timezone.utc).isoformat()
        })
        
        # Create income_received entry
        if linked_income_id:
            insert_db_document('income_received', {
                "id": str(uuid.uuid4()),
                "userId": self.user_id,
                "entityId": linked_income_id,
                "entityType": "income",
                "entityName": f"Loan Repayment - {investment['name']}",
                "amount": repay_amount,
                "transactionDate": datetime.now().strftime("%Y-%m-%d"),
                "notes": "Auto-recorded (pending)",
                "source": "auto_loan_repayment",
                "autoRecorded": True,
                "confirmed": False,
                "isLocked": False,
                "createdAt": datetime.now(timezone.utc).isoformat()
            })
        
        # Create test notification
        notification_id = str(uuid.uuid4())
        insert_db_document('notifications', {
            "id": notification_id,
            "userId": self.user_id,
            "title": f"Loan repayment due from {payload['borrowerName']}",
            "message": "Test notification for reject test",
            "type": "loan_repayment_due",
            "relatedInvestmentId": investment_id,
            "relatedTransactionId": txn_id,
            "isRead": False,
            "requiresConfirmation": True,
            "createdAt": datetime.now(timezone.utc).isoformat()
        })
        
        # Call confirm endpoint with action=reject
        reject_resp = self.session.post(
            f"{BASE_URL}/api/investments/confirm-repayment/{notification_id}",
            json={"action": "reject"}
        )
        assert reject_resp.status_code == 200, f"Reject failed: {reject_resp.text}"
        
        data = reject_resp.json()
        assert data["success"] is True
        assert data["action"] == "rejected"
        
        # Verify investment amounts rolled back
        inv = get_db_document('investments', {"id": investment_id})
        assert inv is not None
        # After rollback: amountReceived should be 0, outstanding should be 40000
        assert inv.get("amountReceived") == 0, f"amountReceived should be 0, got {inv.get('amountReceived')}"
        assert inv.get("outstandingAmount") == 40000, f"outstanding should be 40000, got {inv.get('outstandingAmount')}"
        assert inv.get("loanStatus") == "active", f"status should be active, got {inv.get('loanStatus')}"
        
        # Verify transaction is DELETED
        txn_after = get_db_document('investment_transactions', {"id": txn_id})
        assert txn_after is None, "Transaction should be deleted after reject"
        
        # Verify notification marked
        notif = get_db_document('notifications', {"id": notification_id})
        assert notif.get("isRead") is True
        assert notif.get("confirmedAction") == "rejected"
        
        # Cleanup notification
        delete_db_document('notifications', {"id": notification_id})
        
        print("PASSED: action=reject rolls back repayment amounts and deletes transaction")

    def test_07_confirm_repayment_notification_not_found(self):
        """Returns 404 for non-existent notification"""
        fake_id = str(uuid.uuid4())
        resp = self.session.post(
            f"{BASE_URL}/api/investments/confirm-repayment/{fake_id}",
            json={"action": "confirm"}
        )
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("PASSED: confirm-repayment returns 404 for invalid notification_id")

    def test_08_confirm_repayment_invalid_action(self):
        """Returns 400 for invalid action parameter"""
        # Create a minimal notification for this test
        notification_id = str(uuid.uuid4())
        insert_db_document('notifications', {
            "id": notification_id,
            "userId": self.user_id,
            "title": "Test",
            "message": "Test",
            "type": "loan_repayment_due",
            "isRead": False,
            "requiresConfirmation": True,
            "createdAt": datetime.now(timezone.utc).isoformat()
        })
        
        resp = self.session.post(
            f"{BASE_URL}/api/investments/confirm-repayment/{notification_id}",
            json={"action": "invalid_action"}
        )
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        
        # Cleanup
        delete_db_document('notifications', {"id": notification_id})
        print("PASSED: confirm-repayment returns 400 for invalid action")


class TestSchedulerLoanRepaymentFunction:
    """Test that auto_process_loan_repayments function exists and is called in scheduler loop"""
    
    def test_09_scheduler_contains_auto_process_loan_repayments(self):
        """Verify auto_process_loan_repayments is defined in scheduler.py"""
        scheduler_path = "/app/backend/scheduler.py"
        with open(scheduler_path, "r") as f:
            content = f.read()
        
        assert "async def auto_process_loan_repayments" in content, \
            "auto_process_loan_repayments function not found in scheduler.py"
        
        print("PASSED: auto_process_loan_repayments function exists in scheduler.py")

    def test_10_scheduler_loop_calls_loan_repayments(self):
        """Verify scheduler main loop calls auto_process_loan_repayments"""
        scheduler_path = "/app/backend/scheduler.py"
        with open(scheduler_path, "r") as f:
            content = f.read()
        
        # Check that the function is called in the daily checks section
        assert "await auto_process_loan_repayments()" in content, \
            "auto_process_loan_repayments() not called in scheduler loop"
        
        print("PASSED: auto_process_loan_repayments is called in scheduler main loop")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
