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

# Mapping language codes to token IDs
lang_token_ids = {code: tokenizer.convert_tokens_to_ids(code) for code in LANG_CODES.values()}

app = FastAPI()

# เพิ่ม middleware สำหรับ CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # กำหนดโดเมนที่อนุญาต
    allow_credentials=True,
    allow_methods=["*"],  # อนุญาตทุก HTTP method (GET, POST, PUT, DELETE, ฯลฯ)
    allow_headers=["*"],  # อนุญาตให้ใช้ทุก headers
)

def translate(text: str, src: str, tgt: str) -> str:
    try:
        start_time = time.time()  # Record start time
        
        src_code = LANG_CODES.get(src)
        tgt_code = LANG_CODES.get(tgt)
        
        if not src_code or not tgt_code:
            return f"[ERROR] Unsupported language code: {src}->{tgt}"

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
        
        end_time = time.time()  # Record end time
        translation_time = end_time - start_time  # Calculate translation time
        
        # return f"{translation.strip()} (Time taken: {translation_time:.2f} seconds)"
        return f"{translation.strip()}"
    
    except Exception as e:
        return f"[ERROR] {str(e)}"
    
# ฟังก์ชันแปลง base64 เป็นไฟล์เสียงแล้วแปลงเป็นข้อความ (Speech-to-Text)
def audio_to_text(audio_base64: str, language_code: str) -> str:
    try:
        # แปลงข้อมูล base64 กลับเป็น bytes
        audio_data = base64.b64decode(audio_base64)

        recognizer = sr.Recognizer()
        audio_file = io.BytesIO(audio_data)

        with sr.AudioFile(audio_file) as source:
            audio = recognizer.record(source)

        # ใช้ pocketsphinx (offline STT)
        text = recognizer.recognize_sphinx(audio)  # ใช้ pocketsphinx ที่ทำงานแบบออฟไลน์
        return text

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
    
# WebSocket endpoint to handle real-time communication
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            parts = data.split('|')

            if parts[-1] == "audio":
                audio_base64 = parts[0]  # ข้อมูลเสียงในรูปแบบ base64
                src_lang = parts[1]
                tgt_lang = parts[2]

                # ตรวจสอบว่า src_lang_code เป็น None หรือไม่
                src_lang_code = LANG_CODES.get(src_lang, "en")
                tgt_lang_code = LANG_CODES.get(tgt_lang, "en")

                # แปลงไฟล์เสียงเป็นข้อความ
                audio_start_time = time.time()  # Start time for audio-to-text
                text = audio_to_text(audio_base64, src_lang_code)
                audio_end_time = time.time()  # End time for audio-to-text
                audio_processing_time = audio_end_time - audio_start_time  # Time taken for audio-to-text

                # แปลข้อความ
                translation_start_time = time.time()  # Start time for translation
                translated_text = translate(text, src_lang, tgt_lang)
                translation_end_time = time.time()  # End time for translation
                translation_processing_time = translation_end_time - translation_start_time  # Time taken for translation

                # ส่งข้อความที่แปลงกลับไปยัง Frontend
                await websocket.send_text(f"Original: {text}\nTranslated: {translated_text}\nAudio-to-text processing time: {audio_processing_time:.2f} seconds\nMT: {translation_processing_time:.2f} seconds\nAction: audio")
            else:
                # ข้อมูลข้อความที่ปกติ
                text, src_lang, tgt_lang, action = parts
                translation_start_time = time.time()  # Start time for translation
                translated_text = translate(text, src_lang, tgt_lang)
                translation_end_time = time.time()  # End time for translation
                translation_processing_time = translation_end_time - translation_start_time  # Time taken for translation

                await websocket.send_text(f"Original: {text}\nTranslated: {translated_text}\nMT: {translation_processing_time:.2f} seconds\nAction: {action}")

    except WebSocketDisconnect:
        print("Client disconnected")