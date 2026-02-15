"""Investment routes - CRUD for investments."""
from fastapi import APIRouter, HTTPException, Request
from typing import List
from datetime import datetime

from database import db
from models.financial import Investment, InvestmentCreate
from routes.auth import get_current_user
from routes.utils import get_user_filter, convert_datetime_fields

router = APIRouter(prefix="/investments", tags=["Investments"])


@router.post("", response_model=Investment)
async def create_investment(input: InvestmentCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    investment_dict = input.model_dump()
    investment_dict['userId'] = user.get('user_id')
    investment_obj = Investment(**investment_dict)
    
    doc = investment_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.investments.insert_one(doc)
    return investment_obj


@router.get("", response_model=List[Investment])
async def get_investments(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_filter = get_user_filter(user)
    investments = await db.investments.find(user_filter, {"_id": 0}).to_list(1000)
    
    for investment in investments:
        convert_datetime_fields(investment)
    
    return investments


@router.get("/{investment_id}", response_model=Investment)
async def get_investment(investment_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_filter = get_user_filter(user)
    user_filter["id"] = investment_id
    investment = await db.investments.find_one(user_filter, {"_id": 0})
    
    if not investment:
        raise HTTPException(status_code=404, detail="Investment not found")
    
    convert_datetime_fields(investment)
    return investment


@router.put("/{investment_id}", response_model=Investment)
async def update_investment(investment_id: str, input: InvestmentCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_filter = get_user_filter(user)
    user_filter["id"] = investment_id
    existing = await db.investments.find_one(user_filter, {"_id": 0})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Investment not found")
    
    investment_dict = input.model_dump()
    investment_dict['id'] = investment_id
    investment_dict['userId'] = user.get('user_id')
    investment_dict['createdAt'] = existing['createdAt']
    
    await db.investments.replace_one({"id": investment_id}, investment_dict)
    
    investment_obj = Investment(**investment_dict)
    if isinstance(investment_obj.createdAt, str):
        investment_obj.createdAt = datetime.fromisoformat(investment_obj.createdAt)
    
    return investment_obj


@router.delete("/{investment_id}")
async def delete_investment(investment_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_filter = get_user_filter(user)
    user_filter["id"] = investment_id
    existing = await db.investments.find_one(user_filter, {"_id": 0})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Investment not found")
    
    await db.investments.delete_one({"id": investment_id})
    return {"message": "Investment deleted successfully", "id": investment_id}
