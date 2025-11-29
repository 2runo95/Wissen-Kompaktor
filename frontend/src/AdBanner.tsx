// frontend/src/AdBanner.tsx
import React, { useEffect } from "react";
import type { CSSProperties } from "react";
import { type CookieConsentValue } from "./CookieBanner";

// window.adsbygoogle für TypeScript bekannt machen
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdBannerProps {
  cookieConsent: CookieConsentValue;
  slotId: string;               // AdSense ad slot ID
  className?: string;
  style?: CSSProperties;
}

/**
 * Deine echte Publisher-ID (stimmt bereits)
 */
const ADSENSE_CLIENT = "ca-pub-1048222071695232";

const AdBanner: React.FC<AdBannerProps> = ({
  cookieConsent,
  slotId,
  className,
  style,
}) => {
  useEffect(() => {
    if (cookieConsent === "accepted") {
      try {
        // AdSense initialisieren / neues Ad anfordern
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch (e) {
        console.warn("AdSense error:", e);
      }
    }
  }, [cookieConsent, slotId]);

  // Werbung nur anzeigen, wenn Cookies akzeptiert wurden
  if (cookieConsent !== "accepted") {
    return null;
  }

  const finalStyle: CSSProperties =
    style ?? { display: "block", textAlign: "center" };

  return (
    <ins
      className={`adsbygoogle ${className ?? ""}`}
      style={finalStyle}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slotId}     // <-- jetzt nutzt er wirklich das Prop
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
};

export default AdBanner;
