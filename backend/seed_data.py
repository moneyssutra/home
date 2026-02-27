"""Comprehensive data seeder for MoneySSutra - seeds all types via API."""
import requests
import json
import sys

API = sys.argv[1]
s = requests.Session()
login = s.post(f"{API}/api/auth/login", json={"username": "test@moneyssutra.com", "password": "test"})
s.cookies.set("session_token", login.json()["session_token"])

def post(endpoint, data):
    r = s.post(f"{API}/api/{endpoint}", json=data)
    if r.status_code in (200, 201):
        name = data.get("name") or data.get("expenseName") or data.get("policyName") or data.get("loanName") or data.get("cardName") or data.get("goalType") or endpoint
        print(f"  OK: {name}")
        return r.json()
    else:
        print(f"  FAIL {endpoint}: {r.status_code} - {r.text[:200]}")
        return None

# ===== 1. INCOME SOURCES =====
print("\n=== INCOME (8 types) ===")
incomes = [
    {"type": "Salary", "name": "Software Engineer Salary", "expectedAmount": 150000, "frequency": "Monthly", "selectedDate": "1", "incomeType": "fixed"},
    {"type": "Salary", "name": "Annual Bonus", "expectedAmount": 300000, "frequency": "Yearly", "selectedMonth": "March", "incomeType": "fixed"},
    {"type": "Business", "name": "Consulting Revenue", "expectedAmount": 75000, "frequency": "Monthly", "selectedDate": "15", "incomeType": "variable", "isVariable": True},
    {"type": "Self-Employed", "name": "Freelance Web Dev", "expectedAmount": 40000, "frequency": "Monthly", "selectedDate": "20", "incomeType": "variable", "isVariable": True, "profession": "Web Developer"},
    {"type": "Commission", "name": "Insurance Referrals", "expectedAmount": 15000, "frequency": "Quarterly", "selectedQuarter": "Q1 (Jan-Mar)", "incomeType": "variable", "isVariable": True},
    {"type": "Commission", "name": "Real Estate Commission", "expectedAmount": 50000, "frequency": "Half-Yearly", "selectedHalf": "H1 (Jan-Jun)", "incomeType": "variable", "isVariable": True},
    {"type": "Other", "name": "YouTube Ad Revenue", "expectedAmount": 8000, "frequency": "Monthly", "selectedDate": "25", "incomeType": "variable", "isVariable": True},
    {"type": "Other", "name": "Cash Gift (Diwali)", "expectedAmount": 25000, "frequency": "Yearly", "selectedMonth": "November", "incomeType": "fixed"},
]
for inc in incomes:
    post("income", inc)

