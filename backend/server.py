from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import logging
import math
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, List, Optional

import bcrypt
import jwt
import requests
from fastapi import APIRouter, Depends, FastAPI, File, Header, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, or_, select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from starlette.middleware.cors import CORSMiddleware

from db import async_session_maker, engine, get_db
from models import (
    ApplicationORM,
    Base,
    CategoryORM,
    ChatORM,
    FileORM,
    FilterORM,
    MessageORM,
    TaskORM,
    UserORM,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

APP_ENV = os.environ.get("APP_ENV", "development").lower()
IS_PROD = APP_ENV == "production"

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-jwt-secret-change-me")

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "profi-mvp"
_storage_key: Optional[str] = None


def init_storage() -> Optional[str]:
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_KEY:
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        return _storage_key
    except Exception as e:
        logging.error("Storage init failed: %s", e)
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if resp.status_code == 403:
        global _storage_key
        _storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    if resp.status_code == 403:
        global _storage_key
        _storage_key = None
        key = init_storage()
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=60,
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_phone(phone: str) -> str:
    return "".join(ch for ch in phone if ch.isdigit() or ch == "+")


def user_row(u: UserORM) -> dict:
    return {
        "id": u.id,
        "phone": u.phone,
        "password_hash": u.password_hash,
        "name": u.name,
        "role": u.role,
        "city": u.city,
        "rating": u.rating,
        "reviews_count": u.reviews_count,
        "bio": u.bio,
        "services": u.services or [],
        "avatar": u.avatar,
        "lat": u.lat,
        "lng": u.lng,
        "last_seen": u.last_seen,
        "created_at": u.created_at,
        "email": u.email,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "email_verified": u.email_verified,
        "is_test_user": u.is_test_user,
        "tester_role": u.tester_role,
        "status": u.status,
    }


def user_to_public(u: dict) -> dict:
    return {
        "id": u["id"],
        "phone": u["phone"],
        "name": u["name"],
        "role": u["role"],
        "city": u.get("city"),
        "rating": u.get("rating", 0.0),
        "reviews_count": u.get("reviews_count", 0),
        "bio": u.get("bio"),
        "services": u.get("services", []),
        "avatar": u.get("avatar"),
        "lat": u.get("lat"),
        "lng": u.get("lng"),
        "last_seen": u.get("last_seen"),
        "created_at": u["created_at"],
    }


class RegisterRequest(BaseModel):
    phone: str
    password: str
    name: str
    role: str
    city: Optional[str] = None


class LoginRequest(BaseModel):
    phone: str
    password: str


class UserPublic(BaseModel):
    id: str
    phone: str
    name: str
    role: str
    city: Optional[str] = None
    rating: float = 0.0
    reviews_count: int = 0
    bio: Optional[str] = None
    services: List[str] = []
    avatar: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    last_seen: Optional[str] = None
    created_at: str


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


class TaskCreate(BaseModel):
    title: str
    description: str
    category: str
    city: str
    address: Optional[str] = None
    budget: Optional[int] = None
    deadline: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    photos: List[str] = Field(default_factory=list)


class TaskPublic(BaseModel):
    id: str
    title: str
    description: str
    category: str
    city: str
    address: Optional[str] = None
    budget: Optional[int] = None
    deadline: Optional[str] = None
    status: str
    customer_id: str
    customer_name: str
    applications_count: int = 0
    accepted_specialist_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    photos: List[str] = Field(default_factory=list)
    distance_km: Optional[float] = None
    created_at: str


class ApplicationCreate(BaseModel):
    message: str
    price: Optional[int] = None


class ApplicationPublic(BaseModel):
    id: str
    task_id: str
    task_title: str
    specialist_id: str
    specialist_name: str
    specialist_rating: float = 0.0
    specialist_city: Optional[str] = None
    message: str
    price: Optional[int] = None
    status: str
    created_at: str


class MessageCreate(BaseModel):
    text: str


class MessagePublic(BaseModel):
    id: str
    chat_id: str
    sender_id: str
    sender_name: str
    text: str
    created_at: str


class ChatPublic(BaseModel):
    id: str
    task_id: str
    task_title: str
    customer_id: str
    customer_name: str
    specialist_id: str
    specialist_name: str
    last_message: Optional[str] = None
    last_message_at: Optional[str] = None
    task_status: Optional[str] = None
    created_at: str


app = FastAPI(
    title="Marketplace API",
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None if IS_PROD else "/redoc",
)

api_router = APIRouter(prefix="/api")


async def get_current_user(request: Request, session: AsyncSession = Depends(get_db)) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else None
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        u = await session.scalar(select(UserORM).where(UserORM.id == payload["sub"]))
        if not u:
            raise HTTPException(status_code=401, detail="User not found")
        return user_row(u)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@api_router.post("/auth/register", response_model=AuthResponse)
async def register(body: RegisterRequest, session: AsyncSession = Depends(get_db)):
    if body.role not in ("customer", "specialist"):
        raise HTTPException(status_code=400, detail="Invalid role")
    if len(body.password) < 4:
        raise HTTPException(status_code=400, detail="Password too short")
    phone = normalize_phone(body.phone)
    exists = await session.scalar(select(UserORM).where(UserORM.phone == phone))
    if exists:
        raise HTTPException(status_code=400, detail="Phone already registered")
    user_id = str(uuid.uuid4())
    u = UserORM(
        id=user_id,
        phone=phone,
        password_hash=hash_password(body.password),
        name=body.name,
        role=body.role,
        city=body.city,
        rating=0.0,
        reviews_count=0,
        bio=None,
        services=[],
        avatar=None,
        created_at=now_iso(),
    )
    session.add(u)
    await session.flush()
    token = create_access_token(user_id, body.role)
    return {"token": token, "user": user_to_public(user_row(u))}


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginRequest, session: AsyncSession = Depends(get_db)):
    phone = normalize_phone(body.phone)
    u = await session.scalar(select(UserORM).where(UserORM.phone == phone))
    if not u or not verify_password(body.password, u.password_hash):
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    token = create_access_token(u.id, u.role)
    return {"token": token, "user": user_to_public(user_row(u))}


