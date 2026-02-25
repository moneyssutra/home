"""Financial Health routes - Rule-based financial assessment."""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import asyncio

router = APIRouter(prefix="/financial-health", tags=["financial-health"])

# Import shared dependencies
import sys
sys.path.insert(0, '/app/backend')
from database import db
from routes.auth import get_current_user


@router.get("")
async def get_financial_health(request: Request):
    """Calculate comprehensive financial health metrics based on standard benchmarks"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    user_filter = {"userId": user_id}
    
    # Fetch all required data in parallel
    (
        assets, investments, accounts, loans, credit_cards, 
        incomes, expenses, insurances, profile, snapshots
    ) = await asyncio.gather(
        db.assets.find(user_filter, {"_id": 0}).to_list(1000),
        db.investments.find(user_filter, {"_id": 0}).to_list(1000),
        db.accounts.find(user_filter, {"_id": 0}).to_list(1000),
        db.loans.find(user_filter, {"_id": 0}).to_list(1000),
        db.credit_cards.find(user_filter, {"_id": 0}).to_list(1000),
        db.income_sources.find(user_filter, {"_id": 0}).to_list(1000),
        db.expenses.find(user_filter, {"_id": 0}).to_list(1000),
        db.insurances.find(user_filter, {"_id": 0}).to_list(1000),
        db.profiles.find_one({"userId": user_id}, {"_id": 0}),
        db.analytics_snapshots.find(user_filter, {"_id": 0}).sort([("year", -1), ("month", -1)]).to_list(2)
    )
    
    # ============ GLOBAL DATA DEFINITIONS ============
    # Monthly Income
    monthly_income = 0
    for inc in incomes:
        freq = inc.get('frequency', 'Monthly')
        amount = inc.get('expectedAmount', 0)
        if freq == 'Daily':
            monthly_income += amount * 30
        elif freq == 'Weekly':
            monthly_income += amount * 4
        elif freq == 'Monthly':
            monthly_income += amount
        elif freq == 'Quarterly':
            monthly_income += amount / 3
        elif freq == 'Half-Yearly':
            monthly_income += amount / 6
        elif freq == 'Yearly':
            monthly_income += amount / 12
    
    annual_income = monthly_income * 12
    
    # Monthly Expense
    monthly_expense = 0
    for exp in expenses:
        freq = exp.get('frequency', 'Monthly')
        amount = exp.get('expectedAmount', 0)
        if freq == 'Daily':
            monthly_expense += amount * 30
        elif freq == 'Weekly':
            monthly_expense += amount * 4
        elif freq == 'Monthly':
            monthly_expense += amount
        elif freq == 'Quarterly':
            monthly_expense += amount / 3
        elif freq == 'Half-Yearly':
            monthly_expense += amount / 6
        elif freq == 'Yearly':
            monthly_expense += amount / 12
    
    annual_expense = monthly_expense * 12
    
    # Essential Expenses (Fixed + EMI + Insurance)
    essential_expense = 0
    for exp in expenses:
        exp_type = exp.get('expenseType', '')
        category = exp.get('category', '')
        amount = exp.get('expectedAmount', 0)
        freq = exp.get('frequency', 'Monthly')
        
        monthly_amt = amount
        if freq == 'Yearly':
            monthly_amt = amount / 12
        elif freq == 'Quarterly':
            monthly_amt = amount / 3
        
        if exp_type == 'Fixed' or category in ['EMI', 'Insurance', 'Utilities', 'Housing']:
            essential_expense += monthly_amt
    
    # Liquid Funds
    liquid_funds = sum(acc.get('currentBalance', 0) or acc.get('balance', 0) for acc in accounts)
    for inv in investments:
        cat = inv.get('category', '').lower()
        if 'liquid' in cat or cat == 'fd' or cat == 'fixed deposit':
            liquid_funds += inv.get('currentValue', 0)
    
    # Totals
    total_investments = sum(inv.get('currentValue', 0) for inv in investments)
    total_assets = sum(a.get('currentValue', 0) for a in assets)
    total_loans = sum(l.get('outstandingAmount', 0) for l in loans)
    cc_outstanding = sum(c.get('currentOutstanding', 0) or c.get('outstandingAmount', 0) for c in credit_cards)
    cc_limit = sum(c.get('creditLimit', 0) for c in credit_cards)
    
    # Age
    age = 30
    if profile and profile.get('dateOfBirth'):
        try:
            dob = datetime.fromisoformat(profile['dateOfBirth'].replace('Z', '+00:00'))
            today = datetime.now(timezone.utc)
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        except:
            pass
    
    surplus = monthly_income - monthly_expense
    savings_rate = (surplus / monthly_income * 100) if monthly_income > 0 else 0
    total_emi = sum(l.get('emiAmount', 0) for l in loans)
    
    # ============ 1. EMERGENCY FUND ============
    emergency_target = essential_expense * 6
    emergency_current = liquid_funds
    emergency_gap = max(0, emergency_target - emergency_current)
    
    if essential_expense == 0:
        emergency_status = "N/A"
        emergency_action = "Add your fixed expenses to calculate emergency fund needs."
    elif emergency_current < essential_expense * 3:
        emergency_status = "Critical"
        emergency_action = f"Build emergency fund to cover at least 3 months of essential expenses (₹{int(essential_expense * 3):,})."
    elif emergency_current < essential_expense * 6:
        emergency_status = "Needs Improvement"
        emergency_action = f"Increase emergency fund to 6 months target (₹{int(emergency_target):,})."
    else:
        emergency_status = "Healthy"
        emergency_action = "Your emergency fund is adequate. Consider investing the excess."
    
    # ============ 2. LIFE INSURANCE ADEQUACY ============
    life_insurance_types = ['term life', 'term', 'life', 'whole life', 'life insurance', 'term insurance']
    life_cover = sum(i.get('coverageAmount', 0) or i.get('coverAmount', 0) or i.get('sumAssured', 0) for i in insurances 
                     if (i.get('insuranceType', '') or i.get('type', '')).lower() in life_insurance_types)
    life_target = annual_income * 12
    life_gap = max(0, life_target - life_cover)
    
    if annual_income == 0:
        life_status = "N/A"
        life_action = "Add your income details to calculate life insurance needs."
    elif life_cover == 0:
        life_status = "High Risk"
        life_action = "Get term life insurance coverage of at least 10-12x your annual income."
    elif life_cover < annual_income * 10:
        life_status = "Underinsured"
        life_action = f"Increase term cover to at least ₹{int(annual_income * 10):,} (10x annual income)."
    else:
        life_status = "Adequate"
        life_action = "Your life insurance coverage is adequate for your income level."
    
    # ============ 3. HEALTH INSURANCE ADEQUACY ============
    health_cover = sum(i.get('coverAmount', 0) or i.get('sumAssured', 0) for i in insurances 
                       if (i.get('insuranceType', '') or i.get('type', '')).lower() in ['health', 'medical', 'mediclaim', 'health insurance'])
    health_target = 1000000
    health_gap = max(0, health_target - health_cover)
    
    if health_cover == 0:
        health_status = "Not Covered"
        health_action = "Get health insurance coverage of at least ₹5L per adult."
    elif health_cover < 500000:
        health_status = "Low Coverage"
        health_action = "Increase health coverage to at least ₹5L for adequate protection."
    elif health_cover < 1000000:
        health_status = "Moderate"
        health_action = "Consider increasing coverage to ₹10L+ for comprehensive protection."
    else:
        health_status = "Adequate"
        health_action = "Your health insurance coverage is adequate."
    
    # ============ 4. INVESTMENT ALLOCATION ============
    recommended_equity = max(30, 100 - age)
    
    equity_investments = 0
    for inv in investments:
        cat = inv.get('category', '').lower()
        if any(x in cat for x in ['equity', 'stock', 'mutual fund', 'mf', 'elss', 'index']):
            equity_investments += inv.get('currentValue', 0)
    
    actual_equity = (equity_investments / total_investments * 100) if total_investments > 0 else 0
    equity_gap = recommended_equity - actual_equity
    
    if total_investments == 0:
        allocation_status = "N/A"
        allocation_action = "Start investing to build your portfolio."
    elif actual_equity < recommended_equity - 10:
        allocation_status = "Underexposed"
        allocation_action = f"Increase equity allocation to ~{int(recommended_equity)}% for long-term growth."
    elif actual_equity > recommended_equity + 15:
        allocation_status = "Overexposed"
        allocation_action = f"Consider rebalancing - reduce equity exposure to ~{int(recommended_equity)}%."
    else:
        allocation_status = "Balanced"
        allocation_action = "Your investment allocation is well-balanced for your age."
    
    # ============ 5. CREDIT CARD UTILIZATION ============
    cc_utilization = (cc_outstanding / cc_limit * 100) if cc_limit > 0 else 0
    
    if cc_limit == 0:
        cc_status = "N/A"
        cc_action = "No credit cards found."
    elif cc_utilization > 75:
        cc_status = "Critical"
        cc_action = "Pay down credit card debt immediately. High utilization hurts credit score."
    elif cc_utilization > 50:
        cc_status = "High Risk"
        cc_action = "Reduce credit card usage to below 50% of limit."
    elif cc_utilization > 30:
        cc_status = "Moderate"
        cc_action = "Try to keep utilization below 30% for optimal credit score."
    else:
        cc_status = "Healthy"
        cc_action = "Excellent credit utilization. Keep it below 30%."
    
    # ============ 6. LOAN BURDEN RATIO ============
    emi_ratio = (total_emi / monthly_income * 100) if monthly_income > 0 else 0
    
    if monthly_income == 0:
        loan_status = "N/A"
        loan_action = "Add income details to calculate loan burden."
    elif total_loans == 0 and total_emi == 0:
        loan_status = "Healthy"
        loan_action = "No active loans. Great financial discipline!"
    elif emi_ratio > 50:
        loan_status = "Dangerous"
        loan_action = "EMI burden is very high. Consider debt consolidation or prepayment."
    elif emi_ratio > 35:
        loan_status = "High"
        loan_action = "EMI burden is high. Avoid taking new loans."
    elif emi_ratio > 20:
        loan_status = "Moderate"
        loan_action = "Loan burden is manageable. Focus on high-interest loan prepayment."
    else:
        loan_status = "Healthy"
        loan_action = "Your loan burden is well within healthy limits."
    
    # ============ 7. DEBT TO ASSET RATIO ============
    total_debt = total_loans + cc_outstanding
    total_worth = total_assets + total_investments + liquid_funds
    debt_ratio = (total_debt / total_worth * 100) if total_worth > 0 else 0
    
    if total_worth == 0:
        debt_status = "N/A"
        debt_action = "Add your assets and investments to calculate debt ratio."
    elif debt_ratio > 70:
        debt_status = "High Leverage"
        debt_action = "Debt is very high relative to assets. Prioritize debt reduction."
    elif debt_ratio > 40:
        debt_status = "Moderate"
        debt_action = "Debt levels are moderate. Focus on building assets."
    else:
        debt_status = "Stable"
        debt_action = "Your debt-to-asset ratio is healthy."
    
    # ============ 8. SAVINGS RATE ============
    if monthly_income == 0:
        savings_status = "N/A"
        savings_action = "Add income details to calculate savings rate."
    elif savings_rate < 10:
        savings_status = "Weak"
        savings_action = "Increase savings to at least 20% of income. Track and cut expenses."
    elif savings_rate < 20:
        savings_status = "Average"
        savings_action = "Good start! Aim for 30%+ savings rate for faster wealth building."
    elif savings_rate < 35:
        savings_status = "Good"
        savings_action = "Strong savings habit! Consider increasing investments."
    else:
        savings_status = "Excellent"
        savings_action = "Exceptional savings rate! Ensure surplus is optimally invested."
    
    # ============ 9. RETIREMENT READINESS ============
    required_corpus = annual_expense * 25
    
    retirement_corpus = 0
    for inv in investments:
        cat = inv.get('category', '').lower()
        if any(x in cat for x in ['nps', 'epf', 'ppf', 'pension', 'retirement']):
            retirement_corpus += inv.get('currentValue', 0)
    
    if retirement_corpus == 0:
        retirement_corpus = total_investments * 0.3
    
    retirement_progress = (retirement_corpus / required_corpus * 100) if required_corpus > 0 else 0
    
    if age < 18:
        retirement_status = "N/A"
        retirement_action = "Too early for retirement planning calculations."
    elif annual_expense == 0:
        retirement_status = "N/A"
        retirement_action = "Add expense details to calculate retirement needs."
    elif retirement_progress < 25:
        retirement_status = "At Risk"
        retirement_action = f"Start aggressive retirement saving. Target corpus: ₹{int(required_corpus):,}"
    elif retirement_progress < 50:
        retirement_status = "Needs Improvement"
        retirement_action = "Increase retirement contributions. You're behind target."
    elif retirement_progress < 75:
        retirement_status = "Moderate"
        retirement_action = "Good progress! Stay consistent with retirement investments."
    else:
        retirement_status = "Good"
        retirement_action = "Excellent retirement preparation! Review allocation periodically."
    
    # ============ 10. NET WORTH TREND ============
    current_net_worth = total_assets + total_investments + liquid_funds - total_debt
    previous_net_worth = snapshots[1].get('netWorth', current_net_worth) if len(snapshots) > 1 else current_net_worth
    nw_growth = ((current_net_worth - previous_net_worth) / previous_net_worth * 100) if previous_net_worth > 0 else 0
    
    if previous_net_worth == current_net_worth or len(snapshots) <= 1:
        nw_status = "N/A"
        nw_action = "Track for a month to see net worth trend."
    elif nw_growth > 5:
        nw_status = "Excellent"
        nw_action = "Great wealth growth! Keep up the momentum."
    elif nw_growth > 0:
        nw_status = "Good"
        nw_action = "Positive growth trend. Continue building wealth."
    elif nw_growth > -5:
        nw_status = "Moderate"
        nw_action = "Slight decline. Review expenses and investments."
    else:
        nw_status = "At Risk"
        nw_action = "Significant decline. Analyze spending and liabilities."
    
    # ============ 11. OVERALL FINANCIAL HEALTH SCORE ============
    def status_to_score(status):
        scores = {
            "Excellent": 100, "Good": 85, "Healthy": 85, "Adequate": 80, "Balanced": 80, "Stable": 75,
            "Moderate": 60, "Average": 55, "Needs Improvement": 50, "Low Coverage": 45,
            "Underinsured": 40, "Underexposed": 40, "Overexposed": 40, "High": 35,
            "High Risk": 25, "High Leverage": 25, "Critical": 15, "Dangerous": 10, "Weak": 20, "At Risk": 15,
            "Not Covered": 10, "N/A": 50
        }
        return scores.get(status, 50)
    
    weights = {
        "emergencyFund": 0.175,
        "lifeInsurance": 0.075,
        "healthInsurance": 0.075,
        "savingsRate": 0.125,
        "loanBurden": 0.125,
        "creditUtilization": 0.10,
        "investmentAllocation": 0.125,
        "retirementReadiness": 0.10,
        "debtToAsset": 0.10
    }
    
    module_scores = {
        "emergencyFund": status_to_score(emergency_status),
        "lifeInsurance": status_to_score(life_status),
        "healthInsurance": status_to_score(health_status),
        "savingsRate": status_to_score(savings_status),
        "loanBurden": status_to_score(loan_status),
        "creditUtilization": status_to_score(cc_status),
        "investmentAllocation": status_to_score(allocation_status),
        "retirementReadiness": status_to_score(retirement_status),
        "debtToAsset": status_to_score(debt_status)
    }
    
    contributions = {}
    for key, raw_score in module_scores.items():
        w = weights[key]
        max_contribution = round(100 * w, 1)
        contributions[key] = {
            "rawScore": raw_score,
            "weight": round(w * 100),
            "contribution": round(raw_score * w, 1),
            "maxContribution": max_contribution
        }
    
    overall_score = sum(c["contribution"] for c in contributions.values())
    
    return {
        "overallScore": round(overall_score),
        "contributions": contributions,
        "emergencyFund": {
            "current": emergency_current,
            "target": emergency_target,
            "gap": emergency_gap,
            "status": emergency_status,
            "action": emergency_action
        },
        "lifeInsurance": {
            "current": life_cover,
            "target": life_target,
            "gap": life_gap,
            "status": life_status,
            "action": life_action
        },
        "healthInsurance": {
            "current": health_cover,
            "target": health_target,
            "gap": health_gap,
            "status": health_status,
            "action": health_action
        },
        "investmentAllocation": {
            "actualEquity": round(actual_equity, 1),
            "recommendedEquity": recommended_equity,
            "gap": round(abs(equity_gap), 1),
            "status": allocation_status,
            "action": allocation_action
        },
        "creditUtilization": {
            "utilization": round(cc_utilization, 1),
            "outstanding": cc_outstanding,
            "limit": cc_limit,
            "status": cc_status,
            "action": cc_action
        },
        "loanBurden": {
            "emiRatio": round(emi_ratio, 1),
            "totalEmi": total_emi,
            "totalLoans": total_loans,
            "status": loan_status,
            "action": loan_action
        },
        "debtToAsset": {
            "ratio": round(debt_ratio, 1),
            "totalDebt": total_debt,
            "totalWorth": total_worth,
            "status": debt_status,
            "action": debt_action
        },
        "savingsRate": {
            "rate": round(savings_rate, 1),
            "surplus": surplus,
            "monthlyIncome": monthly_income,
            "status": savings_status,
            "action": savings_action
        },
        "retirementReadiness": {
            "currentCorpus": retirement_corpus,
            "requiredCorpus": required_corpus,
            "progress": round(retirement_progress, 1),
            "status": retirement_status,
            "action": retirement_action
        },
        "netWorthTrend": {
            "currentNetWorth": current_net_worth,
            "previousNetWorth": previous_net_worth,
            "growthPercent": round(nw_growth, 1),
            "status": nw_status,
            "action": nw_action
        }
    }
