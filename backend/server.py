from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import logging
import os
import uuid

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware
import certifi

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
db = client[os.environ.get("DB_NAME", "forgefit")]

app = FastAPI(title="ForgeFit API")
api_router = APIRouter(prefix="/api")
logger = logging.getLogger("forgefit")


class SessionRequest(BaseModel):
    session_id: str


class SessionResponse(BaseModel):
    session_token: str
    user: Dict[str, Any]


class StatePayload(BaseModel):
    state: Dict[str, Any] = Field(default_factory=dict)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
    return utc_now()


def default_state(user_id: str) -> Dict[str, Any]:
    return {
        "user_id": user_id,
        "water_ml": 1250,
        "water_goal_ml": 3500,
        "meals": [],
        "workout_logs": [],
        "bodyweight_logs": [],
        "routines": {
            "Monday": {"name": "Push Power", "focus": "Chest + Triceps", "exercises": ["Barbell Bench Press", "Overhead Press", "Cable Triceps Pushdown"]},
            "Tuesday": {"name": "Pull Strength", "focus": "Back + Biceps", "exercises": ["Lat Pulldown", "Barbell Row", "Dumbbell Curl"]},
            "Wednesday": {"name": "Active Recovery", "focus": "Mobility + Core", "exercises": ["Plank", "Dead Bug"]},
            "Thursday": {"name": "Leg Day", "focus": "Quads + Hamstrings", "exercises": ["Back Squat", "Romanian Deadlift", "Leg Press"]},
            "Friday": {"name": "Upper Volume", "focus": "Shoulders + Arms", "exercises": ["Incline Dumbbell Press", "Lateral Raise", "Hammer Curl"]},
            "Saturday": {"name": "Conditioning", "focus": "Full Body", "exercises": ["Kettlebell Swing", "Goblet Squat"]},
            "Sunday": {"name": "Rest Day", "focus": "Recovery", "exercises": []},
        },
        "settings": {"sound": True, "haptics": True, "unit": "kg"},
        "updated_at": utc_now().isoformat(),
    }


EXERCISES = [
    {"name": "Barbell Bench Press", "muscle": "Chest", "equipment": "Barbell"},
    {"name": "Incline Dumbbell Press", "muscle": "Chest", "equipment": "Dumbbells"},
    {"name": "Overhead Press", "muscle": "Shoulders", "equipment": "Barbell"},
    {"name": "Lateral Raise", "muscle": "Shoulders", "equipment": "Dumbbells"},
    {"name": "Lat Pulldown", "muscle": "Back", "equipment": "Cable"},
    {"name": "Barbell Row", "muscle": "Back", "equipment": "Barbell"},
    {"name": "Back Squat", "muscle": "Legs", "equipment": "Barbell"},
    {"name": "Romanian Deadlift", "muscle": "Legs", "equipment": "Barbell"},
    {"name": "Leg Press", "muscle": "Legs", "equipment": "Machine"},
    {"name": "Cable Triceps Pushdown", "muscle": "Arms", "equipment": "Cable"},
    {"name": "Dumbbell Curl", "muscle": "Arms", "equipment": "Dumbbells"},
    {"name": "Kettlebell Swing", "muscle": "Full Body", "equipment": "Kettlebell"},
    {"name": "Plank", "muscle": "Core", "equipment": "Bodyweight"},
]


async def current_user(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    token = authorization.split(" ", 1)[1].strip()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session or normalize_datetime(session.get("expires_at")) <= utc_now():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


@api_router.get("/")
async def root() -> Dict[str, str]:
    return {"message": "ForgeFit API online"}


@api_router.post("/auth/session", response_model=SessionResponse)
async def create_session(input_data: SessionRequest) -> SessionResponse:
    async with httpx.AsyncClient(timeout=15) as http_client:
        response = await http_client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": input_data.session_id},
        )
    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google session")
    auth_data = response.json()
    user_data = auth_data.get("user", auth_data)
    email = user_data.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google profile email missing")
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    user_id = existing.get("user_id") if existing else f"user_{uuid.uuid4().hex[:12]}"
    user = {
        "user_id": user_id,
        "email": email,
        "name": user_data.get("name") or user_data.get("full_name") or "ForgeFit Athlete",
        "picture": user_data.get("picture") or user_data.get("profile_picture"),
        "updated_at": utc_now().isoformat(),
    }
    await db.users.update_one({"email": email}, {"$set": user}, upsert=True)
    session_token = auth_data.get("session_token") or uuid.uuid4().hex
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {"session_token": session_token, "user_id": user_id, "created_at": utc_now(), "expires_at": utc_now() + timedelta(days=7)}},
        upsert=True,
    )
    return SessionResponse(session_token=session_token, user=user)


@api_router.get("/auth/me")
async def get_me(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    return user


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(default=None)) -> Dict[str, bool]:
    if authorization and authorization.lower().startswith("bearer "):
        await db.user_sessions.delete_one({"session_token": authorization.split(" ", 1)[1].strip()})
    return {"success": True}


@api_router.get("/state")
async def get_state(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    state = await db.user_data.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not state:
        state = default_state(user["user_id"])
        await db.user_data.insert_one(dict(state))
    return state


@api_router.put("/state")
async def save_state(payload: StatePayload, user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    state = dict(payload.state)
    state.pop("_id", None)
    state["user_id"] = user["user_id"]
    state["updated_at"] = utc_now().isoformat()
    await db.user_data.replace_one({"user_id": user["user_id"]}, state, upsert=True)
    return state


@api_router.get("/exercises", response_model=List[Dict[str, str]])
async def get_exercises(_: Dict[str, Any] = Depends(current_user)) -> List[Dict[str, str]]:
    return EXERCISES


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

"""
@app.on_event("startup")
async def setup_indexes() -> None:
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)


@app.on_event("shutdown")
async def shutdown_db_client() -> None:
    client.close()"""
@app.get("/")
async def root():
    return {"status": "ok", "message": "ForgeFit API is running"}