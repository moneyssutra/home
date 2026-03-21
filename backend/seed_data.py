"""Seed script to populate test data for moneyssutra@gmail.com user."""
import asyncio
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = "mongodb+srv://moneyssutra_user:psK92QMcqOqBsBpq@cluster0.oqrmi6o.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
DB_NAME = "moneyssutra_prod"

USER_ID = "user_50103ba5a65a"
WIFE_USER_ID = "user_wife_" + str(uuid.uuid4())[:8]
NOW = datetime.now(timezone.utc).isoformat()


def uid():
    return str(uuid.uuid4())


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # ============================================================
    # 1. PROFILE - Fill personal details
    # ============================================================
    await db.user_profiles.update_one(
        {"userId": USER_ID},
        {"$set": {
            "userId": USER_ID,
            "basic": {
                "firstName": "Rahul",
                "middleName": "Kumar",
                "lastName": "Sharma",
                "mobile": "9876543210",
                "sex": "Male",
                "dateOfBirth": "1990-05-15"
            },
            "extended": {
                "occupation": "Software Engineer",
                "industry": "Technology",
                "employerName": "Infosys Ltd",
                "annualIncome": 2400000,
                "panNumber": "ABCDE1234F",
                "aadhaarLast4": "6789",
                "city": "Bangalore",
                "state": "Karnataka",
                "country": "India",
                "taxFilingStatus": "Old Regime",
                "riskAppetite": "Moderate",
                "maritalStatus": "Married",
                "dependents": 2,
                "employmentType": "Salaried"
            },
            "updatedAt": NOW
        }},
        upsert=True
    )
    print("Profile updated")

    # ============================================================
    # 2. INCOME SOURCES - 1 for each type
    # ============================================================
    income_types = [
        {"type": "Job", "name": "Infosys Salary", "expectedAmount": 200000, "frequency": "Monthly", "selectedDate": "1", "incomeType": "fixed", "profession": "Software Engineer"},
        {"type": "Business", "name": "Freelance Web Dev", "expectedAmount": 50000, "frequency": "Monthly", "selectedDate": "15", "incomeType": "variable"},
        {"type": "Rental", "name": "Koramangala Flat Rent", "expectedAmount": 25000, "frequency": "Monthly", "selectedDate": "5", "incomeType": "fixed", "tenantName": "Amit Patel"},
        {"type": "Interest", "name": "FD Interest Payout", "expectedAmount": 8000, "frequency": "Quarterly", "selectedQuarter": "Q1", "incomeType": "fixed", "principal": 1200000, "rate": 7.5},
        {"type": "Dividend", "name": "HDFC Bank Dividend", "expectedAmount": 5000, "frequency": "Half-Yearly", "selectedHalf": "H1", "incomeType": "variable"},
        {"type": "Pension", "name": "Father's Pension", "expectedAmount": 15000, "frequency": "Monthly", "selectedDate": "1", "incomeType": "fixed"},
        {"type": "Commission", "name": "Insurance Referral Commission", "expectedAmount": 10000, "frequency": "Monthly", "selectedDate": "20", "incomeType": "variable"},
        {"type": "Royalty", "name": "eBook Royalties", "expectedAmount": 3000, "frequency": "Monthly", "selectedDate": "28", "incomeType": "variable"},
        {"type": "Gift", "name": "Diwali Gift from Parents", "expectedAmount": 50000, "frequency": "Yearly", "selectedMonth": "November", "incomeType": "fixed"},
        {"type": "Other", "name": "YouTube Channel Revenue", "expectedAmount": 8000, "frequency": "Monthly", "selectedDate": "25", "incomeType": "variable"},
    ]
    await db.income_sources.delete_many({"userId": USER_ID})
    for inc in income_types:
        doc = {"id": uid(), "userId": USER_ID, "createdAt": NOW, "source": "seed", **inc}
        await db.income_sources.insert_one(doc)
    print(f"Income sources: {len(income_types)} added")

    # ============================================================
    # 3. EXPENSES - 1 for each type/category
    # ============================================================
    expenses = [
        {"expenseName": "House Rent", "expenseType": "Fixed", "category": "Housing", "expectedAmount": 30000, "frequency": "Monthly", "selectedDate": "1"},
        {"expenseName": "Electricity Bill", "expenseType": "Fixed", "category": "Utilities", "expectedAmount": 3500, "frequency": "Monthly", "selectedDate": "10"},
        {"expenseName": "Mobile & Internet", "expenseType": "Fixed", "category": "Utilities", "expectedAmount": 1500, "frequency": "Monthly", "selectedDate": "15"},
        {"expenseName": "Netflix + Hotstar", "expenseType": "Fixed", "category": "Entertainment", "expectedAmount": 1200, "frequency": "Monthly", "selectedDate": "5"},
        {"expenseName": "Gym Membership", "expenseType": "Fixed", "category": "Health", "expectedAmount": 3000, "frequency": "Monthly", "selectedDate": "1"},
        {"expenseName": "Car Insurance Premium", "expenseType": "Fixed", "category": "Insurance", "expectedAmount": 12000, "frequency": "Yearly", "selectedMonth": "June"},
        {"expenseName": "Society Maintenance", "expenseType": "Fixed", "category": "Housing", "expectedAmount": 5500, "frequency": "Monthly", "selectedDate": "1"},
        {"expenseName": "Child School Fees", "expenseType": "Fixed", "category": "Education", "expectedAmount": 25000, "frequency": "Quarterly", "selectedQuarter": "Q1"},
        {"expenseName": "Groceries", "expenseType": "Variable", "category": "Food", "expectedAmount": 12000, "frequency": "Monthly", "selectedDate": "1"},
        {"expenseName": "Dining Out", "expenseType": "Variable", "category": "Food", "expectedAmount": 5000, "frequency": "Monthly", "selectedDate": "15"},
        {"expenseName": "Petrol", "expenseType": "Variable", "category": "Transport", "expectedAmount": 6000, "frequency": "Monthly", "selectedDate": "1"},
        {"expenseName": "Shopping & Clothing", "expenseType": "Variable", "category": "Lifestyle", "expectedAmount": 5000, "frequency": "Monthly", "selectedDate": "20"},
        {"expenseName": "Medical & Pharmacy", "expenseType": "Variable", "category": "Health", "expectedAmount": 3000, "frequency": "Monthly", "selectedDate": "1"},
        {"expenseName": "Vacation Fund", "expenseType": "Variable", "category": "Travel", "expectedAmount": 10000, "frequency": "Monthly", "selectedDate": "1"},
        {"expenseName": "Gifts & Donations", "expenseType": "Variable", "category": "Miscellaneous", "expectedAmount": 2000, "frequency": "Monthly", "selectedDate": "15"},
    ]
    await db.expenses.delete_many({"userId": USER_ID})
    for exp in expenses:
        doc = {"id": uid(), "userId": USER_ID, "createdAt": NOW, "isPaid": False, **exp}
        await db.expenses.insert_one(doc)
    print(f"Expenses: {len(expenses)} added")

    # ============================================================
    # 4. ASSETS - 1 for each type
    # ============================================================
    assets = [
        {"assetType": "Residential Property", "assetName": "3BHK Koramangala", "purchaseValue": 8500000, "currentValue": 12000000, "purchaseDate": "2018-06-15", "location": "Koramangala, Bangalore", "generatesIncome": True, "incomeAmount": 25000, "incomeFrequency": "Monthly"},
        {"assetType": "Commercial Property", "assetName": "Office Space MG Road", "purchaseValue": 4500000, "currentValue": 6200000, "purchaseDate": "2020-01-10", "location": "MG Road, Bangalore"},
        {"assetType": "Land / Plot", "assetName": "Agricultural Land Mysuru", "purchaseValue": 1500000, "currentValue": 2500000, "purchaseDate": "2019-03-20", "location": "Mysuru, Karnataka"},
        {"assetType": "Vehicle", "assetName": "Hyundai Creta 2023", "purchaseValue": 1800000, "currentValue": 1400000, "purchaseDate": "2023-09-01", "depreciationType": "Straight Line", "isInsured": True},
        {"assetType": "Vehicle", "assetName": "Honda Activa 6G", "purchaseValue": 110000, "currentValue": 75000, "purchaseDate": "2022-03-15", "depreciationType": "Straight Line"},
        {"assetType": "Gold / Jewellery", "assetName": "Gold Necklace Set", "purchaseValue": 350000, "currentValue": 520000, "purchaseDate": "2020-11-01"},
        {"assetType": "Gold / Jewellery", "assetName": "Gold Coins (50g)", "purchaseValue": 250000, "currentValue": 380000, "purchaseDate": "2021-04-14"},
        {"assetType": "Equipment / Machinery", "assetName": "MacBook Pro M3", "purchaseValue": 250000, "currentValue": 180000, "purchaseDate": "2024-01-10", "depreciationType": "Straight Line"},
        {"assetType": "Collectibles / Art", "assetName": "MF Husain Print Collection", "purchaseValue": 80000, "currentValue": 120000, "purchaseDate": "2021-08-15"},
        {"assetType": "Other", "assetName": "Intellectual Property - Patent", "purchaseValue": 50000, "currentValue": 200000, "purchaseDate": "2022-06-01"},
    ]
    await db.assets.delete_many({"userId": USER_ID})
    for asset in assets:
        doc = {"id": uid(), "userId": USER_ID, "createdAt": NOW, **asset}
        await db.assets.insert_one(doc)
    print(f"Assets: {len(assets)} added")

    # ============================================================
    # 5. INVESTMENTS - 1 for each category
    # ============================================================
    investments = [
        {"investmentCategory": "Mutual Fund", "investmentMode": "SIP", "name": "Axis Bluechip Fund", "principal": 240000, "currentValue": 285000, "startDate": "2023-01-01", "sipAmount": 10000, "investmentFrequency": "Monthly", "sipSelectedDate": "5", "returnRate": 14.5},
        {"investmentCategory": "Mutual Fund", "investmentMode": "Lump Sum", "name": "HDFC Mid-Cap Opportunities", "principal": 500000, "currentValue": 620000, "startDate": "2022-06-15", "returnRate": 18.2},
        {"investmentCategory": "Stocks", "investmentMode": "Growth Only", "name": "Reliance Industries", "principal": 200000, "currentValue": 310000, "startDate": "2021-03-10", "quantity": 80, "unitPrice": 2500, "currentPrice": 3875, "returnRate": 22.5},
        {"investmentCategory": "Stocks", "investmentMode": "Dividend", "name": "HDFC Bank Ltd", "principal": 150000, "currentValue": 185000, "startDate": "2022-01-20", "quantity": 100, "unitPrice": 1500, "currentPrice": 1850, "returnRate": 12.0},
        {"investmentCategory": "PPF", "investmentMode": "SIP", "name": "PPF Account SBI", "principal": 750000, "currentValue": 920000, "startDate": "2018-04-01", "sipAmount": 12500, "investmentFrequency": "Monthly", "sipSelectedDate": "1", "returnRate": 7.1, "maturityDate": "2033-04-01", "lockInPeriod": 15},
        {"investmentCategory": "NPS", "investmentMode": "SIP", "name": "NPS Tier 1 - Equity", "principal": 500000, "currentValue": 620000, "startDate": "2020-01-01", "sipAmount": 5000, "investmentFrequency": "Monthly", "sipSelectedDate": "10", "returnRate": 12.0},
        {"investmentCategory": "Fixed Deposit", "investmentMode": "Lump Sum", "name": "SBI FD 3-Year", "principal": 1200000, "currentValue": 1380000, "startDate": "2024-01-15", "returnRate": 7.5, "maturityDate": "2027-01-15", "compoundingFrequency": "Quarterly"},
        {"investmentCategory": "Recurring Deposit", "investmentMode": "SIP", "name": "ICICI RD", "principal": 120000, "currentValue": 128000, "startDate": "2025-01-01", "sipAmount": 10000, "investmentFrequency": "Monthly", "sipSelectedDate": "1", "returnRate": 6.8, "maturityDate": "2026-01-01"},
        {"investmentCategory": "Digital Gold", "investmentMode": "SIP", "name": "Paytm Digital Gold", "principal": 30000, "currentValue": 34500, "startDate": "2025-06-01", "sipAmount": 2000, "investmentFrequency": "Monthly", "sipSelectedDate": "15", "returnRate": 10.0},
        {"investmentCategory": "Sovereign Gold Bond (SGB)", "investmentMode": "Lump Sum", "name": "SGB 2023-24 Series IV", "principal": 200000, "currentValue": 240000, "startDate": "2023-12-15", "returnRate": 2.5, "maturityDate": "2031-12-15", "quantity": 30, "unitPrice": 6667},
        {"investmentCategory": "US Stocks", "investmentMode": "Growth Only", "name": "Apple Inc (AAPL)", "principal": 300000, "currentValue": 420000, "startDate": "2022-09-01", "quantity": 15, "unitPrice": 20000, "currentPrice": 28000, "returnRate": 20.0},
        {"investmentCategory": "Crypto", "investmentMode": "Growth Only", "name": "Bitcoin (BTC)", "principal": 100000, "currentValue": 180000, "startDate": "2023-01-01", "quantity": 0.012, "returnRate": 80.0},
        {"investmentCategory": "Real Estate Fund", "investmentMode": "Lump Sum", "name": "Embassy REIT", "principal": 200000, "currentValue": 225000, "startDate": "2023-06-01", "quantity": 500, "unitPrice": 400, "currentPrice": 450, "returnRate": 8.5},
        {"investmentCategory": "Bonds", "investmentMode": "Lump Sum", "name": "NHAI Bond 7.15%", "principal": 500000, "currentValue": 540000, "startDate": "2022-03-01", "returnRate": 7.15, "maturityDate": "2032-03-01"},
        {"investmentCategory": "ELSS", "investmentMode": "SIP", "name": "Mirae Asset Tax Saver", "principal": 150000, "currentValue": 195000, "startDate": "2023-04-01", "sipAmount": 12500, "investmentFrequency": "Monthly", "sipSelectedDate": "5", "returnRate": 16.0, "lockInPeriod": 3},
        {"investmentCategory": "Loan Given", "investmentMode": "Lump Sum", "name": "Loan to Suresh", "principal": 200000, "currentValue": 200000, "startDate": "2025-09-01", "borrowerName": "Suresh Kumar", "borrowerContact": "9988776655", "interestType": "simple", "returnRate": 12.0, "agreedReturnAmount": 224000, "repaymentType": "fixed", "repaymentFrequency": "Monthly", "installmentAmount": 18667, "dueDate": "2026-09-01", "amountReceived": 56000, "outstandingAmount": 144000, "loanStatus": "active"},
    ]
    await db.investments.delete_many({"userId": USER_ID})
    for inv in investments:
        doc = {"id": uid(), "userId": USER_ID, "createdAt": NOW, **inv}
        await db.investments.insert_one(doc)
    print(f"Investments: {len(investments)} added")

    # ============================================================
    # 6. BANK ACCOUNTS - 5 different banks
    # ============================================================
    accounts = [
        {"accountName": "SBI Savings Account", "accountType": "Savings", "currentBalance": 245000, "openingBalance": 100000, "accountNumber": "XXXX6789", "isPrimary": True},
        {"accountName": "HDFC Salary Account", "accountType": "Savings", "currentBalance": 520000, "openingBalance": 200000, "accountNumber": "XXXX4321"},
        {"accountName": "ICICI Current Account", "accountType": "Bank Account", "currentBalance": 180000, "openingBalance": 50000, "accountNumber": "XXXX8765"},
        {"accountName": "Kotak 811 Account", "accountType": "Savings", "currentBalance": 35000, "openingBalance": 10000, "accountNumber": "XXXX2345"},
        {"accountName": "Axis Bank Joint Account", "accountType": "Savings", "currentBalance": 890000, "openingBalance": 500000, "accountNumber": "XXXX9012", "notes": "Joint with wife"},
    ]
    await db.accounts.delete_many({"userId": USER_ID})
    for acc in accounts:
        doc = {"id": uid(), "userId": USER_ID, "createdAt": NOW, **acc}
        await db.accounts.insert_one(doc)
    print(f"Accounts: {len(accounts)} added")

    # ============================================================
    # 7. CREDIT CARDS - 3 different
    # ============================================================
    credit_cards = [
        {"cardName": "HDFC Regalia Gold", "bankName": "HDFC", "creditLimit": 500000, "outstandingAmount": 45000, "billingDate": 15, "dueDate": 5, "minimumDue": 4500, "interestRate": 42.0},
        {"cardName": "SBI Simply Click", "bankName": "SBI", "creditLimit": 200000, "outstandingAmount": 18500, "billingDate": 20, "dueDate": 10, "minimumDue": 1850, "interestRate": 39.6},
        {"cardName": "Axis Flipkart Card", "bankName": "Axis", "creditLimit": 300000, "outstandingAmount": 72000, "billingDate": 1, "dueDate": 21, "minimumDue": 7200, "interestRate": 40.2},
    ]
    await db.credit_cards.delete_many({"userId": USER_ID})
    for cc in credit_cards:
        doc = {"id": uid(), "userId": USER_ID, "createdAt": NOW, **cc}
        await db.credit_cards.insert_one(doc)
    print(f"Credit Cards: {len(credit_cards)} added")

    # ============================================================
    # 8. LOANS - each and every type
    # ============================================================
    loans = [
        {"loanType": "Home Loan", "loanName": "SBI Home Loan - 3BHK", "lenderName": "State Bank of India", "principalAmount": 6000000, "outstandingAmount": 4200000, "interestRate": 8.5, "emiAmount": 52000, "emiFrequency": "Monthly", "tenureMonths": 240, "startDate": "2018-06-15", "endDate": "2038-06-15", "emiSelectedDate": "5", "autoCreateExpense": True},
        {"loanType": "Car Loan", "loanName": "HDFC Car Loan - Creta", "lenderName": "HDFC Bank", "principalAmount": 1200000, "outstandingAmount": 650000, "interestRate": 9.2, "emiAmount": 25000, "emiFrequency": "Monthly", "tenureMonths": 60, "startDate": "2023-09-01", "endDate": "2028-09-01", "emiSelectedDate": "10", "autoCreateExpense": True},
        {"loanType": "Personal Loan", "loanName": "ICICI Personal Loan", "lenderName": "ICICI Bank", "principalAmount": 500000, "outstandingAmount": 180000, "interestRate": 12.0, "emiAmount": 18000, "emiFrequency": "Monthly", "tenureMonths": 36, "startDate": "2024-01-15", "endDate": "2027-01-15", "emiSelectedDate": "15", "autoCreateExpense": True},
        {"loanType": "Education Loan", "loanName": "BoB Education Loan", "lenderName": "Bank of Baroda", "principalAmount": 800000, "outstandingAmount": 520000, "interestRate": 7.5, "emiAmount": 15000, "emiFrequency": "Monthly", "tenureMonths": 84, "startDate": "2020-07-01", "endDate": "2027-07-01", "emiSelectedDate": "1"},
        {"loanType": "Gold Loan", "loanName": "Muthoot Gold Loan", "lenderName": "Muthoot Finance", "principalAmount": 300000, "outstandingAmount": 250000, "interestRate": 10.5, "emiAmount": 12000, "emiFrequency": "Monthly", "tenureMonths": 36, "startDate": "2025-06-01", "endDate": "2028-06-01", "emiSelectedDate": "20"},
        {"loanType": "Business Loan", "loanName": "Bajaj Business Loan", "lenderName": "Bajaj Finserv", "principalAmount": 1000000, "outstandingAmount": 780000, "interestRate": 14.0, "emiAmount": 35000, "emiFrequency": "Monthly", "tenureMonths": 36, "startDate": "2025-01-01", "endDate": "2028-01-01", "emiSelectedDate": "1"},
        {"loanType": "Two-Wheeler Loan", "loanName": "Bajaj Two-Wheeler EMI", "lenderName": "Bajaj Finance", "principalAmount": 80000, "outstandingAmount": 25000, "interestRate": 11.0, "emiAmount": 3500, "emiFrequency": "Monthly", "tenureMonths": 24, "startDate": "2024-03-15", "endDate": "2026-03-15", "emiSelectedDate": "15"},
        {"loanType": "Credit Card Loan", "loanName": "HDFC CC EMI Conversion", "lenderName": "HDFC Bank", "principalAmount": 100000, "outstandingAmount": 40000, "interestRate": 15.0, "emiAmount": 9000, "emiFrequency": "Monthly", "tenureMonths": 12, "startDate": "2025-08-01", "endDate": "2026-08-01", "emiSelectedDate": "5"},
        {"loanType": "Mortgage Loan", "loanName": "PNB Plot Mortgage", "lenderName": "Punjab National Bank", "principalAmount": 2000000, "outstandingAmount": 1600000, "interestRate": 9.0, "emiAmount": 30000, "emiFrequency": "Monthly", "tenureMonths": 120, "startDate": "2023-01-01", "endDate": "2033-01-01", "emiSelectedDate": "1"},
        {"loanType": "Other", "loanName": "Friend Loan (Ravi)", "lenderName": "Ravi Shankar", "principalAmount": 100000, "outstandingAmount": 60000, "interestRate": 0, "emiAmount": 10000, "emiFrequency": "Monthly", "tenureMonths": 12, "startDate": "2025-10-01", "endDate": "2026-10-01", "emiSelectedDate": "25"},
    ]
    await db.loans.delete_many({"userId": USER_ID})
    for loan in loans:
        doc = {"id": uid(), "userId": USER_ID, "createdAt": NOW, **loan}
        await db.loans.insert_one(doc)
    print(f"Loans: {len(loans)} added")

    # ============================================================
    # 9. INSURANCE
    # ============================================================
    insurances = [
        {"insuranceType": "Life Insurance", "policyName": "LIC Jeevan Anand", "coverageAmount": 5000000, "premiumAmount": 25000, "premiumFrequency": "Yearly", "startDate": "2019-04-01", "endDate": "2049-04-01", "premiumPaymentDate": "5", "coveredPerson": "Self", "maturityType": "Endowment", "expectedMaturityAmount": 3000000},
        {"insuranceType": "Health Insurance", "policyName": "Star Health Family Floater", "coverageAmount": 1000000, "premiumAmount": 18000, "premiumFrequency": "Yearly", "startDate": "2022-01-01", "endDate": "2027-01-01", "premiumPaymentDate": "10", "coveredPerson": "Family"},
        {"insuranceType": "Term Insurance", "policyName": "HDFC Click2Protect", "coverageAmount": 10000000, "premiumAmount": 12000, "premiumFrequency": "Yearly", "startDate": "2020-06-01", "endDate": "2050-06-01", "premiumPaymentDate": "15", "coveredPerson": "Self"},
        {"insuranceType": "Vehicle Insurance", "policyName": "Bajaj Allianz Car Insurance", "coverageAmount": 1800000, "premiumAmount": 12000, "premiumFrequency": "Yearly", "startDate": "2025-09-01", "endDate": "2026-09-01", "premiumPaymentDate": "1", "coveredPerson": "Self"},
    ]
    await db.insurances.delete_many({"userId": USER_ID})
    for ins in insurances:
        doc = {"id": uid(), "userId": USER_ID, "createdAt": NOW, **ins}
        await db.insurances.insert_one(doc)
    print(f"Insurance: {len(insurances)} added")

    # ============================================================
    # 10. WIFE ACCOUNT + FAMILY + DEPENDENTS
    # ============================================================
    wife_user = {
        "user_id": WIFE_USER_ID,
        "email": "priya.sharma@gmail.com",
        "name": "Priya Sharma",
        "phone": "9876543211",
        "auth_type": "google",
        "createdAt": NOW
    }
    await db.users.update_one({"email": "priya.sharma@gmail.com"}, {"$set": wife_user}, upsert=True)
    print("Wife user created")

    await db.user_profiles.update_one(
        {"userId": WIFE_USER_ID},
        {"$set": {
            "userId": WIFE_USER_ID,
            "basic": {"firstName": "Priya", "middleName": "", "lastName": "Sharma", "mobile": "9876543211", "sex": "Female", "dateOfBirth": "1992-08-22"},
            "extended": {"occupation": "Interior Designer", "industry": "Design", "employerName": "Self Employed", "annualIncome": 1200000, "panNumber": "FGHIJ5678K", "aadhaarLast4": "1234", "city": "Bangalore", "state": "Karnataka", "country": "India", "taxFilingStatus": "Old Regime", "riskAppetite": "Conservative", "maritalStatus": "Married", "dependents": 2, "employmentType": "Self Employed"},
            "updatedAt": NOW
        }},
        upsert=True
    )

    wife_incomes = [
        {"type": "Business", "name": "Interior Design Projects", "expectedAmount": 100000, "frequency": "Monthly", "selectedDate": "10", "incomeType": "variable"},
        {"type": "Interest", "name": "RD Interest", "expectedAmount": 2000, "frequency": "Monthly", "selectedDate": "1", "incomeType": "fixed", "principal": 500000, "rate": 6.5},
    ]
    await db.income_sources.delete_many({"userId": WIFE_USER_ID})
    for inc in wife_incomes:
        await db.income_sources.insert_one({"id": uid(), "userId": WIFE_USER_ID, "createdAt": NOW, "source": "seed", **inc})

    wife_expenses = [
        {"expenseName": "Studio Rent", "expenseType": "Fixed", "category": "Business", "expectedAmount": 15000, "frequency": "Monthly", "selectedDate": "1"},
        {"expenseName": "Kids Activities", "expenseType": "Variable", "category": "Education", "expectedAmount": 8000, "frequency": "Monthly", "selectedDate": "5"},
        {"expenseName": "Personal Care", "expenseType": "Variable", "category": "Lifestyle", "expectedAmount": 5000, "frequency": "Monthly", "selectedDate": "15"},
    ]
    await db.expenses.delete_many({"userId": WIFE_USER_ID})
    for exp in wife_expenses:
        await db.expenses.insert_one({"id": uid(), "userId": WIFE_USER_ID, "createdAt": NOW, "isPaid": False, **exp})

    wife_accounts = [
        {"accountName": "HDFC Women's Savings", "accountType": "Savings", "currentBalance": 320000, "openingBalance": 100000, "accountNumber": "XXXX7777", "isPrimary": True},
        {"accountName": "Kotak Mahila Account", "accountType": "Savings", "currentBalance": 85000, "openingBalance": 50000, "accountNumber": "XXXX3333"},
    ]
    await db.accounts.delete_many({"userId": WIFE_USER_ID})
    for acc in wife_accounts:
        await db.accounts.insert_one({"id": uid(), "userId": WIFE_USER_ID, "createdAt": NOW, **acc})

    wife_investments = [
        {"investmentCategory": "Mutual Fund", "investmentMode": "SIP", "name": "SBI Small Cap Fund", "principal": 120000, "currentValue": 155000, "startDate": "2023-06-01", "sipAmount": 5000, "investmentFrequency": "Monthly", "sipSelectedDate": "10", "returnRate": 18.0},
        {"investmentCategory": "PPF", "investmentMode": "SIP", "name": "PPF Account PNB", "principal": 300000, "currentValue": 360000, "startDate": "2020-04-01", "sipAmount": 5000, "investmentFrequency": "Monthly", "sipSelectedDate": "1", "returnRate": 7.1},
        {"investmentCategory": "Fixed Deposit", "investmentMode": "Lump Sum", "name": "HDFC FD 2-Year", "principal": 500000, "currentValue": 550000, "startDate": "2025-01-01", "returnRate": 7.0, "maturityDate": "2027-01-01"},
    ]
    await db.investments.delete_many({"userId": WIFE_USER_ID})
    for inv in wife_investments:
        await db.investments.insert_one({"id": uid(), "userId": WIFE_USER_ID, "createdAt": NOW, **inv})

    wife_assets = [
        {"assetType": "Gold / Jewellery", "assetName": "Wedding Jewellery Set", "purchaseValue": 800000, "currentValue": 1200000, "purchaseDate": "2018-11-15"},
        {"assetType": "Vehicle", "assetName": "Maruti Swift 2024", "purchaseValue": 850000, "currentValue": 720000, "purchaseDate": "2024-02-10", "depreciationType": "Straight Line"},
    ]
    await db.assets.delete_many({"userId": WIFE_USER_ID})
    for asset in wife_assets:
        await db.assets.insert_one({"id": uid(), "userId": WIFE_USER_ID, "createdAt": NOW, **asset})

    wife_cc = [{"cardName": "Amazon Pay ICICI", "bankName": "ICICI", "creditLimit": 150000, "outstandingAmount": 12000, "billingDate": 10, "dueDate": 1, "minimumDue": 1200, "interestRate": 36.0}]
    await db.credit_cards.delete_many({"userId": WIFE_USER_ID})
    for cc in wife_cc:
        await db.credit_cards.insert_one({"id": uid(), "userId": WIFE_USER_ID, "createdAt": NOW, **cc})

    wife_loans = [{"loanType": "Personal Loan", "loanName": "Bajaj Personal Loan", "lenderName": "Bajaj Finserv", "principalAmount": 200000, "outstandingAmount": 120000, "interestRate": 13.0, "emiAmount": 8500, "emiFrequency": "Monthly", "tenureMonths": 24, "startDate": "2025-03-01", "endDate": "2027-03-01", "emiSelectedDate": "10"}]
    await db.loans.delete_many({"userId": WIFE_USER_ID})
    for loan in wife_loans:
        await db.loans.insert_one({"id": uid(), "userId": WIFE_USER_ID, "createdAt": NOW, **loan})

    wife_insurance = [{"insuranceType": "Health Insurance", "policyName": "Niva Bupa Health", "coverageAmount": 500000, "premiumAmount": 8000, "premiumFrequency": "Yearly", "startDate": "2023-01-01", "endDate": "2028-01-01", "premiumPaymentDate": "15", "coveredPerson": "Self"}]
    await db.insurances.delete_many({"userId": WIFE_USER_ID})
    for ins in wife_insurance:
        await db.insurances.insert_one({"id": uid(), "userId": WIFE_USER_ID, "createdAt": NOW, **ins})

    print("Wife data seeded")

    # Family group
    await db.families.delete_many({"createdBy": USER_ID})
    family = {
        "id": uid(),
        "familyName": "Sharma Family",
        "createdBy": USER_ID,
        "members": [
            {"id": USER_ID, "name": "Rahul Sharma", "relationship": "Self", "email": "moneyssutra@gmail.com", "role": "owner", "joinedAt": NOW},
            {"id": WIFE_USER_ID, "name": "Priya Sharma", "relationship": "Wife", "email": "priya.sharma@gmail.com", "phone": "9876543211", "role": "admin", "joinedAt": NOW},
            {"id": "dep_" + uid()[:8], "name": "Aarav Sharma", "relationship": "Son", "phone": "N/A", "role": "viewer", "joinedAt": NOW, "notes": "Age 6, School: DPS Bangalore"},
            {"id": "dep_" + uid()[:8], "name": "Ananya Sharma", "relationship": "Daughter", "phone": "N/A", "role": "viewer", "joinedAt": NOW, "notes": "Age 3, Playschool"},
        ],
        "inviteCode": str(uuid.uuid4())[:8].upper(),
        "createdAt": NOW
    }
    await db.families.insert_one(family)

    # Wife session
    wife_session_token = str(uuid.uuid4())
    await db.user_sessions.insert_one({
        "user_id": WIFE_USER_ID, "email": "priya.sharma@gmail.com", "name": "Priya Sharma",
        "session_token": wife_session_token, "expires_at": "2026-12-31T23:59:59.000000+00:00",
        "auth_type": "seed", "created_at": NOW
    })

    print("\n" + "="*60)
    print("SEED COMPLETE!")
    print("="*60)
    print(f"User: moneyssutra@gmail.com ({USER_ID})")
    print(f"  Income: {len(income_types)} | Expenses: {len(expenses)} | Assets: {len(assets)}")
    print(f"  Investments: {len(investments)} | Accounts: {len(accounts)} | CCs: {len(credit_cards)}")
    print(f"  Loans: {len(loans)} | Insurance: {len(insurances)}")
    print(f"\nWife: priya.sharma@gmail.com ({WIFE_USER_ID})")
    print(f"  Income: 2 | Expenses: 3 | Accounts: 2 | Investments: 3")
    print(f"  Assets: 2 | CC: 1 | Loans: 1 | Insurance: 1")
    print(f"\nFamily: Sharma Family (4 members)")
    print(f"  Rahul (Self) + Priya (Wife) + Aarav (Son, 6) + Ananya (Daughter, 3)")
    print(f"\nWife session: {wife_session_token}")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
