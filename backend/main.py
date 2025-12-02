import os
from typing import Optional

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
from prompts import build_kids_prompt, build_short_summary_prompt

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

        text_parts = []
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


# --------------------- Main Logic ---------------------


def add_language_instruction(text: str, language_code: str) -> str:
    """
    Fügt dem Prompt eine klare Sprachinstruktion hinzu,
    basierend auf dem Sprachcode vom Frontend.
    """
    lang_name = LANGUAGE_NAMES.get(language_code, language_code)
    instruction = (
        f"Bitte antworte ausschließlich in {lang_name}. "
        "Strukturiere die Antwort klar und gut lesbar.\n\n"
    )
    return instruction + text


def run_compact(client: OpenAI, text: str, mode: str, opts: Optional[CompactOptions]):
    lang_code = opts.language if opts else "de"
    prompt_text = add_language_instruction(text, lang_code)

    if mode == "summary":
        return process_summary(client, prompt_text)

    if mode == "bullets":
        return process_bullets(client, prompt_text)

    if mode == "flashcards":
        return process_flashcards(client, prompt_text)

    if mode == "kids":
        prompt = build_kids_prompt(prompt_text)
        return process_simple(client, prompt)

    if mode == "short":
        prompt = build_short_summary_prompt(prompt_text)
        return process_simple(client, prompt)

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
