"""Credit Card routes - CRUD for credit cards."""
from fastapi import APIRouter, HTTPException, Request
from typing import List
from datetime import datetime

from database import db
from models.financial import CreditCard, CreditCardCreate
from routes.auth import get_current_user
from routes.utils import get_user_filter, convert_datetime_fields

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
    
    user_filter = get_user_filter(user)
    cards = await db.credit_cards.find(user_filter, {"_id": 0}).to_list(1000)
    
    for card in cards:
        convert_datetime_fields(card)
    
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
    
    convert_datetime_fields(card)
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
