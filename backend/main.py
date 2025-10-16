from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
import speech_recognition as sr
import io

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
        # ดึงรหัสของภาษาต้นทางและปลายทาง
        src_code = LANG_CODES.get(src)
        tgt_code = LANG_CODES.get(tgt)
        
        if not src_code or not tgt_code:
            return f"[ERROR] Unsupported language code: {src}->{tgt}"

        tokenizer.src_lang = src_code
        inputs = tokenizer(text, return_tensors="pt")

        # ใช้รหัสภาษาเป้าหมายในการแปล
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

# WebSocket endpoint to handle real-time communication
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            # คาดว่าได้รับข้อมูลในรูปแบบ text|src_lang|tgt_lang|action
            text, src_lang, tgt_lang, action = data.split('|')

            # แปลข้อความ
            translated_text = translate(text, src_lang, tgt_lang)

            # ส่งข้อความแปลกลับไปยัง Frontend
            await websocket.send_text(f"Original: {text}\nTranslated: {translated_text}\nAction: {action}")
    except WebSocketDisconnect:
        print("Client disconnected")


