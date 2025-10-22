import time
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
import speech_recognition as sr
import base64
import io
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware

# Loading the translation model
MODEL_NAME = "facebook/nllb-200-distilled-600M"
print("Loading translation model... (first time may take ~1-2 min)")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)

# Language codes mapping
LANG_CODES = {
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
    "ar": "arb_Arab",
}
LANG_CODES2 = {
    "th": "th-TH",  # ภาษาไทย
    "en": "en-US",  # ภาษาอังกฤษ
    "es": "es-ES",  # ภาษาสเปน
    "fr": "fr-FR",  # ภาษาฝรั่งเศส
    "it": "it-IT",  # ภาษาอิตาลี
    "ru": "ru-RU",  # ภาษารัสเซีย
    "de": "de-DE",  # ภาษาเยอรมัน
    "zh": "zh-CN",  # ภาษาจีน (จีนกลาง)
    "ja": "ja-JP",  # ภาษาญี่ปุ่น
    "ar": "ar-SA",  # ภาษาอาหรับ
}

# Mapping language codes to token IDs
lang_token_ids = {code: tokenizer.convert_tokens_to_ids(code) for code in LANG_CODES.values()}

app = FastAPI()

# เพิ่ม middleware สำหรับ CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "Translation API is running",
        "model": MODEL_NAME,
        "supported_languages": list(LANG_CODES.keys())
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": model is not None and tokenizer is not None
    }

# ฟังก์ชันแปล
def translate(text: str, src: str, tgt: str) -> dict:
    try:
        start_time = time.time()  # เริ่มจับเวลา
        
        src_code = LANG_CODES.get(src)
        tgt_code = LANG_CODES.get(tgt)
        
        if not src_code or not tgt_code:
            return {"error": f"Unsupported language code: {src}->{tgt}"}

        tokenizer.src_lang = src_code
        inputs = tokenizer(text, return_tensors="pt")

        forced_bos_id = lang_token_ids.get(tgt_code, tokenizer.convert_tokens_to_ids(tgt_code))

        with torch.no_grad():
            generated_tokens = model.generate(
                **inputs,
                forced_bos_token_id=forced_bos_id,
                max_new_tokens=128
            )

        translation = tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)[0]
        
        end_time = time.time()  # จบการจับเวลา
        translation_time = end_time - start_time  # คำนวณเวลาที่ใช้
        
        # ส่งผลลัพธ์ในรูปแบบ key:value
        return {
            "translated_text": translation.strip(),
            "translation_time": f"{translation_time:.2f} seconds"
        }

    except Exception as e:
        return {"error": f"{str(e)}", "translation_time": "0"}

# ฟังก์ชันแปลง base64 เป็นไฟล์เสียงแล้วแปลงเป็นข้อความ (Speech-to-Text)
def audio_to_text(audio_base64: str, language_code: str) -> str:
    try:
        # แปลงข้อมูล base64 กลับเป็น bytes
        audio_data = base64.b64decode(audio_base64)
        
        # สร้าง recognizer object
        recognizer = sr.Recognizer()
        
        # สร้างไฟล์เสียงจากข้อมูล base64
        audio_file = io.BytesIO(audio_data)
        
        # ใช้ AudioFile ในการเปิดไฟล์เสียง
        with sr.AudioFile(audio_file) as source:
            audio = recognizer.record(source)  # บันทึกเสียงทั้งหมด
        
        # ใช้ Google Speech Recognition API หรือ Sphinx (offline) เพื่อแปลงเสียงเป็นข้อความ
        # หากต้องการแปลงแบบออฟไลน์, ใช้ recognize_sphinx
        text = recognizer.recognize_google(audio, language=language_code)  # ใช้ Google Speech Recognition API

        return text
    
    except sr.UnknownValueError:
        return "ไม่สามารถเข้าใจเสียงได้"
    except sr.RequestError as e:
        return f"ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์: {e}"
    except Exception as e:
        return f"[ERROR] {str(e)}"
    
