"""Onboarding module — Profile setup flow and completion tracking."""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
from database import db
from routes.auth import get_current_user
import uuid

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


async def _get_profile_completion(user_id: str) -> dict:
    """Calculate profile completion from actual user data."""
    uf = {"userId": user_id}

    income_count = await db.income_sources.count_documents(uf)
    expense_count = await db.expenses.count_documents(uf)
    account_count = await db.accounts.count_documents(uf)
    asset_count = await db.assets.count_documents(uf)
    investment_count = await db.investments.count_documents(uf)
    loan_count = await db.loans.count_documents(uf)
    credit_card_count = await db.credit_cards.count_documents(uf)

    income_added = income_count > 0
    expenses_added = expense_count > 0
    assets_added = account_count > 0 or asset_count > 0
    liabilities_added = loan_count > 0 or credit_card_count > 0
    investments_added = investment_count > 0

    # Check if user explicitly skipped or completed steps via onboarding
    progress = await db.onboarding_progress.find_one({"userId": user_id}, {"_id": 0})
    if progress:
        if progress.get("income_completed"):
            income_added = True
        if progress.get("expenses_completed"):
            expenses_added = True
        if progress.get("assets_completed"):
            assets_added = True
        if progress.get("liabilities_completed"):
            liabilities_added = True
        if progress.get("investments_completed"):
            investments_added = True

    completion = (
        (20 if income_added else 0) +
        (20 if expenses_added else 0) +
        (20 if assets_added else 0) +
        (20 if liabilities_added else 0) +
        (20 if investments_added else 0)
    )

    dismissed = progress.get("dismissed", False) if progress else False

    return {
        "profileCompletion": completion,
        "dismissed": dismissed,
        "incomeAdded": income_added,
        "expensesAdded": expenses_added,
        "assetsAdded": assets_added,
        "liabilitiesAdded": liabilities_added,
        "investmentsAdded": investments_added,
        "counts": {
            "income": income_count,
            "expenses": expense_count,
            "accounts": account_count,
            "assets": asset_count,
            "investments": investment_count,
            "loans": loan_count,
            "creditCards": credit_card_count,
        }
    }


@router.get("/profile-completion")
async def get_profile_completion(request: Request):
    """Get user's profile completion status."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return await _get_profile_completion(user["user_id"])


@router.get("/progress")
async def get_onboarding_progress(request: Request):
    """Get saved onboarding progress for resume."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    progress = await db.onboarding_progress.find_one(
        {"userId": user["user_id"]}, {"_id": 0}
    )
    if not progress:
        return {"currentStep": 0, "completed": False, "stepData": {}}
    return progress


