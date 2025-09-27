import argparse
import asyncio
import random
from datetime import datetime, timedelta, timezone

import aiohttp

CHANNELS = ["internet", "mobile", "upi", "atm", "api"]


def gen_user_ids(n: int):
	return [f"U{100000 + i}" for i in range(n)]


def skewed_amount() -> float:
	# Mostly small values, occasional spikes
	if random.random() < 0.95:
		return max(1.0, random.gauss(1200, 800))
	return random.uniform(25000, 150000)


async def send_event(session: aiohttp.ClientSession, base: str, user_id: str):
	now = datetime.now(timezone.utc)
	payload = {
		"user_id": user_id,
		"channel": random.choice(CHANNELS),
		"amount": float(skewed_amount()),
		"currency": "INR",
		"timestamp": now.isoformat(),
	}
	async with session.post(f"{base}/api/v1/events", json=payload) as r:
		await r.json()


async def main():
	parser = argparse.ArgumentParser()
	parser.add_argument("--users", type=int, default=100)
	parser.add_argument("--rate", type=int, default=5, help="events per second")
	parser.add_argument("--base", type=str, default="http://127.0.0.1:8000")
	args = parser.parse_args()

	users = gen_user_ids(args.users)
	interval = 1 / max(1, args.rate)

	async with aiohttp.ClientSession() as session:
		while True:
			user = random.choice(users)
			await send_event(session, args.base, user)
			await asyncio.sleep(interval)


if __name__ == "__main__":
	asyncio.run(main())
