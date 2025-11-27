from openai import OpenAI
from prompts import build_summary_prompt


def process_summary(client: OpenAI, text: str) -> dict:
    """
    Normale Zusammenfassung.
    Ergebnis landet im Feld 'summary'.
    """
    prompt = build_summary_prompt(text)

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt,
    )

    # gleiches Muster wie bei deinen bisherigen Calls
    output_text = response.output[0].content[0].text

    return {
        "summary": output_text,
    }
