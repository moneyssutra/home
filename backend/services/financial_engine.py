"""
Central Financial Engine for MoneySutra.
Provides unified calculations for net worth, cash flow, risk score, and financial health.
All routes should delegate to this engine instead of duplicating computation logic.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from services.financial_service import (
    normalize_to_monthly,
    normalize_to_annual,
    safe_sum,
    calculate_total,
    group_by_field,
    safe_ratio,
    clamp,
)


class FinancialSnapshot:
    """Holds all raw financial data for a user and computes derived metrics."""

    def __init__(
        self,
        assets: List[Dict],
        investments: List[Dict],
        accounts: List[Dict],
        credit_cards: List[Dict],
        loans: List[Dict],
        incomes: List[Dict],
        other_incomes: List[Dict],
        expenses: List[Dict],
        insurances: List[Dict],
    ):
        self.assets = assets
        self.investments = investments
        self.accounts = accounts
        self.credit_cards = credit_cards
        self.loans = loans
        self.incomes = incomes
        self.other_incomes = other_incomes
        self.expenses = expenses
        self.insurances = insurances

    # ── Asset Totals ──
    @property
    def total_assets(self) -> float:
        return calculate_total(self.assets, "currentValue")

    @property
    def total_investments(self) -> float:
        return calculate_total(self.investments, "currentValue")

    @property
    def liquid_balance(self) -> float:
        return sum(
            float(acc.get("currentBalance", 0) or acc.get("balance", 0) or 0)
            for acc in self.accounts
            if acc.get("accountType") != "Credit Card"
        )

    # ── Liability Totals ──
    @property
    def credit_card_outstanding(self) -> float:
        return safe_sum(self.credit_cards, "outstandingAmount")

    @property
    def credit_card_limit(self) -> float:
        return calculate_total(self.credit_cards, "creditLimit")

    @property
    def account_credit_outstanding(self) -> float:
        return sum(
            float(acc.get("outstandingAmount", 0) or 0)
            for acc in self.accounts
            if acc.get("accountType") == "Credit Card"
        )

    @property
    def total_loan_outstanding(self) -> float:
        return sum(
            float(l.get("outstandingAmount", 0) or l.get("principalAmount", 0) or 0)
            for l in self.loans
        )

    @property
    def total_liabilities(self) -> float:
        return self.total_loan_outstanding + self.account_credit_outstanding + self.credit_card_outstanding

    @property
    def total_emi(self) -> float:
        return calculate_total(self.loans, "emiAmount")

    # ── Net Worth ──
    @property
    def net_worth(self) -> float:
        return self.total_assets + self.total_investments + self.liquid_balance - self.total_liabilities

    # ── Income Calculations ──
    @property
    def monthly_income(self) -> float:
        total = 0.0
        for inc in self.incomes:
            amount = float(inc.get("expectedAmount", 0) or inc.get("amount", 0) or 0)
            freq = inc.get("frequency", "Monthly")
            total += normalize_to_monthly(amount, freq)
        for oi in self.other_incomes:
            amount = float(oi.get("amount", 0) or 0)
            freq = oi.get("frequency", "Monthly")
            total += normalize_to_monthly(amount, freq)
        return total

    @property
    def annual_income(self) -> float:
        return self.monthly_income * 12

    # ── Expense Calculations ──
    @property
    def monthly_expenses(self) -> float:
        total = 0.0
        for exp in self.expenses:
            if exp.get("linkedPaymentId"):
                continue
            amount = float(exp.get("expectedAmount", 0) or exp.get("amount", 0) or 0)
            freq = exp.get("frequency", "Monthly")
            total += normalize_to_monthly(amount, freq)
        return total

    # ── Savings & Cash Flow ──
    @property
    def monthly_savings(self) -> float:
        return self.monthly_income - self.monthly_expenses

    @property
    def savings_rate(self) -> float:
        return safe_ratio(self.monthly_savings, self.monthly_income)

    # ── Insurance ──
    @property
    def total_insurance_coverage(self) -> float:
        return sum(
            float(ins.get("coverageAmount", 0) or ins.get("coverAmount", 0) or ins.get("sumAssured", 0) or 0)
            for ins in self.insurances
        )

    @property
    def life_insurance_coverage(self) -> float:
        return sum(
            float(ins.get("coverageAmount", 0) or ins.get("coverAmount", 0) or ins.get("sumAssured", 0) or 0)
            for ins in self.insurances
            if ins.get("insuranceType") in ("Life Insurance", "Term Insurance")
        )

    @property
    def health_insurance_coverage(self) -> float:
        return sum(
            float(ins.get("coverageAmount", 0) or ins.get("coverAmount", 0) or ins.get("sumAssured", 0) or 0)
            for ins in self.insurances
            if ins.get("insuranceType") == "Health Insurance"
        )

    # ── Investment Breakdown ──
    @property
    def equity_investments(self) -> float:
        equity_types = {"stocks", "us stocks", "mutual fund", "etf"}
        return sum(
            float(inv.get("currentValue", 0) or 0)
            for inv in self.investments
            if (inv.get("investmentCategory", "") or "").lower() in equity_types
        )

    @property
    def debt_investments(self) -> float:
        debt_types = {"fixed deposit (fd)", "recurring deposit (rd)", "bonds", "ppf", "epf", "nps"}
        return sum(
            float(inv.get("currentValue", 0) or 0)
            for inv in self.investments
            if (inv.get("investmentCategory", "") or "").lower() in debt_types
        )

    @property
    def semi_liquid_value(self) -> float:
        semi_liquid_types = {"mutual fund", "fixed deposit", "fd", "recurring deposit", "rd"}
        return sum(
            float(inv.get("currentValue", 0) or 0)
            for inv in self.investments
            if (inv.get("investmentCategory", "") or "").lower() in semi_liquid_types
        )

    @property
    def effective_funds(self) -> float:
        return self.liquid_balance + (self.semi_liquid_value * 0.6)

    # ── Loan Given ──
    @property
    def loan_given_total(self) -> float:
        return sum(
            float(inv.get("currentValue", 0) or inv.get("principal", 0) or 0)
            for inv in self.investments
            if inv.get("investmentCategory") == "Loan Given"
        )

    @property
    def loan_given_count(self) -> int:
        return sum(1 for inv in self.investments if inv.get("investmentCategory") == "Loan Given")

    # ── Risk Metrics ──
    @property
    def emi_to_income_ratio(self) -> float:
        return safe_ratio(self.total_emi, self.monthly_income)

    @property
    def credit_utilization(self) -> float:
        return safe_ratio(self.credit_card_outstanding, self.credit_card_limit)

    @property
    def debt_to_asset_ratio(self) -> float:
        total_assets = self.total_assets + self.total_investments + self.liquid_balance
        return safe_ratio(self.total_liabilities, total_assets) if total_assets > 0 else 0

    # ── Emergency Fund ──
    @property
    def emergency_fund_months(self) -> float:
        if self.monthly_expenses <= 0:
            return 0
        emergency_assets = sum(
            float(inv.get("currentValue", 0) or 0)
            for inv in self.investments
            if inv.get("isLiquidAsset")
        ) + self.liquid_balance
        return emergency_assets / self.monthly_expenses

    # ── Breakdowns ──
    def asset_breakdown(self) -> Dict[str, float]:
        return group_by_field(self.assets, "assetType", "currentValue")

    def investment_breakdown(self) -> Dict[str, float]:
        return group_by_field(self.investments, "investmentCategory", "currentValue")

    def loan_breakdown(self) -> Dict[str, float]:
        result: Dict[str, float] = {}
        for l in self.loans:
            t = l.get("loanType", "Other") or "Other"
            val = float(l.get("outstandingAmount", 0) or l.get("principalAmount", 0) or 0)
            result[t] = result.get(t, 0) + val
        return result

    def income_breakdown(self) -> Dict[str, float]:
        result: Dict[str, float] = {}
        for i in self.incomes:
            t = i.get("type", "Other") or "Other"
            amount = float(i.get("expectedAmount", 0) or 0)
            freq = i.get("frequency", "Monthly")
            result[t] = result.get(t, 0) + normalize_to_monthly(amount, freq)
        return result

    def expense_breakdown(self) -> Dict[str, float]:
        result: Dict[str, float] = {}
        for e in self.expenses:
            if e.get("linkedPaymentId"):
                continue
            cat = e.get("category", "Other") or "Other"
            amount = float(e.get("expectedAmount", 0) or 0)
            freq = e.get("frequency", "Monthly")
            result[cat] = result.get(cat, 0) + normalize_to_monthly(amount, freq)
        return result

    # ── Summary Dict ──
    def summary(self) -> Dict[str, Any]:
        """Return full financial summary as a dict (for API responses)."""
        return {
            "netWorth": round(self.net_worth, 2),
            "totalAssets": round(self.total_assets, 2),
            "totalInvestments": round(self.total_investments, 2),
            "liquidBalance": round(self.liquid_balance, 2),
            "totalLiabilities": round(self.total_liabilities, 2),
            "creditCardOutstanding": round(self.credit_card_outstanding, 2),
            "creditCardLimit": round(self.credit_card_limit, 2),
            "creditUtilization": round(self.credit_utilization, 2),
            "monthlyIncome": round(self.monthly_income, 2),
            "monthlyExpenses": round(self.monthly_expenses, 2),
            "monthlySavings": round(self.monthly_savings, 2),
            "savingsRate": round(self.savings_rate, 2),
            "totalEMI": round(self.total_emi, 2),
            "emiToIncomeRatio": round(self.emi_to_income_ratio, 2),
            "debtToAssetRatio": round(self.debt_to_asset_ratio, 2),
            "effectiveFunds": round(self.effective_funds, 0),
            "emergencyFundMonths": round(self.emergency_fund_months, 1),
            "totalInsuranceCoverage": round(self.total_insurance_coverage, 2),
            "lifeInsuranceCoverage": round(self.life_insurance_coverage, 2),
            "healthInsuranceCoverage": round(self.health_insurance_coverage, 2),
            "loanGivenTotal": round(self.loan_given_total, 2),
            "loanGivenCount": self.loan_given_count,
            "counts": {
                "assets": len(self.assets),
                "investments": len(self.investments),
                "accounts": len(self.accounts),
                "creditCards": len(self.credit_cards),
                "loans": len(self.loans),
                "incomes": len(self.incomes),
                "otherIncomes": len(self.other_incomes),
                "expenses": len(self.expenses),
                "insurances": len(self.insurances),
            },
            "breakdowns": {
                "assets": self.asset_breakdown(),
                "investments": self.investment_breakdown(),
                "loans": self.loan_breakdown(),
                "income": self.income_breakdown(),
                "expenses": self.expense_breakdown(),
            },
        }


async def build_snapshot(db, user_filter: dict) -> FinancialSnapshot:
    """Fetch all financial data in parallel and return a FinancialSnapshot."""
    import asyncio

    assets, investments, accounts, credit_cards, loans, incomes, other_incomes, expenses, insurances = await asyncio.gather(
        db.assets.find(user_filter, {"_id": 0}).to_list(1000),
        db.investments.find(user_filter, {"_id": 0}).to_list(1000),
        db.accounts.find(user_filter, {"_id": 0}).to_list(1000),
        db.credit_cards.find(user_filter, {"_id": 0}).to_list(1000),
        db.loans.find(user_filter, {"_id": 0}).to_list(1000),
        db.income_sources.find(user_filter, {"_id": 0}).to_list(1000),
        db.other_income.find(user_filter, {"_id": 0}).to_list(1000),
        db.expenses.find(user_filter, {"_id": 0}).to_list(1000),
        db.insurances.find(user_filter, {"_id": 0}).to_list(1000),
    )

    return FinancialSnapshot(
        assets=assets,
        investments=investments,
        accounts=accounts,
        credit_cards=credit_cards,
        loans=loans,
        incomes=incomes,
        other_incomes=other_incomes,
        expenses=expenses,
        insurances=insurances,
    )
