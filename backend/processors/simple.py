from openai import OpenAI
from ..prompts import build_kids_prompt


def process_simple(client: OpenAI, text: str) -> dict:
    """
    Erklärt den Text so, dass ein Kind (10–12 Jahre) ihn versteht.
    Ergebnis landet im Feld 'summary'.
    """
    prompt = build_kids_prompt(text)

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt,
    )

    output_text = response.output[0].content[0].text

    return {
        "summary": output_text,
    }
