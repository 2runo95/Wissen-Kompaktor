# backend/prompts.py

from typing import Dict

# Mapping von Codes auf englische Sprach-Namen
LANGUAGE_LABELS: Dict[str, str] = {
    "de": "German",
    "deutsch": "German",
    "en": "English",
    "english": "English",
    "en-us": "English",
    "fr": "French",
    "es": "Spanish",
    "tr": "Turkish",
    "ar": "Arabic",
    "ja": "Japanese",
    "zh": "Chinese",
    # Erweiterbar
}


def language_rule(language: str) -> str:
    """
    Harte Sprachvorgabe – wird vom Modell kaum ignoriert.
    """
    if not language:
        language = "de"

    key = language.strip().lower()
    label = LANGUAGE_LABELS.get(key, language)

    # Spezieller Fall: Deutsch
    if key in ("de", "deutsch"):
        return (
            "IMPORTANT: Antworte ausschließlich auf Deutsch. "
            "Verwende keine andere Sprache.\n"
        )

    # Alle anderen Sprachen
    return (
        f"IMPORTANT: Answer exclusively in {label}. "
        "Do not use any other language, even if the input text "
        "is written in a different language.\n"
    )


def build_summary_prompt(text: str, language: str = "de") -> str:
    lang_rule = language_rule(language)
    return f"""
{lang_rule}
Fasse den folgenden Text klar und verständlich zusammen.

Regeln:
- Fokus auf die wichtigsten Aussagen.
- Keine überflüssigen Details.
- Länge: 4–8 Sätze.

TEXT:
{text}
"""


def build_bullet_prompt(text: str, language: str = "de") -> str:
    lang_rule = language_rule(language)
    return f"""
{lang_rule}
Erstelle prägnante Bulletpoints aus dem folgenden Text.

Regeln:
- Jede Zeile ein klarer Punkt.
- Keine langen Absätze.
- Zwischen 5 und 100 Punkten.

TEXT:
{text}
"""


def build_flashcard_prompt(text: str, language: str = "de") -> str:
    lang_rule = language_rule(language)
    return f"""
{lang_rule}
Erstelle Lernkarten aus dem folgenden Text.

Format:
Frage: <Frage>
Antwort: <Antwort>

Regeln:
- Kurze, klare Fragen.
- Antworten präzise, aber verständlich.
- Mindestens 3 Karten, maximal 100.

TEXT:
{text}
"""


def build_kids_prompt(text: str, language: str = "de") -> str:
    lang_rule = language_rule(language)
    return f"""
{lang_rule}
Erkläre den folgenden Text so, dass ein Kind (10–12 Jahre) ihn verstehen kann.

Regeln:
- Verwende einfache Sätze.
- Nutze Beispiele aus dem Alltag.
- Erkläre schwierige Wörter.
- Maximal 10–15 Sätze.

TEXT:
{text}
"""


def build_short_summary_prompt(text: str, language: str = "de") -> str:
    lang_rule = language_rule(language)
    return f"""
{lang_rule}
Fasse den folgenden Text in GENAU fünf Sätzen zusammen.

Regeln:
- Klarer, verständlicher Fließtext.
- Keine Aufzählungen.
- Keine unwichtigen Details.

TEXT:
{text}
"""


def build_exam_questions_prompt(text: str, language: str = "de") -> str:
    lang_rule = language_rule(language)
    return f"""
{lang_rule}
Erstelle aus dem folgenden Text prüfungsähnliche Fragen mit passenden Musterantworten.

Format:
Frage: <Frage>
Antwort: <Antwort>

Regeln:
- Kurze, klare Fragen.
- Antworten präzise und verständlich.
- Mindestens 3 und maximal 50 Fragen.
- Orientiere dich stilistisch an typischen Klausur- oder Prüfungsfragen.

TEXT:
{text}
"""


def build_quiz_prompt(text: str, language: str = "de") -> str:
    lang_rule = language_rule(language)
    return f"""
{lang_rule}
Erstelle aus dem folgenden Text ein Multiple-Choice-Quiz.

Regeln:
- Zu jeder Frage genau eine richtige und drei falsche, aber plausible Antworten.
- Markiere die richtige Antwort mit (✔) am Anfang der richtigen Option.
- Nummeriere die Fragen fortlaufend.

Beispielformat:
Frage 1: <Frage>
(✔) Richtige Antwort
(A) Falsche Antwort
(B) Falsche Antwort
(C) Falsche Antwort

TEXT:
{text}
"""


def build_cheatsheet_prompt(text: str, language: str = "de") -> str:
    lang_rule = language_rule(language)
    return f"""
{lang_rule}
Erstelle aus dem folgenden Text einen extrem kompakten Spickzettel (Cheatsheet).

Regeln:
- Nutze kurze Bulletpoints.
- Fokus auf Formeln, Definitionen, Schlüsselbegriffe, Merksätze.
- Keine langen Erklärungen.
- Nur das Wichtigste, was man für eine Prüfung braucht.

TEXT:
{text}
"""
