import threading
import time
from collections import deque
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
from deepface import DeepFace
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

MODEL_NAME = "ArcFace"

BASE_DIR = Path(r"C:\Users\Adi Singh\Desktop\Study.io\Java_Script\PracticeProjects\Full Stack Quiz Application\server\uploads\students").resolve()

MATCH_DISTANCE = 0.68
WINDOW = 20
STILL_MOTION = 0.01
MAX_IDLE_S = 1800

ATTEMPTS = {}
LOCK = threading.Lock()


@asynccontextmanager
async def lifespan(app: FastAPI):
    blank = np.zeros((224, 224, 3), dtype=np.uint8)
    DeepFace.represent(blank, model_name=MODEL_NAME, enforce_detection=False)
    try:
        DeepFace.represent(
            blank,
            model_name=MODEL_NAME,
            enforce_detection=False,
            anti_spoofing=True,
        )
    except Exception as e:
        print("Anti-spoof warm-up finished with:", e)
    yield


app = FastAPI(lifespan=lifespan)


class EmbedRequest(BaseModel):
    path: str


class VerifyRequest(BaseModel):
    path: str
    attempt_token: str
    embedding: list[float]


class CompleteRequest(BaseModel):
    attempt_token: str


def cosine_distance(a, b):
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    return 1 - float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def track_motion(attempt_token, area):
    now = time.time()
    center = (area["x"] + area["w"] / 2, area["y"] + area["h"] / 2, area["w"])

    with LOCK:
        for k in [k for k, v in ATTEMPTS.items() if now - v["seen"] > MAX_IDLE_S]:
            del ATTEMPTS[k]

        record = ATTEMPTS.setdefault(
            attempt_token, {"boxes": deque(maxlen=WINDOW), "seen": now}
        )
        record["seen"] = now
        record["boxes"].append(center)
        boxes = list(record["boxes"])

    if len(boxes) < WINDOW:
        return None

    arr = np.array(boxes, dtype=float)
    mean_w = arr[:, 2].mean()
    return float(
        max(
            np.std(arr[:, 0] / mean_w),
            np.std(arr[:, 1] / mean_w),
            np.std(arr[:, 2] / mean_w),
        )
    )


@app.post("/embed")
def embed(req: EmbedRequest):
    file_path = (BASE_DIR / req.path).resolve()
    if not file_path.is_relative_to(BASE_DIR):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Image not found")

    try:
        faces = DeepFace.represent(
            img_path=str(file_path),
            model_name=MODEL_NAME,
            enforce_detection=True,
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="No face detected")

    if len(faces) > 1:
        raise HTTPException(status_code=400, detail="Multiple faces detected")

    return {"embedding": faces[0]["embedding"], "model": MODEL_NAME}


@app.post("/verify")
def verify(req: VerifyRequest):
    file_path = (BASE_DIR / req.path).resolve()
    if not file_path.is_relative_to(BASE_DIR):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    if len(req.embedding) != 512:
        raise HTTPException(status_code=400, detail="Invalid stored embedding")

    try:
        faces = DeepFace.represent(
            img_path=str(file_path),
            model_name=MODEL_NAME,
            enforce_detection=True,
            anti_spoofing=True,
        )
    except ValueError as e:
        if "spoof" in str(e).lower():
            return {"match": False, "message": "Fake face detected"}
        return {"match": False, "message": "No face detected"}

    if len(faces) > 1:
        return {"match": False, "message": "Multiple faces detected"}

    motion = track_motion(req.attempt_token, faces[0]["facial_area"])
    if motion is not None:
        print(f"motion={motion:.4f}")

    distance = cosine_distance(req.embedding, faces[0]["embedding"])
    if distance >= MATCH_DISTANCE:
        return {"match": False, "message": "Face not Verified"}

    if motion is not None and motion < STILL_MOTION:
        return {"match": False, "message": "Face is unnaturally still"}

    return {"match": True, "message": "Face Verified"}


@app.post("/complete")
def complete(req: CompleteRequest):
    with LOCK:
        ATTEMPTS.pop(req.attempt_token, None)
    return {"message": "Attempt cleared"}


@app.get("/ping")
def ping():
    return {"message": "FR SERVICE OK"}