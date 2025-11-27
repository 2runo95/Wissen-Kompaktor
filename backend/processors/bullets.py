from openai import OpenAI
from prompts import build_bullet_prompt


def process_bullets(client: OpenAI, text: str) -> dict:
    """
    Erzeugt Stichpunkte und gibt sie als Liste von Strings zurück.
    """
    prompt = build_bullet_prompt(text)

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt,
    )

    raw_text = response.output[0].content[0].text

    # Rohtext in einzelne Bullet-Zeilen aufräumen
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    bullets: list[str] = []

    for line in lines:
        # führende Bullet-Zeichen weg
        if line.startswith(("-", "•", "*")):
            line = line.lstrip("-•*").strip()
        bullets.append(line)

    # Fallback, falls irgendwas schiefgeht
    if not bullets and raw_text.strip():
        bullets = [raw_text.strip()]

    return {
        "bullets": bullets,
    }
