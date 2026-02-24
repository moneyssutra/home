"""Goal routes - Full CRUD with progress calculation from server.py."""
from fastapi import APIRouter, HTTPException, Request
from typing import List
from datetime import datetime, timezone

from database import db
from server_models import Goal, GoalCreate, GoalPriorityUpdate
from routes.auth import get_current_user
from routes.utils import get_user_filter

router = APIRouter(prefix="/goals", tags=["Goals"])


async def calculate_goal_progress(goal: dict) -> dict:
    calculated_amount = 0
    linked_details = []
    sip_projections = []

    if goal.get('manualOverride') and not goal.get('autoCalculate'):
        return {"currentAmount": goal.get('currentAmount', 0), "linkedDetails": [], "sipProjections": [], "calculationMethod": "manual"}

    goal_type = goal.get('goalType', '')
    target_date = goal.get('targetDate')
    months_to_target = 0
    if target_date:
        try:
            target_dt = datetime.fromisoformat(target_date).date()
            today = datetime.now(timezone.utc).date()
            months_to_target = max(0, (target_dt - today).days / 30)
        except (ValueError, TypeError):
            pass

    def _freq_to_monthly(sip_amount, frequency):
        if frequency == 'Daily': return sip_amount * 30
        elif frequency == 'Weekly': return sip_amount * 4
        elif frequency == 'Monthly': return sip_amount
        elif frequency == 'Quarterly': return sip_amount / 3
        elif frequency == 'Yearly': return sip_amount / 12
        return 0

    def _calc_projected(current_value, monthly_contribution, return_rate, n):
        monthly_rate = (return_rate / 100) / 12 if return_rate else 0
        if monthly_rate > 0:
            pv = current_value * ((1 + monthly_rate) ** n)
            pmt = monthly_contribution * (((1 + monthly_rate) ** n - 1) / monthly_rate)
            return pv + pmt
        return current_value + (monthly_contribution * n)

    async def _process_investments_full(inv_ids, prefix_data=None):
        nonlocal calculated_amount
        for inv_id in inv_ids:
            investment = await db.investments.find_one({"id": inv_id}, {"_id": 0})
            if not investment:
                continue
            cv = investment.get('currentValue', 0)
            calculated_amount += cv
            sa = investment.get('sipAmount', 0)
            freq = investment.get('investmentFrequency', '')
            rr = investment.get('returnRate', 0)
            pv = cv
            mc = 0
            if sa and freq and months_to_target > 0:
                mc = _freq_to_monthly(sa, freq)
                pv = _calc_projected(cv, mc, rr, months_to_target)
                sip_projections.append({
                    "investmentId": inv_id, "investmentName": investment.get('name'),
                    "currentValue": cv, "sipAmount": sa, "frequency": freq,
                    "monthlyContribution": mc, "returnRate": rr,
                    "projectedValue": round(pv, 2), "projectedGain": round(pv - cv, 2),
                    "monthsToTarget": round(months_to_target, 1), **(prefix_data or {})
                })
            linked_details.append({
                "type": "Investment", "name": investment.get('name'),
                "category": investment.get('investmentCategory'), "contribution": cv,
                "principal": investment.get('principal', 0), "hasSIP": bool(sa and freq),
                "sipAmount": sa, "frequency": freq,
                "projectedValue": round(pv, 2) if sa else None, **(prefix_data or {})
            })

    async def _process_accounts_full(acc_ids, prefix_data=None):
        nonlocal calculated_amount
        for acc_id in acc_ids:
            account = await db.accounts.find_one({"id": acc_id}, {"_id": 0})
            if account and account.get('accountType') != 'Credit Card':
                bal = account.get('currentBalance', 0)
                calculated_amount += bal
                linked_details.append({
                    "type": "Account", "name": account.get('accountName'),
                    "accountType": account.get('accountType'), "contribution": bal,
                    **(prefix_data or {})
                })

    async def _process_linked_accounts_new(linked_accounts):
        nonlocal calculated_amount
        for la in linked_accounts:
            acc_id = la.get('id')
            allocated = la.get('allocatedAmount', 0)
            account = await db.accounts.find_one({"id": acc_id}, {"_id": 0})
            if account and account.get('accountType') != 'Credit Card' and allocated > 0:
                calculated_amount += allocated
                linked_details.append({
                    "type": "Account", "name": account.get('accountName'),
                    "accountType": account.get('accountType'), "contribution": allocated,
                    "totalBalance": account.get('currentBalance', 0),
                    "isPartialAllocation": allocated < account.get('currentBalance', 0)
                })

    async def _process_linked_investments_new(linked_investments):
        nonlocal calculated_amount
        for li in linked_investments:
            inv_id = li.get('id')
            allocated = li.get('allocatedAmount', 0)
            investment = await db.investments.find_one({"id": inv_id}, {"_id": 0})
            if not investment or allocated <= 0:
                continue
            calculated_amount += allocated
            cv = investment.get('currentValue', 0)
            ratio = allocated / cv if cv > 0 else 0
            sa = investment.get('sipAmount', 0)
            freq = investment.get('investmentFrequency', '')
            rr = investment.get('returnRate', 0)
            pv = allocated
            mc = 0
            if sa and freq and months_to_target > 0:
                mc = _freq_to_monthly(sa, freq) * ratio
                pv = _calc_projected(allocated, mc, rr, months_to_target)
                sip_projections.append({
                    "investmentId": inv_id, "investmentName": investment.get('name'),
                    "allocatedAmount": allocated, "currentValue": cv, "sipAmount": sa,
                    "frequency": freq, "monthlyContribution": mc, "returnRate": rr,
                    "projectedValue": round(pv, 2), "projectedGain": round(pv - allocated, 2),
                    "monthsToTarget": round(months_to_target, 1)
                })
            linked_details.append({
                "type": "Investment", "name": investment.get('name'),
                "category": investment.get('investmentCategory'), "contribution": allocated,
                "totalValue": cv, "isPartialAllocation": allocated < cv,
                "hasSIP": bool(sa and freq), "sipAmount": sa, "frequency": freq,
                "projectedValue": round(pv, 2) if sa else None
            })

    if goal_type == "Debt Elimination":
        if goal.get('linkedLoanId'):
            loan = await db.loans.find_one({"id": goal['linkedLoanId']}, {"_id": 0})
            if loan:
                paid_off = loan.get('principalAmount', 0) - loan.get('outstandingAmount', 0)
                calculated_amount += paid_off
                linked_details.append({"type": "Loan", "name": loan.get('loanName'), "contribution": paid_off, "principal": loan.get('principalAmount', 0), "outstanding": loan.get('outstandingAmount', 0), "emiAmount": loan.get('emiAmount', 0)})
        if goal.get('linkedCreditCardId'):
            card = await db.credit_cards.find_one({"id": goal['linkedCreditCardId']}, {"_id": 0})
            if card:
                available = card.get('creditLimit', 0) - card.get('outstandingAmount', 0)
                calculated_amount += available
                linked_details.append({"type": "Credit Card", "name": card.get('cardName'), "contribution": available, "creditLimit": card.get('creditLimit', 0), "outstanding": card.get('outstandingAmount', 0)})

    elif goal_type in ["Investment Target", "Wealth Creation"]:
        await _process_investments_full(goal.get('linkedInvestmentIds', []))
        await _process_linked_accounts_new(goal.get('linkedAccounts', []))
        processed_acc_ids = [a.get('id') for a in goal.get('linkedAccounts', [])]
        remaining_acc_ids = [aid for aid in goal.get('linkedAccountIds', []) if aid not in processed_acc_ids]
        await _process_accounts_full(remaining_acc_ids)

    elif goal_type == "Emergency Fund":
        await _process_linked_accounts_new(goal.get('linkedAccounts', []))
        processed_acc_ids = [a.get('id') for a in goal.get('linkedAccounts', [])]
        remaining_acc_ids = [aid for aid in goal.get('linkedAccountIds', []) if aid not in processed_acc_ids]
        await _process_accounts_full(remaining_acc_ids, {"isLegacy": True})
        await _process_linked_investments_new(goal.get('linkedInvestments', []))
        processed_inv_ids = [i.get('id') for i in goal.get('linkedInvestments', [])]
        remaining_inv_ids = [iid for iid in goal.get('linkedInvestmentIds', []) if iid not in processed_inv_ids]
        await _process_investments_full(remaining_inv_ids, {"isLegacy": True})

    else:
        await _process_investments_full(goal.get('linkedInvestmentIds', []))
        await _process_accounts_full(goal.get('linkedAccountIds', []))

    total_projected = sum(sp.get('projectedValue', 0) for sp in sip_projections)
    total_monthly_sip = sum(sp.get('monthlyContribution', 0) for sp in sip_projections)

    if goal.get('manualOverride'):
        manual = goal.get('currentAmount', 0)
        if manual > calculated_amount:
            return {"currentAmount": manual, "linkedDetails": linked_details, "sipProjections": sip_projections, "totalProjectedFromSIPs": total_projected, "totalMonthlySIPContribution": total_monthly_sip, "monthsToTarget": round(months_to_target, 1), "calculationMethod": "manual_override"}

    return {"currentAmount": calculated_amount, "linkedDetails": linked_details, "sipProjections": sip_projections, "totalProjectedFromSIPs": total_projected, "totalMonthlySIPContribution": total_monthly_sip, "monthsToTarget": round(months_to_target, 1), "calculationMethod": "auto"}


