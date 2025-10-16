import os
from fastapi import FastAPI
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
from pydantic import BaseModel

app = FastAPI()

# โหลดโมเดล NLLB
model_name = "facebook/nllb-200-distilled-600M"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

class TextRequest(BaseModel):
    text: str
    target_lang: str

# API สำหรับการแปลภาษา
@app.post("/translate/")
async def translate_text(request: TextRequest):
    # เตรียมข้อความที่ต้องการแปล
    src_text = request.text
    target_lang = request.target_lang

    # การแปลข้อความ
    translated = translate(src_text, target_lang)
    return {"translated_text": translated}

def translate(text: str, target_lang: str) -> str:
    # ใช้ tokenizer และ model จาก Hugging Face
    encoded = tokenizer.encode(text, return_tensors="pt")
    translated_tokens = model.generate(encoded, forced_bos_token_id=tokenizer.lang2id[target_lang])

    translated_text = tokenizer.decode(translated_tokens[0], skip_special_tokens=True)
    return translated_text
