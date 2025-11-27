from openai import OpenAI
from prompts import build_short_summary_prompt


def process_short_summary(client: OpenAI, text: str) -> dict:
    """
    Fasse den Text in ca. 5 Sätzen zusammen.
    Ergebnis landet im Feld 'summary'.
    """
    prompt = build_short_summary_prompt(text)

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt,
    )

    output_text = response.output[0].content[0].text

    return {
        "summary": output_text,
    }
