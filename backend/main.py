import os
from typing import Optional, Any, Dict, List

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from PyPDF2 import PdfReader

# Prozessoren
from processors.summary import process_summary
from processors.bullets import process_bullets
from processors.flashcards import process_flashcards
from processors.simple import process_simple

# Prompt-Builder (mit language-Parameter für die „einfachen“ Modi)
from prompts import (
    build_kids_prompt,
    build_short_summary_prompt,
    build_exam_questions_prompt,
    build_quiz_prompt,
    build_cheatsheet_prompt,
)

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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

# --------------------- Language Mapping ---------------------

LANGUAGE_NAMES = {
    "de": "Deutsch",
    "en": "Englisch",
    "es": "Spanisch",
    "fr": "Französisch",
    "tr": "Türkisch",
    "ar": "Arabisch",
    "ja": "Japanisch",
    "zh": "Chinesisch",
}

# --------------------- Models ---------------------


class CompactOptions(BaseModel):
    language: str = "de"  # Standard: Deutsch


class CompactRequest(BaseModel):
    text: str
    mode: str
    options: Optional[CompactOptions] = None


# --------------------- File Extract ---------------------


async def extract_text_from_upload(file: UploadFile) -> str:
    filename = file.filename or "upload"
    lower = filename.lower()

    if lower.endswith((".txt", ".md")):
        raw = await file.read()
        await file.close()
        return raw.decode("utf-8", errors="ignore")

    if lower.endswith(".pdf"):
        raw = await file.read()
        await file.close()
        tmp = f"/tmp/{filename}"
        with open(tmp, "wb") as f:
            f.write(raw)

        text_parts: List[str] = []
        try:
            reader = PdfReader(tmp)
            for page in reader.pages:
                try:
                    t = page.extract_text() or ""
                    text_parts.append(t)
                except Exception:
                    pass
        finally:
            try:
                os.remove(tmp)
            except OSError:
                pass

        return "\n".join(text_parts)

    return ""


# --------------------- Helper ---------------------


def add_language_instruction(text: str, language_code: str) -> str:
    """
    Fügt dem Prompt eine klare Sprachinstruktion hinzu,
    basierend auf dem Sprachcode vom Frontend.
    (Wird weiter für Summary / Bullets / Flashcards genutzt.)
    """
    lang_name = LANGUAGE_NAMES.get(language_code, language_code)
    instruction = (
        f"Bitte antworte ausschließlich in {lang_name}. "
        "Strukturiere die Antwort klar und gut lesbar.\n\n"
    )
    return instruction + text


def _wrap_summary(raw: Any) -> Dict[str, str]:
    """
    Stellt sicher, dass wir immer ein Objekt { "summary": "<text>" } zurückgeben.
    """
    if isinstance(raw, dict) and "summary" in raw:
        return {"summary": str(raw["summary"])}
    return {"summary": str(raw)}


# --------------------- Main Logic ---------------------


def run_compact(
    client: OpenAI, text: str, mode: str, opts: Optional[CompactOptions]
) -> Dict[str, Any]:
    # Sprache bestimmen
    language = (opts.language if opts and opts.language else "de").strip()

    # Für die „klassischen“ Modi verwenden wir weiterhin add_language_instruction,
    # damit vorhandene Prozessoren funktionieren.
    prompt_text = add_language_instruction(text, language)

    # --- Zusammenfassung ---
    if mode == "summary":
        raw = process_summary(client, prompt_text)
        return _wrap_summary(raw)

    # --- Stichpunkte ---
    if mode == "bullets":
        raw = process_bullets(client, prompt_text)
        # process_bullets liefert üblicherweise schon eine Liste,
        # wir kapseln sie einheitlich in { "bullets": [...] }
        if isinstance(raw, dict) and "bullets" in raw:
            return {"bullets": list(raw["bullets"])}
        if isinstance(raw, list):
            return {"bullets": [str(x) for x in raw]}
        # Fallback: Textzeilen als Liste
        lines = str(raw).splitlines()
        bullets = [ln.strip("-•* ").strip() for ln in lines if ln.strip()]
        return {"bullets": bullets}

    # --- Lernkarten ---
    if mode == "flashcards":
        raw = process_flashcards(client, prompt_text)
        # Erwartetes Format: Liste von Karten oder dict mit "cards"
        cards_out: List[Dict[str, str]] = []

        if isinstance(raw, dict) and "cards" in raw:
            for c in raw["cards"]:
                q = str(c.get("question", "")).strip()
                a = str(c.get("answer", "")).strip()
                if q and a:
                    cards_out.append({"question": q, "answer": a})
        else:
            # Fallback: Text parsen wie bei den Demo-Prompts
            text_out = str(raw)
            blocks = text_out.split("\n\n")
            for block in blocks:
                lines = [ln.strip() for ln in block.splitlines() if ln.strip()]
                if not lines:
                    continue
                question = None
                answer = None
                for line in lines:
                    lower = line.lower()
                    if lower.startswith("frage:"):
                        question = line.split(":", 1)[1].strip()
                    elif lower.startswith("antwort:"):
                        answer = line.split(":", 1)[1].strip()
                if question and answer:
                    cards_out.append({"question": question, "answer": answer})

        return {"cards": cards_out}

    # --- Für Kinder erklärt ---
    if mode == "kids":
        # NEU: build_kids_prompt erwartet (text, language)
        prompt = build_kids_prompt(text, language)
        raw = process_simple(client, prompt)
        return _wrap_summary(raw)

    # --- In 5 Sätzen ---
    if mode == "short":
        # NEU: build_short_summary_prompt erwartet (text, language)
        prompt = build_short_summary_prompt(text, language)
        raw = process_simple(client, prompt)
        return _wrap_summary(raw)

    # --- Prüfungsfragen ---
    if mode == "exam_questions":
        prompt = build_exam_questions_prompt(text, language)
        raw = process_simple(client, prompt)
        return _wrap_summary(raw)

    # --- Multiple-Choice-Quiz ---
    if mode == "quiz_mc":
        prompt = build_quiz_prompt(text, language)
        raw = process_simple(client, prompt)
        return _wrap_summary(raw)

    # --- Spickzettel / Cheatsheet ---
    if mode == "cheatsheet":
        prompt = build_cheatsheet_prompt(text, language)
        raw = process_simple(client, prompt)
        return _wrap_summary(raw)

    raise ValueError(f"Unbekannter Modus: {mode}")


# --------------------- API ---------------------


@app.post("/api/compact")
def compact_text(req: CompactRequest):
    try:
        opts = req.options or CompactOptions()
        result = run_compact(client, req.text, req.mode, opts)
        return {"success": True, "result": result}
    except Exception as e:
        print("Error /api/compact:", e)
        return {"success": False, "error": {"message": str(e)}}


@app.post("/api/compact-file")
async def compact_file(
    mode: str = Form("summary"),
    language: str = Form("de"),
    file: UploadFile = File(...),
):
    try:
        text = await extract_text_from_upload(file)
        if not text.strip():
            return {
                "success": False,
                "error": {"message": "Konnte Text nicht extrahieren"},
            }

        opts = CompactOptions(language=language)
        result = run_compact(client, text, mode, opts)

        return {"success": True, "result": result, "text": text}
    except Exception as e:
        print("Error /api/compact-file:", e)
        return {"success": False, "error": {"message": str(e)}}


