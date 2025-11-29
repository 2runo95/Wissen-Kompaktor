import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import AdBanner from "./AdBanner";
import CookieBanner, { type CookieConsentValue } from "./CookieBanner";

type Mode = "summary" | "bullets" | "flashcards" | "kids" | "short";

export type LanguageCode = "de" | "en" | "es" | "fr" | "tr" | "ar" | "ja" | "zh";

type DetailLevel = "compact" | "normal" | "verbose";

interface CompactOptions {
  maxFlashcards?: number;
  detailLevel?: DetailLevel;
}

interface CompactResponse {
  result: string;
  text?: string;
}

interface HistoryItem {
  id: string;
  timestamp: string;
  mode: Mode;
  language: LanguageCode;
  inputText: string;
  resultText: string;
}

const HISTORY_KEY = "wk_history";
const HISTORY_MAX_ITEMS = 20;
const CONSENT_KEY = "wk_cookie_consent";

const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "https://wissen-backend-u8d0.onrender.com";

const modeLabels: Record<Mode, string> = {
  summary: "Zusammenfassung",
  bullets: "Stichpunkte",
  flashcards: "Lernkarten",
  kids: "Für Kinder erklärt",
  short: "In 5 Sätzen",
};

const languageLabels: Record<LanguageCode, string> = {
  de: "Deutsch",
  en: "English",
  es: "Español",
  fr: "Français",
  tr: "Türkçe",
  ar: "العربية",
  ja: "日本語",
  zh: "中文",
};

const defaultLanguage: LanguageCode = "de";
const defaultMode: Mode = "summary";

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function loadConsent(): CookieConsentValue {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (raw === "accepted" || raw === "necessary") return raw;
    return null;
  } catch {
    return null;
  }
}

