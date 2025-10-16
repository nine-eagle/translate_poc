from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal
import asyncio
from tts_edge import synth_to_bytes

app = FastAPI(title="Speech Translation POC API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Lang = Literal["th","en","es","fr","it","ru","de","zh","ko","ja","ar"]

class TranslateReq(BaseModel):
    text: str
    src: Lang
    tgt: Lang
    quality: Literal["fast","high"] = "fast"

class SpeakReq(BaseModel):
    text: str
    lang: Lang
    gender: Literal["standard","female","male"] = "standard"

@app.get("/health")
async def health():
    return {"ok": True}

@app.post("/translate")
async def translate(req: TranslateReq):
    out = f"({req.src}→{req.tgt} / {req.quality}) {req.text}"
    await asyncio.sleep(0.05)
    return {"translation": out}

@app.post("/speak")
async def speak(req: SpeakReq):
    audio = await synth_to_bytes(req.text, req.lang, req.gender)
    return Response(content=audio, media_type="audio/mpeg")
