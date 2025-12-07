import React, { useEffect, useState } from "react";
import CookieBanner, { type CookieConsentValue } from "./CookieBanner";
import AdBanner from "./AdBanner";

type Mode = "summary" | "bullets" | "flashcards" | "kids" | "short";

type LanguageCode = "de" | "en" | "es" | "fr" | "tr" | "ar" | "ja" | "zh";

const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  de: "Deutsch",
  en: "Englisch",
  es: "Spanisch",
  fr: "Französisch",
  tr: "Türkisch",
  ar: "Arabisch",
  ja: "Japanisch",
  zh: "Chinesisch",
};

interface Flashcard {
  question: string;
  answer: string;
}

interface ApiResult {
  summary?: string;
  bullets?: string[];
  cards?: Flashcard[];
}

interface HistoryEntry {
  id: number;
  timestamp: string;
  mode: Mode;
  inputPreview: string;
  result: ApiResult;
}

const API_BASE = "https://wissen-backend-u8d0.onrender.com";

const MODES: { id: Mode; label: string }[] = [
  { id: "summary", label: "Zusammenfassung" },
  { id: "bullets", label: "Stichpunkte" },
  { id: "flashcards", label: "Lernkarten" },
  { id: "kids", label: "Für Kinder erklärt" },
  { id: "short", label: "In 5 Sätzen" },
];

