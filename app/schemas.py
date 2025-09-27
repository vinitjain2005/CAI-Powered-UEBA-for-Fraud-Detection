from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class Event(BaseModel):
	user_id: str
	channel: str = Field(description="channel like internet, mobile, upi, atm, api")
	amount: float = 0.0
	currency: str = "INR"
	ip: Optional[str] = None
	device_id: Optional[str] = None
	geo_country: Optional[str] = None
	timestamp: datetime
	extra: Dict[str, Any] = {}

class ScoreResponse(BaseModel):
	user_id: str
	score: float
	is_anomaly: bool
	reasons: List[str] = []
	timestamp: datetime

class AnomalyRecord(BaseModel):
	id: int
	user_id: str
	score: float
	channel: str
	amount: float
	timestamp: datetime
	reasons: List[str] = []

class Metrics(BaseModel):
	ingested_events: int
	anomaly_count: int
	model_updated_at: Optional[datetime] = None
