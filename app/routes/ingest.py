from fastapi import APIRouter, Depends
from datetime import datetime

from ..schemas import Event, ScoreResponse
from ..ueba.model import UEBAService
from ..ueba.storage import increment_metric, save_anomaly

router = APIRouter()

ueba_service = UEBAService()


def get_service() -> UEBAService:
	return ueba_service


@router.post("/events", response_model=ScoreResponse)
def ingest_event(event: Event, svc: UEBAService = Depends(get_service)):
	score, is_anomaly, reasons = svc.ingest_and_score(
		user_id=event.user_id,
		channel=event.channel,
		amount=event.amount,
		ts=event.timestamp,
	)
	increment_metric("ingested_events", 1)
	if is_anomaly:
		save_anomaly(event.user_id, score, event.channel, event.amount, event.timestamp, reasons)
	return ScoreResponse(
		user_id=event.user_id,
		score=score,
		is_anomaly=is_anomaly,
		reasons=reasons,
		timestamp=datetime.utcnow(),
	)


@router.post("/events/batch", response_model=list[ScoreResponse])
def ingest_batch(events: list[Event], svc: UEBAService = Depends(get_service)):
	responses: list[ScoreResponse] = []
	for e in events:
		responses.append(ingest_event(e, svc))
	return responses
