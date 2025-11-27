from openai import OpenAI
from prompts import build_flashcard_prompt


def process_flashcards(client: OpenAI, text: str) -> dict:
    """
    Erzeugt Lernkarten im Format:
    Frage: ...
    Antwort: ...

    und gibt sie als Liste von {question, answer} zurück.
    """
    prompt = build_flashcard_prompt(text)

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt,
    )

    raw_text = response.output[0].content[0].text

    cards = []
    current_question: str | None = None

    for line in raw_text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue

        lower = stripped.lower()

        if lower.startswith("frage"):
            # alles nach dem ersten ":" nehmen
            if ":" in stripped:
                current_question = stripped.split(":", 1)[1].strip()
            else:
                current_question = stripped
        elif lower.startswith("antwort") and current_question:
            if ":" in stripped:
                answer = stripped.split(":", 1)[1].strip()
            else:
                answer = stripped

            cards.append({
                "question": current_question,
                "answer": answer,
            })
            current_question = None

    # Fallback: wenn Parsing nicht geklappt hat, Einfach-Card
    if not cards and raw_text.strip():
        cards.append({
            "question": "Worum geht es in diesem Text?",
            "answer": raw_text.strip(),
        })

    return {
        "cards": cards,
    }