@api_router.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    ts = now_iso()
    await session.execute(update(UserORM).where(UserORM.id == user["id"]).values(last_seen=ts))
    user["last_seen"] = ts
    return user_to_public(user)


@api_router.get("/auth/stats")
async def my_stats(user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    if user["role"] == "specialist":
        applied = await session.scalar(
            select(func.count()).select_from(ApplicationORM).where(ApplicationORM.specialist_id == user["id"])
        ) or 0
        accepted = await session.scalar(
            select(func.count())
            .select_from(ApplicationORM)
            .where(ApplicationORM.specialist_id == user["id"], ApplicationORM.status == "accepted")
        ) or 0
        active_chats = await session.scalar(
            select(func.count()).select_from(ChatORM).where(ChatORM.specialist_id == user["id"])
        ) or 0
        return {
            "role": "specialist",
            "applied": applied,
            "accepted": accepted,
            "active_chats": active_chats,
            "rating": user.get("rating", 0.0),
            "reviews_count": user.get("reviews_count", 0),
        }
    posted = await session.scalar(
        select(func.count()).select_from(TaskORM).where(TaskORM.customer_id == user["id"])
    ) or 0
    open_tasks = await session.scalar(
        select(func.count()).select_from(TaskORM).where(TaskORM.customer_id == user["id"], TaskORM.status == "open")
    ) or 0
    in_progress = await session.scalar(
        select(func.count())
        .select_from(TaskORM)
        .where(TaskORM.customer_id == user["id"], TaskORM.status == "in_progress")
    ) or 0
    return {
        "role": "customer",
        "posted": posted,
        "open": open_tasks,
        "in_progress": in_progress,
    }


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"ok": True}


CATEGORIES = [
    {"id": "repair", "icon": "Wrench", "name_ru": "Ремонт и строительство", "name_ro": "Reparații și construcții"},
    {"id": "cleaning", "icon": "Sparkles", "name_ru": "Уборка", "name_ro": "Curățenie"},
    {"id": "beauty", "icon": "Scissors", "name_ru": "Красота и здоровье", "name_ro": "Frumusețe și sănătate"},
    {"id": "tutors", "icon": "GraduationCap", "name_ru": "Репетиторы", "name_ro": "Meditații"},
    {"id": "courier", "icon": "Package", "name_ru": "Курьеры и грузчики", "name_ro": "Curieri și hamali"},
    {"id": "auto", "icon": "Car", "name_ru": "Авто услуги", "name_ro": "Servicii auto"},
    {"id": "it", "icon": "Laptop", "name_ru": "IT и компьютеры", "name_ro": "IT și calculatoare"},
    {"id": "events", "icon": "PartyPopper", "name_ru": "Праздники и мероприятия", "name_ro": "Evenimente"},
    {"id": "pets", "icon": "PawPrint", "name_ru": "Уход за животными", "name_ro": "Îngrijirea animalelor"},
    {"id": "design", "icon": "Palette", "name_ru": "Дизайн", "name_ro": "Design"},
    {"id": "legal", "icon": "Scale", "name_ru": "Юридическая помощь", "name_ro": "Asistență juridică"},
    {"id": "other", "icon": "MoreHorizontal", "name_ru": "Другое", "name_ro": "Altele"},
]


