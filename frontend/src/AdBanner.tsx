import React, { useEffect } from "react";
import type { CSSProperties } from "react";
import type { CookieConsentValue } from "./CookieBanner";

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdBannerProps {
  cookieConsent: CookieConsentValue | null;
  slotId: string;
  className?: string;
  style?: CSSProperties;
}

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
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch (e) {
        console.warn("AdSense error:", e);
      }
    }
  }, [cookieConsent, slotId]);

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
      data-ad-slot={slotId}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
};

export default AdBanner;
