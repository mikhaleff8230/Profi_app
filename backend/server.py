from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
import math
import requests
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Header, Query
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure, NetworkTimeout, ServerSelectionTimeoutError
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name, "")
    if raw is None or not str(raw).strip():
        return default
    try:
        return int(str(raw).strip())
    except ValueError:
        logger.warning("Invalid integer for %s=%r, using default %s", name, raw, default)
        return default


def _mongo_uri() -> str:
    raw = (os.environ.get("MONGO_URL") or "mongodb://localhost:27017").strip()
    if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in "\"'":
        raw = raw[1:-1].strip()
    return raw or "mongodb://localhost:27017"


# ---------- Config ----------
APP_ENV = os.environ.get("APP_ENV", "development").lower()
IS_PROD = APP_ENV == "production"

# ---------- Mongo ----------
mongo_url = _mongo_uri()
mongo_pool_size = _env_int("MONGO_MAX_POOL_SIZE", 20)
mongo_server_selection_ms = _env_int("MONGO_SERVER_SELECTION_TIMEOUT_MS", 10000)
client = AsyncIOMotorClient(
    mongo_url,
    maxPoolSize=mongo_pool_size,
    minPoolSize=1,
    serverSelectionTimeoutMS=mongo_server_selection_ms,
)
db = client[os.environ.get("DB_NAME", "test_database")]

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-jwt-secret-change-me")

# Object storage
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
        logging.error(f"Storage init failed: {e}")
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 403:
        # Refresh key and retry once
        global _storage_key
        _storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60,
    )
    if resp.status_code == 403:
        global _storage_key
        _storage_key = None
        key = init_storage()
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key}, timeout=60,
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


# ---------- Helpers ----------
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


# ---------- Models ----------
class RegisterRequest(BaseModel):
    phone: str
    password: str
    name: str
    role: str  # "customer" | "specialist"
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
    deadline: Optional[str] = None  # ISO date
    lat: Optional[float] = None
    lng: Optional[float] = None
    photos: List[str] = []  # storage paths


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
    photos: List[str] = []
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
    status: str  # pending | accepted | rejected
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


# ---------- App ----------
app = FastAPI(
    title="Marketplace API",
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None if IS_PROD else "/redoc",
)


async def _mongo_unavailable_handler(request: Request, exc: Exception):
    logger.warning("Mongo driver error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=503,
        content={"detail": "Database unavailable", "error": type(exc).__name__, "message": str(exc)},
    )


for _exc_cls in (ServerSelectionTimeoutError, ConnectionFailure, NetworkTimeout):
    app.add_exception_handler(_exc_cls, _mongo_unavailable_handler)

api_router = APIRouter(prefix="/api")


# ---------- Auth dep ----------
async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else None
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


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


# ---------- Auth Routes ----------
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(body: RegisterRequest):
    if body.role not in ("customer", "specialist"):
        raise HTTPException(status_code=400, detail="Invalid role")
    if len(body.password) < 4:
        raise HTTPException(status_code=400, detail="Password too short")
    phone = normalize_phone(body.phone)
    existing = await db.users.find_one({"phone": phone})
    if existing:
        raise HTTPException(status_code=400, detail="Phone already registered")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "phone": phone,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": body.role,
        "city": body.city,
        "rating": 0.0,
        "reviews_count": 0,
        "bio": None,
        "services": [],
        "avatar": None,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc)
    token = create_access_token(user_id, body.role)
    return {"token": token, "user": user_to_public(user_doc)}


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    phone = normalize_phone(body.phone)
    user = await db.users.find_one({"phone": phone}, {"_id": 0})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    token = create_access_token(user["id"], user["role"])
    return {"token": token, "user": user_to_public(user)}


@api_router.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    ts = now_iso()
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_seen": ts}})
    user["last_seen"] = ts
    return user_to_public(user)


