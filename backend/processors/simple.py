# processors/simple.py

from openai import OpenAI


def process_simple(client: OpenAI, prompt: str):
    """
    Führt einen einfachen ChatCompletion-Aufruf aus.
    Der Prompt MUSS vollständig sein (inkl. Sprache!).
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "You are a helpful assistant that strictly follows instructions."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.4,
    )

    return response.choices[0].message.content.strip()
