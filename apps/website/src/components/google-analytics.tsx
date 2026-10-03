"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  isAnalyticsRuntimeEligible,
  nextCanonicalPageView,
  sanitizeInternalReferrer,
  sanitizePageLocation
} from "../lib/analytics";
import { useAnalyticsConsent } from "./analytics-consent";

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
const isAutomatedTest = process.env.NODE_ENV === "test";

export function GoogleAnalytics() {
  const pathname = usePathname();
  const { choice, hydrated } = useAnalyticsConsent();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const initializedRef = useRef(false);
  const lastPagePathRef = useRef<string | null>(null);

  const eligible = hydrated && isAnalyticsRuntimeEligible({
    environment: process.env.NODE_ENV,
    isAutomatedTest,
    measurementId,
    consent: choice,
    pathname
  });

  const initialize = useCallback(() => {
    if (initializedRef.current || !measurementId) {
      setScriptLoaded(true);
      return;
    }
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
    window[`ga-disable-${measurementId}`] = false;
    window.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    initializedRef.current = true;
    setScriptLoaded(true);
  }, []);

  useEffect(() => {
    if (!measurementId) return;
    if (!eligible) {
      window.__KARIGO_ANALYTICS_READY__ = false;
      window[`ga-disable-${measurementId}`] = true;
      lastPagePathRef.current = null;
      return;
    }
    window[`ga-disable-${measurementId}`] = false;
  }, [eligible]);

  useEffect(() => {
    if (!eligible || !scriptLoaded || typeof window.gtag !== "function") return;
    const pagePath = nextCanonicalPageView(lastPagePathRef.current, pathname);
    if (!pagePath) return;

    const previousPath = lastPagePathRef.current;
    lastPagePathRef.current = pagePath;
    window.__KARIGO_ANALYTICS_READY__ = true;
    window.gtag("event", "page_view", {
      page_location: sanitizePageLocation(pagePath),
      page_title: document.title,
      ...(previousPath
        ? { page_referrer: sanitizePageLocation(previousPath) }
        : { page_referrer: sanitizeInternalReferrer(document.referrer) })
    });
  }, [eligible, pathname, scriptLoaded]);

  if (!eligible) return null;

  return (
    <Script
      id="karigo-ga4-loader"
      onLoad={initialize}
      onReady={initialize}
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
      strategy="afterInteractive"
    />
  );
}
