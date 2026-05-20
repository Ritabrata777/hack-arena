import os
import pandas as pd
import json
import base64
import io
from pymongo import MongoClient
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
import joblib
from dotenv import load_dotenv
from pypdf import PdfReader

# Load environment variables
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, "../../.env.local")
load_dotenv(dotenv_path=env_path)

# MongoDB connection
MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB_NAME", "medichain")
PYTHON_PATH = os.getenv("PYTHON_PATH") 

if not MONGO_URI:
    print("Error: MONGODB_URI not found")
    exit(1)

def extract_text_from_docs(documents):
    text_content = ""
    if not isinstance(documents, list):
        return ""
        
    for doc in documents:
        try:
            uri = doc.get('uri', '')
            if uri.startswith('data:application/pdf'):
                # Extract base64 part
                base64_pdf = uri.split(',')[1]
                pdf_bytes = base64.b64decode(base64_pdf)
                reader = PdfReader(io.BytesIO(pdf_bytes))
                for page in reader.pages:
                    text_content += page.extract_text() + " "
            elif uri.startswith('data:text/plain'):
                 base64_txt = uri.split(',')[1]
                 text_content += base64.b64decode(base64_txt).decode('utf-8') + " "
            # Images are skipped as per plan
        except Exception as e:
            print(f"Error extracting text from doc: {e}")
            continue
    return text_content

def train():
    print("Connecting to MongoDB...")
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    
    # Fetch data
    cursor = db.fundraiserRequests.find({
        "status": {"$in": ["approved", "rejected"]}
    })
    
    data = list(cursor)
    
    if len(data) < 5:
        print("Not enough data to train (minimum 5 records required).")
        return

    df = pd.DataFrame(data)
    
    # Feature Engineering
    df['goalAmount'] = pd.to_numeric(df['goalAmount'], errors='coerce')
    
    timestamp_imputer = SimpleImputer(strategy='constant', fill_value=0)
    # If we had account creation time, we'd use it. For now, we stick to request data.

    # Combined Text
    def combine_text(row):
        title = str(row.get('title', ''))
        desc = str(row.get('description', ''))
        docs = row.get('documents', [])
        doc_text = extract_text_from_docs(docs)
        return f"{title} {desc} {doc_text}"

    df['full_text'] = df.apply(combine_text, axis=1)
    
    # Target
    df['target'] = df['status'].apply(lambda x: 1 if x == 'rejected' else 0)
    
    # Preprocessing Pipeline
    # Numeric features: goalAmount
    numeric_features = ['goalAmount']
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    # Text features: full_text
    text_transformer = Pipeline(steps=[
        ('tfidf', TfidfVectorizer(max_features=500, stop_words='english'))
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('txt', text_transformer, 'full_text')
        ])

    # Model Pipeline
    clf = Pipeline(steps=[('preprocessor', preprocessor),
                          ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))])
    
    X = df[['goalAmount', 'full_text']]
    y = df['target']
    
    print(f"Training on {len(df)} records with NLP...")
    clf.fit(X, y)
    
    # Save Model
    joblib.dump(clf, 'src/ml_service/model.pkl')
    print("Model saved to src/ml_service/model.pkl")

if __name__ == "__main__":
    train()
