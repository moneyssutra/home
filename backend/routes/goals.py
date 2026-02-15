"""Goal routes - Goal CRUD and progress calculation."""
from fastapi import APIRouter, HTTPException, Request
from typing import List
from datetime import datetime, timezone

from database import db
from models.goals import Goal, GoalCreate, GoalPriorityUpdate
from routes.auth import get_current_user
from routes.utils import get_user_filter, convert_datetime_fields

router = APIRouter(prefix="/goals", tags=["Goals"])


async def calculate_goal_progress(goal: dict) -> dict:
    """Calculate the current progress of a goal based on linked sources"""
    calculated_amount = 0
    linked_details = []
    sip_projections = []
    
    # If manual override, use stored amount
    if goal.get('manualOverride') and not goal.get('autoCalculate'):
        return {
            "currentAmount": goal.get('currentAmount', 0),
            "linkedDetails": [],
            "sipProjections": [],
            "calculationMethod": "manual"
        }
    
    goal_type = goal.get('goalType', '')
    target_date = goal.get('targetDate')
    
    # Calculate months until target
    months_to_target = 0
    if target_date:
        try:
            target_dt = datetime.fromisoformat(target_date).date()
            today = datetime.now(timezone.utc).date()
            days_diff = (target_dt - today).days
            months_to_target = max(0, days_diff / 30)
        except (ValueError, TypeError):
            months_to_target = 0
    
    # Debt Elimination goals
    if goal_type == "Debt Elimination":
        if goal.get('linkedLoanId'):
            loan = await db.loans.find_one({"id": goal['linkedLoanId']}, {"_id": 0})
            if loan:
                principal = loan.get('principalAmount', 0)
                outstanding = loan.get('outstandingAmount', 0)
                paid_off = principal - outstanding
                calculated_amount += paid_off
                linked_details.append({
                    "type": "Loan",
                    "name": loan.get('loanName'),
                    "contribution": paid_off,
                    "principal": principal,
                    "outstanding": outstanding,
                    "emiAmount": loan.get('emiAmount', 0)
                })
        
        if goal.get('linkedCreditCardId'):
            card = await db.credit_cards.find_one({"id": goal['linkedCreditCardId']}, {"_id": 0})
            if card:
                limit = card.get('creditLimit', 0)
                outstanding = card.get('outstandingAmount', 0)
                available = limit - outstanding
                calculated_amount += available
                linked_details.append({
                    "type": "Credit Card",
                    "name": card.get('cardName'),
                    "contribution": available,
                    "creditLimit": limit,
                    "outstanding": outstanding
                })
    
    # Investment/Wealth goals
    elif goal_type in ["Investment Target", "Wealth Creation"]:
        for inv_id in goal.get('linkedInvestmentIds', []):
            investment = await db.investments.find_one({"id": inv_id}, {"_id": 0})
            if investment:
                current_value = investment.get('currentValue', 0)
                calculated_amount += current_value
                
                # SIP projection
                sip_amount = investment.get('sipAmount', 0)
                frequency = investment.get('investmentFrequency', '')
                return_rate = investment.get('returnRate', 0)
                projected_value = current_value
                monthly_contribution = 0
                
                if sip_amount and frequency and months_to_target > 0:
                    freq_map = {'Daily': 30, 'Weekly': 4, 'Monthly': 1, 'Quarterly': 1/3, 'Yearly': 1/12}
                    monthly_contribution = sip_amount * freq_map.get(frequency, 1)
                    monthly_rate = (return_rate / 100) / 12 if return_rate else 0
                    n = months_to_target
                    
                    if monthly_rate > 0:
                        pv_growth = current_value * ((1 + monthly_rate) ** n)
                        pmt_growth = monthly_contribution * (((1 + monthly_rate) ** n - 1) / monthly_rate)
                        projected_value = pv_growth + pmt_growth
                    else:
                        projected_value = current_value + (monthly_contribution * n)
                    
                    sip_projections.append({
                        "investmentId": inv_id,
                        "investmentName": investment.get('name'),
                        "currentValue": current_value,
                        "sipAmount": sip_amount,
                        "frequency": frequency,
                        "monthlyContribution": monthly_contribution,
                        "returnRate": return_rate,
                        "projectedValue": round(projected_value, 2),
                        "projectedGain": round(projected_value - current_value, 2),
                        "monthsToTarget": round(months_to_target, 1)
                    })
                
                linked_details.append({
                    "type": "Investment",
                    "name": investment.get('name'),
                    "category": investment.get('investmentCategory'),
                    "contribution": current_value,
                    "hasSIP": bool(sip_amount and frequency),
                    "projectedValue": round(projected_value, 2) if sip_amount else None
                })
        
        # Add linked accounts
        for acc_id in goal.get('linkedAccountIds', []):
            account = await db.accounts.find_one({"id": acc_id}, {"_id": 0})
            if account and account.get('accountType') != 'Credit Card':
                balance = account.get('currentBalance', 0)
                calculated_amount += balance
                linked_details.append({
                    "type": "Account",
                    "name": account.get('accountName'),
                    "accountType": account.get('accountType'),
                    "contribution": balance
                })
    
    # Emergency Fund goals
    elif goal_type == "Emergency Fund":
        for acc_id in goal.get('linkedAccountIds', []):
            account = await db.accounts.find_one({"id": acc_id}, {"_id": 0})
            if account and account.get('accountType') != 'Credit Card':
                balance = account.get('currentBalance', 0)
                calculated_amount += balance
                linked_details.append({
                    "type": "Account",
                    "name": account.get('accountName'),
                    "accountType": account.get('accountType'),
                    "contribution": balance
                })
        
        # Include liquid investments
        for inv_id in goal.get('linkedInvestmentIds', []):
            investment = await db.investments.find_one({"id": inv_id}, {"_id": 0})
            if investment:
                current_value = investment.get('currentValue', 0)
                calculated_amount += current_value
                linked_details.append({
                    "type": "Investment",
                    "name": investment.get('name'),
                    "contribution": current_value
                })
    
    # Other goals
    else:
        for inv_id in goal.get('linkedInvestmentIds', []):
            investment = await db.investments.find_one({"id": inv_id}, {"_id": 0})
            if investment:
                current_value = investment.get('currentValue', 0)
                calculated_amount += current_value
                linked_details.append({
                    "type": "Investment",
                    "name": investment.get('name'),
                    "contribution": current_value
                })
        
        for acc_id in goal.get('linkedAccountIds', []):
            account = await db.accounts.find_one({"id": acc_id}, {"_id": 0})
            if account and account.get('accountType') != 'Credit Card':
                calculated_amount += account.get('currentBalance', 0)
                linked_details.append({
                    "type": "Account",
                    "name": account.get('accountName'),
                    "contribution": account.get('currentBalance', 0)
                })
    
    total_projected_from_sips = sum(sp.get('projectedValue', 0) for sp in sip_projections)
    total_monthly_sip_contribution = sum(sp.get('monthlyContribution', 0) for sp in sip_projections)
    
    # Handle manual override
    if goal.get('manualOverride'):
        manual_amount = goal.get('currentAmount', 0)
        if manual_amount > calculated_amount:
            return {
                "currentAmount": manual_amount,
                "linkedDetails": linked_details,
                "sipProjections": sip_projections,
                "totalProjectedFromSIPs": total_projected_from_sips,
                "totalMonthlySIPContribution": total_monthly_sip_contribution,
                "monthsToTarget": round(months_to_target, 1),
                "calculationMethod": "manual_override"
            }
    
    return {
        "currentAmount": calculated_amount,
        "linkedDetails": linked_details,
        "sipProjections": sip_projections,
        "totalProjectedFromSIPs": total_projected_from_sips,
        "totalMonthlySIPContribution": total_monthly_sip_contribution,
        "monthsToTarget": round(months_to_target, 1),
        "calculationMethod": "auto"
    }


