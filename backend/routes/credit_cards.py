"""Credit card routes - Full CRUD from server.py."""
from fastapi import APIRouter, HTTPException, Request
from typing import List
from datetime import datetime

from database import db
from server_models import CreditCard, CreditCardCreate
from routes.auth import get_current_user
from routes.utils import get_user_filter, get_effective_user_filter

router = APIRouter(prefix="/credit-cards", tags=["Credit Cards"])


@router.post("", response_model=CreditCard)
async def create_credit_card(input: CreditCardCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    card_dict = input.model_dump()
    card_dict['userId'] = user.get('user_id')
    card_obj = CreditCard(**card_dict)
    doc = card_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    await db.credit_cards.insert_one(doc)
    return card_obj


@router.get("", response_model=List[CreditCard])
async def get_credit_cards(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = await get_effective_user_filter(user, request)
    cards = await db.credit_cards.find(user_filter, {"_id": 0}).to_list(1000)
    for card in cards:
        if isinstance(card.get('createdAt'), str):
            card['createdAt'] = datetime.fromisoformat(card['createdAt'])
    return cards


@router.get("/{card_id}", response_model=CreditCard)
async def get_credit_card(card_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = card_id
    card = await db.credit_cards.find_one(user_filter, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Credit card not found")
    if isinstance(card.get('createdAt'), str):
        card['createdAt'] = datetime.fromisoformat(card['createdAt'])
    return card


@router.put("/{card_id}", response_model=CreditCard)
async def update_credit_card(card_id: str, input: CreditCardCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = card_id
    existing = await db.credit_cards.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Credit card not found")
    card_dict = input.model_dump()
    card_dict['id'] = card_id
    card_dict['userId'] = user.get('user_id')
    card_dict['createdAt'] = existing['createdAt']
    await db.credit_cards.replace_one({"id": card_id}, card_dict)
    card_obj = CreditCard(**card_dict)
    if isinstance(card_obj.createdAt, str):
        card_obj.createdAt = datetime.fromisoformat(card_obj.createdAt)
    return card_obj


@router.delete("/{card_id}")
async def delete_credit_card(card_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = card_id
    existing = await db.credit_cards.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Credit card not found")
    await db.credit_cards.delete_one({"id": card_id})
    return {"message": "Credit card deleted successfully", "id": card_id}



@router.get("/{card_id}/detail")
async def get_credit_card_detail(card_id: str, request: Request):
    """Get comprehensive credit card detail with payment history and insights."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = card_id
    card = await db.credit_cards.find_one(user_filter, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Credit card not found")

    user_id = user.get("user_id")
    outstanding = card.get("outstandingAmount", 0)
    limit = card.get("creditLimit", 1)
    utilization = round((outstanding / limit * 100), 1) if limit > 0 else 0
    available = max(0, limit - outstanding)
    apr = card.get("interestRate", 0)
    min_due = card.get("minimumDue", 0)

    # Monthly interest on outstanding if only min due paid
    monthly_interest = round(outstanding * (apr / 12 / 100), 2) if apr > 0 else 0

    # Linked expenses (CC payments)
    linked_expenses = await db.expenses.find(
        {"userId": user_id, "category": {"$regex": "credit.card|cc", "$options": "i"}},
        {"_id": 0}
    ).to_list(100)

    # Payment history from income_transactions or manual entries
    payments = await db.cc_payments.find(
        {"userId": user_id, "cardId": card_id}, {"_id": 0}
    ).sort("paymentDate", -1).to_list(100)

    # Months to pay off with min payment
    months_to_payoff = 0
    if min_due > 0 and outstanding > 0 and apr > 0:
        r = apr / 12 / 100
        if min_due > outstanding * r:
            import math
            months_to_payoff = math.ceil(-math.log(1 - (outstanding * r / min_due)) / math.log(1 + r))
        else:
            months_to_payoff = 999

    return {
        **{k: v for k, v in card.items() if k != "createdAt"},
        "createdAt": card.get("createdAt") if isinstance(card.get("createdAt"), str) else card.get("createdAt", datetime.now()).isoformat() if card.get("createdAt") else None,
        "availableCredit": available,
        "utilization": utilization,
        "monthlyInterest": monthly_interest,
        "monthsToPayoff": months_to_payoff,
        "linkedExpenses": len(linked_expenses),
        "payments": payments,
    }


@router.post("/{card_id}/record-payment")
async def record_cc_payment(card_id: str, request: Request):
    """Record a credit card payment."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    body = await request.json()
    amount = body.get("amount", 0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    user_filter = get_user_filter(user)
    user_filter["id"] = card_id
    card = await db.credit_cards.find_one(user_filter, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Credit card not found")

    import uuid as _uuid
    new_outstanding = max(0, round(card.get("outstandingAmount", 0) - amount, 2))
    await db.credit_cards.update_one({"id": card_id}, {"$set": {"outstandingAmount": new_outstanding}})

    payment = {
        "id": str(_uuid.uuid4()),
        "userId": user.get("user_id"),
        "cardId": card_id,
        "cardName": card.get("cardName", ""),
        "amount": amount,
        "paymentDate": body.get("paymentDate", datetime.now().strftime("%Y-%m-%d")),
        "outstandingBefore": card.get("outstandingAmount", 0),
        "outstandingAfter": new_outstanding,
        "createdAt": datetime.now().isoformat()
    }
    await db.cc_payments.insert_one(payment)
    return {"success": True, "payment": {k: v for k, v in payment.items() if k != "_id"}, "newOutstanding": new_outstanding}
