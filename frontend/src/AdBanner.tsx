// frontend/src/AdBanner.tsx
import React, { useEffect } from "react";
import type { CSSProperties } from "react";
import { type CookieConsentValue } from "./CookieBanner";

interface AdBannerProps {
  cookieConsent: CookieConsentValue;
  slot: string;                // AdSense ad slot ID
  className?: string;
  style?: CSSProperties;
}

/**
 * Wichtig:
 * Setz hier deine echte AdSense Publisher-ID ein – die gleiche,
 * die du im <script ... client="ca-pub-XXXX"> in index.html verwendest.
 */
const ADSENSE_CLIENT = "ca-pub-XXXXXXXXXXXX"; // TODO: ersetzen

const AdBanner: React.FC<AdBannerProps> = ({
  cookieConsent,
  slot,
  className,
  style,
}) => {
  useEffect(() => {
    if (cookieConsent === "accepted") {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.warn("AdSense error:", e);
      }
    }
  }, [cookieConsent]);

  if (cookieConsent !== "accepted") {
    // Werbung nur anzeigen, wenn Cookies akzeptiert wurden
    return null;
  }

  return (
    <ins
      className={`adsbygoogle ${className ?? ""}`}
      style={style ?? { display: "block", textAlign: "center" }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
};

export default AdBanner;
