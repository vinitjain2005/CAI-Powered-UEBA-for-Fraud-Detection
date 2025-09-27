# CAI-Powered UEBA for Fraud Detection (Hackathon Prototype)

A runnable prototype demonstrating CAI-powered User & Entity Behaviour Analytics (UEBA) to detect anomalous activity across channels (internet banking, mobile, UPI, ATM, APIs).

- FastAPI backend with scoring and anomaly registry
- UEBA module using IsolationForest and rolling baselines
- Event ingestion API and batch scoring
- Lightweight web dashboard (HTML/JS) to view anomalies and metrics
- Sample data and a simulator to stream synthetic events

## Images

<img width="1835" height="916" alt="Screenshot 2025-09-27 125323" src="https://github.com/user-attachments/assets/8b846d80-38ab-43b8-b79f-a7eb4867a49d" />
<img width="1494" height="892" alt="Screenshot 2025-09-27 125340" src="https://github.com/user-attachments/assets/d348ddb3-0f36-4f9d-be08-b1f5890aadaa" />
<img width="1586" height="880" alt="Screenshot 2025-09-27 125350" src="https://github.com/user-attachments/assets/89e301b0-1ff7-4bf1-b2e0-d320655f41d6" />
<img width="1659" height="578" alt="Screenshot 2025-09-27 125359" src="https://github.com/user-attachments/assets/5e7abcdb-b7ef-4ae3-ac1c-f4e0951d184a" />


## ⚡ Quick Start

1️⃣ Navigate to project folder (PowerShell safe with `[ ]`):

```powershell
Set-Location -LiteralPath "C:\Users\jainv\OneDrive\Documents\BOB[1]\BOB"
```

2️⃣ Create & activate virtual environment:

```powershell
python -m venv .venv
.venv\Scripts\activate.bat
```

3️⃣ Install dependencies:

```powershell
pip install -r requirements.txt
```

4️⃣ Run backend:

```powershell
python -m uvicorn app.main:app --reload
```

5️⃣ (Optional) Run event simulator:

```powershell
python tools/simulate_events.py --users 200 --rate 4
```

6️⃣ Open dashboard in browser:

```
http://127.0.0.1:8000/
```


## Project Structure

```
app/
  main.py
  deps.py
  schemas.py
  ueba/
    __init__.py
    features.py
    model.py
    storage.py
  routes/
    __init__.py
    ingest.py
    score.py
    anomalies.py
  static/
    index.html
    dashboard.js
    styles.css
  data/
    channels.json
    countries.json
  state/
    (runtime db & models)
requirements.txt
tools/
  simulate_events.py
```

## Notes
- This is educational; not production-ready. No PII; data is synthetic.
- Model uses online feature aggregates and IsolationForest for fast anomaly scores.
- Storage is file-based SQLite + joblib for simplicity.

## API (high level)
- POST `/api/v1/events` – ingest a single event
- POST `/api/v1/events/batch` – ingest batch
- GET `/api/v1/score/{user_id}` – latest risk for user
- GET `/api/v1/anomalies` – list recent anomalies
- GET `/api/v1/metrics` – model/ingestion metrics

## License
MIT
