import os
from typing import Optional, Any, Dict, List

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from PyPDF2 import PdfReader

# Nur noch der generische Prozessor
from processors.simple import process_simple

# Prompt-Builder (alle mit language-Parameter)
from prompts import (
    build_summary_prompt,
    build_bullet_prompt,
    build_flashcard_prompt,
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


def _to_summary_text(raw: Any) -> str:
    """
    Aus dem Rückgabewert von process_simple den reinen Text holen.
    """
    if isinstance(raw, dict) and "summary" in raw:
        return str(raw["summary"])
    return str(raw)


def _wrap_summary(raw: Any) -> Dict[str, str]:
    """
    Stellt sicher, dass wir immer { "summary": "<text>" } zurückgeben.
    """
    if isinstance(raw, dict) and "summary" in raw:
        return {"summary": str(raw["summary"])}
    return {"summary": str(raw)}


# --------------------- Main Logic ---------------------


def run_compact(
    client: OpenAI, text: str, mode: str, opts: Optional[CompactOptions]
) -> Dict[str, Any]:
    language = (opts.language if opts and opts.language else "de").strip()

    # --- Zusammenfassung (4–8 Sätze) ---
    if mode == "summary":
        prompt = build_summary_prompt(text, language)
        raw = process_simple(client, prompt)
        return _wrap_summary(raw)

    # --- Stichpunkte ---
    if mode == "bullets":
        prompt = build_bullet_prompt(text, language)
        raw = process_simple(client, prompt)
        summary_text = _to_summary_text(raw)

        lines = summary_text.splitlines()
        bullets: List[str] = []
        for line in lines:
            s = line.strip()
            if not s:
                continue
            # führende Bullet-Zeichen entfernen
            if s[0] in "-•*":
                s = s[1:].strip()
            bullets.append(s)

        return {"bullets": bullets}

    # --- Lernkarten ---
    if mode == "flashcards":
        prompt = build_flashcard_prompt(text, language)
        raw = process_simple(client, prompt)
        text_out = _to_summary_text(raw)

        blocks = text_out.split("\n\n")
        cards: List[Dict[str, str]] = []

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
                cards.append({"question": question, "answer": answer})

        return {"cards": cards}

    # --- Für Kinder erklärt ---
    if mode == "kids":
        prompt = build_kids_prompt(text, language)
        raw = process_simple(client, prompt)
        return _wrap_summary(raw)

    # --- In 5 Sätzen ---
    if mode == "short":
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
