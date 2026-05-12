from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

# ---------- Mongo ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ['JWT_SECRET']

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
    created_at: str


# ---------- App ----------
app = FastAPI()
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
    return user_to_public(user)


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
async def list_chats(user: dict = Depends(get_current_user)):
    query = {"$or": [{"customer_id": user["id"]}, {"specialist_id": user["id"]}]}
    cursor = db.chats.find(query, {"_id": 0}).sort("last_message_at", -1)
    chats = await cursor.to_list(200)
    return [chat_to_public(c) for c in chats]


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


# ---------- Startup ----------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("phone", unique=True)
    await db.tasks.create_index("customer_id")
    await db.tasks.create_index("category")
    await db.applications.create_index([("task_id", 1), ("specialist_id", 1)], unique=True)
    await db.messages.create_index("chat_id")
    await db.chats.create_index([("customer_id", 1), ("specialist_id", 1)])
    await db.files.create_index("storage_path")
    init_storage()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
