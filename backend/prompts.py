def build_summary_prompt(text: str) -> str:
    return f"""
Fasse den folgenden Text klar und verständlich zusammen.

Regeln:
- Schreibe auf Deutsch.
- Fokus auf die wichtigsten Aussagen.
- Keine überflüssigen Details.
- Länge: 4–8 Sätze.

TEXT:
{text}
"""


def build_bullet_prompt(text: str) -> str:
    return f"""
Erstelle prägnante Bulletpoints aus dem folgenden Text.

Regeln:
- Schreibe auf Deutsch.
- Jede Zeile ein klarer Punkt.
- Keine langen Absätze.
- Zwischen 5 und 100 Punkten.

TEXT:
{text}
"""


def build_flashcard_prompt(text: str) -> str:
    return f"""
Erstelle Lernkarten aus dem folgenden Text.

Format:
Frage: <Frage>
Antwort: <Antwort>

Regeln:
- Schreibe auf Deutsch.
- Kurze, klare Fragen.
- Antworten präzise, aber verständlich.
- Mindestens 3 Karten, maximal 100.

TEXT:
{text}
"""


def build_kids_prompt(text: str) -> str:
    return f"""
Erkläre den folgenden Text so, dass ein Kind (10–12 Jahre) ihn verstehen kann.

Regeln:
- Schreibe auf Deutsch.
- Verwende einfache Sätze.
- Nutze Beispiele aus dem Alltag.
- Erkläre schwierige Wörter.
- Maximal 10–15 Sätze.

TEXT:
{text}
"""


def build_short_summary_prompt(text: str) -> str:
    return f"""
Fasse den folgenden Text in GENAU fünf Sätzen zusammen.

Regeln:
- Schreibe auf Deutsch.
- Klarer, verständlicher Fließtext.
- Keine Aufzählungen.
- Keine unwichtigen Details.

TEXT:
{text}
"""