const App: React.FC = () => {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [language, setLanguage] = useState<LanguageCode>(defaultLanguage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentResult, setCurrentResult] = useState<string>("");
  const [currentInput, setCurrentInput] = useState<string>("");

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null
  );

  const [cookieConsent, setCookieConsent] =
    useState<CookieConsentValue>(null);

  const [maxFlashcards, setMaxFlashcards] = useState<number>(10);
  const [detailLevel, setDetailLevel] = useState<DetailLevel>("normal");

  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
    setCookieConsent(loadConsent());
  }, []);

  const charCount = text.length;
  const wordCount = useMemo(
    () => (text.trim() ? text.trim().split(/\s+/).length : 0),
    [text]
  );

  const activeHistoryItem = useMemo(
    () => history.find((h) => h.id === selectedHistoryId) || null,
    [history, selectedHistoryId]
  );

  const showResult = useMemo(() => {
    if (activeTab === "current") return currentResult;
    return activeHistoryItem?.resultText ?? "";
  }, [activeTab, currentResult, activeHistoryItem]);

  const showInput = useMemo(() => {
    if (activeTab === "current") return currentInput || text;
    return activeHistoryItem?.inputText ?? "";
  }, [activeTab, currentInput, text, activeHistoryItem]);

  function addToHistory(item: Omit<HistoryItem, "id">) {
    const newItem: HistoryItem = {
      ...item,
      id: crypto.randomUUID(),
    };
    setHistory((prev) => {
      const updated = [newItem, ...prev].slice(0, HISTORY_MAX_ITEMS);
      saveHistory(updated);
      return updated;
    });
  }

  async function handleCompactText() {
    if (!text.trim()) {
      setError("Bitte gib zuerst einen Text ein oder lade eine Datei hoch.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setActiveTab("current");
    setSelectedHistoryId(null);

    const options: CompactOptions = {};
    if (mode === "flashcards") {
      options.maxFlashcards = maxFlashcards;
      options.detailLevel = detailLevel;
    }

    try {
      const res = await fetch(`${API_BASE}/api/compact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode, language, options }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Fehler: ${res.status}`);
      }

      const data: CompactResponse = await res.json();
      const resultText = data.result ?? "";

      setCurrentResult(resultText);
      setCurrentInput(text);

      addToHistory({
        timestamp: new Date().toISOString(),
        mode,
        language,
        inputText: text,
        resultText,
      });
    } catch (err: any) {
      setError(err.message || "Es ist ein Fehler aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCompactFile() {
    if (!uploadFile) {
      setError("Bitte wähle zuerst eine Datei aus.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setActiveTab("current");
    setSelectedHistoryId(null);

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("mode", mode);
    formData.append("language", language);

    try {
      const res = await fetch(`${API_BASE}/api/compact-file`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Fehler: ${res.status}`);
      }

      const data: CompactResponse = await res.json();
      const resultText = data.result ?? "";
      const extracted = data.text ?? "";

      setCurrentResult(resultText);
      setCurrentInput(extracted || `📄 ${uploadFile.name}`);

      if (extracted) setText(extracted);

      addToHistory({
        timestamp: new Date().toISOString(),
        mode,
        language,
        inputText: extracted || `Datei: ${uploadFile.name}`,
        resultText,
      });
    } catch (err: any) {
      setError(err.message || "Es ist ein Fehler beim Datei-Upload aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleCopy() {
    if (!showResult) return;
    navigator.clipboard.writeText(showResult).catch(() => {
      setError("Kopieren in die Zwischenablage ist fehlgeschlagen.");
    });
  }

  function handleDownloadTxt() {
    if (!showResult) return;
    const blob = new Blob([showResult], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wissen-kompaktor.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadPdf() {
    if (!showResult) return;
    const doc = new jsPDF();
    const lineHeight = 7;
    const margin = 10;
    const maxWidth = 190;
    const lines = doc.splitTextToSize(showResult, maxWidth);
    let y = margin;

    lines.forEach((line: string) => {
      if (y > 280) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });

    doc.save("wissen-kompaktor.pdf");
  }

  const isCurrentModeFlashcards = mode === "flashcards";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        {/* Cookie-Banner – steuert cookieConsent */}
        <CookieBanner
          value={cookieConsent}
          onChange={(value) => {
            setCookieConsent(value);
            try {
              if (value) {
                localStorage.setItem(CONSENT_KEY, value);
              } else {
                localStorage.removeItem(CONSENT_KEY);
              }
            } catch {
              // ignore
            }
          }}
        />

        {/* Header */}
        <header className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Wissen-Kompaktor
            </h1>
            <p className="mt-1 text-sm text-slate-300 md:text-base">
              Komprimiere Inhalte intelligent.
            </p>
          </div>

          {/* Spracheinstellungen */}
          <div className="flex flex-col items-start gap-1 text-xs sm:flex-row sm:items-center sm:gap-2 md:text-sm">
            <label className="font-medium text-slate-300">
              Antwortsprache
              <span className="ml-1 text-[10px] font-normal text-slate-400">
                (Eingabesprache wird automatisch erkannt)
              </span>
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="mt-0.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-500/60 sm:w-48"
            >
              {(Object.keys(languageLabels) as LanguageCode[]).map((lang) => (
                <option key={lang} value={lang}>
                  {languageLabels[lang]}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Ads Top */}
        <div className="mb-4">
          <AdBanner cookieConsent={cookieConsent} slotId="4124950988" />
        </div>

        <main className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* Linke Spalte: Input + Optionen */}
          <section className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg">
              <div className="flex flex-col gap-4 p-4 sm:p-5">
                {/* Modus-Auswahl */}
                <div>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Modus
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(
                      ["summary", "bullets", "flashcards", "kids", "short"] as Mode[]
                    ).map((m) => {
                      const isActive = mode === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMode(m)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                            isActive
                              ? "border-violet-400 bg-violet-500/15 text-violet-100 shadow-sm"
                              : "border-slate-700 bg-slate-950/60 text-slate-200 hover:border-slate-500"
                          }`}
                        >
                          {modeLabels[m]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Lernkarten-Optionen */}
                {isCurrentModeFlashcards && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs sm:text-sm">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-100">
                        Lernkarten-Einstellungen
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-violet-300">
                        Beta
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Max. Karten
                        </label>
                        <input
                          type="number"
                          min={3}
                          max={50}
                          value={maxFlashcards}
                          onChange={(e) =>
                            setMaxFlashcards(
                              Math.min(
                                50,
                                Math.max(3, Number(e.target.value) || 3)
                              )
                            )
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-500/60"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Detailgrad
                        </label>
                        <select
                          value={detailLevel}
                          onChange={(e) =>
                            setDetailLevel(e.target.value as DetailLevel)
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-500/60"
                        >
                          <option value="compact">Kompakt</option>
                          <option value="normal">Normal</option>
                          <option value="verbose">Ausführlich</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Textfeld */}
                <div>
                  <label
                    htmlFor="wk-input"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    Eingabetext
                  </label>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70">
                    <textarea
                      id="wk-input"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Füge hier deinen Text ein oder lade eine Datei hoch (PDF/Bild) ..."
                      className="h-48 min-h-[8rem] max-h-[24rem] w-full resize-none bg-transparent px-3 py-2 text-sm text-slate-50 outline-none scrollbar-thin scrollbar-track-slate-950 scrollbar-thumb-slate-700/80"
                    />
                    <div className="flex items-center justify-between border-t border-slate-800 px-3 py-1.5 text-[11px] text-slate-400">
                      <span>
                        Zeichen:{" "}
                        <span className="font-medium text-slate-200">
                          {charCount}
                        </span>{" "}
                        · Wörter:{" "}
                        <span className="font-medium text-slate-200">
                          {wordCount}
                        </span>
                      </span>
                      <span className="hidden sm:inline">
                        Eingabesprache ist flexibel – die Antwort nutzt deine
                        gewählte Sprache.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Datei-Upload + Aktionen */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-col gap-2 text-xs text-slate-300">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-950/60 px-3 py-2 hover:border-slate-500">
                      <input
                        type="file"
                        className="hidden"
                        accept=".txt,.md,.pdf,image/*"
                        onChange={(e) =>
                          setUploadFile(e.target.files?.[0] ?? null)
                        }
                      />
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs">
                        📎
                      </span>
                      <span>
                        {uploadFile
                          ? `Ausgewählt: ${uploadFile.name}`
                          : "Datei wählen (PDF, Text, Bild)"}
                      </span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Dateien werden sicher nur zur Komprimierung verwendet.
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleCompactFile}
                      className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-100 shadow-sm transition hover:border-slate-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      📄 Datei komprimieren
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleCompactText}
                      className="inline-flex items-center justify-center rounded-full bg-violet-500 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? "Komprimiere ..." : "Text komprimieren"}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-100">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Ads Left (nur XL) */}
            <div className="hidden xl:block">
              <AdBanner cookieConsent={cookieConsent} slotId="5661393931" />
            </div>
          </section>

          {/* Rechte Spalte: Ergebnisse + History */}
          <section className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg">
              {/* Tabs */}
              <div className="flex items-center border-b border-slate-800 bg-slate-900/70 px-3 py-2 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("current")}
                  className={`mr-2 rounded-full px-3 py-1 font-medium transition ${
                    activeTab === "current"
                      ? "bg-slate-800 text-slate-50"
                      : "text-slate-400 hover:bg-slate-900"
                  }`}
                >
                  Aktuell
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`mr-2 rounded-full px-3 py-1 font-medium transition ${
                    activeTab === "history"
                      ? "bg-slate-800 text-slate-50"
                      : "text-slate-400 hover:bg-slate-900"
                  }`}
                >
                  Zuletzt gemacht
                </button>
                <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-400">
                  {activeTab === "current" ? (
                    <>
                      <span>{modeLabels[mode]}</span>
                      <span>·</span>
                      <span>{languageLabels[language]}</span>
                    </>
                  ) : activeHistoryItem ? (
                    <>
                      <span>{modeLabels[activeHistoryItem.mode]}</span>
                      <span>·</span>
                      <span>{languageLabels[activeHistoryItem.language]}</span>
                    </>
                  ) : (
                    <span>Keine Auswahl</span>
                  )}
                </div>
              </div>

              {/* Inhalt */}
              <div className="grid gap-0 border-t border-slate-800/60 md:grid-cols-2">
                {/* Original */}
                <div className="border-r border-slate-800/60 bg-slate-950/70 p-3 text-xs">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-semibold text-slate-200">
                      Ausgangstext
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-slate-500">
                      {showInput ? "Vorschau" : "Kein Text"}
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto rounded-lg bg-slate-950/70 p-2 text-[11px] leading-snug text-slate-300 scrollbar-thin scrollbar-track-slate-950 scrollbar-thumb-slate-700/80">
                    {showInput ? (
                      <pre className="whitespace-pre-wrap font-mono">
                        {showInput}
                      </pre>
                    ) : (
                      <span className="text-slate-500">
                        Hier erscheint eine Vorschau deines Ausgangstextes, sobald
                        du etwas komprimierst.
                      </span>
                    )}
                  </div>
                </div>

                {/* Ergebnis */}
                <div className="bg-slate-950/60 p-3 text-xs">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-semibold text-slate-200">
                      Komprimiertes Ergebnis
                    </span>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={handleCopy}
                        disabled={!showResult}
                        className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-100 hover:border-slate-500 disabled:opacity-40"
                      >
                        Kopieren
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadTxt}
                        disabled={!showResult}
                        className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-100 hover:border-slate-500 disabled:opacity-40"
                      >
                        .txt
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={!showResult}
                        className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-100 hover:border-slate-500 disabled:opacity-40"
                      >
                        .pdf
                      </button>
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto rounded-lg bg-slate-950/80 p-2 text-[11px] leading-snug text-slate-200 scrollbar-thin scrollbar-track-slate-950 scrollbar-thumb-slate-700/80">
                    {showResult ? (
                      <pre className="whitespace-pre-wrap font-mono">
                        {showResult}
                      </pre>
                    ) : (
                      <span className="text-slate-500">
                        Hier erscheinen Zusammenfassung, Stichpunkte, Lernkarten
                        usw., sobald du etwas komprimierst.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* History */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
              <div className="border-b border-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Verlauf (max. {HISTORY_MAX_ITEMS})
              </div>
              <div className="max-h-56 overflow-y-auto text-xs scrollbar-thin scrollbar-track-slate-950 scrollbar-thumb-slate-700/80">
                {history.length === 0 ? (
                  <div className="px-3 py-3 text-slate-500">
                    Noch nichts komprimiert – starte mit einem Text oder einer
                    Datei.
                  </div>
                ) : (
                  history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab("history");
                        setSelectedHistoryId(item.id);
                      }}
                      className={`flex w-full items-start gap-2 border-b border-slate-900 px-3 py-2 text-left hover:bg-slate-900/80 ${
                        selectedHistoryId === item.id && activeTab === "history"
                          ? "bg-slate-900/80"
                          : ""
                      }`}
                    >
                      <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-violet-400" />
                      <div className="flex-1">
                        <div className="mb-0.5 flex flex-wrap items-center gap-1">
                          <span className="text-[11px] font-semibold text-slate-100">
                            {modeLabels[item.mode]}
                          </span>
                          <span className="text-[10px] text-slate-500">·</span>
                          <span className="text-[10px] text-slate-400">
                            {languageLabels[item.language]}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ·{" "}
                            {new Date(item.timestamp).toLocaleString(undefined, {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                        <div className="line-clamp-2 text-[11px] text-slate-400">
                          {item.inputText}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Ads Right (nur XL) */}
            <div className="hidden xl:block">
              <AdBanner cookieConsent={cookieConsent} slotId="3822640606" />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default App;
