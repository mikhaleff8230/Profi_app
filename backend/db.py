"""Async SQLite + SQLAlchemy session (единая точка подключения)."""
from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

ROOT_DIR = Path(__file__).parent
_default_db = (ROOT_DIR / "app.db").resolve().as_posix()
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite+aiosqlite:///{_default_db}").strip()

engine = create_async_engine(
    DATABASE_URL,
    echo=os.environ.get("SQL_ECHO", "").lower() in ("1", "true", "yes"),
)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