@api_router.get("/categories")
async def get_categories(session: AsyncSession = Depends(get_db)):
    try:
        n = await session.scalar(select(func.count()).select_from(CategoryORM)) or 0
        if n == 0:
            return CATEGORIES
        res = await session.execute(select(CategoryORM).order_by(CategoryORM.id))
        items = []
        for c in res.scalars().all():
            items.append({"id": c.id, "icon": c.icon, "name_ru": c.name_ru, "name_ro": c.name_ro})
        return items if items else CATEGORIES
    except Exception:
        return CATEGORIES


async def task_to_public(session: AsyncSession, t: TaskORM, user_lat: Optional[float] = None, user_lng: Optional[float] = None) -> dict:
    apps_count = (
        await session.scalar(select(func.count()).select_from(ApplicationORM).where(ApplicationORM.task_id == t.id)) or 0
    )
    distance = None
    if user_lat is not None and user_lng is not None and t.lat is not None and t.lng is not None:
        distance = round(haversine(user_lat, user_lng, t.lat, t.lng), 1)
    return {
        "id": t.id,
        "title": t.title,
        "description": t.description,
        "category": t.category,
        "city": t.city,
        "address": t.address,
        "budget": t.budget,
        "deadline": t.deadline,
        "status": t.status,
        "customer_id": t.customer_id,
        "customer_name": t.customer_name,
        "applications_count": apps_count,
        "accepted_specialist_id": t.accepted_specialist_id,
        "lat": t.lat,
        "lng": t.lng,
        "photos": t.photos or [],
        "distance_km": distance,
        "created_at": t.created_at,
    }


