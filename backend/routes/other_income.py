"""Other Income routes - Full CRUD from server.py."""
from fastapi import APIRouter, HTTPException, Request
from typing import List
from datetime import datetime

from database import db
from server_models import OtherIncome, OtherIncomeCreate
from routes.auth import get_current_user
from routes.utils import get_user_filter, get_effective_user_filter

router = APIRouter(prefix="/other-income", tags=["Other Income"])


@router.post("", response_model=OtherIncome)
async def create_other_income(input: OtherIncomeCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    income_dict = input.model_dump()
    income_dict['userId'] = user.get('user_id')
    income_obj = OtherIncome(**income_dict)
    doc = income_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    await db.other_income.insert_one(doc)
    return income_obj


@router.get("", response_model=List[OtherIncome])
async def get_other_incomes(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = await get_effective_user_filter(user, request)
    incomes = await db.other_income.find(user_filter, {"_id": 0}).to_list(1000)
    for income in incomes:
        if isinstance(income.get('createdAt'), str):
            income['createdAt'] = datetime.fromisoformat(income['createdAt'])
    return incomes


@router.get("/{income_id}", response_model=OtherIncome)
async def get_other_income(income_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = income_id
    income = await db.other_income.find_one(user_filter, {"_id": 0})
    if not income:
        raise HTTPException(status_code=404, detail="Other income not found")
    if isinstance(income.get('createdAt'), str):
        income['createdAt'] = datetime.fromisoformat(income['createdAt'])
    return income


@router.put("/{income_id}", response_model=OtherIncome)
async def update_other_income(income_id: str, input: OtherIncomeCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = income_id
    existing = await db.other_income.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Other income not found")
    income_dict = input.model_dump()
    income_dict['id'] = income_id
    income_dict['userId'] = user.get('user_id')
    income_dict['createdAt'] = existing['createdAt']
    await db.other_income.replace_one({"id": income_id}, income_dict)
    income_obj = OtherIncome(**income_dict)
    if isinstance(income_obj.createdAt, str):
        income_obj.createdAt = datetime.fromisoformat(income_obj.createdAt)
    return income_obj


@router.delete("/{income_id}")
async def delete_other_income(income_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = income_id
    existing = await db.other_income.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Other income not found")
    await db.other_income.delete_one({"id": income_id})
    return {"message": "Other income deleted successfully", "id": income_id}
