from __future__ import annotations

from datetime import datetime
from typing import List, Tuple

import numpy as np
from sklearn.ensemble import IsolationForest

from .features import OnlineFeatureStore, build_feature_vector
from .storage import persist_model, load_model


class UEBAService:
	def __init__(self) -> None:
		self.features = OnlineFeatureStore()
		self.model: IsolationForest | None = load_model()
		self.threshold = 0.6  # anomaly if score >= 0.6

	def _ensure_model(self) -> None:
		if self.model is None:
			# Start with a baseline model trained on benign-like random data
			rng = np.random.default_rng(42)
			X = rng.normal(0, 1, size=(512, 6))
			self.model = IsolationForest(n_estimators=200, contamination=0.05, random_state=42)
			self.model.fit(X)
			persist_model(self.model)

	def ingest_and_score(self, user_id: str, channel: str, amount: float, ts: datetime) -> Tuple[float, bool, List[str]]:
		self._ensure_model()
		self.features.add(user_id=user_id, ts=ts, amount=amount, channel=channel)
		summary = self.features.summarize(user_id=user_id, now=ts)
		vec = np.array([build_feature_vector(summary, amount)], dtype=float)
		assert self.model is not None
		# IsolationForest returns negative scores for anomalies; convert to 0..1 risk
		raw = -self.model.score_samples(vec)[0]
		risk = float((raw - (-0.5)) / (1.5))
		risk = max(0.0, min(1.0, risk))
		reasons: List[str] = []
		if amount > (summary.get("amount_mean", 0) + 3 * (summary.get("amount_std", 0) or 1)):
			reasons.append("amount_spike")
		if summary.get("txn_count", 0) < 3 and amount > 20000:
			reasons.append("new_user_high_amount")
		is_anomaly = risk >= self.threshold
		return risk, is_anomaly, reasons

	def partial_fit(self, feature_rows: List[List[float]]) -> None:
		self._ensure_model()
		X = np.array(feature_rows, dtype=float)
		assert self.model is not None
		self.model.fit(X)
		persist_model(self.model)
