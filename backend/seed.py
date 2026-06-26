"""
Начальные данные для SQLite (идемпотентно).

CLI:
  cd backend && .venv/bin/python -m seed

API: POST /api/admin/seed (header X-Admin-Token)
"""
from __future__ import annotations

import logging
import os
import uuid
from typing import Any, Callable

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from models import CategoryORM, FilterORM, UserORM

logger = logging.getLogger(__name__)

SEED_ADMIN_PHONE = "+10000000001"
SEED_CUSTOMER_PHONE = "+10000000002"
SEED_SPECIALIST_PHONE = "+10000000003"
SEED_ADMIN_EMAIL = "admin@test.com"
SEED_ADMIN_PASSWORD = "admin123"
SEED_CUSTOMER_PASSWORD = "customer123"
SEED_SPECIALIST_PASSWORD = "specialist123"

# Админ-специалист (Sancan): телефон + email; пароль — SEED_SANCAN_SPECIALIST_PASSWORD или значение ниже.
SANCAN_SPECIALIST_PHONE = "+79031416581"
SANCAN_SPECIALIST_EMAIL = "sale@sancan.ru"
SANCAN_SPECIALIST_NAME = "Alexander"
SANCAN_SPECIALIST_PASSWORD = os.environ.get("SEED_SANCAN_SPECIALIST_PASSWORD", "SancanProffi2025!")


def _user_orm(
    user_id: str,
    phone: str,
    password_plain: str,
    name: str,
    role: str,
    city: str | None,
    hash_password: Callable[[str], str],
    now_iso: Callable[[], str],
    email: str | None = None,
    email_verified: bool = False,
) -> UserORM:
    return UserORM(
        id=user_id,
        phone=phone,
        password_hash=hash_password(password_plain),
        name=name,
        role=role,
        city=city,
        rating=0.0,
        reviews_count=0,
        bio=None,
        services=[],
        avatar=None,
        created_at=now_iso(),
        email=email,
        email_verified=email_verified,
    )


async def _upsert_user(
    session: AsyncSession,
    phone: str,
    hash_password: Callable[[str], str],
    now_iso: Callable[[], str],
    normalize_phone: Callable[[str], str],
    password_plain: str,
    name: str,
    role: str,
    city: str | None,
    email: str | None = None,
    email_verified: bool = False,
) -> str:
    p = normalize_phone(phone)
    existing = await session.scalar(select(UserORM).where(UserORM.phone == p))
    uid = existing.id if existing else str(uuid.uuid4())
    u = _user_orm(
        uid,
        p,
        password_plain,
        name,
        role,
        city,
        hash_password,
        now_iso,
        email=email,
        email_verified=email_verified,
    )
    if existing:
        await session.execute(
            update(UserORM)
            .where(UserORM.phone == p)
            .values(
                password_hash=u.password_hash,
                name=u.name,
                role=u.role,
                city=u.city,
                email=u.email,
                email_verified=u.email_verified,
            )
        )
        return "updated"
    session.add(u)
    return "inserted"


async def _upsert_category(session: AsyncSession, cid: str, icon: str, name_ru: str, name_ro: str) -> str:
    existing = await session.scalar(select(CategoryORM).where(CategoryORM.id == cid))
    if existing:
        await session.execute(
            update(CategoryORM)
            .where(CategoryORM.id == cid)
            .values(icon=icon, name_ru=name_ru, name_ro=name_ro)
        )
        return "updated"
    session.add(CategoryORM(id=cid, icon=icon, name_ru=name_ru, name_ro=name_ro))
    return "inserted"


async def _upsert_filter(
    session: AsyncSession,
    fid: str,
    name: str,
    key: str,
    value: str,
    now_iso: Callable[[], str],
) -> str:
    existing = await session.scalar(select(FilterORM).where(FilterORM.id == fid))
    if existing:
        await session.execute(
            update(FilterORM).where(FilterORM.id == fid).values(name=name, key=key, value=value)
        )
        return "updated"
    session.add(FilterORM(id=fid, name=name, key=key, value=value, created_at=now_iso()))
    return "inserted"


async def run_seed(
    session: AsyncSession,
    hash_password: Callable[[str], str],
    now_iso: Callable[[], str],
    normalize_phone: Callable[[str], str],
) -> dict[str, Any]:
    summary: dict[str, Any] = {"users": [], "categories": [], "filters": []}

    summary["users"].append(
        await _upsert_user(
            session,
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
            session,
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
            session,
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
    summary["users"].append(
        await _upsert_user(
            session,
            SANCAN_SPECIALIST_PHONE,
            hash_password,
            now_iso,
            normalize_phone,
            SANCAN_SPECIALIST_PASSWORD,
            SANCAN_SPECIALIST_NAME,
            "specialist",
            None,
            email=SANCAN_SPECIALIST_EMAIL,
            email_verified=True,
        )
    )

    cats = [
        ("seed_repair", "Wrench", "Ремонт (seed)", "Reparații (seed)"),
        ("seed_clean", "Sparkles", "Уборка (seed)", "Curățenie (seed)"),
        ("seed_it", "Laptop", "IT (seed)", "IT (seed)"),
    ]
    for cid, icon, ru, ro in cats:
        summary["categories"].append(await _upsert_category(session, cid, icon, ru, ro))

    summary["filters"].append(
        await _upsert_filter(session, "seed_filter_demo", "Demo filter", "seed", "1", now_iso)
    )

    logger.info("Seed finished: %s", summary)
    return summary


async def _main_async() -> None:
    from pathlib import Path

    from dotenv import load_dotenv

    ROOT = Path(__file__).parent
    load_dotenv(ROOT / ".env")

    from datetime import datetime, timezone

    from db import async_session_maker, engine
    from models import Base

    def hash_password(password: str) -> str:
        import bcrypt

        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    def normalize_phone(phone: str) -> str:
        return "".join(ch for ch in phone if ch.isdigit() or ch == "+")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_maker() as session:
        try:
            out = await run_seed(session, hash_password, now_iso, normalize_phone)
            await session.commit()
            print(out)
        except Exception:
            await session.rollback()
            raise


if __name__ == "__main__":
    import asyncio

    logging.basicConfig(level=logging.INFO)
    asyncio.run(_main_async())
