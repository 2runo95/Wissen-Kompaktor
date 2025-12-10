# backend/prompts.py

from typing import Dict

# Optional: Mapping von Codes auf Klartext-Namen
LANGUAGE_LABELS: Dict[str, str] = {
    "de": "Deutsch",
    "deutsch": "Deutsch",
    "en": "Englisch",
    "english": "Englisch",
    "en-us": "Englisch",
    "fr": "Französisch",
    "es": "Spanisch",
    # kannst du nach Bedarf erweitern
}


def language_rule(language: str) -> str:
    """
    Erzeugt eine einheitliche Sprach-Regel wie:
    'Schreibe ausschließlich in Deutsch.'
    """
    if not language:
        # Fallback, wenn nichts gesetzt ist
        return "Schreibe ausschließlich in Deutsch."

    key = language.strip().lower()
    label = LANGUAGE_LABELS.get(key, language)
    return f"Schreibe ausschließlich in {label}."


def build_summary_prompt(text: str, language: str) -> str:
    lang_rule = language_rule(language)
    return f"""
Fasse den folgenden Text klar und verständlich zusammen.

Regeln:
- {lang_rule}
- Fokus auf die wichtigsten Aussagen.
- Keine überflüssigen Details.
- Länge: 4–8 Sätze.

TEXT:
{text}
"""


def build_bullet_prompt(text: str, language: str) -> str:
    lang_rule = language_rule(language)
    return f"""
Erstelle prägnante Bulletpoints aus dem folgenden Text.

Regeln:
- {lang_rule}
- Jede Zeile ein klarer Punkt.
- Keine langen Absätze.
- Zwischen 5 und 100 Punkten.

TEXT:
{text}
"""


def build_flashcard_prompt(text: str, language: str) -> str:
    lang_rule = language_rule(language)
    return f"""
Erstelle Lernkarten aus dem folgenden Text.

Format:
Frage: <Frage>
Antwort: <Antwort>

Regeln:
- {lang_rule}
- Kurze, klare Fragen.
- Antworten präzise, aber verständlich.
- Mindestens 3 Karten, maximal 100.

TEXT:
{text}
"""


def build_kids_prompt(text: str, language: str) -> str:
    lang_rule = language_rule(language)
    return f"""
Erkläre den folgenden Text so, dass ein Kind (10–12 Jahre) ihn verstehen kann.

Regeln:
- {lang_rule}
- Verwende einfache Sätze.
- Nutze Beispiele aus dem Alltag.
- Erkläre schwierige Wörter.
- Maximal 10–15 Sätze.

TEXT:
{text}
"""


def build_short_summary_prompt(text: str, language: str) -> str:
    lang_rule = language_rule(language)
    return f"""
Fasse den folgenden Text in GENAU fünf Sätzen zusammen.

Regeln:
- {lang_rule}
- Klarer, verständlicher Fließtext.
- Keine Aufzählungen.
- Keine unwichtigen Details.

TEXT:
{text}
"""


# Prüfungsfragen
def build_exam_questions_prompt(text: str, language: str) -> str:
    lang_rule = language_rule(language)
    return f"""
Erstelle aus dem folgenden Text prüfungsähnliche Fragen mit passenden Musterantworten.

Format:
Frage: <Frage>
Antwort: <Antwort>

Regeln:
- {lang_rule}
- Kurze, klare Fragen.
- Antworten präzise und verständlich.
- Mindestens 3 und maximal 50 Fragen.
- Orientiere dich stilistisch an typischen Klausur- oder Prüfungsfragen.

TEXT:
{text}
"""


#  Multiple-Choice-Quiz
def build_quiz_prompt(text: str, language: str) -> str:
    lang_rule = language_rule(language)
    return f"""
Erstelle aus dem folgenden Text ein Multiple-Choice-Quiz.

Regeln:
- {lang_rule}
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


# 🆕 Spickzettel / Cheatsheet
def build_cheatsheet_prompt(text: str, language: str) -> str:
    lang_rule = language_rule(language)
    return f"""
Erstelle aus dem folgenden Text einen extrem kompakten Spickzettel (Cheatsheet).

Regeln:
- {lang_rule}
- Nutze kurze Bulletpoints.
- Fokus auf Formeln, Definitionen, Schlüsselbegriffe, Merksätze.
- Keine langen Erklärungen.
- Nur das Wichtigste, was man für eine Prüfung braucht.

TEXT:
{text}
"""