# ===== 2. EXPENSES (all categories) =====
print("\n=== EXPENSES (all categories) ===")
expenses = [
    {"expenseName": "Rent", "expenseType": "Fixed", "category": "Housing", "expectedAmount": 28000, "frequency": "Monthly", "selectedDate": "1"},
    {"expenseName": "Society Maintenance", "expenseType": "Fixed", "category": "Housing", "expectedAmount": 4500, "frequency": "Monthly", "selectedDate": "5"},
    {"expenseName": "Electricity Bill", "expenseType": "Variable", "category": "Utilities", "expectedAmount": 3500, "frequency": "Monthly", "selectedDate": "10"},
    {"expenseName": "Water Bill", "expenseType": "Fixed", "category": "Utilities", "expectedAmount": 800, "frequency": "Monthly", "selectedDate": "10"},
    {"expenseName": "Gas Cylinder", "expenseType": "Variable", "category": "Utilities", "expectedAmount": 900, "frequency": "Monthly", "selectedDate": "15"},
    {"expenseName": "Groceries", "expenseType": "Variable", "category": "Food", "expectedAmount": 12000, "frequency": "Monthly", "selectedDate": "1"},
    {"expenseName": "Dining Out", "expenseType": "Variable", "category": "Food", "expectedAmount": 5000, "frequency": "Monthly", "selectedDate": "15"},
    {"expenseName": "Petrol", "expenseType": "Variable", "category": "Travel", "expectedAmount": 6000, "frequency": "Monthly", "selectedDate": "1"},
    {"expenseName": "Uber/Ola", "expenseType": "Variable", "category": "Travel", "expectedAmount": 3000, "frequency": "Monthly", "selectedDate": "25"},
    {"expenseName": "Amazon Shopping", "expenseType": "Variable", "category": "Shopping", "expectedAmount": 4000, "frequency": "Monthly", "selectedDate": "20"},
    {"expenseName": "Family Doctor Visit", "expenseType": "Variable", "category": "Medical", "expectedAmount": 2000, "frequency": "Quarterly", "selectedQuarter": "Q1 (Jan-Mar)", "selectedDate": "15"},
    {"expenseName": "Medicines", "expenseType": "Fixed", "category": "Medical", "expectedAmount": 1500, "frequency": "Monthly", "selectedDate": "5"},
    {"expenseName": "Kids School Fees", "expenseType": "Fixed", "category": "Education", "expectedAmount": 25000, "frequency": "Quarterly", "selectedQuarter": "Q1 (Jan-Mar)", "selectedDate": "1"},
    {"expenseName": "Netflix", "expenseType": "Fixed", "category": "Subscriptions", "expectedAmount": 649, "frequency": "Monthly", "selectedDate": "5"},
    {"expenseName": "Spotify", "expenseType": "Fixed", "category": "Subscriptions", "expectedAmount": 119, "frequency": "Monthly", "selectedDate": "12"},
    {"expenseName": "iCloud Storage", "expenseType": "Fixed", "category": "Subscriptions", "expectedAmount": 75, "frequency": "Monthly", "selectedDate": "18"},
    {"expenseName": "Internet + Mobile", "expenseType": "Fixed", "category": "Utilities", "expectedAmount": 1500, "frequency": "Monthly", "selectedDate": "5"},
    {"expenseName": "Gym Membership", "expenseType": "Fixed", "category": "Subscriptions", "expectedAmount": 3000, "frequency": "Monthly", "selectedDate": "1"},
    {"expenseName": "Property Tax", "expenseType": "Fixed", "category": "Housing", "expectedAmount": 12000, "frequency": "Yearly", "selectedMonth": "April"},
]
for exp in expenses:
    post("expenses", exp)

# ===== 3. ACCOUNTS =====
print("\n=== ACCOUNTS ===")
accounts = [
    {"name": "HDFC Savings", "accountType": "Bank Account", "currentBalance": 250000, "isPrimary": True},
    {"name": "SBI Salary Account", "accountType": "Bank Account", "currentBalance": 85000},
    {"name": "Cash in Hand", "accountType": "Cash", "currentBalance": 15000},
    {"name": "Paytm Wallet", "accountType": "Wallet", "currentBalance": 3500},
]
account_ids = {}
for acc in accounts:
    result = post("accounts", acc)
    if result:
        account_ids[acc["name"]] = result.get("id")