@app.post("/set_audio_settings")
async def set_audio_settings(request: Request):
    body = await request.json()  # รับข้อมูล JSON
    chunk_size = body.get('chunkSize')
    vad_sensitivity = body.get('vadSensitivity')

    # พิมพ์ค่าการตั้งค่าสำหรับการตรวจสอบ
    print(f"Chunk Size: {chunk_size}, VAD Sensitivity: {vad_sensitivity}")

    # ปรับค่าการตั้งค่าการจับเสียง
    apply_audio_settings(chunk_size, vad_sensitivity)

    return {"message": "Audio settings updated successfully"}


# ฟังก์ชันสำหรับตั้งค่าการจับเสียง (VAD Sensitivity) และขนาดช่วงเสียง (Chunk Size)
def apply_audio_settings(vad_sensitivity: str, chunk_size: str):
    recognizer = sr.Recognizer()  # สร้างตัวแปร recognizer ของ SpeechRecognition

    # ตั้งค่าความไวในการจับเสียง (VAD Sensitivity)
    if vad_sensitivity == "Low":
        recognizer.energy_threshold = 4000  # ความไวต่ำ
    elif vad_sensitivity == "Medium":
        recognizer.energy_threshold = 2000  # ความไวปานกลาง
    else:
        recognizer.energy_threshold = 1000  # ความไวสูง
    
    # ตั้งค่าขนาดช่วงเสียง (Chunk Size)
    if chunk_size == "20ms":
        recognizer.pause_threshold = 0.02  # ขนาดช่วงเสียง 20ms
    elif chunk_size == "50ms":
        recognizer.pause_threshold = 0.05  # ขนาดช่วงเสียง 50ms
    elif chunk_size == "100ms":
        recognizer.pause_threshold = 0.1  # ขนาดช่วงเสียง 100ms

    print(f"Recognizer configured: VAD Sensitivity: {vad_sensitivity}, Chunk Size: {chunk_size}")
    
# WebSocket endpoint ที่ทำงานร่วมกับเวลาที่ใช้ในการแปล
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket client connected")
    try:
        while True:
            data = await websocket.receive_text()
            print(f"Received data: {data[:100]}...")  # Log first 100 chars
            parts = data.split('|')

            if len(parts) < 3:
                print(f"Invalid data format: expected at least 3 parts, got {len(parts)}")
                await websocket.send_text(f"Original: \nTranslated: Error - Invalid data format\nMT: 0\nAction: error")
                continue

            if parts[-1] == "audio":
                audio_base64 = parts[0]
                src_lang = parts[1]
                tgt_lang = parts[2]

                src_lang_code = LANG_CODES2.get(src_lang, "en")
                tgt_lang_code = LANG_CODES2.get(tgt_lang, "en")
                print(f"{src_lang_code}")
                # แปลงไฟล์เสียงเป็นข้อความ
                audio_start_time = time.time()
                text = audio_to_text(audio_base64, src_lang_code)
                audio_end_time = time.time()
                audio_processing_time = audio_end_time - audio_start_time  # เวลาที่ใช้ในขั้นตอนการแปลงเสียงเป็นข้อความ

                # แปลข้อความ
                translation_start_time = time.time()
                translated_data = translate(text, src_lang, tgt_lang)
                translation_end_time = time.time()
                
                # ตรวจสอบว่ามี error หรือไม่
                if "error" in translated_data:
                    await websocket.send_text(f"Original: {text}\nTranslated: Error - {translated_data['error']}\nMT: {translated_data.get('translation_time', '0')}\nAction: audio")
                else:
                    await websocket.send_text(f"Original: {text}\nTranslated: {translated_data['translated_text']}\nMT: {translated_data['translation_time']}\nAction: audio")
            else:
                text, src_lang, tgt_lang, action = parts
                translation_start_time = time.time()
                translated_data = translate(text, src_lang, tgt_lang)
                translation_end_time = time.time()
                
                # ตรวจสอบว่ามี error หรือไม่
                if "error" in translated_data:
                    await websocket.send_text(f"Original: {text}\nTranslated: Error - {translated_data['error']}\nMT: {translated_data.get('translation_time', '0')}\nAction: {action}")
                else:
                    await websocket.send_text(f"Original: {text}\nTranslated: {translated_data['translated_text']}\nMT: {translated_data['translation_time']}\nAction: {action}")

    except WebSocketDisconnect:
        print("Client disconnected")