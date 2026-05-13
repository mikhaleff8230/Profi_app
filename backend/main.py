"""
MVP backend for Expo Go: FastAPI + SQLite + local uploads.
Run: uvicorn main:app --reload --host 0.0.0.0 --port 8000
Docs: http://127.0.0.1:8000/docs
"""
from __future__ import annotations

import io
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict
from sqlalchemy import Float, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "app.db"
UPLOAD_DIR = BASE_DIR / "uploads"

DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    phone: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    city: Mapped[str] = mapped_column(String(128), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    photo_url: Mapped[str] = mapped_column(String(1024), default="")


class UserCreate(BaseModel):
    phone: str
    name: str = ""
    city: str = ""
    description: str = ""
    latitude: float | None = None
    longitude: float | None = None
    photo_url: str = ""


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    phone: str
    name: str
    city: str
    description: str
    latitude: float | None
    longitude: float | None
    photo_url: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Proffi Expo MVP", version="1.0.0", lifespan=lifespan)

# Expo / LAN dev: * covers localhost:19000, 19006, 127.0.0.1, and http://<LAN-IP>:8000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"service": "proffi-mvp", "docs": "/docs", "health": "/health"}


@app.get("/users", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db)):
    return list(db.scalars(select(User).order_by(User.id)).all())


@app.get("/users/{user_id}", response_model=UserRead)
def get_user(user_id: int, db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return u


@app.post("/users", response_model=UserRead)
def create_user(body: UserCreate, db: Session = Depends(get_db)):
    if db.scalars(select(User).where(User.phone == body.phone.strip())).first():
        raise HTTPException(status_code=400, detail="Phone already exists")
    u = User(
        phone=body.phone.strip(),
        name=body.name or "",
        city=body.city or "",
        description=body.description or "",
        latitude=body.latitude,
        longitude=body.longitude,
        photo_url=body.photo_url or "",
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


_ALLOWED = {"jpeg": "jpg", "jpg": "jpg", "png": "png", "webp": "webp", "gif": "gif"}


def _public_base(request: Request) -> str:
    return str(request.base_url).rstrip("/")


@app.post("/upload-photo")
def upload_photo(
    request: Request,
    user_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    raw = file.file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        im = Image.open(io.BytesIO(raw))
        im.load()
        fmt = (im.format or "JPEG").upper()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="Invalid image")

    ext_key = (fmt or "JPEG").lower()
    if ext_key not in _ALLOWED:
        ext_key = "jpeg"
    ext = _ALLOWED[ext_key]
    out_fmt = fmt if fmt in ("JPEG", "PNG", "WEBP", "GIF") else "JPEG"
    if out_fmt == "JPEG" and im.mode in ("RGBA", "P", "LA"):
        im = im.convert("RGB")

    fname = f"{uuid.uuid4().hex}.{ext}"
    dest = UPLOAD_DIR / fname
    im.save(dest, format=out_fmt)

    base = _public_base(request)
    url = f"{base}/uploads/{fname}"
    u.photo_url = url
    db.add(u)
    db.commit()

    return {"url": url}


app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
