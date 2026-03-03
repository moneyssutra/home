"""
Migration script: Extract data from old production and import into moneyssutra_prod
"""
import json
import requests
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

SESSION = "70be672c-b0d4-4408-8624-9698629e1f25"
OLD_PROD = "https://goal-tracker-prod.emergent.host"
HEADERS = {"Authorization": f"Bearer {SESSION}"}

client = MongoClient(os.environ["MONGO_URL"])
prod_db = client["moneyssutra_prod"]

USER_ID = "user_fc4345c6073d"

def fetch(endpoint):
    try:
        r = requests.get(f"{OLD_PROD}/api/{endpoint}", headers=HEADERS, timeout=15)
        if r.status_code == 200:
            return r.json()
        return None
    except:
        return None

def insert_many_safe(collection_name, docs):
    if docs and isinstance(docs, list) and len(docs) > 0:
        prod_db[collection_name].insert_many(docs)
        print(f"  Inserted {len(docs)} docs into {collection_name}")
    else:
        print(f"  Skipped {collection_name} (no data)")

def insert_one_safe(collection_name, doc):
    if doc and isinstance(doc, dict):
        prod_db[collection_name].insert_one(doc)
        print(f"  Inserted 1 doc into {collection_name}")
    else:
        print(f"  Skipped {collection_name} (no data)")

print("=== MIGRATING USER DATA TO moneyssutra_prod ===\n")

# 1. User account
print("1. Creating user account...")
user_doc = {
    "user_id": USER_ID,
    "email": "chandrashekhar.iter@gmail.com",
    "name": "chandra shekhar",
    "firstName": "chandra",
    "middleName": "",
    "lastName": "shekhar",
    "picture": "https://lh3.googleusercontent.com/a/ACg8ocJTi-5do67FrSQtiiX4MJKPk2wOEHfxn6v6Vy5c_YSGq6Qtng=s96-c",
    "auth_type": "google",
    "has_password": True,
}
existing = prod_db.users.find_one({"email": "chandrashekhar.iter@gmail.com"})
if not existing:
    insert_one_safe("users", user_doc)
else:
    print("  User already exists, skipping")

# 2. Basic profile
print("2. Migrating basic profile...")
profile_data = fetch("basic-profile")
if profile_data:
    profile_data["userId"] = USER_ID
    insert_one_safe("basic_profiles", profile_data)

# 3. Assets
print("3. Migrating assets...")
assets = fetch("assets")
insert_many_safe("assets", assets)

# 4. Investments
print("4. Migrating investments...")
investments = fetch("investments")
insert_many_safe("investments", investments)

# 5. Loans
print("5. Migrating loans...")
loans = fetch("loans")
insert_many_safe("loans", loans)

# 6. Expenses
print("6. Migrating expenses...")
expenses = fetch("expenses")
insert_many_safe("expenses", expenses)

# 7. Income sources
print("7. Migrating income sources...")
income = fetch("income")
insert_many_safe("income_sources", income)

# 8. Accounts
print("8. Migrating accounts...")
accounts = fetch("accounts")
insert_many_safe("accounts", accounts)

# 9. Credit Cards
print("9. Migrating credit cards...")
credit_cards = fetch("credit-cards")
insert_many_safe("credit_cards", credit_cards)

# 10. Insurances
print("10. Migrating insurances...")
insurances = fetch("insurances")
insert_many_safe("insurances", insurances)

# 11. Goals
print("11. Migrating goals...")
goals = fetch("goals")
insert_many_safe("goals", goals)

print("\n=== MIGRATION COMPLETE ===")

# Verify
print("\n=== VERIFICATION ===")
user_check = prod_db.users.find_one({"email": "chandrashekhar.iter@gmail.com"}, {"_id": 0, "email": 1, "name": 1})
print(f"User: {user_check}")
print(f"Assets: {prod_db.assets.count_documents({'userId': USER_ID})}")
print(f"Investments: {prod_db.investments.count_documents({'userId': USER_ID})}")
print(f"Loans: {prod_db.loans.count_documents({'userId': USER_ID})}")
print(f"Expenses: {prod_db.expenses.count_documents({'userId': USER_ID})}")
print(f"Income: {prod_db.income_sources.count_documents({'userId': USER_ID})}")
print(f"Accounts: {prod_db.accounts.count_documents({'userId': USER_ID})}")
print(f"Credit Cards: {prod_db.credit_cards.count_documents({'userId': USER_ID})}")
print(f"Insurances: {prod_db.insurances.count_documents({'userId': USER_ID})}")
