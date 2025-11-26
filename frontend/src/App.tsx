import React, { useState, useEffect } from "react";
import CookieBanner from "./CookieBanner";
import type { CookieConsentValue } from "./CookieBanner";
import AdBanner from "./AdBanner";


type Mode = "summary" | "bullets" | "flashcards" | "kids" | "short";

interface Flashcard {
  question: string;
  answer: string;
}

interface ApiResult {
  summary?: string;
  bullets?: string[];
  cards?: Flashcard[];
}

const API_BASE = "https://wissen-backend-u8d0.onrender.com";

const MODES: { id: Mode; label: string }[] = [
  { id: "summary", label: "Zusammenfassung" },
  { id: "bullets", label: "Stichpunkte" },
  { id: "flashcards", label: "Lernkarten" },
  { id: "kids", label: "Für Kinder erklärt" },
  { id: "short", label: "Kurzfassung (5 Sätze)" },
];

const App: React.FC = () => {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("summary");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState("");

  // COOKIE CONSENT
  const [cookieConsent, setCookieConsent] = useState<CookieConsentValue>(() => {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem("cookieConsent");
    if (stored === "accepted" || stored === "necessary") return stored;
    return null;
  });

  useEffect(() => {
    if (cookieConsent === null) return;
    window.localStorage.setItem("cookieConsent", cookieConsent);
  }, [cookieConsent]);

  const wordCount =
    text.trim().length === 0
      ? 0
      : text.trim().split(/\s+/).filter(Boolean).length;

  const handleSubmit = async () => {
    setError("");
    setResult(null);

    if (!text.trim()) {
      setError("Bitte gib einen Text ein.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/compact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, mode }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        const msg =
          data?.error?.message ||
          "Es ist ein Fehler bei der Verarbeitung aufgetreten.";
        setError(msg);
      } else {
        setResult(data.result as ApiResult);
      }
    } catch (e) {
      console.error(e);
      setError("Server nicht erreichbar. Läuft das Backend?");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;

    let textToCopy = "";

    if ((mode === "summary" || mode === "kids" || mode === "short") && result.summary) {
      textToCopy = result.summary;
    } else if (mode === "bullets" && result.bullets) {
      textToCopy = result.bullets.join("\n");
    } else if (mode === "flashcards" && result.cards) {
      textToCopy = result.cards
        .map(
          (c, i) =>
            `Karte ${i + 1}\nFrage: ${c.question}\nAntwort: ${c.answer}`
        )
        .join("\n\n");
    }

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
    }
  };

  const renderResult = () => {
    if (!result) {
      return (
        <div className="text-slate-500 text-xs">
          Hier erscheint das Ergebnis.
        </div>
      );
    }

    if (mode === "summary" || mode === "kids" || mode === "short") {
      return (
        <div className="whitespace-pre-line">
          {result.summary || "Keine Erklärung gefunden."}
        </div>
      );
    }

    if (mode === "bullets") {
      const bullets = result.bullets ?? [];
      return (
        <ul className="list-disc list-inside space-y-1">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      );
    }

    if (mode === "flashcards") {
      const cards = result.cards ?? [];
      return (
        <div className="space-y-3">
          {cards.map((card, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-700 bg-slate-900/60 p-3"
            >
              <div className="text-xs uppercase text-slate-400">
                Karte {i + 1}
              </div>
              <div className="font-semibold mt-1">❓ {card.question}</div>
              <div className="mt-1 text-sm text-slate-200">
                ✅ {card.answer}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return <div>Dieser Modus ist noch nicht implementiert.</div>;
  };

  return (
    <>
      {/* Cookie-Banner liegt über allem */}
      <CookieBanner value={cookieConsent} onChange={setCookieConsent} />

      <div className="min-h-screen flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-6xl bg-slate-900/70 border border-slate-800 rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Wissen-Kompaktor
          </h1>

          {/* Werbung – nur wenn Nutzer zugestimmt hat */}
          <AdBanner cookieConsent={cookieConsent} />

          <p className="text-slate-400 mb-6 text-sm sm:text-base">
            Fasse Texte zusammen, mach Bulletpoints oder Lernkarten – direkt im
            Browser.
          </p>

          {/* Tabs / Modus-Auswahl */}
          <div className="flex flex-wrap gap-2 mb-4">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  mode === m.id
                    ? "bg-sky-500 text-white border-sky-500"
                    : "bg-slate-900 text-slate-200 border-slate-700 hover:border-slate-500"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Eingabe */}
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-2 text-slate-200">
                Eingabetext
              </label>
              <textarea
                className="flex-1 min-h-[220px] rounded-xl bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-vertical"
                placeholder="Füge hier deinen Text ein..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{wordCount} Wörter</span>
                <button
                  type="button"
                  onClick={() => setText("")}
                  className="hover:text-sky-400"
                >
                  Leeren
                </button>
              </div>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-sky-500 hover:bg-sky-600 disabled:bg-sky-900 px-4 py-2 text-sm font-semibold transition"
              >
                {loading ? "Wird verarbeitet..." : "Kompaktieren"}
              </button>
              {error && (
                <div className="mt-3 text-xs text-red-400 bg-red-900/30 border border-red-800 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}
            </div>

            {/* Ausgabe */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium text-slate-200">
                  Ergebnis ({MODES.find((m) => m.id === mode)?.label})
                </h2>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-xs text-slate-400 hover:text-sky-400"
                >
                  Kopieren
                </button>
              </div>
              <div className="flex-1 min-h-[220px] rounded-xl bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm overflow-auto">
                {loading && !result && (
                  <div className="text-slate-500 text-xs">Bitte warten…</div>
                )}
                {!loading && renderResult()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default App;
