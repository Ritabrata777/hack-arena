import sys
import json
import joblib
import pandas as pd
import numpy as np
import base64
import io
from pypdf import PdfReader

# Load model
MODEL_PATH = 'src/ml_service/model.pkl'

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
        except Exception as e:
            # Silently fail for docs to avoid crashing prediction
            continue
    return text_content

def predict(input_data):
    try:
        clf = joblib.load(MODEL_PATH)
    except FileNotFoundError:
        print(json.dumps({"risk_score": 0, "error": "Model not trained yet"}))
        return

    try:
        data = json.loads(input_data)
        
        goalAmount = float(data.get('goalAmount', 0))
        title = str(data.get('title', ''))
        description = str(data.get('description', ''))
        documents = data.get('documents', [])
        
        doc_text = extract_text_from_docs(documents)
        full_text = f"{title} {description} {doc_text}"
        
        # Create DataFrame for pipeline
        input_df = pd.DataFrame([{
            'goalAmount': goalAmount, 
            'full_text': full_text
        }])
        
        # Predict Probability
        prob = clf.predict_proba(input_df)[0][1]
        
        # Heuristics: Penalize very short text (likely testing/spam)
        heuristic_penalty = 0.0
        reasons = []
        
        if len(description) < 30:
            heuristic_penalty += 0.8 # Massive penalty
            reasons.append("Description too short")
        elif len(description) < 100:
             heuristic_penalty += 0.2
             
        if len(title) < 10:
             heuristic_penalty += 0.3
             reasons.append("Title too short")
             
        # Combine Model + Heuristics
        final_score = min(prob + heuristic_penalty, 1.0)
        
        result = {
            "risk_score": round(final_score * 100, 2),
            "prediction": "Fraud" if final_score > 0.5 else "Safe",
            "reasons": reasons,
            "debug_text_len": len(full_text) # Optional debug
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        predict(sys.argv[1])
    else:
        print(json.dumps({"error": "No input provided"}))
