// frontend/src/AdBanner.tsx
import React, { useEffect } from "react";
import type { CSSProperties } from "react";
import type { CookieConsentValue } from "./CookieBanner";

interface AdBannerProps {
  cookieConsent: CookieConsentValue;
  slot: string;                 // <- WICHTIG: slot hier typisieren
  className?: string;
  style?: CSSProperties;
}

const ADSENSE_CLIENT = "ca-pub-1048222071695232";

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
        console.warn("AdSense error", e);
      }
    }
  }, [cookieConsent, slot]);

  // Keine Werbung ohne Einwilligung
  if (cookieConsent !== "accepted") {
    return null;
  }

  return (
    <ins
      className={`adsbygoogle ${className ?? ""}`}
      style={style ?? { display: "block" }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
};

export default AdBanner;
