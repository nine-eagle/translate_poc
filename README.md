# Speech Translation POC (UI + Backend)
- ui/index.html — pure HTML UI (11 languages), pairs evidence, device scan, auto-translate.
- backend/app.py — FastAPI endpoints: POST /translate (mock), POST /speak (Edge TTS 11 langs).
- backend/tts_edge.py — TTS helper.
- backend/requirements.txt

Run:
  cd backend
  python -m venv .venv && .\.venv\Scripts\Activate.ps1
  pip install -r requirements.txt
  uvicorn app:app --host 0.0.0.0 --port 8000
  uvicorn main:app --reload
