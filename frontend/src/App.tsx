import React, { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

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

interface HistoryEntry {
  id: string;
  mode: Mode;
  text: string;
  result: ApiResult;
  createdAt: string;
}

const MODES: { id: Mode; label: string }[] = [
  { id: "summary", label: "Zusammenfassung" },
  { id: "bullets", label: "Bulletpoints" },
  { id: "flashcards", label: "Lernkarten" },
  { id: "kids", label: "Für Kinder erklärt" },
  { id: "short", label: "In 5 Sätzen" },
];

const HISTORY_KEY = "wk_history_v1";

const App: React.FC = () => {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("summary");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const resultRef = useRef<HTMLDivElement | null>(null);

  // History beim Laden holen
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as HistoryEntry[];
        setHistory(parsed);
      }
    } catch (e) {
      console.error("Konnte History nicht laden:", e);
    }
  }, []);

  // History speichern, wenn sie sich ändert
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error("Konnte History nicht speichern:", e);
    }
  }, [history]);

  const wordCount =
    text.trim().length === 0
      ? 0
      : text.trim().split(/\s+/).filter(Boolean).length;

  const addToHistory = (apiResult: ApiResult) => {
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      mode,
      text,
      result: apiResult,
      createdAt: new Date().toISOString(),
    };

    setHistory((prev) => {
      const next = [entry, ...prev];
      return next.slice(0, 20); // max 20 Einträge
    });
  };

  const handleSubmit = async () => {
    setError("");
    setResult(null);

    if (!text.trim()) {
      setError("Bitte gib einen Text ein.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/compact", {
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
        const apiResult = data.result as ApiResult;
        setResult(apiResult);
        addToHistory(apiResult);
      }
    } catch (e) {
      console.error(e);
      setError("Server nicht erreichbar. Läuft das Backend?");
    } finally {
      setLoading(false);
    }
  };

  // Für aktuelles Ergebnis reinen Text bauen (für Kopieren / Speichern)
  const buildResultText = (): string => {
    if (!result) return "";

    if (
      (mode === "summary" || mode === "kids" || mode === "short") &&
      result.summary
    ) {
      return result.summary;
    }

    if (mode === "bullets" && result.bullets) {
      return result.bullets.join("\n");
    }

    if (mode === "flashcards" && result.cards) {
      return result.cards
        .map(
          (c, i) =>
            `Karte ${i + 1}\nFrage: ${c.question}\nAntwort: ${c.answer}`
        )
        .join("\n\n");
    }

    return "";
  };

  // Text für einen History-Eintrag (für Vorschau)
  const getTextForEntry = (entry: HistoryEntry): string => {
    const r = entry.result;
    if (
      (entry.mode === "summary" ||
        entry.mode === "kids" ||
        entry.mode === "short") &&
      r.summary
    ) {
      return r.summary;
    }
    if (entry.mode === "bullets" && r.bullets) {
      return r.bullets.join("; ");
    }
    if (entry.mode === "flashcards" && r.cards) {
      return r.cards
        .map((c, i) => `Karte ${i + 1}: ${c.question}`)
        .join(" | ");
    }
    return "";
  };

  const handleCopy = () => {
    const textToCopy = buildResultText();
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
  };

  const handleDownloadTxt = () => {
    const textToSave = buildResultText();
    if (!textToSave) return;

    const blob = new Blob([textToSave], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    const modeLabel = MODES.find((m) => m.id === mode)?.label ?? mode;
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);

    a.href = url;
    a.download = `wissen-kompaktor-${modeLabel}-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    const textToSave = buildResultText();
    if (!textToSave) return;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    const maxWidth = 515; // A4-Breite minus Ränder
    const lines = doc.splitTextToSize(textToSave, maxWidth);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(11);
    doc.text(lines, margin, margin);

    const modeLabel = MODES.find((m) => m.id === mode)?.label ?? mode;
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);

    doc.save(`wissen-kompaktor-${modeLabel}-${timestamp}.pdf`);
  };

  const handleDownloadImage = async () => {
    if (!resultRef.current) return;
    try {
      const canvas = await html2canvas(resultRef.current);
      const dataUrl = canvas.toDataURL("image/png");

      const a = document.createElement("a");
      const modeLabel = MODES.find((m) => m.id === mode)?.label ?? mode;
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);

      a.href = dataUrl;
      a.download = `wissen-kompaktor-${modeLabel}-${timestamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error("Bild-Export fehlgeschlagen:", e);
    }
  };

  const handleLoadFromHistory = (entry: HistoryEntry) => {
    setMode(entry.mode);
    setText(entry.text);
    setResult(entry.result);
    setError("");
    setShowHistory(false);
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

  const renderHistory = () => {
    if (!history.length) {
      return (
        <div className="text-xs text-slate-500">
          Noch keine Einträge im Verlauf.
        </div>
      );
    }

    return (
      <div className="space-y-2 text-xs">
        {history.map((entry) => {
          const modeLabel =
            MODES.find((m) => m.id === entry.mode)?.label ?? entry.mode;
          const preview = getTextForEntry(entry).slice(0, 160);
          const date = new Date(entry.createdAt).toLocaleString();

          return (
            <div
              key={entry.id}
              className="border border-slate-700 rounded-lg p-2 bg-slate-900/60 flex flex-col gap-1"
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold">{modeLabel}</span>
                <span className="text-[10px] text-slate-400">{date}</span>
              </div>
              <div className="text-[11px] text-slate-200">
                {preview || "Kein Vorschau-Text verfügbar."}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleLoadFromHistory(entry)}
                  className="mt-1 px-2 py-0.5 rounded bg-sky-600 text-[11px] hover:bg-sky-500"
                >
                  Laden
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-6xl bg-slate-900/70 border border-slate-800 rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          Wissen-Kompaktor
        </h1>
        <p className="text-slate-400 mb-6 text-sm sm:text-base">
          Fasse Texte zusammen, mach Bulletpoints oder Lernkarten – direkt im
          Browser.
        </p>

        {/* Modus-Auswahl */}
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

          {/* Ausgabe / History */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className={
                    !showHistory
                      ? "px-2 py-1 rounded bg-sky-600 text-white"
                      : "px-2 py-1 rounded hover:text-sky-400 text-slate-300"
                  }
                >
                  Aktuell
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistory(true)}
                  className={
                    showHistory
                      ? "px-2 py-1 rounded bg-sky-600 text-white"
                      : "px-2 py-1 rounded hover:text-sky-400 text-slate-300"
                  }
                >
                  Zuletzt gemacht
                </button>
              </div>
              <div className="flex items-center gap-2">
                {!showHistory && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="text-xs text-slate-400 hover:text-sky-400"
                    >
                      Kopieren
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadTxt}
                      className="text-xs text-slate-400 hover:text-sky-400"
                    >
                      .txt
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="text-xs text-slate-400 hover:text-sky-400"
                    >
                      .pdf
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadImage}
                      className="text-xs text-slate-400 hover:text-sky-400"
                    >
                      Bild
                    </button>
                  </>
                )}
              </div>
            </div>

            <h2 className="text-sm font-medium text-slate-200 mb-1">
              {showHistory
                ? "Verlauf"
                : `Ergebnis (${MODES.find((m) => m.id === mode)?.label})`}
            </h2>

            <div
              ref={resultRef}
              className="flex-1 min-h-[220px] rounded-xl bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm overflow-auto"
            >
              {showHistory ? (
                renderHistory()
              ) : (
                <>
                  {loading && !result && (
                    <div className="text-slate-500 text-xs">Bitte warten…</div>
                  )}
                  {!loading && renderResult()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