const App: React.FC = () => {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("summary");
  const [language, setLanguage] = useState<LanguageCode>("de");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // COOKIE CONSENT
  const [cookieConsent, setCookieConsent] =
    useState<CookieConsentValue>(null);

  // Cookie-Status aus localStorage laden
  useEffect(() => {
    const stored = localStorage.getItem("cookieConsent");
    if (stored === "accepted" || stored === "necessary") {
      setCookieConsent(stored);
    } else {
      setCookieConsent(null);
    }
  }, []);

  // History aus localStorage laden
  useEffect(() => {
    try {
      const raw = localStorage.getItem("wk_history");
      if (raw) {
        const parsed = JSON.parse(raw) as HistoryEntry[];
        setHistory(parsed);
      }
    } catch {
      // egal, dann eben leere History
    }
  }, []);

  // History speichern wenn sie sich ändert
  useEffect(() => {
    localStorage.setItem("wk_history", JSON.stringify(history));
  }, [history]);

  const wordCount =
    text.trim().length === 0
      ? 0
      : text.trim().split(/\s+/).filter(Boolean).length;

  const addToHistory = (newResult: ApiResult, sourceText: string) => {
    const entry: HistoryEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      mode,
      inputPreview: sourceText.slice(0, 200),
      result: newResult,
    };
    setHistory((prev) => [entry, ...prev].slice(0, 20)); // max 20 Einträge
  };

  // ─────────────────────────────────────────────
  // Text-basierte Anfrage
  // ─────────────────────────────────────────────
  const handleSubmit = async () => {
    setError("");
    setResult(null);

    if (!text.trim()) {
      setError("Bitte gib einen Text ein oder lade eine Datei hoch.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/compact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // WICHTIG: Sprache geht jetzt in options.language ans Backend
        body: JSON.stringify({
          text,
          mode,
          options: { language },
        }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        const msg =
          data?.error?.message ||
          "Es ist ein Fehler bei der Verarbeitung aufgetreten.";
        setError(msg);
      } else {
        const resultData = data.result as ApiResult;
        setResult(resultData);
        addToHistory(resultData, text);
      }
    } catch (e) {
      console.error(e);
      setError("Server nicht erreichbar. Läuft das Backend?");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // Datei-Upload (PDF + Bilder)
  // ─────────────────────────────────────────────
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setResult(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);
      formData.append("language", language);

      const res = await fetch(`${API_BASE}/api/compact-file`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        const msg =
          data?.error?.message ||
          "Es ist ein Fehler bei der Verarbeitung der Datei aufgetreten.";
        setError(msg);
      } else {
        const resultData = data.result as ApiResult;
        setResult(resultData);

        if (data.text && typeof data.text === "string") {
          setText(data.text);
          addToHistory(resultData, data.text);
        } else {
          addToHistory(resultData, `Datei: ${file.name}`);
        }
      }
    } catch (e) {
      console.error(e);
      setError("Server nicht erreichbar. Läuft das Backend?");
    } finally {
      setLoading(false);
      event.target.value = ""; // gleiche Datei erneut auswählbar
    }
  };

  // ─────────────────────────────────────────────
  // Export-Funktionen
  // ─────────────────────────────────────────────
  const buildResultText = (): string => {
    if (!result) return "";
    if (mode === "summary" || mode === "kids" || mode === "short") {
      return result.summary ?? "";
    }
    if (mode === "bullets") {
      return (result.bullets ?? []).join("\n");
    }
    if (mode === "flashcards") {
      return (result.cards ?? [])
        .map(
          (c, i) =>
            `Karte ${i + 1}\nFrage: ${c.question}\nAntwort: ${c.answer}`
        )
        .join("\n\n");
    }
    return "";
  };

  const handleCopy = () => {
    const textToCopy = buildResultText();
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
  };

  const downloadFile = (
    content: string,
    filename: string,
    mime: string
  ) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTxt = () => {
    const content = buildResultText();
    if (!content) return;
    downloadFile(
      content,
      `wissen-kompaktor-${mode}.txt`,
      "text/plain;charset=utf-8"
    );
  };

  const handleDownloadPdf = () => {
    const content = buildResultText();
    if (!content) return;
    downloadFile(
      content,
      `wissen-kompaktor-${mode}.pdf`,
      "application/pdf"
    );
  };

  const handleDownloadImage = () => {
    alert("Bild-Export wird später hinzugefügt 🙂");
  };

  // ─────────────────────────────────────────────
  // Rendering: Ergebnis (mit Beispiel-Inhalten)
  // ─────────────────────────────────────────────
  const renderResult = (r: ApiResult | null, m: Mode) => {
    // Wenn noch kein echtes Ergebnis da ist -> Demo-Content
    if (!r) {
      if (m === "summary") {
        return (
          <div className="text-xs text-slate-200 whitespace-pre-line">
            {`Beispiel-Zusammenfassung:

Der Wissen-Kompaktor fasst längere Texte in wenigen Sätzen zusammen. 
So kannst du dir schnell einen Überblick verschaffen, ohne alles lesen zu müssen.`}
          </div>
        );
      }

      if (m === "bullets") {
        return (
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-200">
            <li>⚡ Lange Texte werden automatisch gekürzt</li>
            <li>📌 Wichtige Stichpunkte werden hervorgehoben</li>
            <li>🎯 Ideal für Lernen, Prüfungsvorbereitung & Notizen</li>
          </ul>
        );
      }

      if (m === "flashcards") {
        const demoCards: Flashcard[] = [
          {
            question: "Was macht der Wissen-Kompaktor?",
            answer:
              "Er verwandelt lange Texte in kurze Zusammenfassungen, Stichpunkte oder Lernkarten.",
          },
          {
            question: "Wofür sind Lernkarten besonders nützlich?",
            answer:
              "Zum Wiederholen von Inhalten vor Prüfungen oder zum schnellen Abfragen.",
          },
        ];
        return (
          <div className="space-y-3 text-slate-200 text-xs">
            {demoCards.map((card, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-700 bg-slate-900/60 p-3"
              >
                <div className="text-[10px] uppercase text-slate-400">
                  Beispielkarte {i + 1}
                </div>
                <div className="font-semibold mt-1">
                  ❓ {card.question}
                </div>
                <div className="mt-1 text-[13px] text-slate-200">
                  ✅ {card.answer}
                </div>
              </div>
            ))}
          </div>
        );
      }

      if (m === "kids") {
        return (
          <div className="text-xs text-slate-200 whitespace-pre-line">
            {`Beispiel für „Für Kinder erklärt“:

Der Wissen-Kompaktor erklärt schwierige Themen so,
als würde man sie einem Kind in einfacher Sprache erzählen.`}
          </div>
        );
      }

      if (m === "short") {
        return (
          <div className="text-xs text-slate-200 whitespace-pre-line">
            {`Beispiel für „In 5 Sätzen“:

1. Der Wissen-Kompaktor reduziert lange Texte auf das Wichtigste.
2. Er kann Zusammenfassungen, Stichpunkte und Lernkarten erzeugen.
3. Du kannst wählen, wie kurz oder ausführlich das Ergebnis sein soll.
4. Außerdem kannst du die Sprache der Antwort einstellen.
5. So sparst du Zeit und lernst Inhalte schneller.`}
          </div>
        );
      }

      return (
        <div className="text-slate-500 text-xs">
          Hier erscheint das Ergebnis.
        </div>
      );
    }

    // Ab hier: echtes Ergebnis anzeigen
    if (m === "summary" || m === "kids" || m === "short") {
      return (
        <div className="whitespace-pre-line text-slate-200 text-sm">
          {r.summary || "Keine Zusammenfassung gefunden."}
        </div>
      );
    }

    if (m === "bullets") {
      const bullets = r.bullets ?? [];
      return (
        <ul className="list-disc list-inside space-y-1 text-slate-200 text-sm">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      );
    }

    if (m === "flashcards") {
      const cards = r.cards ?? [];
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
              <div className="font-semibold mt-1 text-slate-100">
                ❓ {card.question}
              </div>
              <div className="mt-1 text-sm text-slate-200">
                ✅ {card.answer}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  const renderHistory = () => {
    if (history.length === 0) {
      return (
        <div className="text-xs text-slate-500">
          Noch keine bisherigen Kompaktierungen.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {history.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => {
              setMode(entry.mode);
              setResult(entry.result);
              setActiveTab("current");
            }}
            className="w-full text-left rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 hover:border-sky-500 transition"
          >
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>{entry.timestamp}</span>
              <span>
                {MODES.find((m) => m.id === entry.mode)?.label ??
                  entry.mode}
              </span>
            </div>
            <div className="text-xs text-slate-200 line-clamp-2">
              {entry.inputPreview}
            </div>
          </button>
        ))}
      </div>
    );
  };

  // ─────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      {/* TOP-BANNER */}
      <div className="max-w-6xl mx-auto mb-4">
        <AdBanner
          cookieConsent={cookieConsent}
          slot="4124950988" // Block Oben
          style={{ display: "block", width: "100%", minHeight: 90 }}
        />
      </div>

      <div className="max-w-6xl mx-auto flex gap-4">
        {/* LINKES AD – nur auf XL-Screens sichtbar */}
        <div className="hidden xl:block w-56">
          <AdBanner
            cookieConsent={cookieConsent}
            slot="5661393931" // Block Links
            style={{ display: "block", width: "100%", minHeight: 600 }}
          />
        </div>

        {/* Haupt-Card */}
        <div className="flex-1">
          <div className="w-full bg-slate-900/70 border border-slate-800 rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-white">
              Wissen-Kompaktor
            </h1>

            {/* Einleitungstext für Nutzer & AdSense */}
            <p className="text-slate-200 mb-4 text-sm sm:text-base">
              Der Wissen-Kompaktor macht aus umfangreichen Texten präzise Kernaussagen und mehr...
            </p>

            {/* Modus-Auswahl */}
            <div className="flex flex-wrap gap-2 mb-3">
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

            {/* Antwortsprache – Dropdown */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-400">
                Antwortsprache
              </span>
              <select
                value={language}
                onChange={(e) =>
                  setLanguage(e.target.value as LanguageCode)
                }
                className="text-xs rounded-lg border px-2 py-1 bg-slate-950/70 text-slate-100 border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {(Object.keys(LANGUAGE_LABELS) as LanguageCode[]).map(
                  (code) => (
                    <option key={code} value={code}>
                      {LANGUAGE_LABELS[code]}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Eingabe-Spalte */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-2 text-slate-200">
                  Eingabetext
                </label>
                <textarea
                  className="flex-1 min-h-[220px] max-h-[60vh] rounded-xl bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none overflow-y-auto text-white"
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

                {/* Datei-Upload */}
                <div className="mt-4">
                  <label className="text-xs font-medium text-slate-300">
                    Oder lade eine PDF- oder Bilddatei hoch:
                  </label>
                  <div className="mt-2">
                    <label className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-200 cursor-pointer hover:border-sky-500">
                      Datei auswählen (PDF/Bild)
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
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

              {/* Ausgabe-Spalte */}
              <div className="flex flex-col">
                {/* Tabs Aktuell / History */}
                <div className="flex items-center gap-3 mb-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("current")}
                    className={`text-xs px-2 py-1 rounded-full border ${
                      activeTab === "current"
                        ? "bg-sky-500 border-sky-500 text-white"
                        : "border-slate-700 text-slate-300"
                    }`}
                  >
                    Aktuell
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className={`text-xs px-2 py-1 rounded-full border ${
                      activeTab === "history"
                        ? "bg-sky-500 border-sky-500 text-white"
                        : "border-slate-700 text-slate-300"
                    }`}
                  >
                    Zuletzt gemacht
                  </button>

                  <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="hover:text-sky-400"
                    >
                      Kopieren
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadTxt}
                      className="hover:text-sky-400"
                    >
                      .txt
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="hover:text-sky-400"
                    >
                      .pdf
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadImage}
                      className="hover:text-sky-400"
                    >
                      Bild
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-[220px] max-h-[60vh] rounded-xl bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm overflow-y-auto">
                  {loading && !result && activeTab === "current" && (
                    <div className="text-slate-500 text-xs">
                      Bitte warten…
                    </div>
                  )}
                  {!loading &&
                    (activeTab === "current"
                      ? renderResult(result, mode)
                      : renderHistory())}
                </div>
              </div>
            </div>

            {/* Cookie-Banner */}
            <CookieBanner
              value={cookieConsent}
              onChange={setCookieConsent}
            />
          </div>
        </div>

        {/* RECHTES AD – nur auf XL-Screens sichtbar */}
        <div className="hidden xl:block w-56">
          <AdBanner
            cookieConsent={cookieConsent}
            slot="3822640606" // Block Rechts
            style={{ display: "block", width: "100%", minHeight: 600 }}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