@router.post("/save-step")
async def save_onboarding_step(request: Request):
    """Save a single onboarding step's data."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user["user_id"]
    body = await request.json()
    step = body.get("step")  # 1-5
    step_data = body.get("data", {})
    skipped = body.get("skipped", False)

    step_names = {1: "income", 2: "expenses", 3: "assets", 4: "liabilities", 5: "investments"}
    step_name = step_names.get(step, "unknown")

    # Track event
    await _track_event(user_id, "step_completed", {"step": step, "stepName": step_name, "skipped": skipped})

    if skipped:
        # Mark step as skipped AND completed (user acknowledged "none" for this category)
        await db.onboarding_progress.update_one(
            {"userId": user_id},
            {"$set": {
                f"step_{step}_skipped": True,
                f"{step_name}_completed": True,
                "currentStep": step,
                "updatedAt": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True
        )
        return {"message": f"Step {step} skipped"}

    # Save actual financial data based on step
    saved_count = 0

    if step == 1:  # Income
        for item in step_data.get("items", []):
            if not item.get("name") or not item.get("amount"):
                continue
            # Upsert: if an onboarding income source already exists for this user, update it
            existing = await db.income_sources.find_one(
                {"userId": user_id, "source": "onboarding"},
                {"_id": 0, "id": 1}
            )
            if existing:
                await db.income_sources.update_one(
                    {"userId": user_id, "source": "onboarding", "id": existing["id"]},
                    {"$set": {
                        "name": item["name"],
                        "type": item.get("type", "Salary"),
                        "expectedAmount": float(item["amount"]),
                        "frequency": item.get("frequency", "Monthly"),
                        "updatedAt": datetime.now(timezone.utc).isoformat(),
                    }}
                )
            else:
                income_doc = {
                    "id": str(uuid.uuid4()),
                    "userId": user_id,
                    "name": item["name"],
                    "type": item.get("type", "Salary"),
                    "expectedAmount": float(item["amount"]),
                    "frequency": item.get("frequency", "Monthly"),
                    "incomeType": "fixed",
                    "sourceCategory": None,
                    "startDate": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "createdAt": datetime.now(timezone.utc).isoformat(),
                    "source": "onboarding"
                }
                await db.income_sources.insert_one(income_doc)
            saved_count += 1

    elif step == 2:  # Expenses
        # Remove old onboarding expenses first, then insert new ones
        await db.expenses.delete_many({"userId": user_id, "source": "onboarding"})
        for item in step_data.get("items", []):
            if not item.get("name") or not item.get("amount"):
                continue
            expense_doc = {
                "id": str(uuid.uuid4()),
                "userId": user_id,
                "expenseName": item["name"],
                "category": item.get("category", "Other"),
                "expectedAmount": float(item["amount"]),
                "frequency": item.get("frequency", "Monthly"),
                "isPaid": False,
                "skippedMonths": [],
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "source": "onboarding"
            }
            await db.expenses.insert_one(expense_doc)
            saved_count += 1

    elif step == 3:  # Assets (accounts + physical assets)
        # Remove old onboarding assets first
        await db.accounts.delete_many({"userId": user_id, "source": "onboarding"})
        await db.assets.delete_many({"userId": user_id, "source": "onboarding"})
        for item in step_data.get("items", []):
            if not item.get("name") or not item.get("amount"):
                continue
            if item.get("assetType") in ("bank_balance", "savings", "checking"):
                account_doc = {
                    "id": str(uuid.uuid4()),
                    "userId": user_id,
                    "accountName": item["name"],
                    "accountType": item.get("subType", "Savings"),
                    "balance": float(item["amount"]),
                    "bankName": item.get("bank", ""),
                    "createdAt": datetime.now(timezone.utc).isoformat(),
                    "source": "onboarding"
                }
                await db.accounts.insert_one(account_doc)
            else:
                asset_doc = {
                    "id": str(uuid.uuid4()),
                    "userId": user_id,
                    "assetName": item["name"],
                    "assetType": item.get("assetType", "other"),
                    "currentValue": float(item["amount"]),
                    "createdAt": datetime.now(timezone.utc).isoformat(),
                    "source": "onboarding"
                }
                await db.assets.insert_one(asset_doc)
            saved_count += 1

    elif step == 4:  # Liabilities
        # Remove old onboarding liabilities first
        await db.loans.delete_many({"userId": user_id, "source": "onboarding"})
        await db.credit_cards.delete_many({"userId": user_id, "source": "onboarding"})
        for item in step_data.get("items", []):
            if not item.get("name") or not item.get("amount"):
                continue
            if item.get("liabilityType") == "credit_card":
                cc_doc = {
                    "id": str(uuid.uuid4()),
                    "userId": user_id,
                    "cardName": item["name"],
                    "outstandingBalance": float(item["amount"]),
                    "creditLimit": float(item.get("limit", 0)),
                    "createdAt": datetime.now(timezone.utc).isoformat(),
                    "source": "onboarding"
                }
                await db.credit_cards.insert_one(cc_doc)
            else:
                loan_doc = {
                    "id": str(uuid.uuid4()),
                    "userId": user_id,
                    "loanName": item["name"],
                    "loanType": item.get("loanType", "Personal"),
                    "principalAmount": float(item["amount"]),
                    "emiAmount": float(item.get("emi", 0)),
                    "interestRate": float(item.get("rate", 0)),
                    "createdAt": datetime.now(timezone.utc).isoformat(),
                    "source": "onboarding"
                }
                await db.loans.insert_one(loan_doc)
            saved_count += 1

    elif step == 5:  # Investments
        # Remove old onboarding investments first
        await db.investments.delete_many({"userId": user_id, "source": "onboarding"})
        for item in step_data.get("items", []):
            if not item.get("name") or not item.get("amount"):
                continue
            inv_doc = {
                "id": str(uuid.uuid4()),
                "userId": user_id,
                "name": item["name"],
                "investmentType": item.get("investmentType", "mutual-fund"),
                "investmentCategory": item.get("category", "Mutual Fund"),
                "monthlyAmount": float(item["amount"]),
                "currentValue": float(item.get("currentValue", item["amount"])),
                "frequency": item.get("frequency", "Monthly"),
                "startDate": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "source": "onboarding"
            }
            await db.investments.insert_one(inv_doc)
            saved_count += 1

    # Update progress
    await db.onboarding_progress.update_one(
        {"userId": user_id},
        {"$set": {
            "currentStep": step,
            f"{step_name}_completed": True,
            f"step_{step}_data_count": saved_count,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True
    )

    return {"message": f"Step {step} saved", "savedCount": saved_count}


@router.post("/complete")
async def complete_onboarding(request: Request):
    """Mark onboarding as complete."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user["user_id"]

    await db.onboarding_progress.update_one(
        {"userId": user_id},
        {"$set": {
            "completed": True,
            "completedAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True
    )

    # Track event
    await _track_event(user_id, "onboarding_completed", {})

    # Update profile completion
    completion = await _get_profile_completion(user_id)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"profileCompletion": completion["profileCompletion"]}}
    )

    return {"message": "Onboarding complete", **completion}


@router.post("/dismiss")
async def dismiss_onboarding(request: Request):
    """Dismiss onboarding banner (user can revisit later)."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    await db.onboarding_progress.update_one(
        {"userId": user["user_id"]},
        {"$set": {"dismissed": True, "updatedAt": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "Onboarding dismissed"}


async def _track_event(user_id: str, event_type: str, metadata: dict):
    """Track onboarding events for admin analytics."""
    await db.onboarding_events.insert_one({
        "id": str(uuid.uuid4()),
        "userId": user_id,
        "eventType": event_type,
        "metadata": metadata,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    })
