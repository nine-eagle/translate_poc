# app.py
from fastapi import FastAPI, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal
import os
from fastapi import UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, HTMLResponse, JSONResponse
from pydub import AudioSegment
import speech_recognition as sr
from gtts import gTTS
from io import BytesIO

from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch

app = FastAPI()

# ---------- CORS ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # สำหรับ production ให้ระบุ domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- NLLB setup ----------
MODEL_PATH = os.environ.get(
    "NLLB_MODEL_PATH",
    "/Users/nam/models/nllb-200-distilled-600M"  # path บน Mac ของคุณ
)
MAX_NEW_TOKENS = int(os.environ.get("MAX_NEW_TOKENS", "120"))

# รหัสภาษาสำหรับ NLLB-200
CODES = {
    "th": "tha_Thai",
    "en": "eng_Latn",
    "es": "spa_Latn",
    "fr": "fra_Latn",
    "it": "ita_Latn",
    "ru": "rus_Cyrl",
    "de": "deu_Latn",
    "zh": "zho_Hans",
    "ko": "kor_Hang",
    "ja": "jpn_Jpan",
    "ar": "ara_Arab",
}
SUPPORTED = set(CODES.keys())

_tokenizer = None
_model = None
# เลือก device อัตโนมัติ: MPS สำหรับ M1/M2, CPU สำหรับ Intel
_device = torch.device("mps") if torch.backends.mps.is_available() else torch.device("cpu")
print(f"Using device: {_device}")

def _load_nllb():
    global _tokenizer, _model
    if _tokenizer is None or _model is None:
        if not os.path.isdir(MODEL_PATH):
            raise RuntimeError(f"NLLB model path not found: {MODEL_PATH}")
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
        _model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_PATH).to(_device)
        _model.eval()

def translate_nllb(text: str, src: str, tgt: str) -> str:
    _load_nllb()
    if src not in SUPPORTED or tgt not in SUPPORTED:
        return text

    tok = _tokenizer
    tok.src_lang = CODES[src]

    inputs = tok(text, return_tensors="pt").to(_device)
    forced_id = tok.convert_tokens_to_ids(CODES[tgt])

    with torch.no_grad():
        out = _model.generate(
            **inputs,
            forced_bos_token_id=forced_id,
            max_new_tokens=MAX_NEW_TOKENS
        )
    return tok.batch_decode(out, skip_special_tokens=True)[0]

# ---------- API ----------
class TranslateBody(BaseModel):
    text: str
    src: Literal["th","en","es","fr","it","ru","de","zh","ko","ja","ar"]
    tgt: Literal["th","en","es","fr","it","ru","de","zh","ko","ja","ar"]

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/translate")
def translate(body: TranslateBody):
    text, src, tgt = body.text.strip(), body.src, body.tgt
    if not text:
        return {"translation": ""}

    try:
        out = translate_nllb(text, src, tgt)
        return {"translation": out}
    except Exception as e:
        return {"translation": text, "note": f"fallback: {e.__class__.__name__}"}

# ===== STT =====
@app.post("/stt")
async def stt(file: UploadFile):
    try:
        # แปลง WebM → WAV
        audio = AudioSegment.from_file(file.file, format="webm")
        audio = audio.set_channels(1).set_frame_rate(16000)
        wav_io = BytesIO()
        audio.export(wav_io, format="wav")
        wav_io.seek(0)

        # ใช้ speech_recognition
        r = sr.Recognizer()
        with sr.AudioFile(wav_io) as source:
            data = r.record(source)
        text = r.recognize_google(data, language="th-TH")  # หรือ en-US
        return {"text": text}
    except Exception as e:
        return {"error": str(e)}

# ===== TTS =====
@app.get("/tts")
async def tts(text: str = Query(...), lang: str = Query("en")):
    if not text:
        return {"error": "Text is empty"}
    try:
        # สร้าง mp3 ด้วย gTTS
        mp3_fp = BytesIO()
        tts = gTTS(text=text, lang=lang)
        tts.write_to_fp(mp3_fp)
        mp3_fp.seek(0)

        # แปลง mp3 → wav ด้วย pydub (ตัวเลือก)
        audio = AudioSegment.from_file(mp3_fp, format="mp3")
        wav_fp = BytesIO()
        audio.export(wav_fp, format="wav")
        wav_fp.seek(0)

        return StreamingResponse(wav_fp, media_type="audio/wav")
    except Exception as e:
        return {"error": str(e)}
