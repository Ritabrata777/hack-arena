import os
import random
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
script_dir = os.path.dirname(os.path.abspath(__file__))
# Assumes script is in `scripts/` folder, so .env.local is in parent
env_path = os.path.join(script_dir, "../.env.local") 
load_dotenv(dotenv_path=env_path)

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB_NAME", "medichain")

if not MONGO_URI:
    print("Error: MONGODB_URI not found")
    exit(1)

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db.fundraiserRequests

dummy_data = [
    {
        "title": "Help for Surgery",
        "description": "Urgent heart surgery needed for my father. Please help us.",
        "goalAmount": 5000,
        "status": "approved",
        "documents": [],
        "createdAt": datetime.now()
    },
    {
        "title": "Fake Charity",
        "description": "Give me money for a vacation I mean surgery.",
        "goalAmount": 100000,
        "status": "rejected",
        "documents": [],
        "createdAt": datetime.now()
    },
    {
        "title": "School fees",
        "description": "Need help paying specifically for medical school fees due to illness.",
        "goalAmount": 1000,
        "status": "approved",
        "documents": [],
        "createdAt": datetime.now()
    },
    {
        "title": "Cancer Treatment",
        "description": "Diagnosed with stage 3 cancer, need funds for chemotherapy.",
        "goalAmount": 25000,
        "status": "approved",
        "documents": [],
        "createdAt": datetime.now()
    },
    {
        "title": "Scam Alert",
        "description": "This is a test scam with suspicious keywords.",
        "goalAmount": 999999,
        "status": "rejected",
        "documents": [],
        "createdAt": datetime.now()
    },
    {
        "title": "Broken Leg",
        "description": "Fell down stairs, need cast and physio.",
        "goalAmount": 500,
        "status": "approved",
        "documents": [],
        "createdAt": datetime.now()
    }
]

print(f"Seeding {len(dummy_data)} records...")
collection.insert_many(dummy_data)
print("Done.")
