from fastapi import APIRouter
from datetime import datetime
from typing import List

from ..schemas import AnomalyRecord, Metrics
from ..ueba.storage import list_anomalies, read_metric

router = APIRouter()


@router.get("/anomalies", response_model=List[AnomalyRecord])
def get_anomalies(limit: int = 200):
	rows = list_anomalies(limit)
	result: List[AnomalyRecord] = []
	for r in rows:
		result.append(
			AnomalyRecord(
				id=int(r[0]),
				user_id=str(r[1]),
				score=float(r[2]),
				channel=str(r[3]),
				amount=float(r[4]),
				timestamp=datetime.fromisoformat(r[5]),
				reasons=[s.strip() for s in str(r[6]).split(",") if s.strip()],
			)
		)
	return result


@router.get("/metrics", response_model=Metrics)
def get_metrics():
	return Metrics(
		ingested_events=read_metric("ingested_events"),
		anomaly_count=len(list_anomalies(100000)),
		model_updated_at=None,
	)
