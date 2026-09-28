import os
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated

import requests
from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ---------------------------------------------------------------------------
# MongoDB connection
# ---------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ---------------------------------------------------------------------------
# Object Storage (Emergent managed)
# ---------------------------------------------------------------------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "cari-kroto"
_storage_key = None


def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
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
    global _storage_key
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 503:
        _storage_key = None
        key = init_storage()
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Single-user app (no auth requested). All data belongs to this owner.
OWNER_ID = "default"


def _py_object_id(v):
    return str(v)


PyObjectId = Annotated[str, BeforeValidator(_py_object_id)]


def now_utc():
    return datetime.now(timezone.utc)


def iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class LocationCreate(BaseModel):
    name: str
    notes: Optional[str] = ""
    latitude: float
    longitude: float
    harvest_interval_days: int = 14
    photos: List[str] = Field(default_factory=list)


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    harvest_interval_days: Optional[int] = None
    next_harvest_at: Optional[str] = None
    photos: Optional[List[str]] = None


class VisitCreate(BaseModel):
    visited_at: Optional[str] = None
    amount_kg: Optional[float] = 0
    notes: Optional[str] = ""
    photos: List[str] = Field(default_factory=list)


class VisitUpdate(BaseModel):
    visited_at: Optional[str] = None
    amount_kg: Optional[float] = None
    notes: Optional[str] = None


def location_doc_to_api(doc: dict) -> dict:
    next_harvest = doc.get("next_harvest_at")
    status = "ready"
    if next_harvest:
        try:
            nh = datetime.fromisoformat(next_harvest)
            if nh.tzinfo is None:
                nh = nh.replace(tzinfo=timezone.utc)
            status = "ready" if nh <= now_utc() else "cooldown"
        except Exception:
            status = "ready"
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "notes": doc.get("notes", ""),
        "latitude": doc.get("latitude"),
        "longitude": doc.get("longitude"),
        "harvest_interval_days": doc.get("harvest_interval_days", 14),
        "photos": doc.get("photos", []),
        "last_visit_at": doc.get("last_visit_at"),
        "next_harvest_at": doc.get("next_harvest_at"),
        "total_harvest_kg": doc.get("total_harvest_kg", 0),
        "visit_count": doc.get("visit_count", 0),
        "status": status,
        "created_at": doc.get("created_at"),
    }


def visit_doc_to_api(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "location_id": doc.get("location_id"),
        "visited_at": doc.get("visited_at"),
        "amount_kg": doc.get("amount_kg", 0),
        "notes": doc.get("notes", ""),
        "photos": doc.get("photos", []),
        "created_at": doc.get("created_at"),
    }


# ---------------------------------------------------------------------------
# Location routes
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "CARI KROTO API"}


@api_router.post("/locations")
async def create_location(payload: LocationCreate):
    doc = {
        "owner_id": OWNER_ID,
        "name": payload.name,
        "notes": payload.notes or "",
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "harvest_interval_days": payload.harvest_interval_days,
        "photos": payload.photos,
        "last_visit_at": None,
        "next_harvest_at": iso(now_utc()),  # newly marked = ready to scout/harvest now
        "total_harvest_kg": 0,
        "visit_count": 0,
        "created_at": iso(now_utc()),
        "deleted_at": None,
    }
    res = await db.locations.insert_one(doc)
    doc["_id"] = res.inserted_id
    return location_doc_to_api(doc)


@api_router.get("/locations")
async def list_locations():
    docs = await db.locations.find({"owner_id": OWNER_ID, "deleted_at": None}).sort("created_at", -1).to_list(1000)
    return [location_doc_to_api(d) for d in docs]


@api_router.get("/locations/{location_id}")
async def get_location(location_id: str):
    try:
        doc = await db.locations.find_one({"_id": ObjectId(location_id), "deleted_at": None})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not doc:
        raise HTTPException(status_code=404, detail="Location not found")
    return location_doc_to_api(doc)