# ===== 4. INVESTMENTS (all categories with varying SIP frequencies) =====
print("\n=== INVESTMENTS (16 categories) ===")
investments = [
    {"investmentCategory": "Fixed Deposit (FD)", "investmentMode": "Income Generating", "name": "SBI FD 3yr", "principal": 500000, "currentValue": 540000, "startDate": "2024-01-15", "returnRate": 7.25, "compoundingFrequency": "Quarterly", "maturityDate": "2027-01-15", "isLiquidAsset": False},
    {"investmentCategory": "Recurring Deposit (RD)", "investmentMode": "Growth with Maturity", "name": "HDFC RD Monthly", "principal": 0, "currentValue": 60000, "startDate": "2025-06-01", "investmentFrequency": "Monthly", "sipAmount": 5000, "sipSelectedDate": "5", "autoCreateExpense": True, "isLiquidAsset": False},
    {"investmentCategory": "Stocks", "investmentMode": "Growth Only", "name": "Reliance Industries", "principal": 150000, "currentValue": 185000, "startDate": "2023-08-10", "isLiquidAsset": True},
    {"investmentCategory": "US Stocks", "investmentMode": "Growth Only", "name": "Apple Inc (AAPL)", "principal": 80000, "currentValue": 105000, "startDate": "2024-03-01", "isLiquidAsset": True},
    {"investmentCategory": "Mutual Fund", "investmentMode": "Growth Only", "name": "Axis Bluechip MF", "principal": 0, "currentValue": 180000, "startDate": "2023-01-10", "investmentFrequency": "Monthly", "sipAmount": 10000, "sipSelectedDate": "10", "autoCreateExpense": True, "isLiquidAsset": True},
    {"investmentCategory": "ETF", "investmentMode": "Growth Only", "name": "Nifty 50 ETF", "principal": 50000, "currentValue": 62000, "startDate": "2024-06-15", "investmentFrequency": "Weekly", "sipAmount": 2000, "sipSelectedDay": "Monday", "autoCreateExpense": True, "isLiquidAsset": True},
    {"investmentCategory": "Bonds", "investmentMode": "Income Generating", "name": "Govt of India Bonds", "principal": 200000, "currentValue": 210000, "startDate": "2024-01-01", "returnRate": 7.5, "payoutFrequency": "Half-Yearly", "isLiquidAsset": False},
    {"investmentCategory": "Sovereign Gold Bond (SGB)", "investmentMode": "Growth with Maturity", "name": "SGB 2024-25 Series", "principal": 100000, "currentValue": 115000, "startDate": "2024-09-01", "isLiquidAsset": False},
    {"investmentCategory": "Digital Gold", "investmentMode": "Growth Only", "name": "Paytm Digital Gold", "principal": 25000, "currentValue": 28000, "startDate": "2025-01-01", "quantity": 3.5, "unitPrice": 7142, "currentPrice": 8000, "isLiquidAsset": True},
    {"investmentCategory": "P2P Lending", "investmentMode": "Income Generating", "name": "LenDenClub P2P", "principal": 50000, "currentValue": 55000, "startDate": "2024-07-01", "returnRate": 12, "isLiquidAsset": False},
    {"investmentCategory": "ULIP", "investmentMode": "Growth with Maturity", "name": "ICICI Pru ULIP", "principal": 100000, "currentValue": 110000, "startDate": "2023-04-01", "investmentFrequency": "Yearly", "sipAmount": 50000, "sipSelectedMonth": "April", "autoCreateExpense": True, "maturityDate": "2033-04-01", "isLiquidAsset": False},
    {"investmentCategory": "Crypto", "investmentMode": "Growth Only", "name": "Bitcoin (BTC)", "principal": 30000, "currentValue": 45000, "startDate": "2024-12-01", "investmentFrequency": "Daily", "sipAmount": 100, "autoCreateExpense": False, "isLiquidAsset": True},
    {"investmentCategory": "PPF", "investmentMode": "Growth with Maturity", "name": "PPF Account", "principal": 0, "currentValue": 350000, "startDate": "2020-04-01", "investmentFrequency": "Monthly", "sipAmount": 12500, "sipSelectedDate": "5", "autoCreateExpense": True, "returnRate": 7.1, "maturityDate": "2035-04-01", "isLiquidAsset": False},
    {"investmentCategory": "NPS", "investmentMode": "Growth with Maturity", "name": "NPS Tier 1", "principal": 0, "currentValue": 480000, "startDate": "2021-06-01", "investmentFrequency": "Monthly", "sipAmount": 5000, "sipSelectedDate": "10", "autoCreateExpense": True, "isLiquidAsset": False},
    {"investmentCategory": "Mutual Fund", "investmentMode": "Growth Only", "name": "Emergency Liquid Fund", "principal": 100000, "currentValue": 305000, "startDate": "2022-01-15", "investmentFrequency": "Quarterly", "sipAmount": 25000, "sipSelectedQuarter": "Q1 (Jan-Mar)", "sipSelectedDate": "15", "autoCreateExpense": True, "isLiquidAsset": True},
    {"investmentCategory": "Other", "investmentMode": "Growth Only", "name": "Angel Investment Startup", "principal": 200000, "currentValue": 200000, "startDate": "2025-09-01", "isLiquidAsset": False},
]
inv_ids = {}
for inv in investments:
    result = post("investments", inv)
    if result:
        inv_ids[inv["name"]] = result.get("id")

