"""Account routes - Full CRUD from server.py."""
from fastapi import APIRouter, HTTPException, Request
from typing import List
from datetime import datetime

from database import db
from server_models import Account, AccountCreate
from routes.auth import get_current_user
from routes.utils import get_user_filter

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.post("", response_model=Account)
async def create_account(input: AccountCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    account_dict = input.model_dump()
    account_dict['userId'] = user.get('user_id')
    account_obj = Account(**account_dict)
    doc = account_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    await db.accounts.insert_one(doc)
    return account_obj


@router.get("", response_model=List[Account])
async def get_accounts(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    accounts = await db.accounts.find(user_filter, {"_id": 0}).to_list(1000)
    for account in accounts:
        if isinstance(account.get('createdAt'), str):
            account['createdAt'] = datetime.fromisoformat(account['createdAt'])
    return accounts


@router.get("/{account_id}", response_model=Account)
async def get_account(account_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = account_id
    account = await db.accounts.find_one(user_filter, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if isinstance(account.get('createdAt'), str):
        account['createdAt'] = datetime.fromisoformat(account['createdAt'])
    return account


@router.put("/{account_id}", response_model=Account)
async def update_account(account_id: str, input: AccountCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = account_id
    existing = await db.accounts.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Account not found")
    account_dict = input.model_dump()
    account_dict['id'] = account_id
    account_dict['userId'] = user.get('user_id')
    account_dict['createdAt'] = existing['createdAt']
    await db.accounts.replace_one({"id": account_id}, account_dict)
    account_obj = Account(**account_dict)
    if isinstance(account_obj.createdAt, str):
        account_obj.createdAt = datetime.fromisoformat(account_obj.createdAt)
    return account_obj


@router.delete("/{account_id}")
async def delete_account(account_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = account_id
    existing = await db.accounts.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Account not found")
    await db.accounts.delete_one({"id": account_id})
    return {"message": "Account deleted successfully", "id": account_id}