@api_router.put("/locations/{location_id}")
async def update_location(location_id: str, payload: LocationUpdate):
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if not updates:
        return await get_location(location_id)
    try:
        doc = await db.locations.find_one_and_update(
            {"_id": ObjectId(location_id), "deleted_at": None},
            {"$set": updates},
            return_document=True,
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not doc:
        raise HTTPException(status_code=404, detail="Location not found")
    return location_doc_to_api(doc)


@api_router.delete("/locations/{location_id}")
async def delete_location(location_id: str):
    try:
        res = await db.locations.update_one(
            {"_id": ObjectId(location_id)}, {"$set": {"deleted_at": iso(now_utc())}}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Location not found")
    await db.visits.update_many({"location_id": location_id}, {"$set": {"deleted_at": iso(now_utc())}})
    return {"ok": True}


@api_router.delete("/locations/{location_id}/photos")
async def remove_photo(location_id: str, path: str = Query(...)):
    try:
        doc = await db.locations.find_one_and_update(
            {"_id": ObjectId(location_id), "deleted_at": None},
            {"$pull": {"photos": path}},
            return_document=True,
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not doc:
        raise HTTPException(status_code=404, detail="Location not found")
    return location_doc_to_api(doc)


# ---------------------------------------------------------------------------
# Visit routes
# ---------------------------------------------------------------------------
@api_router.post("/locations/{location_id}/visits")
async def create_visit(location_id: str, payload: VisitCreate):
    try:
        loc = await db.locations.find_one({"_id": ObjectId(location_id), "deleted_at": None})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    visited_at = payload.visited_at or iso(now_utc())
    visit_doc = {
        "location_id": location_id,
        "owner_id": OWNER_ID,
        "visited_at": visited_at,
        "amount_kg": payload.amount_kg or 0,
        "notes": payload.notes or "",
        "photos": payload.photos,
        "created_at": iso(now_utc()),
        "deleted_at": None,
    }
    res = await db.visits.insert_one(visit_doc)
    visit_doc["_id"] = res.inserted_id

    # Recompute location aggregates + next harvest schedule
    interval = loc.get("harvest_interval_days", 14)
    try:
        base = datetime.fromisoformat(visited_at)
        if base.tzinfo is None:
            base = base.replace(tzinfo=timezone.utc)
    except Exception:
        base = now_utc()
    next_harvest = iso(base + timedelta(days=interval))

    await db.locations.update_one(
        {"_id": ObjectId(location_id)},
        {
            "$set": {"last_visit_at": visited_at, "next_harvest_at": next_harvest},
            "$inc": {"total_harvest_kg": payload.amount_kg or 0, "visit_count": 1},
        },
    )
    return visit_doc_to_api(visit_doc)


@api_router.get("/locations/{location_id}/visits")
async def list_visits(location_id: str):
    docs = await db.visits.find(
        {"location_id": location_id, "deleted_at": None}
    ).sort("visited_at", -1).to_list(1000)
    return [visit_doc_to_api(d) for d in docs]


@api_router.put("/visits/{visit_id}")
async def update_visit(visit_id: str, payload: VisitUpdate):
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    try:
        old = await db.visits.find_one({"_id": ObjectId(visit_id), "deleted_at": None})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not old:
        raise HTTPException(status_code=404, detail="Visit not found")

    doc = await db.visits.find_one_and_update(
        {"_id": ObjectId(visit_id)}, {"$set": updates}, return_document=True
    )
    if "amount_kg" in updates:
        delta = (updates["amount_kg"] or 0) - (old.get("amount_kg") or 0)
        if delta:
            await db.locations.update_one(
                {"_id": ObjectId(old["location_id"])}, {"$inc": {"total_harvest_kg": delta}}
            )
    return visit_doc_to_api(doc)


@api_router.delete("/visits/{visit_id}")
async def delete_visit(visit_id: str):
    try:
        old = await db.visits.find_one({"_id": ObjectId(visit_id), "deleted_at": None})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not old:
        raise HTTPException(status_code=404, detail="Visit not found")
    await db.visits.update_one({"_id": ObjectId(visit_id)}, {"$set": {"deleted_at": iso(now_utc())}})
    await db.locations.update_one(
        {"_id": ObjectId(old["location_id"])},
        {"$inc": {"total_harvest_kg": -(old.get("amount_kg") or 0), "visit_count": -1}},
    )
    return {"ok": True}


# ---------------------------------------------------------------------------
# Photo upload / serve
# ---------------------------------------------------------------------------
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    data = await file.read()
    ext = "jpg"
    if file.filename and "." in file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower()
    path = f"{APP_NAME}/uploads/{OWNER_ID}/{uuid.uuid4()}.{ext}"
    content_type = file.content_type or "image/jpeg"
    try:
        result = await run_in_threadpool(put_object, path, data, content_type)
    except requests.HTTPError as e:
        code = e.response.status_code if e.response is not None else 500
        if code == 402:
            raise HTTPException(status_code=402, detail="Storage quota exceeded")
        raise HTTPException(status_code=500, detail="Upload failed")
    return {"path": result["path"]}


@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    try:
        content, content_type = await run_in_threadpool(get_object, path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(content=content, media_type=content_type)


# ---------------------------------------------------------------------------
# Wiring
# ---------------------------------------------------------------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    try:
        await run_in_threadpool(init_storage)
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning(f"Object storage init failed (will retry on upload): {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
