"""
Initial data seed for MongoDB (Atlas / local).
Safe to run multiple times: upserts by stable keys (phone, category id, filter id).

Run from project root:
  cd backend && .venv/bin/python -m seed

Or trigger via API: POST /api/admin/seed (header X-Admin-Token).
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any, Callable, Awaitable

logger = logging.getLogger(__name__)

# --- Stable keys for idempotent seed ---
SEED_ADMIN_PHONE = "+10000000001"
SEED_CUSTOMER_PHONE = "+10000000002"
SEED_SPECIALIST_PHONE = "+10000000003"

SEED_ADMIN_EMAIL = "admin@test.com"
# Plain password for dev seed only — always stored as bcrypt hash (same as production users).
SEED_ADMIN_PASSWORD = "admin123"
SEED_CUSTOMER_PASSWORD = "customer123"
SEED_SPECIALIST_PASSWORD = "specialist123"


def _user_doc(
    user_id: str,
    phone: str,
    password_plain: str,
    name: str,
    role: str,
    city: str | None,
    hash_password: Callable[[str], str],
    now_iso: Callable[[], str],
    email: str | None = None,
) -> dict[str, Any]:
    # TODO(production): passwords only via hash_password (already); never log password_plain.
    doc: dict[str, Any] = {
        "id": user_id,
        "phone": phone,
        "password_hash": hash_password(password_plain),
        "name": name,
        "role": role,
        "city": city,
        "rating": 0.0,
        "reviews_count": 0,
        "bio": None,
        "services": [],
        "avatar": None,
        "created_at": now_iso(),
    }
    if email:
        doc["email"] = email
    return doc


async def _upsert_user(
    db: Any,
    phone: str,
    hash_password: Callable[[str], str],
    now_iso: Callable[[], str],
    normalize_phone: Callable[[str], str],
    password_plain: str,
    name: str,
    role: str,
    city: str | None,
    email: str | None = None,
) -> str:
    p = normalize_phone(phone)
    existing = await db.users.find_one({"phone": p})
    uid = existing["id"] if existing else str(uuid.uuid4())
    doc = _user_doc(uid, p, password_plain, name, role, city, hash_password, now_iso, email=email)
    await db.users.update_one(
        {"phone": p},
        {"$set": doc},
        upsert=True,
    )
    return "updated" if existing else "inserted"


async def _upsert_category(
    db: Any,
    cid: str,
    icon: str,
    name_ru: str,
    name_ro: str,
) -> str:
    doc = {"id": cid, "icon": icon, "name_ru": name_ru, "name_ro": name_ro}
    r = await db.categories.update_one({"id": cid}, {"$set": doc}, upsert=True)
    if r.upserted_id is not None:
        return "inserted"
    return "updated"


async def _upsert_filter(
    db: Any,
    fid: str,
    name: str,
    key: str,
    value: str,
    now_iso: Callable[[], str],
) -> str:
    doc = {"id": fid, "name": name, "key": key, "value": value, "created_at": now_iso()}
    existing = await db.filters.find_one({"id": fid})
    if existing:
        await db.filters.update_one({"id": fid}, {"$set": {"name": name, "key": key, "value": value}})
        return "updated"
    await db.filters.insert_one(doc)
    return "inserted"


async def run_seed(
    db: Any,
    hash_password: Callable[[str], str],
    now_iso: Callable[[], str],
    normalize_phone: Callable[[str], str],
) -> dict[str, Any]:
    """
    Idempotent seed. Uses shared Motor `db` from server (singleton client).
    """
    summary: dict[str, Any] = {"users": [], "categories": [], "filters": []}

    summary["users"].append(
        await _upsert_user(
            db,
            SEED_ADMIN_PHONE,
            hash_password,
            now_iso,
            normalize_phone,
            SEED_ADMIN_PASSWORD,
            "Seed Admin",
            "admin",
            None,
            email=SEED_ADMIN_EMAIL,
        )
    )
    summary["users"].append(
        await _upsert_user(
            db,
            SEED_CUSTOMER_PHONE,
            hash_password,
            now_iso,
            normalize_phone,
            SEED_CUSTOMER_PASSWORD,
            "Seed Customer",
            "customer",
            "Chișinău",
        )
    )
    summary["users"].append(
        await _upsert_user(
            db,
            SEED_SPECIALIST_PHONE,
            hash_password,
            now_iso,
            normalize_phone,
            SEED_SPECIALIST_PASSWORD,
            "Seed Specialist",
            "specialist",
            "Chișinău",
        )
    )

    cats = [
        ("seed_repair", "Wrench", "Ремонт (seed)", "Reparații (seed)"),
        ("seed_clean", "Sparkles", "Уборка (seed)", "Curățenie (seed)"),
        ("seed_it", "Laptop", "IT (seed)", "IT (seed)"),
    ]
    for cid, icon, ru, ro in cats:
        summary["categories"].append(await _upsert_category(db, cid, icon, ru, ro))

    summary["filters"].append(
        await _upsert_filter(db, "seed_filter_demo", "Demo filter", "seed", "1", now_iso)
    )

    logger.info("Seed finished: %s", summary)
    return summary


async def _main_async() -> None:
    from pathlib import Path
    from dotenv import load_dotenv
    import os
    from motor.motor_asyncio import AsyncIOMotorClient

    ROOT = Path(__file__).parent
    load_dotenv(ROOT / ".env")

    def _env_int(name: str, default: int) -> int:
        raw = os.environ.get(name, "")
        if not str(raw).strip():
            return default
        try:
            return int(str(raw).strip())
        except ValueError:
            return default

    def _mongo_uri() -> str:
        raw = (os.environ.get("MONGO_URL") or "mongodb://localhost:27017").strip()
        if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in "\"'":
            raw = raw[1:-1].strip()
        return raw or "mongodb://localhost:27017"

    mongo_url = _mongo_uri()
    client = AsyncIOMotorClient(
        mongo_url,
        maxPoolSize=_env_int("MONGO_MAX_POOL_SIZE", 20),
        minPoolSize=1,
        serverSelectionTimeoutMS=_env_int("MONGO_SERVER_SELECTION_TIMEOUT_MS", 10000),
    )
    db = client[os.environ.get("DB_NAME", "test_database")]

    # Reuse same hashing as server
    import bcrypt

    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    from datetime import datetime, timezone

    def now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    def normalize_phone(phone: str) -> str:
        return "".join(ch for ch in phone if ch.isdigit() or ch == "+")

    try:
        out = await run_seed(db, hash_password, now_iso, normalize_phone)
        print(out)
    finally:
        client.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(_main_async())