@router.post("", response_model=Goal)
async def create_goal(input: GoalCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    goal_dict = input.model_dump()
    goal_dict['userId'] = user.get('user_id')
    goal_obj = Goal(**goal_dict)
    
    # Auto-set target for Debt Elimination
    if goal_obj.goalType == "Debt Elimination":
        if goal_obj.linkedLoanId:
            loan = await db.loans.find_one({"id": goal_obj.linkedLoanId}, {"_id": 0})
            if loan and goal_obj.targetAmount == 0:
                goal_obj.targetAmount = loan.get('outstandingAmount', 0)
        elif goal_obj.linkedCreditCardId:
            card = await db.credit_cards.find_one({"id": goal_obj.linkedCreditCardId}, {"_id": 0})
            if card and goal_obj.targetAmount == 0:
                goal_obj.targetAmount = card.get('outstandingAmount', 0)
    
    doc = goal_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.goals.insert_one(doc)
    return goal_obj


@router.get("")
async def get_goals(request: Request):
    """Get all goals with calculated progress"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_filter = get_user_filter(user)
    goals = await db.goals.find(user_filter, {"_id": 0}).to_list(1000)
    
    result = []
    for goal in goals:
        convert_datetime_fields(goal)
        
        progress_data = await calculate_goal_progress(goal)
        goal['calculatedAmount'] = progress_data['currentAmount']
        goal['linkedDetails'] = progress_data['linkedDetails']
        goal['calculationMethod'] = progress_data['calculationMethod']
        goal['sipProjections'] = progress_data.get('sipProjections', [])
        goal['totalProjectedFromSIPs'] = progress_data.get('totalProjectedFromSIPs', 0)
        goal['totalMonthlySIPContribution'] = progress_data.get('totalMonthlySIPContribution', 0)
        
        # Progress percentage
        target = goal.get('targetAmount', 0)
        current = progress_data['currentAmount']
        goal['progressPercent'] = round((current / target) * 100, 1) if target > 0 else 0
        
        # Projected progress
        projected_total = progress_data.get('totalProjectedFromSIPs', 0)
        goal['projectedProgressPercent'] = round((projected_total / target) * 100, 1) if projected_total > 0 and target > 0 else goal['progressPercent']
        
        # Days remaining
        target_date = goal.get('targetDate')
        if target_date:
            try:
                target_dt = datetime.fromisoformat(target_date).date()
                today = datetime.now(timezone.utc).date()
                days_remaining = (target_dt - today).days
                goal['daysRemaining'] = days_remaining
                goal['isOverdue'] = days_remaining < 0
            except (ValueError, TypeError):
                goal['daysRemaining'] = None
                goal['isOverdue'] = False
        
        result.append(goal)
    
    result.sort(key=lambda x: (x.get('priority', 1), x.get('daysRemaining') or 9999))
    return result


@router.get("/achievements")
async def get_goal_achievements(request: Request):
    """Get all completed goals for achievements page"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_filter = get_user_filter(user)
    user_filter["isCompleted"] = True
    
    completed_goals = await db.goals.find(user_filter, {"_id": 0}).to_list(1000)
    
    result = []
    for goal in completed_goals:
        convert_datetime_fields(goal)
        progress_data = await calculate_goal_progress(goal)
        
        result.append({
            "id": goal.get('id'),
            "goalName": goal.get('goalName'),
            "goalType": goal.get('goalType'),
            "targetAmount": goal.get('targetAmount'),
            "achievedAmount": progress_data['currentAmount'],
            "completedDate": goal.get('completedDate'),
            "reachedMilestones": goal.get('reachedMilestones', []),
            "linkedDetails": progress_data['linkedDetails']
        })
    
    return result


@router.get("/{goal_id}")
async def get_goal(goal_id: str, request: Request):
    """Get single goal with full details"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_filter = get_user_filter(user)
    user_filter["id"] = goal_id
    goal = await db.goals.find_one(user_filter, {"_id": 0})
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    convert_datetime_fields(goal)
    progress_data = await calculate_goal_progress(goal)
    
    goal['calculatedAmount'] = progress_data['currentAmount']
    goal['linkedDetails'] = progress_data['linkedDetails']
    goal['sipProjections'] = progress_data.get('sipProjections', [])
    goal['totalProjectedFromSIPs'] = progress_data.get('totalProjectedFromSIPs', 0)
    goal['totalMonthlySIPContribution'] = progress_data.get('totalMonthlySIPContribution', 0)
    goal['calculationMethod'] = progress_data['calculationMethod']
    
    target = goal.get('targetAmount', 0)
    current = progress_data['currentAmount']
    goal['progressPercent'] = round((current / target) * 100, 1) if target > 0 else 0
    
    target_date = goal.get('targetDate')
    if target_date:
        try:
            target_dt = datetime.fromisoformat(target_date).date()
            today = datetime.now(timezone.utc).date()
            days_remaining = (target_dt - today).days
            goal['daysRemaining'] = days_remaining
            goal['isOverdue'] = days_remaining < 0
        except (ValueError, TypeError):
            goal['daysRemaining'] = None
            goal['isOverdue'] = False
    
    return goal


@router.put("/{goal_id}", response_model=Goal)
async def update_goal(goal_id: str, input: GoalCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_filter = get_user_filter(user)
    user_filter["id"] = goal_id
    existing = await db.goals.find_one(user_filter, {"_id": 0})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    goal_dict = input.model_dump()
    goal_dict['id'] = goal_id
    goal_dict['userId'] = user.get('user_id')
    goal_dict['createdAt'] = existing['createdAt']
    
    await db.goals.replace_one({"id": goal_id}, goal_dict)
    
    goal_obj = Goal(**goal_dict)
    if isinstance(goal_obj.createdAt, str):
        goal_obj.createdAt = datetime.fromisoformat(goal_obj.createdAt)
    
    return goal_obj


@router.delete("/{goal_id}")
async def delete_goal(goal_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_filter = get_user_filter(user)
    user_filter["id"] = goal_id
    existing = await db.goals.find_one(user_filter, {"_id": 0})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    await db.goals.delete_one({"id": goal_id})
    return {"message": "Goal deleted successfully", "id": goal_id}


@router.put("/priorities/update")
async def update_goal_priorities(priorities: List[GoalPriorityUpdate], request: Request):
    """Bulk update goal priorities"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    updated = []
    for p in priorities:
        result = await db.goals.update_one(
            {"id": p.id},
            {"$set": {"priority": p.priority}}
        )
        if result.modified_count > 0:
            updated.append(p.id)
    
    return {"updated": updated, "count": len(updated)}


@router.put("/{goal_id}/complete")
async def mark_goal_complete(goal_id: str, request: Request):
    """Mark a goal as completed"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_filter = get_user_filter(user)
    user_filter["id"] = goal_id
    goal = await db.goals.find_one(user_filter, {"_id": 0})
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    await db.goals.update_one(
        {"id": goal_id},
        {"$set": {
            "isCompleted": True,
            "completedDate": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Goal marked as complete", "id": goal_id}


@router.put("/{goal_id}/milestone")
async def update_goal_milestone(goal_id: str, milestone: int, request: Request):
    """Record a milestone achievement (25, 50, 75, 100)"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if milestone not in [25, 50, 75, 100]:
        raise HTTPException(status_code=400, detail="Invalid milestone. Must be 25, 50, 75, or 100")
    
    user_filter = get_user_filter(user)
    user_filter["id"] = goal_id
    goal = await db.goals.find_one(user_filter, {"_id": 0})
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    milestones = goal.get('reachedMilestones', [])
    if milestone not in milestones:
        milestones.append(milestone)
        milestones.sort()
        
        await db.goals.update_one(
            {"id": goal_id},
            {"$set": {"reachedMilestones": milestones}}
        )
    
    return {"message": f"Milestone {milestone}% recorded", "reachedMilestones": milestones}
