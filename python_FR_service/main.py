from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
from deepface import DeepFace
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

MODEL_NAME = "ArcFace"

BASE_DIR = Path(r"secret").resolve()


@asynccontextmanager
async def lifespan(app: FastAPI):
    blank = np.zeros((224, 224, 3), dtype=np.uint8)
    DeepFace.represent(blank, model_name=MODEL_NAME, enforce_detection=False)
    yield


app = FastAPI(lifespan=lifespan)


class EmbedRequest(BaseModel):
    path: str  


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