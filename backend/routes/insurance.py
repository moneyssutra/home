"""Insurance routes - CRUD for insurance policies."""
from fastapi import APIRouter, HTTPException, Request
from typing import List
from datetime import datetime, timezone
import uuid

from database import db
from models.insurance import Insurance, InsuranceCreate
from routes.auth import get_current_user
from routes.utils import get_user_filter, convert_datetime_fields

router = APIRouter(prefix="/insurances", tags=["Insurance"])


@router.post("", response_model=Insurance)
async def create_insurance(input: InsuranceCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    insurance_dict = input.model_dump()
    insurance_dict['userId'] = user.get('user_id')
    insurance_obj = Insurance(**insurance_dict)
    
    doc = insurance_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.insurances.insert_one(doc)
    
    # Auto-create premium expense if enabled
    if insurance_obj.autoCreateExpense:
        existing_expense = await db.expenses.find_one({"linkedInsuranceId": insurance_obj.id}, {"_id": 0})
        if not existing_expense:
            freq_map = {
                "Monthly": "Monthly", 
                "Quarterly": "Quarterly", 
                "Half-Yearly": "Half-Yearly", 
                "Yearly": "Yearly"
            }
            expense_freq = freq_map.get(insurance_obj.premiumFrequency, "Yearly")
            
            start_date = datetime.fromisoformat(insurance_obj.startDate) if insurance_obj.startDate else datetime.now(timezone.utc)
            selected_date = str(start_date.day)
            
            expense_data = {
                "id": str(uuid.uuid4()),
                "userId": user.get('user_id'),
                "expenseName": f"{insurance_obj.policyName} Premium",
                "expenseType": "Fixed",
                "category": "Insurance Premium",
                "expectedAmount": insurance_obj.premiumAmount,
                "frequency": expense_freq,
                "linkedAccountId": None,
                "linkedLoanId": None,
                "linkedInsuranceId": insurance_obj.id,
                "selectedDay": None,
                "selectedDate": selected_date,
                "selectedQuarter": None,
                "selectedHalf": None,
                "selectedMonth": None,
                "oneTimeDate": None,
                "isPaid": False,
                "lastPaidDate": None,
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
            await db.expenses.insert_one(expense_data)
            insurance_obj.linkedExpenseId = expense_data['id']
    
    return insurance_obj


@router.get("", response_model=List[Insurance])
async def get_insurances(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_filter = get_user_filter(user)
    insurances = await db.insurances.find(user_filter, {"_id": 0}).to_list(1000)
    
    for insurance in insurances:
        convert_datetime_fields(insurance)
    
    return insurances


@router.get("/{insurance_id}", response_model=Insurance)
async def get_insurance(insurance_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_filter = get_user_filter(user)
    user_filter["id"] = insurance_id
    insurance = await db.insurances.find_one(user_filter, {"_id": 0})
    
    if not insurance:
        raise HTTPException(status_code=404, detail="Insurance not found")
    
    convert_datetime_fields(insurance)
    return insurance


@router.put("/{insurance_id}", response_model=Insurance)
async def update_insurance(insurance_id: str, input: InsuranceCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_filter = get_user_filter(user)
    user_filter["id"] = insurance_id
    existing = await db.insurances.find_one(user_filter, {"_id": 0})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Insurance not found")
    
    insurance_dict = input.model_dump()
    insurance_dict['id'] = insurance_id
    insurance_dict['userId'] = user.get('user_id')
    insurance_dict['createdAt'] = existing['createdAt']
    
    # Update linked expense if autoCreateExpense is enabled
    if insurance_dict.get('autoCreateExpense'):
        linked_expense = await db.expenses.find_one({"linkedInsuranceId": insurance_id}, {"_id": 0})
        if linked_expense:
            await db.expenses.update_one(
                {"linkedInsuranceId": insurance_id},
                {"$set": {
                    "expenseName": f"{insurance_dict['policyName']} Premium",
                    "expectedAmount": insurance_dict['premiumAmount'],
                    "frequency": insurance_dict.get('premiumFrequency', 'Yearly')
                }}
            )
    
    await db.insurances.replace_one({"id": insurance_id}, insurance_dict)
    
    insurance_obj = Insurance(**insurance_dict)
    if isinstance(insurance_obj.createdAt, str):
        insurance_obj.createdAt = datetime.fromisoformat(insurance_obj.createdAt)
    
    return insurance_obj


@router.delete("/{insurance_id}")
async def delete_insurance(insurance_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_filter = get_user_filter(user)
    user_filter["id"] = insurance_id
    existing = await db.insurances.find_one(user_filter, {"_id": 0})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Insurance not found")
    
    await db.insurances.delete_one({"id": insurance_id})
    return {"message": "Insurance deleted successfully", "id": insurance_id}
