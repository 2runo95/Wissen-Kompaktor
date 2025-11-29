// frontend/src/AdBanner.tsx
import React, { useEffect, useState } from "react";
import type { CSSProperties } from "react";

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdBannerProps {
  slotId: string; // AdSense ad slot ID
  className?: string;
  style?: CSSProperties;
}

/**
 * Deine echte Publisher-ID
 */
const ADSENSE_CLIENT = "ca-pub-1048222071695232";

/**
 * Consent aus localStorage lesen.
 * WICHTIG: Key muss zum CookieBanner passen.
 * Wir verwenden hier "wk_cookie_consent".
 */
function getStoredConsent(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("wk_cookie_consent");
  } catch {
    return null;
  }
}

const AdBanner: React.FC<AdBannerProps> = ({ slotId, className, style }) => {
  const [canShowAds, setCanShowAds] = useState(false);

  useEffect(() => {
    const consent = getStoredConsent();

    if (consent === "accepted") {
      setCanShowAds(true);
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch (e) {
        console.warn("AdSense error:", e);
      }
    } else {
      setCanShowAds(false);
    }
  }, [slotId]);

  if (!canShowAds) {
    // Werbung nur anzeigen, wenn Consent "accepted"
    return null;
  }

  const finalStyle: CSSProperties =
    style ?? { display: "block", textAlign: "center" };

  return (
    <ins
      className={`adsbygoogle ${className ?? ""}`}
      style={finalStyle}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slotId}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
};

export default AdBanner;
