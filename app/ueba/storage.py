from __future__ import annotations

import os
from datetime import datetime
from typing import Iterable, List, Tuple
import sqlite3
from joblib import dump, load

STATE_DIR = os.path.join("app", "state")
DB_PATH = os.path.join(STATE_DIR, "events.db")
MODEL_PATH = os.path.join(STATE_DIR, "model.joblib")

os.makedirs(STATE_DIR, exist_ok=True)


def get_conn() -> sqlite3.Connection:
	conn = sqlite3.connect(DB_PATH)
	conn.execute(
		"""
		CREATE TABLE IF NOT EXISTS anomalies (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id TEXT,
			score REAL,
			channel TEXT,
			amount REAL,
			timestamp TEXT,
			reasons TEXT
		);
		"""
	)
	conn.execute(
		"""
		CREATE TABLE IF NOT EXISTS metrics (
			key TEXT PRIMARY KEY,
			value INTEGER
		);
		"""
	)
	conn.commit()
	return conn


def increment_metric(key: str, delta: int = 1) -> None:
	with get_conn() as c:
		cur = c.execute("SELECT value FROM metrics WHERE key=?", (key,))
		row = cur.fetchone()
		if row is None:
			c.execute("INSERT INTO metrics(key, value) VALUES(?, ?)", (key, delta))
		else:
			c.execute("UPDATE metrics SET value=? WHERE key=?", (row[0] + delta, key))
		c.commit()


def read_metric(key: str) -> int:
	with get_conn() as c:
		cur = c.execute("SELECT value FROM metrics WHERE key=?", (key,))
		row = cur.fetchone()
		return int(row[0]) if row else 0


def save_anomaly(user_id: str, score: float, channel: str, amount: float, ts: datetime, reasons: List[str]) -> None:
	with get_conn() as c:
		c.execute(
			"INSERT INTO anomalies(user_id, score, channel, amount, timestamp, reasons) VALUES(?,?,?,?,?,?)",
			(user_id, score, channel, amount, ts.isoformat(), ", ".join(reasons)),
		)
		c.commit()


def list_anomalies(limit: int = 200) -> List[Tuple]:
	with get_conn() as c:
		cur = c.execute("SELECT id, user_id, score, channel, amount, timestamp, reasons FROM anomalies ORDER BY id DESC LIMIT ?", (limit,))
		return list(cur.fetchall())


def persist_model(model) -> None:
	dump(model, MODEL_PATH)


def load_model():
	if os.path.exists(MODEL_PATH):
		return load(MODEL_PATH)
	return None