@router.post("", response_model=Goal)
async def create_goal(input: GoalCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    goal_dict = input.model_dump()
    goal_dict['userId'] = user.get('user_id')
    goal_obj = Goal(**goal_dict)
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


@router.get("/allocation-status")
async def get_allocation_status(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    goals = await db.goals.find(user_filter, {"_id": 0}).to_list(1000)
    investments = await db.investments.find(user_filter, {"_id": 0}).to_list(1000)
    accounts = await db.accounts.find(user_filter, {"_id": 0}).to_list(1000)

    inv_alloc = {}
    for inv in investments:
        iid = inv.get('id')
        tv = inv.get('currentValue', inv.get('principal', 0))
        inv_alloc[iid] = {"id": iid, "name": inv.get('name',''), "category": inv.get('investmentCategory',''), "totalValue": tv, "allocatedAmount": 0, "remainingAmount": tv, "allocations": []}
    acc_alloc = {}
    for acc in accounts:
        aid = acc.get('id')
        tb = acc.get('currentBalance', 0)
        acc_alloc[aid] = {"id": aid, "name": acc.get('accountName',''), "accountType": acc.get('accountType',''), "totalBalance": tb, "allocatedAmount": 0, "remainingAmount": tb, "allocations": []}

    for goal in goals:
        gid = goal.get('id'); gn = goal.get('goalName','')
        for li in goal.get('linkedInvestments', []):
            iid = li.get('id'); alloc = li.get('allocatedAmount', 0)
            if iid in inv_alloc and alloc > 0:
                inv_alloc[iid]['allocatedAmount'] += alloc; inv_alloc[iid]['remainingAmount'] -= alloc
                inv_alloc[iid]['allocations'].append({"goalId": gid, "goalName": gn, "allocatedAmount": alloc})
        for iid in goal.get('linkedInvestmentIds', []):
            already = any(a.get('goalId') == gid for a in inv_alloc.get(iid, {}).get('allocations', []))
            if iid in inv_alloc and not already:
                tv = inv_alloc[iid]['totalValue']
                inv_alloc[iid]['allocatedAmount'] += tv; inv_alloc[iid]['remainingAmount'] = 0
                inv_alloc[iid]['allocations'].append({"goalId": gid, "goalName": gn, "allocatedAmount": tv, "isLegacy": True})
        for la in goal.get('linkedAccounts', []):
            aid = la.get('id'); alloc = la.get('allocatedAmount', 0)
            if aid in acc_alloc and alloc > 0:
                acc_alloc[aid]['allocatedAmount'] += alloc; acc_alloc[aid]['remainingAmount'] -= alloc
                acc_alloc[aid]['allocations'].append({"goalId": gid, "goalName": gn, "allocatedAmount": alloc})
        for aid in goal.get('linkedAccountIds', []):
            already = any(a.get('goalId') == gid for a in acc_alloc.get(aid, {}).get('allocations', []))
            if aid in acc_alloc and not already:
                tb = acc_alloc[aid]['totalBalance']
                acc_alloc[aid]['allocatedAmount'] += tb; acc_alloc[aid]['remainingAmount'] = 0
                acc_alloc[aid]['allocations'].append({"goalId": gid, "goalName": gn, "allocatedAmount": tb, "isLegacy": True})
    return {"investments": list(inv_alloc.values()), "accounts": list(acc_alloc.values())}


@router.get("/achievements")
async def get_goal_achievements(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["isCompleted"] = True
    completed = await db.goals.find(user_filter, {"_id": 0}).to_list(1000)
    achievements = []
    for goal in completed:
        if isinstance(goal.get('createdAt'), str): goal['createdAt'] = datetime.fromisoformat(goal['createdAt'])
        pd = await calculate_goal_progress(goal)
        rm = goal.get('reachedMilestones', [])
        mh = [{"milestone": m, "reached": m in rm, "label": f"{m}% Complete"} for m in [25, 50, 75, 100]]
        dd = None
        ca = goal.get('createdAt'); cd = goal.get('completedDate')
        if ca and cd:
            try:
                cdt = datetime.fromisoformat(ca) if isinstance(ca, str) else ca
                dd = (datetime.fromisoformat(cd) - cdt).days
            except (ValueError, TypeError): pass
        achievements.append({
            "id": goal.get('id'), "goalName": goal.get('goalName'), "goalType": goal.get('goalType'),
            "customTypeName": goal.get('customTypeName'), "targetAmount": goal.get('targetAmount', 0),
            "finalAmount": pd['currentAmount'], "targetDate": goal.get('targetDate'),
            "completedDate": cd, "createdAt": ca.isoformat() if isinstance(ca, datetime) else ca,
            "milestoneHistory": mh, "reachedMilestones": rm, "durationDays": dd,
            "priority": goal.get('priority', 1), "notes": goal.get('notes'),
            "linkedDetails": pd.get('linkedDetails', [])
        })
    achievements.sort(key=lambda x: x.get('completedDate') or '', reverse=True)
    ta = sum(a.get('finalAmount', 0) for a in achievements)
    ad = sum(a.get('durationDays', 0) or 0 for a in achievements) / len(achievements) if achievements else 0
    return {"totalCompleted": len(achievements), "totalAmountAchieved": ta, "averageDurationDays": round(ad), "achievements": achievements}


@router.get("/summary/dashboard")
async def get_goals_dashboard_summary(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["isCompleted"] = False
    goals = await db.goals.find(user_filter, {"_id": 0}).to_list(1000)
    cf = get_user_filter(user); cf["isCompleted"] = True
    cc = await db.goals.count_documents(cf)
    summary = {"totalActiveGoals": len(goals), "completedGoals": cc, "goals": []}
    for goal in goals[:5]:
        pd = await calculate_goal_progress(goal)
        t = goal.get('targetAmount', 0); c = pd['currentAmount']
        dr = None
        td = goal.get('targetDate')
        if td:
            try:
                dr = (datetime.fromisoformat(td).date() - datetime.now(timezone.utc).date()).days
            except (ValueError, TypeError): pass
        summary["goals"].append({"id": goal.get('id'), "goalName": goal.get('goalName'), "goalType": goal.get('goalType'), "targetAmount": t, "currentAmount": c, "progressPercent": round((c / t) * 100, 1) if t > 0 else 0, "daysRemaining": dr, "priority": goal.get('priority', 1)})
    summary["goals"].sort(key=lambda x: (x.get('priority', 1), x.get('progressPercent', 0)))
    return summary


@router.get("/{goal_id}")
async def get_goal(goal_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = goal_id
    goal = await db.goals.find_one(user_filter, {"_id": 0})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if isinstance(goal.get('createdAt'), str): goal['createdAt'] = datetime.fromisoformat(goal['createdAt'])
    pd = await calculate_goal_progress(goal)
    goal['calculatedAmount'] = pd['currentAmount']; goal['linkedDetails'] = pd['linkedDetails']
    goal['calculationMethod'] = pd['calculationMethod']; goal['sipProjections'] = pd.get('sipProjections', [])
    goal['totalProjectedFromSIPs'] = pd.get('totalProjectedFromSIPs', 0)
    goal['totalMonthlySIPContribution'] = pd.get('totalMonthlySIPContribution', 0)
    goal['monthsToTarget'] = pd.get('monthsToTarget', 0)
    t = goal.get('targetAmount', 0); c = pd['currentAmount']
    goal['progressPercent'] = round((c / t) * 100, 1) if t > 0 else 0
    pt = pd.get('totalProjectedFromSIPs', 0)
    goal['projectedProgressPercent'] = round((pt / t) * 100, 1) if pt > 0 and t > 0 else goal['progressPercent']
    remaining = t - c; mtt = pd.get('monthsToTarget', 0); ms = pd.get('totalMonthlySIPContribution', 0)
    if mtt > 0:
        mn = remaining / mtt; goal['additionalMonthlySavingsNeeded'] = round(max(0, mn - ms), 2); goal['totalMonthlyNeeded'] = round(mn, 2)
    else:
        goal['additionalMonthlySavingsNeeded'] = 0; goal['totalMonthlyNeeded'] = 0
    td = goal.get('targetDate')
    if td:
        try:
            dr = (datetime.fromisoformat(td).date() - datetime.now(timezone.utc).date()).days
            goal['daysRemaining'] = dr; goal['isOverdue'] = dr < 0
        except (ValueError, TypeError): goal['daysRemaining'] = None; goal['isOverdue'] = False
    li = []
    for iid in goal.get('linkedInvestmentIds', []):
        inv = await db.investments.find_one({"id": iid}, {"_id": 0})
        if inv: li.append(inv)
    goal['linkedInvestments'] = li
    la = []
    for aid in goal.get('linkedAccountIds', []):
        acc = await db.accounts.find_one({"id": aid}, {"_id": 0})
        if acc: la.append(acc)
    goal['linkedAccounts'] = la
    if goal.get('linkedLoanId'):
        goal['linkedLoan'] = await db.loans.find_one({"id": goal['linkedLoanId']}, {"_id": 0})
    if goal.get('linkedCreditCardId'):
        goal['linkedCreditCard'] = await db.credit_cards.find_one({"id": goal['linkedCreditCardId']}, {"_id": 0})
    return goal


@router.get("/{goal_id}/milestones")
async def check_goal_milestones(goal_id: str):
    goal = await db.goals.find_one({"id": goal_id}, {"_id": 0})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    pd = await calculate_goal_progress(goal)
    ca = pd['currentAmount']; ta = goal.get('targetAmount', 0)
    pp = round((ca / ta) * 100, 1) if ta > 0 else 0
    rm = goal.get('reachedMilestones', []); nr = []
    for m in [25, 50, 75, 100]:
        if pp >= m and m not in rm: nr.append(m); rm.append(m)
    if nr:
        await db.goals.update_one({"id": goal_id}, {"$set": {"reachedMilestones": rm}})
    return {"goalId": goal_id, "goalName": goal.get('goalName', ''), "progressPercent": pp, "currentAmount": ca, "targetAmount": ta, "reachedMilestones": rm, "newlyReached": nr, "isCompleted": goal.get('isCompleted', False)}


@router.put("/{goal_id}")
async def update_goal(goal_id: str, input: GoalCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = goal_id
    existing = await db.goals.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Goal not found")
    gd = input.model_dump()
    gd['id'] = goal_id; gd['userId'] = user.get('user_id'); gd['createdAt'] = existing['createdAt']
    gd['isCompleted'] = existing.get('isCompleted', False); gd['completedDate'] = existing.get('completedDate')
    await db.goals.replace_one({"id": goal_id}, gd)
    updated = await db.goals.find_one({"id": goal_id}, {"_id": 0})
    pd = await calculate_goal_progress(updated)
    updated['calculatedAmount'] = pd['currentAmount']
    updated['progressPercent'] = round((pd['currentAmount'] / updated.get('targetAmount', 1)) * 100, 1) if updated.get('targetAmount', 0) > 0 else 0
    return updated


@router.patch("/{goal_id}/complete")
async def mark_goal_complete(goal_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = goal_id
    existing = await db.goals.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.goals.update_one({"id": goal_id}, {"$set": {"isCompleted": True, "completedDate": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Goal marked as completed", "id": goal_id}


@router.patch("/{goal_id}/progress")
async def update_goal_progress(goal_id: str, current_amount: float, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = goal_id
    existing = await db.goals.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.goals.update_one({"id": goal_id}, {"$set": {"currentAmount": current_amount, "manualOverride": True}})
    target = existing.get('targetAmount', 0)
    if current_amount >= target and target > 0:
        await db.goals.update_one({"id": goal_id}, {"$set": {"isCompleted": True, "completedDate": datetime.now(timezone.utc).isoformat()}})
        return {"message": "Goal progress updated and marked as completed!", "id": goal_id, "currentAmount": current_amount}
    return {"message": "Goal progress updated", "id": goal_id, "currentAmount": current_amount}


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


@router.patch("/reorder")
async def reorder_goals(updates: List[GoalPriorityUpdate]):
    updated_count = 0
    for update in updates:
        result = await db.goals.update_one({"id": update.id}, {"$set": {"priority": update.priority}})
        if result.modified_count > 0: updated_count += 1
    return {"message": f"Updated priorities for {updated_count} goals", "updatedCount": updated_count}


@router.get("")
async def get_goals(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    goals = await db.goals.find(user_filter, {"_id": 0}).to_list(1000)
    result = []
    for goal in goals:
        if isinstance(goal.get('createdAt'), str): goal['createdAt'] = datetime.fromisoformat(goal['createdAt'])
        pd = await calculate_goal_progress(goal)
        goal['calculatedAmount'] = pd['currentAmount']; goal['linkedDetails'] = pd['linkedDetails']
        goal['calculationMethod'] = pd['calculationMethod']; goal['sipProjections'] = pd.get('sipProjections', [])
        goal['totalProjectedFromSIPs'] = pd.get('totalProjectedFromSIPs', 0)
        goal['totalMonthlySIPContribution'] = pd.get('totalMonthlySIPContribution', 0)
        t = goal.get('targetAmount', 0); c = pd['currentAmount']
        goal['progressPercent'] = round((c / t) * 100, 1) if t > 0 else 0
        pt = pd.get('totalProjectedFromSIPs', 0)
        goal['projectedProgressPercent'] = round((pt / t) * 100, 1) if pt > 0 and t > 0 else goal['progressPercent']
        td = goal.get('targetDate')
        if td:
            try:
                dr = (datetime.fromisoformat(td).date() - datetime.now(timezone.utc).date()).days
                goal['daysRemaining'] = dr; goal['isOverdue'] = dr < 0
            except (ValueError, TypeError): goal['daysRemaining'] = None; goal['isOverdue'] = False
        result.append(goal)
    result.sort(key=lambda x: (x.get('priority', 1), x.get('daysRemaining') or 9999))
    return result
