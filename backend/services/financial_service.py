"""
Shared financial calculation utilities.
Reusable helpers for amount normalization, totals, and response formatting.
"""
from typing import List, Dict, Any, Optional


def normalize_to_monthly(amount: float, frequency: str) -> float:
    """Convert any frequency-based amount to its monthly equivalent."""
    if not amount or amount <= 0:
        return 0.0
    freq = (frequency or "Monthly").strip()
    multipliers = {
        "Daily": 30.0,
        "Weekly": 4.33,
        "Bi-Weekly": 2.17,
        "Monthly": 1.0,
        "Quarterly": 1 / 3,
        "Half-Yearly": 1 / 6,
        "Semi-Annually": 1 / 6,
        "Yearly": 1 / 12,
        "Annually": 1 / 12,
        "One-Time": 0.0,
    }
    return amount * multipliers.get(freq, 1.0)


def normalize_to_annual(amount: float, frequency: str) -> float:
    """Convert any frequency-based amount to its annual equivalent."""
    return normalize_to_monthly(amount, frequency) * 12


def safe_sum(items: List[Dict], *keys: str, default: float = 0.0) -> float:
    """Sum a field from a list of dicts, trying multiple key names in order."""
    total = 0.0
    for item in items:
        for key in keys:
            val = item.get(key)
            if val is not None:
                total += float(val)
                break
        else:
            total += default
    return total


def calculate_total(items: List[Dict], field: str, default: float = 0.0) -> float:
    """Sum a single field from a list of dicts."""
    return sum(float(item.get(field, default) or default) for item in items)


def group_by_field(items: List[Dict], field: str, value_field: str, default_group: str = "Other") -> Dict[str, float]:
    """Group items by a field and sum a value field."""
    result: Dict[str, float] = {}
    for item in items:
        group = item.get(field, default_group) or default_group
        val = float(item.get(value_field, 0) or 0)
        result[group] = result.get(group, 0) + val
    return result


def format_currency(amount: float, locale: str = "en-IN") -> str:
    """Format amount as Indian currency string."""
    if amount >= 10000000:
        return f"₹{amount / 10000000:.2f} Cr"
    if amount >= 100000:
        return f"₹{amount / 100000:.2f} L"
    if amount >= 1000:
        return f"₹{amount / 1000:.1f}K"
    return f"₹{amount:,.0f}"


def clamp(value: float, min_val: float = 0.0, max_val: float = 100.0) -> float:
    """Clamp a value between min and max."""
    return max(min_val, min(max_val, value))


def safe_ratio(numerator: float, denominator: float, multiply: float = 100.0) -> float:
    """Safe division returning 0 when denominator is 0."""
    if not denominator or denominator == 0:
        return 0.0
    return (numerator / denominator) * multiply
