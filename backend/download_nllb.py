from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

MODEL_NAME = "facebook/nllb-200-distilled-600M"
LOCAL_PATH = "/Users/netchanokpetchurai/transpoc/backend/models/nllb-200-600M"

# โหลด tokenizer และโมเดล แล้วเก็บลง local
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, cache_dir=LOCAL_PATH)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME, cache_dir=LOCAL_PATH)