@api_router.get("/auth/stats")
async def my_stats(user: dict = Depends(get_current_user)):
    if user["role"] == "specialist":
        applied = await db.applications.count_documents({"specialist_id": user["id"]})
        accepted = await db.applications.count_documents({"specialist_id": user["id"], "status": "accepted"})
        active_chats = await db.chats.count_documents({"specialist_id": user["id"]})
        return {
            "role": "specialist",
            "applied": applied,
            "accepted": accepted,
            "active_chats": active_chats,
            "rating": user.get("rating", 0.0),
            "reviews_count": user.get("reviews_count", 0),
        }
    posted = await db.tasks.count_documents({"customer_id": user["id"]})
    open_tasks = await db.tasks.count_documents({"customer_id": user["id"], "status": "open"})
    in_progress = await db.tasks.count_documents({"customer_id": user["id"], "status": "in_progress"})
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


# ---------- Categories ----------
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
async def get_categories():
    try:
        if await db.categories.count_documents({}) == 0:
            return CATEGORIES
        cursor = db.categories.find({}, {"_id": 0}).sort("id", 1)
        items = await cursor.to_list(500)
        return items if items else CATEGORIES
    except Exception:
        return CATEGORIES


# ---------- Tasks ----------
async def task_to_public(t: dict, user_lat: Optional[float] = None, user_lng: Optional[float] = None) -> dict:
    apps_count = await db.applications.count_documents({"task_id": t["id"]})
    distance = None
    if user_lat is not None and user_lng is not None and t.get("lat") is not None and t.get("lng") is not None:
        distance = round(haversine(user_lat, user_lng, t["lat"], t["lng"]), 1)
    return {
        "id": t["id"],
        "title": t["title"],
        "description": t["description"],
        "category": t["category"],
        "city": t["city"],
        "address": t.get("address"),
        "budget": t.get("budget"),
        "deadline": t.get("deadline"),
        "status": t["status"],
        "customer_id": t["customer_id"],
        "customer_name": t["customer_name"],
        "applications_count": apps_count,
        "accepted_specialist_id": t.get("accepted_specialist_id"),
        "lat": t.get("lat"),
        "lng": t.get("lng"),
        "photos": t.get("photos", []),
        "distance_km": distance,
        "created_at": t["created_at"],
    }


@api_router.post("/tasks", response_model=TaskPublic)
async def create_task(body: TaskCreate, user: dict = Depends(get_current_user)):
    if user["role"] != "customer":
        raise HTTPException(status_code=403, detail="Only customers can post tasks")
    task_id = str(uuid.uuid4())
    doc = {
        "id": task_id,
        "title": body.title,
        "description": body.description,
        "category": body.category,
        "city": body.city,
        "address": body.address,
        "budget": body.budget,
        "deadline": body.deadline,
        "status": "open",
        "customer_id": user["id"],
        "customer_name": user["name"],
        "accepted_specialist_id": None,
        "lat": body.lat,
        "lng": body.lng,
        "photos": body.photos or [],
        "created_at": now_iso(),
    }
    await db.tasks.insert_one(doc)
    return await task_to_public(doc)


@api_router.get("/tasks", response_model=List[TaskPublic])
async def list_tasks(
    category: Optional[str] = None,
    city: Optional[str] = None,
    q: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    sort: Optional[str] = None,
):
    query: dict = {"status": "open"}
    if category:
        query["category"] = category
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]
    cursor = db.tasks.find(query, {"_id": 0}).sort("created_at", -1).limit(200)
    tasks = await cursor.to_list(200)
    results = [await task_to_public(t, lat, lng) for t in tasks]
    if sort == "distance" and lat is not None and lng is not None:
        results.sort(key=lambda r: (r["distance_km"] is None, r["distance_km"] or 0))
    elif lat is not None and lng is not None:
        # default: distance-aware when location provided
        results.sort(key=lambda r: (r["distance_km"] is None, r["distance_km"] if r["distance_km"] is not None else 1e9))
    return results[:100]


@api_router.get("/tasks/mine", response_model=List[TaskPublic])
async def my_tasks(user: dict = Depends(get_current_user)):
    cursor = db.tasks.find({"customer_id": user["id"]}, {"_id": 0}).sort("created_at", -1)
    tasks = await cursor.to_list(200)
    return [await task_to_public(t) for t in tasks]


@api_router.get("/tasks/{task_id}", response_model=TaskPublic)
async def get_task(task_id: str, lat: Optional[float] = None, lng: Optional[float] = None):
    t = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    return await task_to_public(t, lat, lng)


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    t = await db.tasks.find_one({"id": task_id})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    if t["customer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your task")
    await db.tasks.delete_one({"id": task_id})
    await db.applications.delete_many({"task_id": task_id})
    return {"ok": True}


