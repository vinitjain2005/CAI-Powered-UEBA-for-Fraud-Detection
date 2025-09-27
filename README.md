# CAI-Powered UEBA for Fraud Detection (Hackathon Prototype)

A runnable prototype demonstrating CAI-powered User & Entity Behaviour Analytics (UEBA) to detect anomalous activity across channels (internet banking, mobile, UPI, ATM, APIs).

- FastAPI backend with scoring and anomaly registry
- UEBA module using IsolationForest and rolling baselines
- Event ingestion API and batch scoring
- Lightweight web dashboard (HTML/JS) to view anomalies and metrics
- Sample data and a simulator to stream synthetic events

## Quickstart

Prerequisites: Python 3.10+, Node not required. Runs on Windows, macOS, Linux.

```bash
python -m venv .venv
. .venv/Scripts/activate  # on Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Start backend
uvicorn app.main:app --reload

# In another terminal, stream sample events
python tools/simulate_events.py --users 200 --rate 4
```

Open the dashboard at `http://127.0.0.1:8000/`.

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
