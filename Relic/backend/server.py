from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Header, Query
from fastapi.responses import Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import math
import random
import uuid
import jwt
import bcrypt
import requests
import cloudinary
import cloudinary.uploader
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

# ---------------------------------------------------------------------------
# Cloudinary config
# ---------------------------------------------------------------------------
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.environ.get("CLOUDINARY_API_KEY", ""),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET", ""),
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("relic")

app = FastAPI()
api_router = APIRouter(prefix="/api")



# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def hash_passcode(passcode: str) -> str:
    return bcrypt.hashpw(passcode.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_passcode(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_vault_token(vault_id: str, name: str) -> str:
    payload = {
        "vault_id": vault_id,
        "name": name,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "type": "vault",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_vault(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "vault":
            raise HTTPException(status_code=401, detail="Invalid token type")
        vault = await db.vaults.find_one({"id": payload["vault_id"]}, {"_id": 0})
        if not vault:
            raise HTTPException(status_code=401, detail="Vault not found")
        return vault
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class VaultCreate(BaseModel):
    name: str
    passcode: str


class VaultEnter(BaseModel):
    name: str
    passcode: str


class MemoryCreate(BaseModel):
    title: str
    memory_type: str  # polaroid | letter | capsule | milestone
    content: Optional[str] = None
    media_url: Optional[str] = None  # storage path (legacy single)
    media_urls: Optional[List[str]] = None  # storage paths (gallery)
    audio_url: Optional[str] = None  # storage path
    caption: Optional[str] = None
    author_name: Optional[str] = "Someone"
    unlock_at: Optional[str] = None  # ISO string


class MemoryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    caption: Optional[str] = None
    author_name: Optional[str] = None
    is_scratched: Optional[bool] = None
    media_urls: Optional[List[str]] = None
    audio_url: Optional[str] = None
    unlock_at: Optional[str] = None
    coord_x: Optional[float] = None
    coord_y: Optional[float] = None
    coord_z: Optional[float] = None


def spherical_coords():
    # distribute nodes on a shell for a pleasing galaxy
    radius = random.uniform(4.0, 9.0)
    theta = random.uniform(0, 2 * math.pi)
    phi = math.acos(random.uniform(-1, 1))
    x = radius * math.sin(phi) * math.cos(theta)
    y = radius * math.cos(phi) * 0.6  # flatten vertically a touch
    z = radius * math.sin(phi) * math.sin(theta)
    return round(x, 3), round(y, 3), round(z, 3)


def serialize_memory(doc: dict, unlocked: bool = True) -> dict:
    doc = {k: v for k, v in doc.items() if k != "_id"}
    # normalise gallery for old docs
    if not doc.get("media_urls"):
        doc["media_urls"] = [doc["media_url"]] if doc.get("media_url") else []
    is_capsule = doc.get("memory_type") == "capsule"
    unlock_at = doc.get("unlock_at")
    locked = False
    if is_capsule and unlock_at:
        try:
            unlock_dt = datetime.fromisoformat(unlock_at)
            if unlock_dt.tzinfo is None:
                unlock_dt = unlock_dt.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) < unlock_dt:
                locked = True
        except Exception:
            locked = False
    if locked:
        # zero-leak: strip all sensitive payload
        doc["content"] = None
        doc["media_url"] = None
        doc["media_urls"] = None
        doc["audio_url"] = None
        doc["caption"] = None
        doc["is_locked"] = True
    else:
        doc["is_locked"] = False
    return doc


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Relic vault online"}


@api_router.post("/vaults")
async def create_vault(payload: VaultCreate):
    name = payload.name.strip()
    if not name or not payload.passcode:
        raise HTTPException(status_code=400, detail="Vault name and passcode are required")
    existing = await db.vaults.find_one({"name_lower": name.lower()})
    if existing:
        raise HTTPException(status_code=409, detail="A vault with this name already exists. Try entering it instead.")
    vault = {
        "id": str(uuid.uuid4()),
        "name": name,
        "name_lower": name.lower(),
        "passcode_hash": hash_passcode(payload.passcode),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.vaults.insert_one(vault)
    token = create_vault_token(vault["id"], vault["name"])
    return {"token": token, "vault": {"id": vault["id"], "name": vault["name"], "created_at": vault["created_at"]}}


@api_router.post("/vaults/enter")
async def enter_vault(payload: VaultEnter):
    name = payload.name.strip()
    vault = await db.vaults.find_one({"name_lower": name.lower()})
    if not vault or not verify_passcode(payload.passcode, vault["passcode_hash"]):
        raise HTTPException(status_code=401, detail="Vault not found or passcode incorrect")
    token = create_vault_token(vault["id"], vault["name"])
    return {"token": token, "vault": {"id": vault["id"], "name": vault["name"], "created_at": vault["created_at"]}}


@api_router.get("/vault/me")
async def vault_me(vault: dict = Depends(get_current_vault)):
    return {"id": vault["id"], "name": vault["name"], "created_at": vault["created_at"]}


@api_router.get("/memories")
async def list_memories(vault: dict = Depends(get_current_vault)):
    docs = await db.memories.find({"vault_id": vault["id"]}).sort("created_at", 1).to_list(1000)
    return [serialize_memory(d) for d in docs]


@api_router.post("/memories")
async def create_memory(payload: MemoryCreate, vault: dict = Depends(get_current_vault)):
    if payload.memory_type not in ("polaroid", "letter", "capsule", "milestone"):
        raise HTTPException(status_code=400, detail="Invalid memory type")
    x, y, z = spherical_coords()
    gallery = payload.media_urls if payload.media_urls is not None else ([payload.media_url] if payload.media_url else [])
    mem = {
        "id": str(uuid.uuid4()),
        "vault_id": vault["id"],
        "author_name": payload.author_name or "Someone",
        "title": payload.title,
        "memory_type": payload.memory_type,
        "content": payload.content,
        "media_url": gallery[0] if gallery else None,
        "media_urls": gallery,
        "audio_url": payload.audio_url,
        "caption": payload.caption,
        "unlock_at": payload.unlock_at,
        "is_scratched": False,
        "coord_x": x,
        "coord_y": y,
        "coord_z": z,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.memories.insert_one(mem)
    return serialize_memory(mem)


@api_router.get("/memories/{memory_id}")
async def get_memory(memory_id: str, vault: dict = Depends(get_current_vault)):
    doc = await db.memories.find_one({"id": memory_id, "vault_id": vault["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Memory not found")
    return serialize_memory(doc)


@api_router.patch("/memories/{memory_id}")
async def update_memory(memory_id: str, payload: MemoryUpdate, vault: dict = Depends(get_current_vault)):
    doc = await db.memories.find_one({"id": memory_id, "vault_id": vault["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Memory not found")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "media_urls" in updates:
        updates["media_url"] = updates["media_urls"][0] if updates["media_urls"] else None
    if updates:
        await db.memories.update_one({"id": memory_id}, {"$set": updates})
    doc = await db.memories.find_one({"id": memory_id, "vault_id": vault["id"]})
    return serialize_memory(doc)


@api_router.delete("/memories/{memory_id}")
async def delete_memory(memory_id: str, vault: dict = Depends(get_current_vault)):
    res = await db.memories.delete_one({"id": memory_id, "vault_id": vault["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"ok": True}


@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), vault: dict = Depends(get_current_vault)):
    content_type = file.content_type or "application/octet-stream"
    try:
        result = cloudinary.uploader.upload(
            file.file,
            resource_type="auto",
            folder=f"relic/{vault['id']}",
        )
        url = result["secure_url"]
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")
        raise HTTPException(status_code=500, detail="File upload failed")
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "vault_id": vault["id"],
        "storage_path": url,
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("bytes", 0),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": url, "path": url, "content_type": content_type}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        await db.vaults.create_index("name_lower", unique=True)
        await db.memories.create_index("vault_id")
    except Exception as e:
        logger.warning(f"Index setup: {e}")
    if cloudinary.config().cloud_name:
        logger.info("Cloudinary configured")
    else:
        logger.warning("Cloudinary credentials not set — uploads will fail")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
