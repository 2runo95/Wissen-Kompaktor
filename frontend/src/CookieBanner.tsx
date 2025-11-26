import React from "react";

export type CookieConsentValue = "accepted" | "necessary" | null;

interface CookieBannerProps {
  value: CookieConsentValue;
  onChange: (value: CookieConsentValue) => void;
}

const CookieBanner: React.FC<CookieBannerProps> = ({ value, onChange }) => {
  // Wenn schon entschieden => nichts anzeigen
  if (value === "accepted" || value === "necessary") {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-slate-900/95 border-t border-slate-700 px-4 py-3 sm:px-6 sm:py-4">
      <div className="mx-auto max-w-4xl flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="text-xs sm:text-sm text-slate-200">
          <span className="font-semibold">Cookies &amp; Datenschutz</span>{" "}
          – Wir verwenden technisch notwendige Cookies und ggf. Dienste
          von Drittanbietern (z.&nbsp;B. Werbung), um diese Seite zu
          betreiben und zu finanzieren. Details findest du in unserem{" "}
          <a
            href="/datenschutz.html"
            target="_blank"
            rel="noreferrer"
            className="text-sky-400 hover:underline"
          >
            Datenschutzhinweis
          </a>{" "}
          und im{" "}
          <a
            href="/impressum.html"
            target="_blank"
            rel="noreferrer"
            className="text-sky-400 hover:underline"
          >
            Impressum
          </a>
          .
        </div>

        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={() => onChange("necessary")}
            className="px-3 py-1.5 rounded-full text-xs sm:text-sm border border-slate-600 text-slate-200 hover:border-slate-400"
          >
            Nur notwendige
          </button>
          <button
            type="button"
            onClick={() => onChange("accepted")}
            className="px-3 py-1.5 rounded-full text-xs sm:text-sm bg-sky-500 hover:bg-sky-600 text-white font-semibold"
          >
            Alle akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
