"""Income routes - Full CRUD + list summary from server.py."""
from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional
from datetime import datetime

from database import db
from server_models import IncomeSource, IncomeSourceCreate
from routes.auth import get_current_user
from routes.utils import get_user_filter

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
        if isinstance(source.get('createdAt'), str):
            source['createdAt'] = datetime.fromisoformat(source['createdAt'])
    return income_sources


@router.get("/list/summary")
async def get_income_list_summary(request: Request, type: Optional[str] = None):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    if type:
        # Treat synonymous types: Job↔Salary, Self-Employed↔Freelance
        type_synonyms = {
            "Job": ["Job", "Salary"],
            "Salary": ["Job", "Salary"],
            "Self-Employed": ["Self-Employed", "Freelance"],
            "Freelance": ["Self-Employed", "Freelance"],
        }
        matches = type_synonyms.get(type)
        if matches:
            user_filter["type"] = {"$in": matches}
        else:
            user_filter["type"] = {"$regex": f"^{type}$", "$options": "i"}
    projection = {
        "_id": 0, "id": 1, "name": 1, "type": 1, "expectedAmount": 1,
        "frequency": 1, "selectedDay": 1, "selectedDate": 1, "selectedMonth": 1,
        "selectedQuarter": 1, "incomeType": 1
    }
    income_sources = await db.income_sources.find(user_filter, projection).to_list(1000)
    entity_ids = [s["id"] for s in income_sources]
    pipeline = [
        {"$match": {"entityId": {"$in": entity_ids}}},
        {"$group": {
            "_id": "$entityId",
            "totalRecorded": {"$sum": "$amount"},
            "transactionCount": {"$sum": 1},
            "lastTransaction": {"$max": "$transactionDate"}
        }}
    ]
    transaction_stats = {}
    async for stat in db.income_transactions.aggregate(pipeline):
        transaction_stats[stat["_id"]] = {
            "totalRecorded": stat["totalRecorded"],
            "transactionCount": stat["transactionCount"],
            "lastTransaction": stat["lastTransaction"]
        }
    for source in income_sources:
        stats = transaction_stats.get(source["id"], {})
        source["totalRecorded"] = stats.get("totalRecorded", 0)
        source["transactionCount"] = stats.get("transactionCount", 0)
        source["lastTransaction"] = stats.get("lastTransaction")
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
    if isinstance(income_source.get('createdAt'), str):
        income_source['createdAt'] = datetime.fromisoformat(income_source['createdAt'])
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
