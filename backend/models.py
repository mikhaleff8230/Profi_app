"""SQLAlchemy ORM — замена коллекций MongoDB."""
from __future__ import annotations

from typing import Any, List, Optional

from sqlalchemy import Boolean, Float, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class UserORM(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    phone: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(String(255), default="")
    role: Mapped[str] = mapped_column(String(32), index=True)
    city: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    rating: Mapped[float] = mapped_column(Float, default=0.0)
    reviews_count: Mapped[int] = mapped_column(Integer, default=0)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    services: Mapped[List[Any]] = mapped_column(JSON, default=list)
    avatar: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    last_seen: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[str] = mapped_column(String(48))
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    first_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    otp_code: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    otp_expires_at: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    is_test_user: Mapped[bool] = mapped_column(Boolean, default=False)
    tester_role: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    status: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)


class TaskORM(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    title: Mapped[str] = mapped_column(String(512))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(64), index=True)
    city: Mapped[str] = mapped_column(String(128))
    address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    budget: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    deadline: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(32), index=True)
    customer_id: Mapped[str] = mapped_column(String(36), index=True)
    customer_name: Mapped[str] = mapped_column(String(255))
    accepted_specialist_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    photos: Mapped[List[Any]] = mapped_column(JSON, default=list)
    created_at: Mapped[str] = mapped_column(String(48), index=True)


class ApplicationORM(Base):
    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("task_id", "specialist_id", name="uq_app_task_specialist"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    task_id: Mapped[str] = mapped_column(String(36), index=True)
    task_title: Mapped[str] = mapped_column(String(512), default="")
    specialist_id: Mapped[str] = mapped_column(String(36), index=True)
    specialist_name: Mapped[str] = mapped_column(String(255))
    specialist_rating: Mapped[float] = mapped_column(Float, default=0.0)
    specialist_city: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    message: Mapped[str] = mapped_column(Text)
    price: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    created_at: Mapped[str] = mapped_column(String(48), index=True)


class ChatORM(Base):
    __tablename__ = "chats"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    task_id: Mapped[str] = mapped_column(String(36), index=True)
    task_title: Mapped[str] = mapped_column(String(512), default="")
    customer_id: Mapped[str] = mapped_column(String(36), index=True)
    customer_name: Mapped[str] = mapped_column(String(255))
    specialist_id: Mapped[str] = mapped_column(String(36), index=True)
    specialist_name: Mapped[str] = mapped_column(String(255))
    last_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_message_at: Mapped[Optional[str]] = mapped_column(String(48), nullable=True)
    created_at: Mapped[str] = mapped_column(String(48))


class MessageORM(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    chat_id: Mapped[str] = mapped_column(String(36), index=True)
    sender_id: Mapped[str] = mapped_column(String(36))
    sender_name: Mapped[str] = mapped_column(String(255))
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(String(48), index=True)


class CategoryORM(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    icon: Mapped[str] = mapped_column(String(64), default="MoreHorizontal")
    name_ru: Mapped[str] = mapped_column(String(255))
    name_ro: Mapped[str] = mapped_column(String(255))


class FilterORM(Base):
    __tablename__ = "filters"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    key: Mapped[str] = mapped_column(String(128))
    value: Mapped[str] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(String(48))


class FileORM(Base):
    __tablename__ = "files"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    storage_path: Mapped[str] = mapped_column(String(1024), unique=True, index=True)
    original_filename: Mapped[str] = mapped_column(String(512))
    content_type: Mapped[str] = mapped_column(String(128))
    size: Mapped[int] = mapped_column(Integer)
    owner_id: Mapped[str] = mapped_column(String(36), index=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[str] = mapped_column(String(48))