@api_router.post("/tasks", response_model=TaskPublic)
async def create_task(body: TaskCreate, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    if user["role"] != "customer":
        raise HTTPException(status_code=403, detail="Only customers can post tasks")
    task_id = str(uuid.uuid4())
    t = TaskORM(
        id=task_id,
        title=body.title,
        description=body.description,
        category=body.category,
        city=body.city,
        address=body.address,
        budget=body.budget,
        deadline=body.deadline,
        status="open",
        customer_id=user["id"],
        customer_name=user["name"],
        accepted_specialist_id=None,
        lat=body.lat,
        lng=body.lng,
        photos=list(body.photos or []),
        created_at=now_iso(),
    )
    session.add(t)
    await session.flush()
    return await task_to_public(session, t)


@api_router.get("/tasks", response_model=List[TaskPublic])
async def list_tasks(
    session: AsyncSession = Depends(get_db),
    category: Optional[str] = None,
    city: Optional[str] = None,
    q: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    sort: Optional[str] = None,
):
    stmt = select(TaskORM).where(TaskORM.status == "open")
    if category:
        stmt = stmt.where(TaskORM.category == category)
    if city:
        stmt = stmt.where(TaskORM.city.ilike(f"%{city}%"))
    if q:
        pat = f"%{q}%"
        stmt = stmt.where(or_(TaskORM.title.ilike(pat), TaskORM.description.ilike(pat)))
    stmt = stmt.order_by(TaskORM.created_at.desc()).limit(200)
    res = await session.execute(stmt)
    tasks = list(res.scalars().all())
    results = [await task_to_public(session, t, lat, lng) for t in tasks]
    if sort == "distance" and lat is not None and lng is not None:
        results.sort(key=lambda r: (r["distance_km"] is None, r["distance_km"] or 0))
    elif lat is not None and lng is not None:
        results.sort(key=lambda r: (r["distance_km"] is None, r["distance_km"] if r["distance_km"] is not None else 1e9))
    return results[:100]


@api_router.get("/tasks/mine", response_model=List[TaskPublic])
async def my_tasks(user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    res = await session.execute(
        select(TaskORM).where(TaskORM.customer_id == user["id"]).order_by(TaskORM.created_at.desc()).limit(200)
    )
    tasks = list(res.scalars().all())
    return [await task_to_public(session, t) for t in tasks]


@api_router.get("/tasks/{task_id}", response_model=TaskPublic)
async def get_task(
    task_id: str,
    session: AsyncSession = Depends(get_db),
    lat: Optional[float] = None,
    lng: Optional[float] = None,
):
    t = await session.scalar(select(TaskORM).where(TaskORM.id == task_id))
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    return await task_to_public(session, t, lat, lng)


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    t = await session.scalar(select(TaskORM).where(TaskORM.id == task_id))
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    if t.customer_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not your task")
    await session.execute(delete(ApplicationORM).where(ApplicationORM.task_id == task_id))
    await session.execute(delete(TaskORM).where(TaskORM.id == task_id))
    return {"ok": True}


def app_to_public(a: ApplicationORM) -> dict:
    return {
        "id": a.id,
        "task_id": a.task_id,
        "task_title": a.task_title or "",
        "specialist_id": a.specialist_id,
        "specialist_name": a.specialist_name,
        "specialist_rating": a.specialist_rating or 0.0,
        "specialist_city": a.specialist_city,
        "message": a.message,
        "price": a.price,
        "status": a.status,
        "created_at": a.created_at,
    }


@api_router.post("/tasks/{task_id}/applications", response_model=ApplicationPublic)
async def apply_to_task(
    task_id: str,
    body: ApplicationCreate,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    if user["role"] != "specialist":
        raise HTTPException(status_code=403, detail="Only specialists can apply")
    task = await session.scalar(select(TaskORM).where(TaskORM.id == task_id))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status != "open":
        raise HTTPException(status_code=400, detail="Task no longer accepting applications")
    existing = await session.scalar(
        select(ApplicationORM).where(ApplicationORM.task_id == task_id, ApplicationORM.specialist_id == user["id"])
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already applied")
    app_id = str(uuid.uuid4())
    a = ApplicationORM(
        id=app_id,
        task_id=task_id,
        task_title=task.title,
        specialist_id=user["id"],
        specialist_name=user["name"],
        specialist_rating=user.get("rating", 0.0) or 0.0,
        specialist_city=user.get("city"),
        message=body.message,
        price=body.price,
        status="pending",
        created_at=now_iso(),
    )
    session.add(a)
    try:
        await session.flush()
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Already applied") from None
    return app_to_public(a)


@api_router.get("/tasks/{task_id}/applications", response_model=List[ApplicationPublic])
async def list_task_apps(task_id: str, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    task = await session.scalar(select(TaskORM).where(TaskORM.id == task_id))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.customer_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not your task")
    res = await session.execute(
        select(ApplicationORM).where(ApplicationORM.task_id == task_id).order_by(ApplicationORM.created_at.desc())
    )
    return [app_to_public(a) for a in res.scalars().all()]


@api_router.post("/applications/{app_id}/accept")
async def accept_application(app_id: str, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    a = await session.scalar(select(ApplicationORM).where(ApplicationORM.id == app_id))
    if not a:
        raise HTTPException(status_code=404, detail="Application not found")
    task = await session.scalar(select(TaskORM).where(TaskORM.id == a.task_id))
    if not task or task.customer_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")
    await session.execute(update(ApplicationORM).where(ApplicationORM.id == app_id).values(status="accepted"))
    await session.execute(
        update(ApplicationORM)
        .where(ApplicationORM.task_id == a.task_id, ApplicationORM.id != app_id)
        .values(status="rejected")
    )
    await session.execute(
        update(TaskORM)
        .where(TaskORM.id == a.task_id)
        .values(status="in_progress", accepted_specialist_id=a.specialist_id)
    )
    chat = await session.scalar(
        select(ChatORM).where(ChatORM.task_id == a.task_id, ChatORM.specialist_id == a.specialist_id)
    )
    if not chat:
        chat_id = str(uuid.uuid4())
        session.add(
            ChatORM(
                id=chat_id,
                task_id=a.task_id,
                task_title=task.title,
                customer_id=user["id"],
                customer_name=user["name"],
                specialist_id=a.specialist_id,
                specialist_name=a.specialist_name,
                last_message=None,
                last_message_at=None,
                created_at=now_iso(),
            )
        )
    return {"ok": True}


@api_router.get("/tasks/{task_id}/specialist-info")
async def task_specialist_info(task_id: str, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    if user["role"] != "specialist":
        raise HTTPException(status_code=403, detail="Specialists only")
    task = await session.scalar(select(TaskORM).where(TaskORM.id == task_id))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    my_app = await session.scalar(
        select(ApplicationORM).where(ApplicationORM.task_id == task_id, ApplicationORM.specialist_id == user["id"])
    )
    total_apps = (
        await session.scalar(select(func.count()).select_from(ApplicationORM).where(ApplicationORM.task_id == task_id))
        or 0
    )
    customer = await session.scalar(select(UserORM).where(UserORM.id == task.customer_id))
    user_rating = user.get("rating", 0.0) or 0.0
    rank_above = await session.scalar(
        select(func.count())
        .select_from(ApplicationORM)
        .where(ApplicationORM.task_id == task_id, ApplicationORM.specialist_rating > user_rating)
    ) or 0
    rank = rank_above + 1
    return {
        "has_applied": my_app is not None,
        "my_application": app_to_public(my_app) if my_app else None,
        "rank": rank if my_app else (total_apps + 1),
        "total_applications": total_apps,
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "avatar": customer.avatar,
            "last_seen": customer.last_seen or customer.created_at,
        }
        if customer
        else None,
    }


@api_router.get("/applications/mine", response_model=List[ApplicationPublic])
async def my_applications(user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    res = await session.execute(
        select(ApplicationORM)
        .where(ApplicationORM.specialist_id == user["id"])
        .order_by(ApplicationORM.created_at.desc())
        .limit(200)
    )
    return [app_to_public(a) for a in res.scalars().all()]


@api_router.get("/specialists/{user_id}", response_model=UserPublic)
async def get_specialist(user_id: str, session: AsyncSession = Depends(get_db)):
    u = await session.scalar(select(UserORM).where(UserORM.id == user_id, UserORM.role == "specialist"))
    if not u:
        raise HTTPException(status_code=404, detail="Specialist not found")
    return user_to_public(user_row(u))


@api_router.patch("/auth/profile", response_model=UserPublic)
async def update_profile(body: dict, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    allowed = {k: v for k, v in body.items() if k in ("name", "city", "bio", "services", "avatar", "lat", "lng")}
    if allowed:
        await session.execute(update(UserORM).where(UserORM.id == user["id"]).values(**allowed))
    u = await session.scalar(select(UserORM).where(UserORM.id == user["id"]))
    return user_to_public(user_row(u))


ALLOWED_EXT = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}


@api_router.post("/uploads")
async def upload_photo(file: UploadFile = File(...), user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    filename = file.filename or "file"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    content_type = ALLOWED_EXT[ext]
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 8MB)")
    storage_path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    result = put_object(storage_path, data, content_type)
    file_id = str(uuid.uuid4())
    rec = FileORM(
        id=file_id,
        storage_path=result.get("path", storage_path),
        original_filename=filename,
        content_type=content_type,
        size=len(data),
        owner_id=user["id"],
        is_deleted=False,
        created_at=now_iso(),
    )
    session.add(rec)
    await session.flush()
    return {"id": file_id, "path": rec.storage_path, "url": f"/api/files/{rec.storage_path}"}


@api_router.get("/files/{path:path}")
async def file_download(path: str, session: AsyncSession = Depends(get_db)):
    record = await session.scalar(select(FileORM).where(FileORM.storage_path == path, FileORM.is_deleted.is_(False)))
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, content_type = get_object(path)
    return Response(content=data, media_type=record.content_type or content_type)


STORIES = [
    {"id": "spring", "title_ru": "Что всплывает весной?", "title_ro": "Ce iese la iveală primăvara?", "color": "#9DB2C4", "icon": "Sun"},
    {"id": "moments", "title_ru": "Ради таких моментов", "title_ro": "Pentru astfel de momente", "color": "#A4B9D1", "icon": "Sparkles"},
    {"id": "now", "title_ru": "Здесь и сейчас", "title_ro": "Aici și acum", "color": "#B8C7DC", "icon": "Hourglass"},
    {"id": "value", "title_ru": "Цена оправдана на 100%", "title_ro": "Preț justificat 100%", "color": "#C8D2E1", "icon": "PiggyBank"},
]


@api_router.get("/stories")
async def get_stories():
    return STORIES


def chat_to_public(c: ChatORM) -> dict:
    return {
        "id": c.id,
        "task_id": c.task_id,
        "task_title": c.task_title,
        "customer_id": c.customer_id,
        "customer_name": c.customer_name,
        "specialist_id": c.specialist_id,
        "specialist_name": c.specialist_name,
        "last_message": c.last_message,
        "last_message_at": c.last_message_at,
        "created_at": c.created_at,
    }


@api_router.get("/chats", response_model=List[ChatPublic])
async def list_chats(status: Optional[str] = None, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    stmt = select(ChatORM).where(or_(ChatORM.customer_id == user["id"], ChatORM.specialist_id == user["id"]))
    # SQLite: без NULLS LAST — сначала чаты с датой последнего сообщения
    stmt = stmt.order_by(ChatORM.last_message_at.is_(None).asc(), ChatORM.last_message_at.desc(), ChatORM.created_at.desc())
    res = await session.execute(stmt)
    chats = list(res.scalars().all())
    out: List[dict] = []
    for c in chats:
        task = await session.scalar(select(TaskORM).where(TaskORM.id == c.task_id))
        task_status = task.status if task else "archived"
        c_pub = chat_to_public(c)
        c_pub["task_status"] = task_status
        if status:
            if status == "open" and task_status != "open":
                continue
            if status == "in_progress" and task_status != "in_progress":
                continue
            if status == "completed" and task_status != "completed":
                continue
            if status == "archived" and task_status not in ("archived",):
                continue
        out.append(c_pub)
    return out


@api_router.get("/chats/{chat_id}", response_model=ChatPublic)
async def get_chat(chat_id: str, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    c = await session.scalar(select(ChatORM).where(ChatORM.id == chat_id))
    if not c:
        raise HTTPException(status_code=404, detail="Chat not found")
    if user["id"] not in (c.customer_id, c.specialist_id):
        raise HTTPException(status_code=403, detail="Not your chat")
    return chat_to_public(c)


@api_router.get("/chats/{chat_id}/messages", response_model=List[MessagePublic])
async def get_messages(chat_id: str, user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    c = await session.scalar(select(ChatORM).where(ChatORM.id == chat_id))
    if not c:
        raise HTTPException(status_code=404, detail="Chat not found")
    if user["id"] not in (c.customer_id, c.specialist_id):
        raise HTTPException(status_code=403, detail="Not your chat")
    res = await session.execute(select(MessageORM).where(MessageORM.chat_id == chat_id).order_by(MessageORM.created_at))
    rows = []
    for m in res.scalars().all():
        rows.append(
            {
                "id": m.id,
                "chat_id": m.chat_id,
                "sender_id": m.sender_id,
                "sender_name": m.sender_name,
                "text": m.text,
                "created_at": m.created_at,
            }
        )
    return rows


@api_router.post("/chats/{chat_id}/messages", response_model=MessagePublic)
async def send_message(
    chat_id: str,
    body: MessageCreate,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    c = await session.scalar(select(ChatORM).where(ChatORM.id == chat_id))
    if not c:
        raise HTTPException(status_code=404, detail="Chat not found")
    if user["id"] not in (c.customer_id, c.specialist_id):
        raise HTTPException(status_code=403, detail="Not your chat")
    msg_id = str(uuid.uuid4())
    ts = now_iso()
    msg = MessageORM(
        id=msg_id,
        chat_id=chat_id,
        sender_id=user["id"],
        sender_name=user["name"],
        text=body.text,
        created_at=ts,
    )
    session.add(msg)
    await session.execute(
        update(ChatORM).where(ChatORM.id == chat_id).values(last_message=body.text, last_message_at=ts)
    )
    return {
        "id": msg_id,
        "chat_id": chat_id,
        "sender_id": user["id"],
        "sender_name": user["name"],
        "text": body.text,
        "created_at": ts,
    }


@api_router.get("/specialists", response_model=List[UserPublic])
async def list_specialists(city: Optional[str] = None, session: AsyncSession = Depends(get_db)):
    stmt = select(UserORM).where(UserORM.role == "specialist")
    if city:
        stmt = stmt.where(UserORM.city.ilike(f"%{city}%"))
    stmt = stmt.limit(100)
    res = await session.execute(stmt)
    return [user_to_public(user_row(u)) for u in res.scalars().all()]


@api_router.get("/")
async def root():
    return {"status": "ok", "service": "marketplace-api"}


@app.get("/health")
async def health():
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ok", "env": APP_ENV, "database": "connected"}
    except Exception as e:
        return {"status": "ok", "env": APP_ENV, "database": "degraded", "database_error": str(e)[:500]}


async def seed_test_user(session: AsyncSession) -> None:
    phone = "+79031416581"
    password = "Test12345!"
    extra = {
        "email": "sale@sancan.ru",
        "first_name": "Test",
        "last_name": "User",
        "email_verified": True,
        "is_test_user": True,
        "tester_role": "tester",
        "status": "active",
    }
    existing = await session.scalar(select(UserORM).where(UserORM.phone == phone))
    if existing:
        await session.execute(
            update(UserORM)
            .where(UserORM.phone == phone)
            .values(
                password_hash=hash_password(password),
                name="Test User",
                role="customer",
                city="Москва",
                **extra,
            )
        )
        logging.info("Test user refreshed: %s", phone)
        return
    u = UserORM(
        id=str(uuid.uuid4()),
        phone=phone,
        password_hash=hash_password(password),
        name="Test User",
        role="customer",
        city="Москва",
        rating=5.0,
        reviews_count=0,
        bio="QA / test account",
        services=[],
        avatar=None,
        lat=55.7558,
        lng=37.6173,
        created_at=now_iso(),
        **extra,
    )
    session.add(u)
    logging.info("Test user created: %s", phone)


ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "admin")


async def verify_admin(x_admin_token: Optional[str] = Header(default=None)):
    if (x_admin_token or "").strip() != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid admin token")
    return True


admin_router = APIRouter(prefix="/api/admin", dependencies=[Depends(verify_admin)])


class AdminUserCreate(BaseModel):
    phone: str
    password: str
    name: str
    role: str
    city: Optional[str] = None
    email: Optional[str] = None


class AdminCategoryCreate(BaseModel):
    id: str
    icon: str = "MoreHorizontal"
    name_ru: str
    name_ro: str


class AdminFilterCreate(BaseModel):
    id: Optional[str] = None
    name: str
    key: str
    value: str


class AdminFilterUpdate(BaseModel):
    name: Optional[str] = None
    key: Optional[str] = None
    value: Optional[str] = None


def admin_user_dict(u: UserORM) -> dict:
    d = user_row(u)
    d.pop("password_hash", None)
    return d


@admin_router.get("/stats")
async def admin_stats(session: AsyncSession = Depends(get_db)):
    users = await session.scalar(select(func.count()).select_from(UserORM)) or 0
    categories = await session.scalar(select(func.count()).select_from(CategoryORM)) or 0
    filters = await session.scalar(select(func.count()).select_from(FilterORM)) or 0
    return {"users": users, "categories": categories, "filters": filters}


@admin_router.get("/users")
async def admin_list_users(session: AsyncSession = Depends(get_db)):
    res = await session.execute(select(UserORM).order_by(UserORM.created_at.desc()).limit(500))
    return [admin_user_dict(u) for u in res.scalars().all()]


@admin_router.post("/users")
async def admin_create_user(body: AdminUserCreate, session: AsyncSession = Depends(get_db)):
    if body.role not in ("customer", "specialist", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    if len(body.password) < 4:
        raise HTTPException(status_code=400, detail="Password too short")
    phone = normalize_phone(body.phone)
    if await session.scalar(select(UserORM).where(UserORM.phone == phone)):
        raise HTTPException(status_code=400, detail="Phone already registered")
    user_id = str(uuid.uuid4())
    u = UserORM(
        id=user_id,
        phone=phone,
        password_hash=hash_password(body.password),
        name=body.name,
        role=body.role,
        city=body.city,
        rating=0.0,
        reviews_count=0,
        bio=None,
        services=[],
        avatar=None,
        created_at=now_iso(),
        email=str(body.email).strip() if body.email and str(body.email).strip() else None,
    )
    session.add(u)
    await session.flush()
    return admin_user_dict(u)


@admin_router.delete("/users/{user_id}")
async def admin_delete_user(user_id: str, session: AsyncSession = Depends(get_db)):
    r = await session.execute(delete(UserORM).where(UserORM.id == user_id))
    if r.rowcount == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


@admin_router.get("/categories")
async def admin_list_categories(session: AsyncSession = Depends(get_db)):
    res = await session.execute(select(CategoryORM).order_by(CategoryORM.id))
    return [{"id": c.id, "icon": c.icon, "name_ru": c.name_ru, "name_ro": c.name_ro} for c in res.scalars().all()]


@admin_router.post("/categories")
async def admin_create_category(body: AdminCategoryCreate, session: AsyncSession = Depends(get_db)):
    cid = body.id.strip()
    if not cid:
        raise HTTPException(status_code=400, detail="Invalid id")
    if await session.scalar(select(CategoryORM).where(CategoryORM.id == cid)):
        raise HTTPException(status_code=400, detail="Category id exists")
    c = CategoryORM(id=cid, icon=body.icon, name_ru=body.name_ru, name_ro=body.name_ro)
    session.add(c)
    await session.flush()
    return {"id": c.id, "icon": c.icon, "name_ru": c.name_ru, "name_ro": c.name_ro}


@admin_router.delete("/categories/{category_id}")
async def admin_delete_category(category_id: str, session: AsyncSession = Depends(get_db)):
    r = await session.execute(delete(CategoryORM).where(CategoryORM.id == category_id))
    if r.rowcount == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"ok": True}


@admin_router.get("/filters")
async def admin_list_filters(session: AsyncSession = Depends(get_db)):
    res = await session.execute(select(FilterORM).order_by(FilterORM.created_at.desc()).limit(500))
    return [
        {"id": f.id, "name": f.name, "key": f.key, "value": f.value, "created_at": f.created_at}
        for f in res.scalars().all()
    ]


@admin_router.post("/filters")
async def admin_create_filter(body: AdminFilterCreate, session: AsyncSession = Depends(get_db)):
    fid = (body.id or "").strip() or str(uuid.uuid4())
    if await session.scalar(select(FilterORM).where(FilterORM.id == fid)):
        raise HTTPException(status_code=400, detail="Filter id exists")
    f = FilterORM(id=fid, name=body.name, key=body.key, value=body.value, created_at=now_iso())
    session.add(f)
    await session.flush()
    return {"id": f.id, "name": f.name, "key": f.key, "value": f.value, "created_at": f.created_at}


@admin_router.put("/filters/{filter_id}")
async def admin_update_filter(filter_id: str, body: AdminFilterUpdate, session: AsyncSession = Depends(get_db)):
    patch = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not patch:
        raise HTTPException(status_code=400, detail="Nothing to update")
    r = await session.execute(update(FilterORM).where(FilterORM.id == filter_id).values(**patch))
    if r.rowcount == 0:
        raise HTTPException(status_code=404, detail="Filter not found")
    row = await session.scalar(select(FilterORM).where(FilterORM.id == filter_id))
    return {"id": row.id, "name": row.name, "key": row.key, "value": row.value, "created_at": row.created_at}


@admin_router.delete("/filters/{filter_id}")
async def admin_delete_filter(filter_id: str, session: AsyncSession = Depends(get_db)):
    r = await session.execute(delete(FilterORM).where(FilterORM.id == filter_id))
    if r.rowcount == 0:
        raise HTTPException(status_code=404, detail="Filter not found")
    return {"ok": True}


async def _execute_seed() -> dict[str, Any]:
    from seed import run_seed as _run_seed

    async with async_session_maker() as session:
        try:
            out = await _run_seed(session, hash_password, now_iso, normalize_phone)
            await session.commit()
            return out
        except Exception:
            await session.rollback()
            raise


@admin_router.post("/seed")
async def admin_seed_post():
    return {"status": "seed completed", "summary": await _execute_seed()}


admin_browser_router = APIRouter(prefix="/admin", dependencies=[Depends(verify_admin)])


@admin_browser_router.post("/seed")
async def admin_seed_alias():
    return {"status": "seed completed", "summary": await _execute_seed()}


@api_router.get("/users", dependencies=[Depends(verify_admin)])
async def api_list_users_compact(session: AsyncSession = Depends(get_db)):
    res = await session.execute(select(UserORM).order_by(UserORM.created_at.desc()).limit(500))
    return [
        {
            "id": u.id,
            "email": u.email,
            "phone": u.phone,
            "name": u.name,
            "role": u.role,
        }
        for u in res.scalars().all()
    ]


@api_router.post("/users", dependencies=[Depends(verify_admin)])
async def api_create_user_alias(body: AdminUserCreate, session: AsyncSession = Depends(get_db)):
    return await admin_create_user(body, session)


@api_router.delete("/users/{user_id}", dependencies=[Depends(verify_admin)])
async def api_delete_user_alias(user_id: str, session: AsyncSession = Depends(get_db)):
    await admin_delete_user(user_id, session)
    return {"status": "deleted"}


@api_router.post("/categories", dependencies=[Depends(verify_admin)])
async def api_create_category_alias(body: AdminCategoryCreate, session: AsyncSession = Depends(get_db)):
    doc = await admin_create_category(body, session)
    return {"status": "created", "category": doc}


@api_router.delete("/categories/{category_id}", dependencies=[Depends(verify_admin)])
async def api_delete_category_alias(category_id: str, session: AsyncSession = Depends(get_db)):
    await admin_delete_category(category_id, session)
    return {"status": "deleted"}


@api_router.get("/filters", dependencies=[Depends(verify_admin)])
async def api_list_filters_alias(session: AsyncSession = Depends(get_db)):
    return await admin_list_filters(session)


@api_router.post("/filters", dependencies=[Depends(verify_admin)])
async def api_create_filter_alias(body: AdminFilterCreate, session: AsyncSession = Depends(get_db)):
    doc = await admin_create_filter(body, session)
    return {"status": "created", "filter": doc}


@api_router.delete("/filters/{filter_id}", dependencies=[Depends(verify_admin)])
async def api_delete_filter_alias(filter_id: str, session: AsyncSession = Depends(get_db)):
    await admin_delete_filter(filter_id, session)
    return {"status": "deleted"}


app.include_router(admin_browser_router)
app.include_router(admin_router)
app.include_router(api_router)


def parse_cors_origins() -> List[str]:
    raw = (os.environ.get("CORS_ORIGINS") or "").strip()
    if raw:
        items = [i.strip() for i in raw.split(",") if i.strip()]
        if items:
            return items
    defaults = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
    ]
    frontend_url = (os.environ.get("FRONTEND_URL") or "").strip()
    if frontend_url:
        defaults.append(frontend_url)
    return defaults


cors_origins = parse_cors_origins()
allow_all_origins = "*" in cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_credentials=not allow_all_origins,
    allow_origins=["*"] if allow_all_origins else cors_origins,
    allow_origin_regex=None if allow_all_origins else os.environ.get("CORS_ORIGIN_REGEX"),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("SQLite schema ready (DATABASE_URL=%s)", os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./app.db"))
    init_storage()
    if os.environ.get("ENABLE_TEST_SEED", "false").lower() == "true":
        async with async_session_maker() as session:
            await seed_test_user(session)
            await session.commit()


@app.on_event("shutdown")
async def shutdown_engine():
    await engine.dispose()


if __name__ == "__main__":
    import socket
    import uvicorn

    def _env_int(name: str, default: int) -> int:
        raw = os.environ.get(name, "")
        if raw is None or not str(raw).strip():
            return default
        try:
            return int(str(raw).strip())
        except ValueError:
            return default

    host = os.environ.get("HOST", "0.0.0.0")
    port = _env_int("PORT", 8001)
    bind_check = "127.0.0.1" if host in ("0.0.0.0", "::", "") else host.replace("[", "").replace("]", "")
    if bind_check == "::":
        bind_check = "127.0.0.1"
    probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        probe.bind((bind_check, port))
    except OSError as e:
        logger.error("Port %s:%s already in use or not bindable: %s", bind_check, port, e)
        raise SystemExit(1) from e
    finally:
        probe.close()
    reload_enabled = os.environ.get("RELOAD", "false" if IS_PROD else "true").lower() == "true"
    uvicorn.run("server:app", host=host, port=port, reload=reload_enabled)
