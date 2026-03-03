"""Migration script for SANDEEP DASH's data into moneyssutra_prod"""
import requests, json
from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

SESSION = "f89d951a-8cbd-4c7d-9719-c14418b61424"
OLD_PROD = "https://goal-tracker-prod.emergent.host"
HEADERS = {"Authorization": f"Bearer {SESSION}"}
client = MongoClient(os.environ["MONGO_URL"])
prod_db = client["moneyssutra_prod"]
USER_ID = "user_42910ca221a4"

def fetch(endpoint):
    try:
        r = requests.get(f"{OLD_PROD}/api/{endpoint}", headers=HEADERS, timeout=15)
        return r.json() if r.status_code == 200 else None
    except: return None

def insert_many_safe(coll, docs):
    if docs and isinstance(docs, list) and len(docs) > 0:
        prod_db[coll].insert_many(docs)
        print(f"  {coll}: {len(docs)} docs")

def insert_one_safe(coll, doc):
    if doc and isinstance(doc, dict):
        prod_db[coll].insert_one(doc)
        print(f"  {coll}: 1 doc")

print("=== MIGRATING SANDEEP DASH ===\n")

# 1. User
existing = prod_db.users.find_one({"email": "sandeepdash24@gmail.com"})
if not existing:
    prod_db.users.insert_one({
        "user_id": USER_ID, "email": "sandeepdash24@gmail.com",
        "name": "SANDEEP DASH", "firstName": "SANDEEP", "middleName": "", "lastName": "DASH",
        "picture": "https://lh3.googleusercontent.com/a/ACg8ocI79_pQetO8nhCYrL7usJcgSBHF5N3xQsR56f7wSYUaCElgOg=s96-c",
        "auth_type": "google", "has_password": True
    })
    print("  users: created")

# 2. Basic profile
bp = fetch("basic-profile")
if bp:
    bp["userId"] = USER_ID
    insert_one_safe("basic_profiles", bp)

# 3. All collections
for endpoint, coll in [("assets", "assets"), ("investments", "investments"), ("loans", "loans"),
                        ("expenses", "expenses"), ("income", "income_sources"),
                        ("accounts", "accounts"), ("credit-cards", "credit_cards"),
                        ("insurances", "insurances"), ("goals", "goals")]:
    data = fetch(endpoint)
    if isinstance(data, list):
        insert_many_safe(coll, data)
    elif isinstance(data, dict) and 'detail' not in data:
        insert_one_safe(coll, data)

# 4. EMI transactions
emi = fetch("loans/emi-ledger-all")
if emi and 'transactions' in emi:
    insert_many_safe("emi_transactions", emi['transactions'])

# 5. Settings
settings = fetch("settings/preferences")
if settings and 'detail' not in settings:
    settings['userId'] = USER_ID
    insert_one_safe("user_settings", settings)

# 6. Gamification
gam = fetch("gamification/profile")
if gam and 'level' in gam:
    prod_db.user_gamification_profile.insert_one({
        'user_id': USER_ID, 'level': gam['level'], 'title': gam['title'],
        'stage': gam['stage'], 'currentXP': gam['currentXP'],
        'streak': gam['streak'], 'longestStreak': gam['longestStreak'],
        'lastScore': gam['lastScore'], 'lastSurvivalDays': gam['lastSurvivalDays'],
        'lastProcessedAt': gam['lastProcessedAt']
    })
    print(f"  gamification: Level {gam['level']}, XP {gam['currentXP']}")
    achievements = gam.get('achievements', [])
    if achievements:
        for a in achievements: a['user_id'] = USER_ID
        prod_db.user_achievements.insert_many(achievements)
        print(f"  achievements: {len(achievements)}")

# 7. Personality
personality = fetch("intelligence/money-pattern")
if personality and 'personality' in personality:
    personality['userId'] = USER_ID
    insert_one_safe("user_personality", personality)

# 8. Workspace
ws = fetch("workspaces")
if ws and isinstance(ws, list):
    for w in ws:
        prod_db.workspaces.insert_one(w)
        if 'member_id' in w:
            prod_db.workspace_members.insert_one({
                'id': w['member_id'], 'workspace_id': w['id'],
                'user_id': USER_ID, 'role': w.get('role', 'owner'),
                'joined_at': w.get('created_at')
            })
    print(f"  workspaces: {len(ws)}")

print("\n=== VERIFICATION ===")
for coll in sorted(prod_db.list_collection_names()):
    count = prod_db[coll].count_documents({'userId': USER_ID}) or prod_db[coll].count_documents({'user_id': USER_ID})
    if count > 0:
        print(f"  {coll}: {count}")
total_users = prod_db.users.count_documents({})
print(f"\nTotal users in moneyssutra_prod: {total_users}")
