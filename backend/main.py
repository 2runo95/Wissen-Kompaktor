from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os
from dotenv import load_dotenv
from openai import OpenAI
from .processors.summary import process_summary
from .processors.bullets import process_bullets
from .processors.flashcards import process_flashcards
from .processors.simple import process_simple
from .processors.short import process_short_summary
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


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
    options: Optional[CompactOptions] = None


@app.get("/")
def root():
    return {"message": "Wissen-Kompaktor API läuft 🚀"}


@app.post("/api/compact")
def compact_text(payload: CompactRequest):
    text = payload.text
    mode = payload.mode

    if mode == "summary":
        result = process_summary(client, text)

    elif mode == "bullets":
        result = process_bullets(client, text)

    elif mode == "flashcards":
        result = process_flashcards(client, text)
        
    elif mode == "kids":
        result = process_simple(client, text)
    
    elif mode == "short":
        result = process_short_summary(client, text)
        
    else:
        return {
            "success": False,
            "error": {
                "code": "MODE_NOT_IMPLEMENTED",
                "message": f"Mode '{mode}' ist noch nicht implementiert."
            }
        }

    return {
        "success": True,
        "mode": mode,
        "meta": {
            "originalChars": len(text),
            "originalWords": len(text.split()),
            "processedAt": datetime.utcnow().isoformat() + "Z",
        },
        "result": result
    }
