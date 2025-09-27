from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from .routes import ingest, score, anomalies

app = FastAPI(title="CAI-Powered UEBA", version="0.1.0")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

app.include_router(ingest.router, prefix="/api/v1", tags=["ingest"])
app.include_router(score.router, prefix="/api/v1", tags=["score"])
app.include_router(anomalies.router, prefix="/api/v1", tags=["anomalies"])

app.mount("/", StaticFiles(directory="app/static", html=True), name="static")

@app.get("/health", response_class=HTMLResponse)
def health() -> str:
	return "OK"
