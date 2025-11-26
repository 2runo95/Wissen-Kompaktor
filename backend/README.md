# Wissen-Kompaktor 🧠⚡

Wissen-Kompaktor ist ein kleines Web-Tool, mit dem du Texte direkt im Browser verdichten kannst:

- **Zusammenfassung** (normal)
- **Stichpunkte**
- **Lernkarten** (Frage–Antwort)
- **Für Kinder erklärt**
- **In 5 Sätzen**

Ideal zum Lernen, Wiederholen, Erklären und kompakt machen von Fachtexten.

---

## 🚀 Live-Demo

> Öffentlich erreichbar unter deiner Render-Frontend-URL, z. B.:  
> `https://DEINE-STATIC-URL.onrender.com`  
> *(hier im Repo bitte die echte URL eintragen)*

---

## 🧩 Features

- ✂️ **Zusammenfassungen** langer Texte  
- 📌 **Stichpunkte** als strukturierte Bullet-List  
- 🎓 **Lernkarten** (Q&A-Karten) für Prüfungen / Lernen  
- 👶 **Für Kinder erklärt** – gleiche Inhalte in einfacher Sprache  
- 🧾 **In 5 Sätzen** – ultrakurze Summary  
- 📋 **Kopieren-Button** für alle Modi  
- 💾 **Export** (z. B. als Text / später PDF / Bild)  
- 🕒 **History-Reiter „Zuletzt gemacht“** (letzte Ergebnisse im Browser behalten)  
- 🌙 **Modernes Dark-UI** mit Tailwind CSS  
- 🖥️ Funktioniert im Browser auf Desktop, Laptop, Tablet & Handy

---

## 🏗️ Tech-Stack

**Frontend**

- React + TypeScript
- Vite
- Tailwind CSS

**Backend**

- Python 3
- FastAPI
- Uvicorn
- OpenAI API (`gpt-4.1-mini` via `responses.create`)

**Hosting**

- Render.com  
  - Webservice für das Backend (FastAPI)  
  - Static Site für das Frontend (gebaute Vite-App)

---

## 📁 Projektstruktur

```text
Wissen-Kompaktor/
├─ backend/
│  ├─ main.py              # FastAPI App, /api/compact Endpoint
│  ├─ prompts.py           # Prompt-Bausteine für die verschiedenen Modi
│  ├─ processors/
│  │  ├─ summary.py        # Verarbeitung für Zusammenfassung
│  │  ├─ bullets.py        # Verarbeitung für Stichpunkte
│  │  ├─ flashcards.py     # Verarbeitung für Lernkarten
│  │  └─ simple.py         # Verarbeitung für Sondermodi (z.B. Kids / 5 Sätze)
│  └─ requirements.txt     # Python-Abhängigkeiten
│
├─ frontend/
│  ├─ src/
│  │  ├─ App.tsx           # React-UI, Modi-Logik, Requests ans Backend
│  │  └─ main.tsx          # Einstiegspunkt React
│  ├─ index.html
│  ├─ package.json
│  └─ vite.config.ts
│
├─ .gitignore
└─ README.md
