"""
MoneySSutra - Comprehensive Test Data Seed Script
Creates fresh test user with realistic Indian financial data across ALL modules.
"""
import asyncio
import hashlib
import uuid
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb+srv://moneyssutra_user:psK92QMcqOqBsBpq@cluster0.oqrmi6o.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
DB_NAME = "moneyssutra"

USER_ID = f"user_{uuid.uuid4().hex[:12]}"
NOW = datetime.now(timezone.utc)
TODAY = NOW.strftime("%Y-%m-%d")

def uid(): return str(uuid.uuid4())
def ts(): return NOW.isoformat()

async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # ========== 1. CREATE TEST USER ==========
    password_hash = hashlib.sha256("test".encode()).hexdigest()
    user = {
        "user_id": USER_ID, "name": "Rahul Sharma", "email": "test@moneyssutra.com",
        "mobile": "9876543210", "password_hash": password_hash, "auth_type": "jwt",
        "has_password": True, "isProfileComplete": True,
        "createdAt": ts(), "updatedAt": ts()
    }
    await db.users.insert_one(user)

    profile = {
        "userId": USER_ID, "name": "Rahul Sharma", "email": "test@moneyssutra.com",
        "mobile": "9876543210", "dateOfBirth": "1992-06-15", "gender": "Male",
        "city": "Mumbai", "occupation": "Software Engineer",
        "annualIncome": "2500000", "dependents": "2",
        "createdAt": ts(), "updatedAt": ts()
    }
    await db.profiles.insert_one(profile)
    print(f"✅ User created: {USER_ID} (test@moneyssutra.com / test)")

    # ========== 2. INCOME SOURCES ==========
    incomes = [
        # Salary
        {"id": uid(), "userId": USER_ID, "incomeName": "TCS Salary", "incomeType": "Salary",
         "expectedAmount": 185000, "frequency": "Monthly", "isActive": True,
         "selectedDate": "1", "notes": "Net take-home after TDS", "createdAt": ts()},
        # Business Income
        {"id": uid(), "userId": USER_ID, "incomeName": "Consulting Business", "incomeType": "Business",
         "expectedAmount": 45000, "frequency": "Monthly", "isActive": True,
         "selectedDate": "15", "notes": "Part-time IT consulting", "createdAt": ts()},
        # Freelance
        {"id": uid(), "userId": USER_ID, "incomeName": "Upwork Freelancing", "incomeType": "Freelance",
         "expectedAmount": 25000, "frequency": "Monthly", "isActive": True,
         "selectedDate": "20", "notes": "Web dev projects", "createdAt": ts()},
        # Rental Income
        {"id": uid(), "userId": USER_ID, "incomeName": "Pune Flat Rent", "incomeType": "Rental",
         "expectedAmount": 18000, "frequency": "Monthly", "isActive": True,
         "selectedDate": "5", "notes": "2BHK in Kothrud", "createdAt": ts()},
        # Interest Income
        {"id": uid(), "userId": USER_ID, "incomeName": "FD Interest - SBI", "incomeType": "Interest",
         "expectedAmount": 48000, "frequency": "Yearly", "isActive": True,
         "selectedMonth": "March", "notes": "7.1% on 6.5L FD", "createdAt": ts()},
        # Dividend
        {"id": uid(), "userId": USER_ID, "incomeName": "Stock Dividends", "incomeType": "Dividend",
         "expectedAmount": 15000, "frequency": "Quarterly", "isActive": True,
         "selectedQuarter": "Q1", "notes": "From HDFC, TCS, Infosys holdings", "createdAt": ts()},
    ]
    await db.income_sources.insert_many(incomes)
    print(f"✅ {len(incomes)} income sources created")

    # Income transactions (3 months history for consistency scoring)
    income_txns = []
    for m in range(3):
        month_date = (NOW - timedelta(days=30*m)).strftime("%Y-%m-%d")
        # Salary - slight variation
        salary_var = 185000 + (m * 500)  # minor increment
        income_txns.append({"id": uid(), "userId": USER_ID, "incomeSourceId": incomes[0]["id"],
            "incomeName": "TCS Salary", "incomeAmount": salary_var,
            "transactionDate": month_date, "createdAt": ts()})
        # Consulting - fluctuating
        consult_var = 45000 + ((-1)**m * 5000)
        income_txns.append({"id": uid(), "userId": USER_ID, "incomeSourceId": incomes[1]["id"],
            "incomeName": "Consulting Business", "incomeAmount": consult_var,
            "transactionDate": month_date, "createdAt": ts()})
        # Freelance - fluctuating
        freelance_var = 25000 + ((-1)**m * 8000)
        income_txns.append({"id": uid(), "userId": USER_ID, "incomeSourceId": incomes[2]["id"],
            "incomeName": "Upwork Freelancing", "incomeAmount": freelance_var,
            "transactionDate": month_date, "createdAt": ts()})
        # Rent - consistent
        income_txns.append({"id": uid(), "userId": USER_ID, "incomeSourceId": incomes[3]["id"],
            "incomeName": "Pune Flat Rent", "incomeAmount": 18000,
            "transactionDate": month_date, "createdAt": ts()})
    if income_txns:
        await db.income_transactions.insert_many(income_txns)
    print(f"✅ {len(income_txns)} income transactions (3-month history)")

    # ========== 3. EXPENSES (All categories) ==========
    expenses = [
        # Housing
        {"id": uid(), "userId": USER_ID, "expenseName": "Rent", "expenseType": "Fixed", "category": "Housing",
         "expectedAmount": 28000, "frequency": "Monthly", "selectedDate": "1", "isPaid": False, "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "expenseName": "Society Maintenance", "expenseType": "Fixed", "category": "Housing",
         "expectedAmount": 4500, "frequency": "Monthly", "selectedDate": "5", "isPaid": False, "createdAt": ts()},
        # Utilities
        {"id": uid(), "userId": USER_ID, "expenseName": "Electricity Bill", "expenseType": "Fixed", "category": "Utilities",
         "expectedAmount": 3500, "frequency": "Monthly", "selectedDate": "10", "isPaid": False, "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "expenseName": "Internet + Mobile", "expenseType": "Fixed", "category": "Utilities",
         "expectedAmount": 1500, "frequency": "Monthly", "selectedDate": "12", "isPaid": False, "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "expenseName": "Gas Cylinder", "expenseType": "Variable", "category": "Utilities",
         "expectedAmount": 900, "frequency": "Monthly", "selectedDate": "15", "isPaid": False, "createdAt": ts()},
        # Food
        {"id": uid(), "userId": USER_ID, "expenseName": "Groceries", "expenseType": "Fixed", "category": "Food",
         "expectedAmount": 10000, "frequency": "Monthly", "selectedDate": "1", "isPaid": False, "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "expenseName": "Dining Out", "expenseType": "Variable", "category": "Food",
         "expectedAmount": 4000, "frequency": "Monthly", "selectedDate": "15", "isPaid": False, "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "expenseName": "Swiggy/Zomato", "expenseType": "Variable", "category": "Food",
         "expectedAmount": 3500, "frequency": "Monthly", "selectedDate": "15", "isPaid": False, "createdAt": ts()},
        # Transport
        {"id": uid(), "userId": USER_ID, "expenseName": "Petrol", "expenseType": "Variable", "category": "Transport",
         "expectedAmount": 5000, "frequency": "Monthly", "selectedDate": "1", "isPaid": False, "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "expenseName": "Car Service", "expenseType": "Variable", "category": "Transport",
         "expectedAmount": 6000, "frequency": "Quarterly", "selectedQuarter": "Q1", "isPaid": False, "createdAt": ts()},
        # Education
        {"id": uid(), "userId": USER_ID, "expenseName": "School Fees - Child 1", "expenseType": "Fixed", "category": "Education",
         "expectedAmount": 45000, "frequency": "Quarterly", "selectedQuarter": "Q1", "isPaid": False, "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "expenseName": "Online Courses", "expenseType": "Variable", "category": "Education",
         "expectedAmount": 2000, "frequency": "Monthly", "selectedDate": "1", "isPaid": False, "createdAt": ts()},
        # Healthcare
        {"id": uid(), "userId": USER_ID, "expenseName": "Health Checkup", "expenseType": "Variable", "category": "Healthcare",
         "expectedAmount": 5000, "frequency": "Half-Yearly", "selectedHalf": "Jan-Jun", "isPaid": False, "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "expenseName": "Medicine", "expenseType": "Fixed", "category": "Healthcare",
         "expectedAmount": 1500, "frequency": "Monthly", "selectedDate": "1", "isPaid": False, "createdAt": ts()},
        # Insurance Premiums (auto-linked)
        {"id": uid(), "userId": USER_ID, "expenseName": "Term Insurance Premium", "expenseType": "Fixed", "category": "Insurance",
         "expectedAmount": 18000, "frequency": "Yearly", "selectedMonth": "April", "isPaid": False, "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "expenseName": "Health Insurance Premium", "expenseType": "Fixed", "category": "Insurance",
         "expectedAmount": 25000, "frequency": "Yearly", "selectedMonth": "July", "isPaid": False, "createdAt": ts()},
        # Shopping / Discretionary
        {"id": uid(), "userId": USER_ID, "expenseName": "Shopping - Clothes/Gadgets", "expenseType": "Variable", "category": "Shopping",
         "expectedAmount": 5000, "frequency": "Monthly", "selectedDate": "20", "isPaid": False, "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "expenseName": "Amazon/Flipkart", "expenseType": "Variable", "category": "Shopping",
         "expectedAmount": 3000, "frequency": "Monthly", "selectedDate": "15", "isPaid": False, "createdAt": ts()},
        # Entertainment
        {"id": uid(), "userId": USER_ID, "expenseName": "Netflix + Hotstar", "expenseType": "Fixed", "category": "Entertainment",
         "expectedAmount": 800, "frequency": "Monthly", "selectedDate": "5", "isPaid": False, "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "expenseName": "Movies/Outings", "expenseType": "Variable", "category": "Entertainment",
         "expectedAmount": 2000, "frequency": "Monthly", "selectedDate": "25", "isPaid": False, "createdAt": ts()},
        # Travel
        {"id": uid(), "userId": USER_ID, "expenseName": "Weekend Trips", "expenseType": "Variable", "category": "Travel",
         "expectedAmount": 8000, "frequency": "Monthly", "selectedDate": "25", "isPaid": False, "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "expenseName": "Annual Vacation", "expenseType": "Variable", "category": "Travel",
         "expectedAmount": 80000, "frequency": "Yearly", "selectedMonth": "December", "isPaid": False, "createdAt": ts()},
        # Gifts
        {"id": uid(), "userId": USER_ID, "expenseName": "Gifts & Donations", "expenseType": "Variable", "category": "Gifts & Donations",
         "expectedAmount": 3000, "frequency": "Monthly", "selectedDate": "1", "isPaid": False, "createdAt": ts()},
        # Personal Care
        {"id": uid(), "userId": USER_ID, "expenseName": "Salon & Personal Care", "expenseType": "Variable", "category": "Personal Care",
         "expectedAmount": 1500, "frequency": "Monthly", "selectedDate": "15", "isPaid": False, "createdAt": ts()},
    ]
    await db.expenses.insert_many(expenses)
    print(f"✅ {len(expenses)} expenses created across {len(set(e['category'] for e in expenses))} categories")

    # ========== 4. BANK ACCOUNTS (Liquid) ==========
    accounts = [
        {"id": uid(), "userId": USER_ID, "accountName": "HDFC Savings Account", "accountType": "Savings",
         "bankName": "HDFC Bank", "currentBalance": 285000, "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "accountName": "SBI Salary Account", "accountType": "Savings",
         "bankName": "State Bank of India", "currentBalance": 142000, "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "accountName": "Kotak Zero Balance", "accountType": "Savings",
         "bankName": "Kotak Mahindra Bank", "currentBalance": 35000, "createdAt": ts()},
    ]
    await db.accounts.insert_many(accounts)
    print(f"✅ {len(accounts)} bank accounts (total: ₹{sum(a['currentBalance'] for a in accounts):,})")

    # ========== 5. INVESTMENTS ==========
    investments = [
        # Equity Mutual Funds
        {"id": uid(), "userId": USER_ID, "name": "HDFC Mid-Cap Opportunities Fund",
         "investmentCategory": "Mutual Fund", "investmentType": "Equity", "currentValue": 320000,
         "investedAmount": 250000, "startDate": "2021-03-15", "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "name": "Axis Bluechip Fund",
         "investmentCategory": "Mutual Fund", "investmentType": "Equity", "currentValue": 185000,
         "investedAmount": 150000, "startDate": "2022-01-10", "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "name": "Mirae Asset Large Cap Fund",
         "investmentCategory": "Mutual Fund", "investmentType": "Equity", "currentValue": 145000,
         "investedAmount": 120000, "startDate": "2022-06-01", "createdAt": ts()},
        # Index Fund
        {"id": uid(), "userId": USER_ID, "name": "Nifty 50 Index Fund",
         "investmentCategory": "Index Fund", "investmentType": "Equity", "currentValue": 210000,
         "investedAmount": 180000, "startDate": "2023-01-01", "createdAt": ts()},
        # Stocks
        {"id": uid(), "userId": USER_ID, "name": "TCS Shares (50 qty)",
         "investmentCategory": "Stocks", "investmentType": "Equity", "currentValue": 195000,
         "investedAmount": 175000, "startDate": "2021-06-01", "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "name": "HDFC Bank Shares (100 qty)",
         "investmentCategory": "Stocks", "investmentType": "Equity", "currentValue": 165000,
         "investedAmount": 140000, "startDate": "2022-03-15", "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "name": "Infosys Shares (30 qty)",
         "investmentCategory": "Stocks", "investmentType": "Equity", "currentValue": 55000,
         "investedAmount": 48000, "startDate": "2023-06-01", "createdAt": ts()},
        # Fixed Deposits (Semi-liquid)
        {"id": uid(), "userId": USER_ID, "name": "SBI FD - 3 Year",
         "investmentCategory": "Fixed Deposit", "investmentType": "Debt", "currentValue": 650000,
         "investedAmount": 550000, "startDate": "2023-04-01", "maturityDate": "2026-04-01", "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "name": "HDFC FD - 1 Year",
         "investmentCategory": "Fixed Deposit", "investmentType": "Debt", "currentValue": 215000,
         "investedAmount": 200000, "startDate": "2025-06-01", "maturityDate": "2026-06-01", "createdAt": ts()},
        # PPF (Illiquid)
        {"id": uid(), "userId": USER_ID, "name": "PPF Account",
         "investmentCategory": "PPF", "investmentType": "Debt", "currentValue": 480000,
         "investedAmount": 400000, "startDate": "2018-04-01", "createdAt": ts()},
        # NPS
        {"id": uid(), "userId": USER_ID, "name": "NPS Tier 1",
         "investmentCategory": "NPS", "investmentType": "Balanced", "currentValue": 320000,
         "investedAmount": 250000, "startDate": "2020-01-01", "createdAt": ts()},
        # EPF
        {"id": uid(), "userId": USER_ID, "name": "EPF Balance",
         "investmentCategory": "EPF", "investmentType": "Debt", "currentValue": 580000,
         "investedAmount": 500000, "startDate": "2018-07-01", "createdAt": ts()},
        # Gold
        {"id": uid(), "userId": USER_ID, "name": "Sovereign Gold Bonds (20g)",
         "investmentCategory": "Gold", "investmentType": "Commodity", "currentValue": 155000,
         "investedAmount": 100000, "startDate": "2021-08-01", "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "name": "Physical Gold (10g)",
         "investmentCategory": "Gold", "investmentType": "Commodity", "currentValue": 78000,
         "investedAmount": 50000, "startDate": "2020-01-01", "createdAt": ts()},
        # ELSS
        {"id": uid(), "userId": USER_ID, "name": "Axis ELSS Tax Saver",
         "investmentCategory": "ELSS", "investmentType": "Equity", "currentValue": 95000,
         "investedAmount": 75000, "startDate": "2022-02-01", "createdAt": ts()},
        # Crypto (High risk)
        {"id": uid(), "userId": USER_ID, "name": "Bitcoin (0.01 BTC)",
         "investmentCategory": "Cryptocurrency", "investmentType": "Alternative", "currentValue": 42000,
         "investedAmount": 50000, "startDate": "2023-11-01", "createdAt": ts()},
    ]
    await db.investments.insert_many(investments)
    total_inv = sum(i["currentValue"] for i in investments)
    print(f"✅ {len(investments)} investments (total: ₹{total_inv:,})")

    # ========== 6. ASSETS ==========
    assets = [
        # Real Estate
        {"id": uid(), "userId": USER_ID, "assetType": "Real Estate", "assetName": "Pune 2BHK Flat (Rented Out)",
         "currentValue": 6500000, "purchaseValue": 4200000, "purchaseDate": "2018-06-15",
         "isFinanced": True, "isInsured": False, "generatesIncome": True,
         "incomeAmount": 18000, "incomeFrequency": "Monthly", "createdAt": ts()},
        # Vehicle
        {"id": uid(), "userId": USER_ID, "assetType": "Vehicle", "assetName": "Hyundai Creta 2022",
         "currentValue": 950000, "purchaseValue": 1450000, "purchaseDate": "2022-03-01",
         "isFinanced": True, "isInsured": True, "generatesIncome": False, "createdAt": ts()},
        # Jewellery
        {"id": uid(), "userId": USER_ID, "assetType": "Jewellery", "assetName": "Gold Jewellery (50g)",
         "currentValue": 385000, "purchaseValue": 250000, "purchaseDate": "2019-01-01",
         "isFinanced": False, "isInsured": False, "generatesIncome": False, "createdAt": ts()},
        # Electronics
        {"id": uid(), "userId": USER_ID, "assetType": "Electronics", "assetName": "MacBook Pro + iPhone",
         "currentValue": 120000, "purchaseValue": 250000, "purchaseDate": "2023-06-01",
         "isFinanced": False, "isInsured": False, "generatesIncome": False, "createdAt": ts()},
        # Cash at home
        {"id": uid(), "userId": USER_ID, "assetType": "Cash", "assetName": "Emergency Cash at Home",
         "currentValue": 25000, "purchaseValue": 25000, "purchaseDate": TODAY,
         "isFinanced": False, "isInsured": False, "generatesIncome": False, "createdAt": ts()},
    ]
    await db.assets.insert_many(assets)
    total_assets = sum(a["currentValue"] for a in assets)
    print(f"✅ {len(assets)} assets (total: ₹{total_assets:,})")

    # ========== 7. LOANS (Liabilities) ==========
    loans = [
        # Home Loan
        {"id": uid(), "userId": USER_ID, "loanName": "Home Loan - HDFC", "loanType": "Home Loan",
         "principalAmount": 3500000, "outstandingAmount": 2800000, "interestRate": 8.5,
         "emiAmount": 35000, "tenure": 240, "remainingTenure": 180, "startDate": "2020-06-01",
         "linkedAssetId": None, "autoCreateExpense": True, "createdAt": ts()},
        # Car Loan
        {"id": uid(), "userId": USER_ID, "loanName": "Car Loan - SBI", "loanType": "Car Loan",
         "principalAmount": 800000, "outstandingAmount": 420000, "interestRate": 9.5,
         "emiAmount": 16500, "tenure": 60, "remainingTenure": 28, "startDate": "2022-04-01",
         "linkedAssetId": None, "autoCreateExpense": True, "createdAt": ts()},
        # Personal Loan
        {"id": uid(), "userId": USER_ID, "loanName": "Personal Loan - ICICI", "loanType": "Personal Loan",
         "principalAmount": 300000, "outstandingAmount": 180000, "interestRate": 12.0,
         "emiAmount": 10500, "tenure": 36, "remainingTenure": 18, "startDate": "2024-06-01",
         "linkedAssetId": None, "autoCreateExpense": True, "createdAt": ts()},
        # Informal Borrowing
        {"id": uid(), "userId": USER_ID, "loanName": "Loan from Father", "loanType": "Personal Loan",
         "principalAmount": 200000, "outstandingAmount": 150000, "interestRate": 0,
         "emiAmount": 10000, "tenure": 20, "remainingTenure": 15, "startDate": "2025-01-01",
         "linkedAssetId": None, "autoCreateExpense": False, "createdAt": ts()},
    ]
    # Add EMI expenses for auto-create loans
    emi_expenses = []
    for loan in loans:
        if loan.get("autoCreateExpense"):
            emi_expenses.append({
                "id": uid(), "userId": USER_ID, "expenseName": f"{loan['loanName']} EMI",
                "expenseType": "Fixed", "category": "EMI",
                "expectedAmount": loan["emiAmount"], "frequency": "Monthly",
                "selectedDate": "5", "linkedLoanId": loan["id"],
                "isPaid": False, "createdAt": ts()
            })
    await db.loans.insert_many(loans)
    if emi_expenses:
        await db.expenses.insert_many(emi_expenses)
    total_debt = sum(l["outstandingAmount"] for l in loans)
    total_emi = sum(l["emiAmount"] for l in loans)
    print(f"✅ {len(loans)} loans (outstanding: ₹{total_debt:,}, EMI: ₹{total_emi:,}/month)")

    # ========== 8. CREDIT CARDS ==========
    credit_cards = [
        {"id": uid(), "userId": USER_ID, "cardName": "HDFC Millennia", "bankName": "HDFC Bank",
         "creditLimit": 300000, "currentOutstanding": 45000, "minimumDue": 2250,
         "dueDate": "15", "interestRate": 42, "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "cardName": "SBI Simply Click", "bankName": "SBI Card",
         "creditLimit": 200000, "currentOutstanding": 18000, "minimumDue": 900,
         "dueDate": "20", "interestRate": 40, "createdAt": ts()},
        {"id": uid(), "userId": USER_ID, "cardName": "Amazon Pay ICICI", "bankName": "ICICI Bank",
         "creditLimit": 150000, "currentOutstanding": 8500, "minimumDue": 425,
         "dueDate": "10", "interestRate": 38, "createdAt": ts()},
    ]
    await db.credit_cards.insert_many(credit_cards)
    total_cc_outstanding = sum(c["currentOutstanding"] for c in credit_cards)
    total_cc_limit = sum(c["creditLimit"] for c in credit_cards)
    print(f"✅ {len(credit_cards)} credit cards (outstanding: ₹{total_cc_outstanding:,}, limit: ₹{total_cc_limit:,})")

    # ========== 9. INSURANCE ==========
    insurances = [
        # Term Insurance (Pure Protection - NOT an asset)
        {"id": uid(), "userId": USER_ID, "insuranceType": "Term Insurance",
         "policyName": "HDFC Click2Protect", "coverageAmount": 10000000,
         "premiumAmount": 18000, "premiumFrequency": "Yearly", "premiumPaymentTerm": "30 Years",
         "startDate": "2021-04-01", "endDate": "2051-04-01", "premiumEndDate": "2051-04-01",
         "maturityType": "Pure Protection", "coveredPerson": "Self",
         "autoCreateExpense": False, "createdAt": ts()},
        # Endowment (Savings - surrender value is illiquid asset)
        {"id": uid(), "userId": USER_ID, "insuranceType": "Life Insurance",
         "policyName": "LIC Jeevan Anand", "coverageAmount": 2500000,
         "premiumAmount": 35000, "premiumFrequency": "Yearly", "premiumPaymentTerm": "20 Years",
         "startDate": "2019-08-01", "endDate": "2039-08-01", "premiumEndDate": "2039-08-01",
         "maturityType": "Returns on Maturity", "expectedMaturityAmount": 1200000,
         "coveredPerson": "Self", "autoCreateExpense": False, "createdAt": ts()},
        # ULIP
        {"id": uid(), "userId": USER_ID, "insuranceType": "Life Insurance",
         "policyName": "ICICI Pru Signature ULIP", "coverageAmount": 1500000,
         "premiumAmount": 50000, "premiumFrequency": "Yearly", "premiumPaymentTerm": "10 Years",
         "startDate": "2022-01-15", "endDate": "2037-01-15", "premiumEndDate": "2032-01-15",
         "maturityType": "Market Linked", "expectedMaturityAmount": 900000,
         "coveredPerson": "Self", "autoCreateExpense": False, "createdAt": ts()},
        # Health Insurance
        {"id": uid(), "userId": USER_ID, "insuranceType": "Health Insurance",
         "policyName": "Star Health Family Floater", "coverageAmount": 1000000,
         "premiumAmount": 25000, "premiumFrequency": "Yearly", "premiumPaymentTerm": "Till Maturity",
         "startDate": "2023-07-01", "endDate": "2024-07-01",
         "coveredPerson": "Family", "autoCreateExpense": False, "createdAt": ts()},
        # Motor Insurance
        {"id": uid(), "userId": USER_ID, "insuranceType": "Motor Insurance",
         "policyName": "HDFC Ergo Car Insurance", "coverageAmount": 1450000,
         "premiumAmount": 12000, "premiumFrequency": "Yearly",
         "startDate": "2025-03-01", "endDate": "2026-03-01",
         "autoCreateExpense": False, "createdAt": ts()},
    ]
    await db.insurances.insert_many(insurances)
    print(f"✅ {len(insurances)} insurance policies")

    # ========== 10. GAMIFICATION PROFILE ==========
    gam_profile = {
        "userId": USER_ID, "level": 1, "xp": 0, "streak": 0,
        "lastActiveDate": TODAY, "createdAt": ts()
    }
    await db.user_gamification_profile.insert_one(gam_profile)
    print("✅ Gamification profile initialized")

    # ========== SUMMARY ==========
    total_monthly_income = 185000 + 45000 + 25000 + 18000 + (48000/12) + (15000/3)
    total_monthly_fixed = sum(e["expectedAmount"] for e in expenses if e["expenseType"] == "Fixed" and e["frequency"] == "Monthly")
    total_monthly_fixed += sum(e["expectedAmount"]/3 for e in expenses if e["expenseType"] == "Fixed" and e["frequency"] == "Quarterly")
    total_monthly_fixed += sum(e["expectedAmount"]/12 for e in expenses if e["expenseType"] == "Fixed" and e["frequency"] == "Yearly")
    total_monthly_fixed += sum(e["emiAmount"] for e in loans if e.get("autoCreateExpense"))

    bank_balance = sum(a["currentBalance"] for a in accounts)
    
    print(f"\n{'='*50}")
    print(f"📊 SEED DATA SUMMARY")
    print(f"{'='*50}")
    print(f"User: Rahul Sharma ({USER_ID})")
    print(f"Login: test@moneyssutra.com / test (or username: test)")
    print(f"")
    print(f"Monthly Income:    ₹{total_monthly_income:>12,.0f}")
    print(f"Monthly Fixed Exp: ₹{total_monthly_fixed:>12,.0f}")
    print(f"Total EMI/month:   ₹{total_emi:>12,.0f}")
    print(f"Bank Balance:      ₹{bank_balance:>12,.0f}")
    print(f"Total Investments: ₹{total_inv:>12,.0f}")
    print(f"Total Assets:      ₹{total_assets:>12,.0f}")
    print(f"Total Debt:        ₹{total_debt:>12,.0f}")
    print(f"CC Outstanding:    ₹{total_cc_outstanding:>12,.0f}")
    print(f"Life Cover:        ₹{sum(i['coverageAmount'] for i in insurances if i['insuranceType'] in ['Term Insurance', 'Life Insurance']):>12,.0f}")
    print(f"Health Cover:      ₹{sum(i['coverageAmount'] for i in insurances if i['insuranceType'] == 'Health Insurance'):>12,.0f}")
    print(f"{'='*50}")
    
    client.close()

asyncio.run(seed())
