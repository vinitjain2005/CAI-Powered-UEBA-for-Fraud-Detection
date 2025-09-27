from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import math

# Simple online aggregates per user

class OnlineFeatureStore:
	def __init__(self, horizon_minutes: int = 60*24*7):
		self.horizon = timedelta(minutes=horizon_minutes)
		self.user_events: Dict[str, List[Tuple[datetime, float]]] = defaultdict(list)
		self.user_channels: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))

	def add(self, user_id: str, ts: datetime, amount: float, channel: str) -> None:
		self.user_events[user_id].append((ts, amount))
		self.user_channels[user_id][channel] += 1
		self._gc(user_id, ts)

	def _gc(self, user_id: str, now: datetime) -> None:
		cutoff = now - self.horizon
		self.user_events[user_id] = [(t, a) for (t, a) in self.user_events[user_id] if t >= cutoff]

	def summarize(self, user_id: str, now: datetime) -> Dict[str, float]:
		events = [a for (t, a) in self.user_events[user_id] if t <= now]
		count = len(events)
		total = float(sum(events)) if events else 0.0
		mean = total / count if count else 0.0
		var = sum((a - mean) ** 2 for a in events) / count if count else 0.0
		std = math.sqrt(var)

		channel_counts = self.user_channels[user_id]
		max_channel_ratio = 0.0
		if count:
			max_channel_ratio = max(channel_counts.values(), default=0) / count

		return {
			"txn_count": float(count),
			"amount_total": total,
			"amount_mean": mean,
			"amount_std": std,
			"max_channel_ratio": max_channel_ratio,
		}


def build_feature_vector(summary: Dict[str, float], amount: float) -> List[float]:
	return [
		summary.get("txn_count", 0.0),
		summary.get("amount_total", 0.0),
		summary.get("amount_mean", 0.0),
		summary.get("amount_std", 0.0),
		summary.get("max_channel_ratio", 0.0),
		amount,
	]
