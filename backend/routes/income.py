"""Income routes - CRUD for income sources."""
from fastapi import APIRouter, HTTPException, Request
from typing import List
from datetime import datetime

from database import db
from models.income import IncomeSource, IncomeSourceCreate
from routes.auth import get_current_user
from routes.utils import get_user_filter, convert_datetime_fields

router = APIRouter(prefix="/income", tags=["Income"])


@router.post("", response_model=IncomeSource)
async def create_income_source(input: IncomeSourceCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    income_dict = input.model_dump()
    income_dict['userId'] = user.get('user_id')
    income_obj = IncomeSource(**income_dict)
    
    doc = income_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.income_sources.insert_one(doc)
    return income_obj


@router.get("", response_model=List[IncomeSource])
async def get_income_sources(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_filter = get_user_filter(user)
    income_sources = await db.income_sources.find(user_filter, {"_id": 0}).to_list(1000)
    
    for source in income_sources:
        convert_datetime_fields(source)
    
    return income_sources


@router.get("/{income_id}", response_model=IncomeSource)
async def get_income_source(income_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_filter = get_user_filter(user)
    user_filter["id"] = income_id
    income_source = await db.income_sources.find_one(user_filter, {"_id": 0})
    
    if not income_source:
        raise HTTPException(status_code=404, detail="Income source not found")
    
    convert_datetime_fields(income_source)
    return income_source


@router.put("/{income_id}", response_model=IncomeSource)
async def update_income_source(income_id: str, input: IncomeSourceCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_filter = get_user_filter(user)
    user_filter["id"] = income_id
    existing = await db.income_sources.find_one(user_filter, {"_id": 0})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Income source not found")
    
    income_dict = input.model_dump()
    income_dict['id'] = income_id
    income_dict['userId'] = user.get('user_id')
    income_dict['createdAt'] = existing['createdAt']
    
    if not isinstance(income_dict['createdAt'], str):
        income_dict['createdAt'] = income_dict['createdAt'].isoformat()
    
    await db.income_sources.replace_one({"id": income_id}, income_dict)
    
    income_obj = IncomeSource(**income_dict)
    if isinstance(income_obj.createdAt, str):
        income_obj.createdAt = datetime.fromisoformat(income_obj.createdAt)
    
    return income_obj


@router.delete("/{income_id}")
async def delete_income_source(income_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_filter = get_user_filter(user)
    user_filter["id"] = income_id
    existing = await db.income_sources.find_one(user_filter, {"_id": 0})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Income source not found")
    
    await db.income_sources.delete_one({"id": income_id})
    
    return {"message": "Income source deleted successfully", "id": income_id}
