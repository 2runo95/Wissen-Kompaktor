import React from "react";

export type CookieConsentValue = "accepted" | "necessary" | null;

interface CookieBannerProps {
  value: CookieConsentValue;
  onChange: (value: CookieConsentValue) => void;
}

const CookieBanner: React.FC<CookieBannerProps> = ({ value, onChange }) => {
  // Wenn schon entschieden wurde: Banner nicht mehr anzeigen
  if (value !== null) return null;

  const handleAcceptAll = () => {
    onChange("accepted");
    localStorage.setItem("cookieConsent", "accepted");
  };

  const handleNecessaryOnly = () => {
    onChange("necessary");
    localStorage.setItem("cookieConsent", "necessary");
  };

  return (
    <div className="mt-6 rounded-3xl bg-slate-950/95 border border-slate-800/80 px-5 py-4 sm:px-7 sm:py-5 shadow-[0_26px_60px_rgba(0,0,0,0.85)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Textbereich */}
        <div className="text-xs sm:text-sm text-slate-200">
          <span className="font-semibold text-emerald-300">
            Cookies &amp; Datenschutz –
          </span>{" "}
          Wir verwenden technisch notwendige Cookies und ggf. Dienste von
          Drittanbietern (z. B. Werbung), um diese Seite zu betreiben und zu
          finanzieren. Details findest du in unserem{" "}
          <a
            href="/datenschutz.html"
            target="_blank"
            rel="noreferrer"
            className="underline text-emerald-300 hover:text-emerald-200"
          >
            Datenschutzhinweis
          </a>{" "}
          und im{" "}
          <a
            href="/impressum.html"
            target="_blank"
            rel="noreferrer"
            className="underline text-emerald-300 hover:text-emerald-200"
          >
            Impressum
          </a>
          .
        </div>

        {/* Buttons */}
        <div className="flex flex-row sm:flex-col md:flex-row gap-2 sm:ml-6 shrink-0 sm:items-end sm:justify-end">
          <button
            type="button"
            onClick={handleNecessaryOnly}
            className="px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium
                       border border-slate-700 bg-slate-900/80
                       text-slate-200
                       hover:border-emerald-400/70 hover:text-emerald-200
                       transition"
          >
            Nur notwendige
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold
                       bg-gradient-to-r from-emerald-500 via-emerald-400 to-lime-300
                       text-slate-950
                       hover:brightness-110 active:scale-[0.99]
                       shadow-md shadow-emerald-500/40
                       transition"
          >
            Alle akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