# ===== 5. ASSETS (all types) =====
print("\n=== ASSETS (10 types) ===")
assets_data = [
    {"assetType": "Residential Property", "name": "2BHK Flat Pune", "purchaseValue": 6500000, "currentValue": 8200000, "purchaseDate": "2020-03-15", "appreciationType": "Appreciating", "appreciationRate": 8, "hasRentalIncome": True, "monthlyRentalIncome": 22000, "isFinanced": True},
    {"assetType": "Commercial Property", "name": "Shop Baner Road", "purchaseValue": 3500000, "currentValue": 4200000, "purchaseDate": "2022-06-01", "appreciationType": "Appreciating", "appreciationRate": 6, "hasRentalIncome": True, "monthlyRentalIncome": 15000},
    {"assetType": "Land", "name": "Plot in Lonavala", "purchaseValue": 2000000, "currentValue": 2800000, "purchaseDate": "2021-01-10", "appreciationType": "Appreciating", "appreciationRate": 10},
    {"assetType": "Vehicle", "name": "Honda City 2023", "purchaseValue": 1500000, "currentValue": 1200000, "purchaseDate": "2023-08-20", "appreciationType": "Depreciating", "depreciationRate": 12},
    {"assetType": "Vehicle", "name": "Activa Scooter", "purchaseValue": 85000, "currentValue": 55000, "purchaseDate": "2022-03-01", "appreciationType": "Depreciating", "depreciationRate": 15},
    {"assetType": "Physical Gold", "name": "Gold Jewelry Collection", "purchaseValue": 450000, "currentValue": 620000, "purchaseDate": "2018-11-01", "appreciationType": "Market Driven", "quantity": 75, "unitPrice": 6000, "currentPrice": 8267},
    {"assetType": "Physical Silver", "name": "Silver Coins", "purchaseValue": 50000, "currentValue": 65000, "purchaseDate": "2023-01-15", "appreciationType": "Market Driven", "quantity": 500, "unitPrice": 100, "currentPrice": 130},
    {"assetType": "Diamonds", "name": "Diamond Ring", "purchaseValue": 180000, "currentValue": 200000, "purchaseDate": "2022-02-14", "appreciationType": "Market Driven"},
    {"assetType": "Business Asset", "name": "Office Furniture Set", "purchaseValue": 250000, "currentValue": 180000, "purchaseDate": "2023-04-01", "appreciationType": "Depreciating", "depreciationRate": 10},
    {"assetType": "Equipment / Machinery", "name": "MacBook Pro M4", "purchaseValue": 250000, "currentValue": 200000, "purchaseDate": "2025-01-10", "appreciationType": "Depreciating", "depreciationRate": 25},
    {"assetType": "Other", "name": "Art Collection", "purchaseValue": 100000, "currentValue": 150000, "purchaseDate": "2021-07-01", "appreciationType": "Appreciating", "appreciationRate": 12},
]
asset_ids = {}
for a in assets_data:
    result = post("assets", a)
    if result:
        asset_ids[a["name"]] = result.get("id")

