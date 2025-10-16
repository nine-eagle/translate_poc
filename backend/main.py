from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
import speech_recognition as sr
import base64
import io
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

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

def translate(text: str, src: str, tgt: str) -> str:
    try:
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
        return translation.strip()

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
                text = audio_to_text(audio_base64, src_lang_code)

                # แปลข้อความ
                translated_text = translate(text, src_lang, tgt_lang)

                # ส่งข้อความที่แปลงกลับไปยัง Frontend
                await websocket.send_text(f"Original: {text}\nTranslated: {translated_text}\nAction: audio")
            else:
                # ข้อมูลข้อความที่ปกติ
                text, src_lang, tgt_lang, action = parts
                translated_text = translate(text, src_lang, tgt_lang)
                await websocket.send_text(f"Original: {text}\nTranslated: {translated_text}\nAction: {action}")

    except WebSocketDisconnect:
        print("Client disconnected")