# ---------- Applications ----------
def app_to_public(a: dict) -> dict:
    return {
        "id": a["id"],
        "task_id": a["task_id"],
        "task_title": a.get("task_title", ""),
        "specialist_id": a["specialist_id"],
        "specialist_name": a["specialist_name"],
        "specialist_rating": a.get("specialist_rating", 0.0),
        "specialist_city": a.get("specialist_city"),
        "message": a["message"],
        "price": a.get("price"),
        "status": a["status"],
        "created_at": a["created_at"],
    }


@api_router.post("/tasks/{task_id}/applications", response_model=ApplicationPublic)
async def apply_to_task(task_id: str, body: ApplicationCreate, user: dict = Depends(get_current_user)):
    if user["role"] != "specialist":
        raise HTTPException(status_code=403, detail="Only specialists can apply")
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task["status"] != "open":
        raise HTTPException(status_code=400, detail="Task no longer accepting applications")
    existing = await db.applications.find_one({"task_id": task_id, "specialist_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Already applied")
    app_id = str(uuid.uuid4())
    doc = {
        "id": app_id,
        "task_id": task_id,
        "task_title": task["title"],
        "specialist_id": user["id"],
        "specialist_name": user["name"],
        "specialist_rating": user.get("rating", 0.0),
        "specialist_city": user.get("city"),
        "message": body.message,
        "price": body.price,
        "status": "pending",
        "created_at": now_iso(),
    }
    await db.applications.insert_one(doc)
    return app_to_public(doc)


@api_router.get("/tasks/{task_id}/applications", response_model=List[ApplicationPublic])
async def list_task_apps(task_id: str, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task["customer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your task")
    cursor = db.applications.find({"task_id": task_id}, {"_id": 0}).sort("created_at", -1)
    apps = await cursor.to_list(200)
    return [app_to_public(a) for a in apps]


@api_router.post("/applications/{app_id}/accept")
async def accept_application(app_id: str, user: dict = Depends(get_current_user)):
    a = await db.applications.find_one({"id": app_id}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Application not found")
    task = await db.tasks.find_one({"id": a["task_id"]})
    if not task or task["customer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.applications.update_one({"id": app_id}, {"$set": {"status": "accepted"}})
    await db.applications.update_many(
        {"task_id": a["task_id"], "id": {"$ne": app_id}},
        {"$set": {"status": "rejected"}},
    )
    await db.tasks.update_one(
        {"id": a["task_id"]},
        {"$set": {"status": "in_progress", "accepted_specialist_id": a["specialist_id"]}},
    )
    # Create chat
    chat = await db.chats.find_one({"task_id": a["task_id"], "specialist_id": a["specialist_id"]}, {"_id": 0})
    if not chat:
        chat_id = str(uuid.uuid4())
        chat_doc = {
            "id": chat_id,
            "task_id": a["task_id"],
            "task_title": task["title"],
            "customer_id": user["id"],
            "customer_name": user["name"],
            "specialist_id": a["specialist_id"],
            "specialist_name": a["specialist_name"],
            "last_message": None,
            "last_message_at": None,
            "created_at": now_iso(),
        }
        await db.chats.insert_one(chat_doc)
    return {"ok": True}


@api_router.get("/tasks/{task_id}/specialist-info")
async def task_specialist_info(task_id: str, user: dict = Depends(get_current_user)):
    """Return application info for the current specialist on a given task."""
    if user["role"] != "specialist":
        raise HTTPException(status_code=403, detail="Specialists only")
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    my_app = await db.applications.find_one({"task_id": task_id, "specialist_id": user["id"]}, {"_id": 0})
    total_apps = await db.applications.count_documents({"task_id": task_id})
    customer = await db.users.find_one({"id": task["customer_id"]}, {"_id": 0})
    # Rank by specialist rating (descending) — specialists with higher rating rank first
    user_rating = user.get("rating", 0.0)
    rank_query = {"task_id": task_id, "specialist_rating": {"$gt": user_rating}}
    rank_above = await db.applications.count_documents(rank_query)
    rank = rank_above + 1
    return {
        "has_applied": my_app is not None,
        "my_application": app_to_public(my_app) if my_app else None,
        "rank": rank if my_app else (total_apps + 1),
        "total_applications": total_apps,
        "customer": {
            "id": customer["id"],
            "name": customer["name"],
            "avatar": customer.get("avatar"),
            "last_seen": customer.get("last_seen", customer.get("created_at")),
        } if customer else None,
    }


@api_router.get("/applications/mine", response_model=List[ApplicationPublic])
async def my_applications(user: dict = Depends(get_current_user)):
    cursor = db.applications.find({"specialist_id": user["id"]}, {"_id": 0}).sort("created_at", -1)
    apps = await cursor.to_list(200)
    return [app_to_public(a) for a in apps]


# ---------- Specialist Public Profile ----------
@api_router.get("/specialists/{user_id}", response_model=UserPublic)
async def get_specialist(user_id: str):
    u = await db.users.find_one({"id": user_id, "role": "specialist"}, {"_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="Specialist not found")
    return user_to_public(u)


@api_router.patch("/auth/profile", response_model=UserPublic)
async def update_profile(body: dict, user: dict = Depends(get_current_user)):
    allowed = {k: v for k, v in body.items() if k in ("name", "city", "bio", "services", "avatar", "lat", "lng")}
    if allowed:
        await db.users.update_one({"id": user["id"]}, {"$set": allowed})
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return user_to_public(u)


# ---------- Photo Upload ----------
ALLOWED_EXT = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}


@api_router.post("/uploads")
async def upload_photo(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
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
    rec = {
        "id": file_id,
        "storage_path": result.get("path", storage_path),
        "original_filename": filename,
        "content_type": content_type,
        "size": len(data),
        "owner_id": user["id"],
        "is_deleted": False,
        "created_at": now_iso(),
    }
    await db.files.insert_one(rec)
    return {"id": file_id, "path": rec["storage_path"], "url": f"/api/files/{rec['storage_path']}"}


@api_router.get("/files/{path:path}")
async def file_download(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, content_type = get_object(path)
    return Response(content=data, media_type=record.get("content_type", content_type))


# ---------- Stories (static banners) ----------
STORIES = [
    {"id": "spring", "title_ru": "Что всплывает весной?", "title_ro": "Ce iese la iveală primăvara?", "color": "#9DB2C4", "icon": "Sun"},
    {"id": "moments", "title_ru": "Ради таких моментов", "title_ro": "Pentru astfel de momente", "color": "#A4B9D1", "icon": "Sparkles"},
    {"id": "now", "title_ru": "Здесь и сейчас", "title_ro": "Aici și acum", "color": "#B8C7DC", "icon": "Hourglass"},
    {"id": "value", "title_ru": "Цена оправдана на 100%", "title_ro": "Preț justificat 100%", "color": "#C8D2E1", "icon": "PiggyBank"},
]


@api_router.get("/stories")
async def get_stories():
    return STORIES


# ---------- Chats ----------
def chat_to_public(c: dict) -> dict:
    return {
        "id": c["id"],
        "task_id": c["task_id"],
        "task_title": c["task_title"],
        "customer_id": c["customer_id"],
        "customer_name": c["customer_name"],
        "specialist_id": c["specialist_id"],
        "specialist_name": c["specialist_name"],
        "last_message": c.get("last_message"),
        "last_message_at": c.get("last_message_at"),
        "created_at": c["created_at"],
    }


@api_router.get("/chats", response_model=List[ChatPublic])
async def list_chats(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"$or": [{"customer_id": user["id"]}, {"specialist_id": user["id"]}]}
    cursor = db.chats.find(query, {"_id": 0}).sort("last_message_at", -1)
    chats = await cursor.to_list(500)
    # Enrich with linked task status and filter
    out: List[dict] = []
    for c in chats:
        task = await db.tasks.find_one({"id": c["task_id"]}, {"_id": 0, "status": 1})
        task_status = task["status"] if task else "archived"
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
async def get_chat(chat_id: str, user: dict = Depends(get_current_user)):
    c = await db.chats.find_one({"id": chat_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Chat not found")
    if user["id"] not in (c["customer_id"], c["specialist_id"]):
        raise HTTPException(status_code=403, detail="Not your chat")
    return chat_to_public(c)


@api_router.get("/chats/{chat_id}/messages", response_model=List[MessagePublic])
async def get_messages(chat_id: str, user: dict = Depends(get_current_user)):
    c = await db.chats.find_one({"id": chat_id})
    if not c:
        raise HTTPException(status_code=404, detail="Chat not found")
    if user["id"] not in (c["customer_id"], c["specialist_id"]):
        raise HTTPException(status_code=403, detail="Not your chat")
    cursor = db.messages.find({"chat_id": chat_id}, {"_id": 0}).sort("created_at", 1)
    return await cursor.to_list(1000)


@api_router.post("/chats/{chat_id}/messages", response_model=MessagePublic)
async def send_message(chat_id: str, body: MessageCreate, user: dict = Depends(get_current_user)):
    c = await db.chats.find_one({"id": chat_id})
    if not c:
        raise HTTPException(status_code=404, detail="Chat not found")
    if user["id"] not in (c["customer_id"], c["specialist_id"]):
        raise HTTPException(status_code=403, detail="Not your chat")
    msg_id = str(uuid.uuid4())
    msg_doc = {
        "id": msg_id,
        "chat_id": chat_id,
        "sender_id": user["id"],
        "sender_name": user["name"],
        "text": body.text,
        "created_at": now_iso(),
    }
    await db.messages.insert_one(msg_doc)
    await db.chats.update_one(
        {"id": chat_id},
        {"$set": {"last_message": body.text, "last_message_at": msg_doc["created_at"]}},
    )
    return msg_doc


# ---------- Specialists list (for category browsing — optional) ----------
@api_router.get("/specialists", response_model=List[UserPublic])
async def list_specialists(city: Optional[str] = None):
    query: dict = {"role": "specialist"}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    cursor = db.users.find(query, {"_id": 0, "password_hash": 0}).limit(100)
    users = await cursor.to_list(100)
    return [user_to_public(u) for u in users]


# ---------- Health ----------
@api_router.get("/")
async def root():
    return {"status": "ok", "service": "marketplace-api"}


@app.get("/health")
async def health():
    mongo = getattr(app.state, "mongo_ok", None)
    if mongo is True:
        m = "connected"
    elif mongo is False:
        m = "degraded"
    else:
        m = "starting"
    return {"status": "ok", "env": APP_ENV, "mongo": m}


async def _ensure_unique_id_index(collection_name: str) -> None:
    try:
        await db[collection_name].create_index("id", unique=True)
    except Exception as e:
        logger.warning("create_index(%s id unique): %s", collection_name, e)


# ---------- Startup ----------
@app.on_event("startup")
async def on_startup():
    app.state.mongo_ok = False
    logger.info("MongoDB connection attempt...")
    try:
        await client.admin.command("ping")
    except Exception as e:
        logger.error("MongoDB connection failed: %s", e)
        logger.warning("Running in fallback mode (MongoDB unavailable)")
        return
    logger.info("MongoDB connected successfully")
    app.state.mongo_ok = True
    try:
        await db.users.create_index("phone", unique=True)
        await db.tasks.create_index("customer_id")
        await db.tasks.create_index("category")
        await db.applications.create_index([("task_id", 1), ("specialist_id", 1)], unique=True)
        await db.messages.create_index("chat_id")
        await db.chats.create_index([("customer_id", 1), ("specialist_id", 1)])
        await db.files.create_index("storage_path")
        await _ensure_unique_id_index("categories")
        await _ensure_unique_id_index("filters")
        init_storage()
        if os.environ.get("ENABLE_TEST_SEED", "false").lower() == "true":
            await seed_test_user()
    except Exception as e:
        logger.error("MongoDB startup tasks failed: %s", e)


async def seed_test_user():
    """Ensure a fixed QA test user exists. Re-seeded on every startup."""
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
    existing = await db.users.find_one({"phone": phone})
    if existing:
        # Refresh the password hash + extras every startup so the credentials never drift
        await db.users.update_one(
            {"phone": phone},
            {"$set": {
                "password_hash": hash_password(password),
                "name": "Test User",
                "role": "customer",
                "city": "Москва",
                **extra,
            }},
        )
        logging.info(f"Test user refreshed: {phone}")
        return
    user_doc = {
        "id": str(uuid.uuid4()),
        "phone": phone,
        "password_hash": hash_password(password),
        "name": "Test User",
        "role": "customer",
        "city": "Москва",
        "rating": 5.0,
        "reviews_count": 0,
        "bio": "QA / test account",
        "services": [],
        "avatar": None,
        "lat": 55.7558,
        "lng": 37.6173,
        "created_at": now_iso(),
        **extra,
    }
    await db.users.insert_one(user_doc)
    logging.info(f"Test user created: {phone}")


# ---------- Admin API (header X-Admin-Token; default token "admin") ----------
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


@admin_router.get("/stats")
async def admin_stats():
    return {
        "users": await db.users.count_documents({}),
        "categories": await db.categories.count_documents({}),
        "filters": await db.filters.count_documents({}),
    }


@admin_router.get("/users")
async def admin_list_users():
    cursor = db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).limit(500)
    return await cursor.to_list(500)


@admin_router.post("/users")
async def admin_create_user(body: AdminUserCreate):
    if body.role not in ("customer", "specialist"):
        raise HTTPException(status_code=400, detail="Invalid role")
    if len(body.password) < 4:
        raise HTTPException(status_code=400, detail="Password too short")
    phone = normalize_phone(body.phone)
    if await db.users.find_one({"phone": phone}):
        raise HTTPException(status_code=400, detail="Phone already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "phone": phone,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": body.role,
        "city": body.city,
        "rating": 0.0,
        "reviews_count": 0,
        "bio": None,
        "services": [],
        "avatar": None,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    doc.pop("password_hash", None)
    return doc


@admin_router.delete("/users/{user_id}")
async def admin_delete_user(user_id: str):
    res = await db.users.delete_one({"id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


@admin_router.get("/categories")
async def admin_list_categories():
    cursor = db.categories.find({}, {"_id": 0}).sort("id", 1)
    return await cursor.to_list(500)


@admin_router.post("/categories")
async def admin_create_category(body: AdminCategoryCreate):
    cid = body.id.strip()
    if not cid:
        raise HTTPException(status_code=400, detail="Invalid id")
    if await db.categories.find_one({"id": cid}):
        raise HTTPException(status_code=400, detail="Category id exists")
    doc = {"id": cid, "icon": body.icon, "name_ru": body.name_ru, "name_ro": body.name_ro}
    await db.categories.insert_one(doc)
    return doc


@admin_router.delete("/categories/{category_id}")
async def admin_delete_category(category_id: str):
    res = await db.categories.delete_one({"id": category_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"ok": True}


@admin_router.get("/filters")
async def admin_list_filters():
    cursor = db.filters.find({}, {"_id": 0}).sort("created_at", -1).limit(500)
    return await cursor.to_list(500)


@admin_router.post("/filters")
async def admin_create_filter(body: AdminFilterCreate):
    fid = (body.id or "").strip() or str(uuid.uuid4())
    if await db.filters.find_one({"id": fid}):
        raise HTTPException(status_code=400, detail="Filter id exists")
    doc = {"id": fid, "name": body.name, "key": body.key, "value": body.value, "created_at": now_iso()}
    await db.filters.insert_one(doc)
    return doc


@admin_router.put("/filters/{filter_id}")
async def admin_update_filter(filter_id: str, body: AdminFilterUpdate):
    patch = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not patch:
        raise HTTPException(status_code=400, detail="Nothing to update")
    res = await db.filters.update_one({"id": filter_id}, {"$set": patch})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Filter not found")
    row = await db.filters.find_one({"id": filter_id}, {"_id": 0})
    return row


@admin_router.delete("/filters/{filter_id}")
async def admin_delete_filter(filter_id: str):
    res = await db.filters.delete_one({"id": filter_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Filter not found")
    return {"ok": True}


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


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("HOST", "0.0.0.0")
    port = _env_int("PORT", 8001)
    reload_enabled = os.environ.get("RELOAD", "false" if IS_PROD else "true").lower() == "true"
    uvicorn.run("server:app", host=host, port=port, reload=reload_enabled)