# ===== 6. LOANS (all types) =====
print("\n=== LOANS (9 types) ===")
loans = [
    {"loanType": "Home Loan", "loanName": "HDFC Home Loan", "lenderName": "HDFC Bank", "principalAmount": 5000000, "outstandingAmount": 4200000, "interestRate": 8.5, "emiAmount": 45000, "emiFrequency": "Monthly", "tenureMonths": 240, "startDate": "2020-03-01", "endDate": "2040-03-01", "autoCreateExpense": True, "linkedAssetId": asset_ids.get("2BHK Flat Pune", "")},
    {"loanType": "Vehicle Loan", "loanName": "Honda City Loan", "lenderName": "ICICI Bank", "principalAmount": 1000000, "outstandingAmount": 650000, "interestRate": 9.5, "emiAmount": 22000, "emiFrequency": "Monthly", "tenureMonths": 60, "startDate": "2023-08-01", "endDate": "2028-08-01", "autoCreateExpense": True, "linkedAssetId": asset_ids.get("Honda City 2023", "")},
    {"loanType": "Personal Loan", "loanName": "SBI Personal Loan", "lenderName": "SBI", "principalAmount": 300000, "outstandingAmount": 180000, "interestRate": 12, "emiAmount": 10500, "emiFrequency": "Monthly", "tenureMonths": 36, "startDate": "2024-06-01", "endDate": "2027-06-01", "autoCreateExpense": True},
    {"loanType": "Education Loan", "loanName": "MBA Education Loan", "lenderName": "PNB", "principalAmount": 800000, "outstandingAmount": 500000, "interestRate": 10, "emiAmount": 15000, "emiFrequency": "Monthly", "tenureMonths": 84, "startDate": "2022-07-01", "endDate": "2029-07-01", "autoCreateExpense": True},
    {"loanType": "Business Loan", "loanName": "Startup Funding Loan", "lenderName": "Bajaj Finance", "principalAmount": 500000, "outstandingAmount": 350000, "interestRate": 14, "emiAmount": 18000, "emiFrequency": "Monthly", "tenureMonths": 36, "startDate": "2024-01-01", "endDate": "2027-01-01", "autoCreateExpense": True},
    {"loanType": "Gold Loan", "loanName": "Muthoot Gold Loan", "lenderName": "Muthoot Finance", "principalAmount": 200000, "outstandingAmount": 120000, "interestRate": 7.5, "emiAmount": 8500, "emiFrequency": "Monthly", "tenureMonths": 24, "startDate": "2025-01-01", "endDate": "2027-01-01", "autoCreateExpense": True},
    {"loanType": "Credit Card Dues", "loanName": "HDFC CC Outstanding", "lenderName": "HDFC Bank", "principalAmount": 75000, "outstandingAmount": 75000, "interestRate": 42, "emiAmount": 7500, "emiFrequency": "Monthly", "tenureMonths": 12, "startDate": "2025-12-01", "endDate": "2026-12-01", "autoCreateExpense": True},
    {"loanType": "Hand Loan Taken", "loanName": "Borrowed from Friend", "lenderName": "Amit Sharma", "principalAmount": 50000, "outstandingAmount": 30000, "interestRate": 0, "emiAmount": 10000, "emiFrequency": "Monthly", "tenureMonths": 5, "startDate": "2026-01-01", "endDate": "2026-06-01", "autoCreateExpense": True},
    {"loanType": "Other", "loanName": "Office Renovation Loan", "lenderName": "Kotak Bank", "principalAmount": 150000, "outstandingAmount": 100000, "interestRate": 11, "emiAmount": 12000, "emiFrequency": "Monthly", "tenureMonths": 18, "startDate": "2025-06-01", "endDate": "2026-12-01", "autoCreateExpense": True},
]
for loan in loans:
    post("loans", loan)

# ===== 7. CREDIT CARDS =====
print("\n=== CREDIT CARDS ===")
credit_cards = [
    {"cardName": "HDFC Regalia", "cardNetwork": "Visa", "creditLimit": 500000, "outstandingAmount": 45000, "billingDate": "15", "dueDate": "5", "interestRate": 42, "minimumDuePercentage": 5, "rewardPoints": 12500},
    {"cardName": "SBI Simply Click", "cardNetwork": "Visa", "creditLimit": 200000, "outstandingAmount": 12000, "billingDate": "20", "dueDate": "10", "interestRate": 39, "minimumDuePercentage": 5, "rewardPoints": 3200},
    {"cardName": "Axis Flipkart", "cardNetwork": "Mastercard", "creditLimit": 300000, "outstandingAmount": 0, "billingDate": "1", "dueDate": "21", "interestRate": 42, "minimumDuePercentage": 5, "rewardPoints": 8000},
    {"cardName": "AMEX Platinum", "cardNetwork": "Amex", "creditLimit": 1000000, "outstandingAmount": 85000, "billingDate": "10", "dueDate": "1", "interestRate": 36, "minimumDuePercentage": 5, "rewardPoints": 45000},
]
for cc in credit_cards:
    post("credit-cards", cc)

