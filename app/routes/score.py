from fastapi import APIRouter, Depends
from datetime import datetime

from ..schemas import ScoreResponse
from ..ueba.model import UEBAService

router = APIRouter()


def get_service() -> UEBAService:
	# reuse the singleton created in ingest module by importing lazily
	from .ingest import ueba_service
	return ueba_service


@router.get("/score/{user_id}", response_model=ScoreResponse)
def get_latest_score(user_id: str, svc: UEBAService = Depends(get_service)):
	# Score with zero-amount no-op based on current summary
	score, is_anomaly, reasons = svc.ingest_and_score(user_id, channel="query", amount=0.0, ts=datetime.utcnow())
	return ScoreResponse(
		user_id=user_id,
		score=score,
		is_anomaly=is_anomaly,
		reasons=reasons,
		timestamp=datetime.utcnow(),
	)
