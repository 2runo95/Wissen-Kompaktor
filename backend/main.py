import os
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from PyPDF2 import PdfReader

# WICHTIG: KEIN Punkt mehr vor "processors" oder "prompts"
from processors.summary import process_summary
from processors.bullets import process_bullets
from processors.flashcards import process_flashcards
from processors.simple import process_simple
from prompts import build_kids_prompt, build_short_summary_prompt

# -------------------------------------------------
# ENV & OpenAI-Client
# -------------------------------------------------

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# -------------------------------------------------
# FastAPI & CORS
# -------------------------------------------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://wissen-kompaktor-frontend.onrender.com",
        "https://wissen-kompaktor.de",
        "https://www.wissen-kompaktor.de",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
# Modelle
# -------------------------------------------------


class CompactOptions(BaseModel):
    language: Optional[str] = "de"
    summaryLength: Optional[str] = "medium"
    maxBullets: Optional[int] = 10
    maxFlashcards: Optional[int] = 15
    readingLevel: Optional[str] = "adult"
    keepTechnicalTerms: Optional[bool] = True


class CompactRequest(BaseModel):
    text: str
    mode: str
    # Sprache kann direkt oben übergeben werden (vom Frontend)
    language: Optional[str] = "de"
    # options bleibt für spätere Feinsteuerung erhalten
    options: Optional[CompactOptions] = None


# -------------------------------------------------
# Hilfsfunktion: Text aus Datei holen (txt/md/pdf)
# -------------------------------------------------


async def extract_text_from_upload(file: UploadFile) -> str:
    """Liest Text aus einer hochgeladenen Datei (txt, md, pdf)."""
    filename = file.filename or "upload"
    name_lower = filename.lower()

    # Reine Text-Dateien
    if name_lower.endswith((".txt", ".md")):
        raw = await file.read()
        try:
            return raw.decode("utf-8", errors="ignore")
        finally:
            await file.close()

    # PDFs
    if name_lower.endswith(".pdf"):
        raw = await file.read()
        await file.close()

        tmp_path = f"/tmp/{filename}"
        with open(tmp_path, "wb") as f:
            f.write(raw)

        try:
            reader = PdfReader(tmp_path)
            chunks: list[str] = []
            for page in reader.pages:
                try:
                    text = page.extract_text() or ""
                    chunks.append(text)
                except Exception:
                    continue
            return "\n\n".join(chunks).strip()
        finally:
            try:
                os.remove(tmp_path)
            except OSError:
                pass

    # Fallback – unbekanntes Format
    return ""


# -------------------------------------------------
# Zentrale Logik: run_compact
# -------------------------------------------------


def _build_language_instruction(language: str) -> str:
    """
    Baut eine kurze Sprach-Anweisung, die dem Prompt/Text vorangestellt wird.
    Das ist bewusst simpel gehalten, damit es mit allen Prozessoren funktioniert.
    """
    lang = (language or "de").lower()

    if lang == "en":
        return "Answer in English."
    if lang == "es":
        return "Responde en español."
    if lang == "fr":
        return "Réponds en français."
    if lang == "tr":
        return "Lütfen Türkçe cevap ver."
    if lang == "ar":
        return "يرجى الإجابة باللغة العربية."
    if lang == "ja":
        return "日本語で回答してください。"
    if lang == "zh":
        return "请用中文回答。"

    # Standard: Deutsch
    return "Antworte bitte auf Deutsch."


def run_compact(
    client: OpenAI,
    text: str,
    mode: str,
    language: str = "de",
    options: Optional[CompactOptions] = None,
):
    """
    Zentrale Verarbeitungslogik für alle Modi.
    Wird von /api/compact (Text) und /api/compact-file (Datei) genutzt.
    """

    language_instruction = _build_language_instruction(language)
    # Für die meisten Prozessoren hängen wir die Sprachinfo einfach an den Text an.
    text_with_lang = f"{language_instruction}\n\n{text}"

    if mode == "summary":
        # Zusammenfassung – mit Sprachhinweis im Text
        return process_summary(client, text_with_lang)

    if mode == "bullets":
        # Stichpunkte – ebenfalls mit Sprachhinweis
        return process_bullets(client, text_with_lang)

    if mode == "flashcards":
        # Lernkarten – Sprachhinweis am Anfang des Textes
        return process_flashcards(client, text_with_lang)

    if mode == "kids":
        # Für Kinder erklärt – wir erweitern den Prompt um die Sprache
        base_prompt = build_kids_prompt(text)
        prompt = f"{base_prompt}\n\n{language_instruction}"
        return process_simple(client, prompt)

    if mode == "short":
        # In 5 Sätzen – ebenfalls Sprachhinweis anhängen
        base_prompt = build_short_summary_prompt(text)
        prompt = f"{base_prompt}\n\n{language_instruction}"
        return process_simple(client, prompt)

    raise ValueError(f"Unbekannter Modus: {mode}")


# -------------------------------------------------
# API-Routen
# -------------------------------------------------


@app.get("/healthz")
def health_check():
    return {"status": "ok"}


@app.post("/api/compact")
def compact_text(req: CompactRequest):
    """
    Endpoint für reinen Text aus dem Frontend.
    Nutzt die gemeinsame run_compact-Logik.
    """
    try:
        # Sprache aus Request oder aus options, Fallback: "de"
        lang = req.language or (req.options.language if req.options else "de")
        result = run_compact(
            client=client,
            text=req.text,
            mode=req.mode,
            language=lang,
            options=req.options,
        )
        return {"success": True, "result": result}
    except Exception as e:
        print("Fehler in /api/compact:", e)
        return {"success": False, "error": {"message": str(e)}}


@app.post("/api/compact-file")
async def compact_file(
    mode: str = Form("summary"),
    language: str = Form("de"),
    file: UploadFile = File(...),
):
    """
    Endpoint für Datei-Uploads:
    - nimmt eine Datei (txt, md, pdf)
    - extrahiert Text
    - ruft run_compact mit Modus + Sprache auf
    """
    try:
        text = await extract_text_from_upload(file)
        if not text.strip():
            return {
                "success": False,
                "error": {
                    "message": "Die Datei konnte nicht in Text umgewandelt werden."
                },
            }

        result = run_compact(
            client=client,
            text=text,
            mode=mode,
            language=language,
            options=None,
        )
        return {"success": True, "result": result, "text": text}
    except Exception as e:
        print("Fehler in /api/compact-file:", e)
        return {"success": False, "error": {"message": str(e)}}