# ===== 8. INSURANCES (all types) =====
print("\n=== INSURANCES (all types) ===")
insurances = [
    {"insuranceType": "Term Insurance", "policyName": "ICICI iProtect Smart", "coverageAmount": 10000000, "premiumAmount": 12000, "premiumFrequency": "Yearly", "startDate": "2022-04-01", "endDate": "2052-04-01", "coveredPerson": "Self", "autoCreateExpense": True, "premiumPaymentDate": "1"},
    {"insuranceType": "Life Insurance", "policyName": "LIC Jeevan Anand", "coverageAmount": 2500000, "premiumAmount": 45000, "premiumFrequency": "Yearly", "startDate": "2019-01-15", "endDate": "2039-01-15", "maturityType": "With Profits", "expectedMaturityAmount": 5000000, "coveredPerson": "Self", "autoCreateExpense": True, "premiumPaymentDate": "15"},
    {"insuranceType": "Health Insurance", "policyName": "Star Family Floater", "coverageAmount": 1000000, "premiumAmount": 25000, "premiumFrequency": "Yearly", "startDate": "2023-06-01", "endDate": "2024-06-01", "coveredPerson": "Self", "autoCreateExpense": True, "premiumPaymentDate": "1"},
    {"insuranceType": "Vehicle Insurance", "policyName": "Honda City Comprehensive", "coverageAmount": 1500000, "premiumAmount": 18000, "premiumFrequency": "Yearly", "startDate": "2025-08-20", "endDate": "2026-08-20", "coveredPerson": "Self", "autoCreateExpense": True, "premiumPaymentDate": "20"},
    {"insuranceType": "Vehicle Insurance", "policyName": "Activa Third Party", "coverageAmount": 500000, "premiumAmount": 2500, "premiumFrequency": "Yearly", "startDate": "2025-03-01", "endDate": "2026-03-01", "coveredPerson": "Self", "autoCreateExpense": True, "premiumPaymentDate": "1"},
    {"insuranceType": "Property Insurance", "policyName": "Home Shield Policy", "coverageAmount": 8000000, "premiumAmount": 8000, "premiumFrequency": "Yearly", "startDate": "2024-03-15", "endDate": "2025-03-15", "coveredPerson": "Self", "autoCreateExpense": True, "premiumPaymentDate": "15"},
    {"insuranceType": "Business Insurance", "policyName": "Office All Risk", "coverageAmount": 500000, "premiumAmount": 5000, "premiumFrequency": "Yearly", "startDate": "2025-04-01", "endDate": "2026-04-01", "autoCreateExpense": True, "premiumPaymentDate": "1"},
    {"insuranceType": "Travel Insurance", "policyName": "Annual Travel Cover", "coverageAmount": 2500000, "premiumAmount": 3500, "premiumFrequency": "Yearly", "startDate": "2025-12-01", "endDate": "2026-12-01", "coveredPerson": "Self", "autoCreateExpense": True, "premiumPaymentDate": "1"},
    {"insuranceType": "Other", "policyName": "Cyber Fraud Protection", "coverageAmount": 500000, "premiumAmount": 1200, "premiumFrequency": "Yearly", "startDate": "2025-09-01", "endDate": "2026-09-01", "autoCreateExpense": True, "premiumPaymentDate": "1"},
]
for ins in insurances:
    post("insurances", ins)

# ===== 9. GOALS (all types) =====
print("\n=== GOALS ===")
goals = [
    {"goalType": "Wealth Creation", "targetAmount": 5000000, "currentAmount": 800000, "targetDate": "2030-12-31", "priority": 1, "notes": "Build corpus for early retirement"},
    {"goalType": "Debt Elimination", "targetAmount": 4200000, "currentAmount": 0, "targetDate": "2035-03-01", "priority": 1, "notes": "Pay off home loan completely"},
    {"goalType": "Investment Target", "targetAmount": 2000000, "currentAmount": 480000, "targetDate": "2028-06-01", "priority": 2, "notes": "NPS corpus growth target"},
    {"goalType": "Emergency Fund", "targetAmount": 600000, "currentAmount": 305000, "targetDate": "2027-01-01", "priority": 1, "notes": "6 months expenses safety net"},
    {"goalType": "Other", "customTypeName": "Kid's Education Fund", "targetAmount": 3000000, "currentAmount": 350000, "targetDate": "2035-06-01", "priority": 2, "notes": "Higher education corpus for child"},
]
for goal in goals:
    post("goals", goal)

# ===== SUMMARY =====
print("\n=== VERIFICATION ===")
for endpoint, label in [("income", "Income"), ("expenses", "Expenses"), ("investments", "Investments"), ("assets", "Assets"), ("loans", "Loans"), ("credit-cards", "Credit Cards"), ("insurances", "Insurance"), ("accounts", "Accounts"), ("goals", "Goals")]:
    try:
        r = s.get(f"{API}/api/{endpoint}")
        data = r.json()
        count = len(data) if isinstance(data, list) else 0
        print(f"  {label}: {count} entries")
    except:
        print(f"  {label}: error")

print("\nSeeding complete!")
