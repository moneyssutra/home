"""Asset routes - Full CRUD with rental income linking from server.py."""
from fastapi import APIRouter, HTTPException, Request
from typing import List
from datetime import datetime, timezone
import uuid

from database import db
from server_models import Asset, AssetCreate
from routes.auth import get_current_user
from routes.utils import get_user_filter, get_effective_user_filter

router = APIRouter(prefix="/assets", tags=["Assets"])


@router.post("", response_model=Asset)
async def create_asset(input: AssetCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    asset_dict = input.model_dump()
    asset_dict['userId'] = user.get('user_id')
    asset_obj = Asset(**asset_dict)

    if asset_obj.generatesIncome and asset_obj.incomeAmount:
        existing_income = await db.income_sources.find_one({"assetId": asset_obj.id}, {"_id": 0})
        if not existing_income:
            rental_income = {
                "id": str(uuid.uuid4()), "userId": user.get('user_id'),
                "type": "Rental", "name": asset_obj.assetName,
                "expectedAmount": asset_obj.incomeAmount,
                "frequency": asset_obj.incomeFrequency or "Monthly",
                "tenantName": asset_dict.get("renterName"),
                "securityDeposit": asset_dict.get("securityDeposit"),
                "assetId": asset_obj.id, "assetValue": asset_obj.currentValue,
                "rentalYield": round((asset_obj.incomeAmount * 12 / asset_obj.currentValue) * 100, 2) if asset_obj.currentValue else None,
                "createdAt": datetime.now(timezone.utc).isoformat(),
            }
            await db.income_sources.insert_one(rental_income)
            asset_obj.linkedIncomeId = rental_income["id"]

    doc = asset_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    await db.assets.insert_one(doc)
    return asset_obj


@router.get("", response_model=List[Asset])
async def get_assets(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = await get_effective_user_filter(user, request)
    assets = await db.assets.find(user_filter, {"_id": 0}).to_list(1000)
    for asset in assets:
        if isinstance(asset.get('createdAt'), str):
            asset['createdAt'] = datetime.fromisoformat(asset['createdAt'])
    return assets


@router.get("/{asset_id}", response_model=Asset)
async def get_asset(asset_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = asset_id
    asset = await db.assets.find_one(user_filter, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if isinstance(asset.get('createdAt'), str):
        asset['createdAt'] = datetime.fromisoformat(asset['createdAt'])
    return asset


@router.put("/{asset_id}", response_model=Asset)
async def update_asset(asset_id: str, input: AssetCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = asset_id
    existing = await db.assets.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset_dict = input.model_dump()
    asset_dict['id'] = asset_id
    asset_dict['userId'] = user.get('user_id')
    asset_dict['createdAt'] = existing['createdAt']

    if asset_dict.get('generatesIncome') and asset_dict.get('incomeAmount'):
        existing_income = await db.income_sources.find_one({"assetId": asset_id}, {"_id": 0})
        if existing_income:
            await db.income_sources.update_one({"assetId": asset_id}, {"$set": {
                "name": asset_dict['assetName'], "expectedAmount": asset_dict['incomeAmount'],
                "frequency": asset_dict.get('incomeFrequency') or "Monthly",
                "tenantName": asset_dict.get('renterName'), "securityDeposit": asset_dict.get('securityDeposit'),
                "assetValue": asset_dict['currentValue'],
                "rentalYield": round((asset_dict['incomeAmount'] * 12 / asset_dict['currentValue']) * 100, 2) if asset_dict['currentValue'] else None,
            }})
            asset_dict['linkedIncomeId'] = existing_income['id']
        else:
            rental_income = {
                "id": str(uuid.uuid4()), "userId": user.get('user_id'),
                "type": "Rental", "name": asset_dict['assetName'],
                "expectedAmount": asset_dict['incomeAmount'],
                "frequency": asset_dict.get('incomeFrequency') or "Monthly",
                "tenantName": asset_dict.get('renterName'), "securityDeposit": asset_dict.get('securityDeposit'),
                "assetId": asset_id, "assetValue": asset_dict['currentValue'],
                "rentalYield": round((asset_dict['incomeAmount'] * 12 / asset_dict['currentValue']) * 100, 2) if asset_dict['currentValue'] else None,
                "createdAt": datetime.now(timezone.utc).isoformat(),
            }
            await db.income_sources.insert_one(rental_income)
            asset_dict['linkedIncomeId'] = rental_income['id']
    elif not asset_dict.get('generatesIncome'):
        asset_dict['linkedIncomeId'] = None
        await db.income_sources.delete_many({"assetId": asset_id})

    await db.assets.replace_one({"id": asset_id}, asset_dict)
    asset_obj = Asset(**asset_dict)
    if isinstance(asset_obj.createdAt, str):
        asset_obj.createdAt = datetime.fromisoformat(asset_obj.createdAt)
    return asset_obj


@router.delete("/{asset_id}")
async def delete_asset(asset_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = asset_id
    existing = await db.assets.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Asset not found")
    await db.assets.delete_one({"id": asset_id})
    return {"message": "Asset deleted successfully", "id": asset_id}



@router.get("/{asset_id}/detail")
async def get_asset_detail(asset_id: str, request: Request):
    """Get comprehensive asset detail with linked entities and appreciation."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = asset_id
    asset = await db.assets.find_one(user_filter, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    import math
    purchase_val = asset.get("purchaseValue") or asset.get("currentValue", 0)
    current_val = asset.get("currentValue", 0)
    appreciation = round(current_val - purchase_val, 2) if purchase_val else 0
    appreciation_pct = round((appreciation / purchase_val * 100), 2) if purchase_val > 0 else 0
    purchase_date_str = asset.get("purchaseDate")

    years_held = 0
    if purchase_date_str:
        try:
            pd = datetime.strptime(purchase_date_str, "%Y-%m-%d")
            years_held = round((datetime.now() - pd).days / 365.25, 1)
        except (ValueError, TypeError):
            pass
    cagr = round((math.pow(current_val / purchase_val, 1 / max(years_held, 0.1)) - 1) * 100, 2) if purchase_val > 0 and years_held > 0 else 0

    # Linked entities
    linked_loan = None
    if asset.get("linkedLoanId"):
        linked_loan = await db.loans.find_one({"id": asset["linkedLoanId"]}, {"_id": 0, "loanName": 1, "outstandingAmount": 1, "id": 1})
    linked_insurance = None
    if asset.get("linkedInsuranceId"):
        linked_insurance = await db.insurances.find_one({"id": asset["linkedInsuranceId"]}, {"_id": 0, "policyName": 1, "coverageAmount": 1, "id": 1})
    linked_income = None
    if asset.get("linkedIncomeId"):
        linked_income = await db.income_sources.find_one({"id": asset["linkedIncomeId"]}, {"_id": 0, "name": 1, "expectedAmount": 1, "id": 1})

    net_equity = current_val - (linked_loan.get("outstandingAmount", 0) if linked_loan else 0)

    return {
        **{k: v for k, v in asset.items() if k != "createdAt"},
        "createdAt": asset.get("createdAt") if isinstance(asset.get("createdAt"), str) else asset.get("createdAt", datetime.now()).isoformat() if asset.get("createdAt") else None,
        "metrics": {
            "appreciation": appreciation,
            "appreciationPct": appreciation_pct,
            "cagr": cagr,
            "yearsHeld": years_held,
            "netEquity": round(net_equity, 2),
        },
        "linkedLoan": linked_loan,
        "linkedInsurance": linked_insurance,
        "linkedIncome": linked_income,
    }
