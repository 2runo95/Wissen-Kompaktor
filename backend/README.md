# Wissen-Kompaktor 🧠

Ein schlankes Web-Tool, mit dem du Texte:

- **zusammenfassen**
- in **Stichpunkte** umwandeln
- als **Lernkarten** (Frage/Antwort)
- **für Kinder erklärt**
- oder **in 5 Sätzen** kurz zusammengefasst

direkt im Browser aufbereiten kannst.

Das Projekt besteht aus einem **FastAPI-Backend** (Python) und einem **React/TypeScript-Frontend** mit Tailwind CSS.  
Die KI-Funktionen laufen über die OpenAI API.

---

## 🌍 Live-Version

Frontend: **`https://DEINE-FRONTEND-URL.onrender.com`**  
Backend: **`https://DEIN-BACKEND-NAME.onrender.com`**

> Ersetze die Platzhalter oben durch deine echten Render-URLs.

---

## ✨ Features

- 📑 **Mehrere Modi**
  - *Zusammenfassung*
  - *Stichpunkte*
  - *Lernkarten*
  - *Für Kinder erklärt*
  - *In 5 Sätzen*
- 📚 **Lernkarten-Generator**  
  Aus einem Fließtext werden automatisch Frage/Antwort-Karten erstellt.
- 🧒 **Kinder-Modus**  
  Erklärt den Text in einfacher Sprache für Kinder im Alter von ca. 10–12 Jahren.
- 🕵️ **Kurzfassung in 5 Sätzen**  
  Ideal, um sich schnell einen Überblick zu verschaffen.
- 📝 **History-Reiter „Zuletzt gemacht“**  
  Zeigt die letzten Ergebnisse an.
- 📋 **Kopieren & Export**  
  Ergebnisse können kopiert oder als Datei gespeichert werden (.txt, .pdf – je nach aktuellem Stand).
- 🍪 **Cookie-Banner mit Consent**  
  Nur bei Zustimmung werden Werbebanner / Tracking aktiviert.
- 📜 **Impressum & Datenschutz**  
  Statische Seiten gemäß deutscher Anforderungen verlinkt.

---

## 🧱 Tech-Stack

**Frontend**

- React + TypeScript
- Vite
- Tailwind CSS
- Fetch-API zum Aufruf des Backends

**Backend**

- Python 3.13
- FastAPI
- Uvicorn
- `python-dotenv`
- OpenAI Python SDK

**Hosting**

- Frontend: Render (Static Site)
- Backend: Render (Web Service, Uvicorn)

---

## 🚀 Lokale Entwicklung

### Voraussetzungen

- Node.js (empfohlen LTS)
- Python 3.11+
- Ein OpenAI API Key

---

### 1️⃣ Backend lokal starten

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate         # Windows PowerShell
pip install -r requirements.txt
