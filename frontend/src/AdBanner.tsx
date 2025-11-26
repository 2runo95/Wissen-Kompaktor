import React, { useEffect, useRef } from "react";
import type { CookieConsentValue } from "./CookieBanner";

interface AdBannerProps {
  cookieConsent: CookieConsentValue;
}

/**
 * Platzhalter-Komponente für Werbung (z.B. Google AdSense).
 * Wird NUR gerendert, wenn cookieConsent === "accepted".
 */
const AdBanner: React.FC<AdBannerProps> = ({ cookieConsent }) => {
  // <ins> entspricht in TS dem Typ HTMLModElement
  const adRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    if (cookieConsent !== "accepted") return;

    // Beispiel für AdSense – hier müsstest du später deine echte ID einsetzen.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    w.adsbygoogle = w.adsbygoogle || [];

    try {
      w.adsbygoogle.push({});
    } catch (e) {
      console.error("AdSense-Initialisierung fehlgeschlagen:", e);
    }
  }, [cookieConsent]);

  if (cookieConsent !== "accepted") {
    // Keine Werbung ohne explizite Zustimmung
    return null;
  }

  return (
    <div className="mb-4">
      <div className="text-xs text-slate-500 mb-1">
        Werbung – hilft, die API-Kosten zu decken 💙
      </div>
      <ins
        ref={adRef}
        className="adsbygoogle block w-full"
        style={{ display: "block" }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // TODO: Deine AdSense-ID
        data-ad-slot="1234567890"                // TODO: Dein Slot
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};

export default AdBanner;

