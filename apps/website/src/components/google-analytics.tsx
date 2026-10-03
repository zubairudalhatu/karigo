"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  createGtagCommandQueue,
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
  const [bootstrapped, setBootstrapped] = useState(false);
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

  useEffect(() => {
    if (!measurementId) return;
    if (!eligible) {
      window.__KARIGO_ANALYTICS_READY__ = false;
      window[`ga-disable-${measurementId}`] = true;
      lastPagePathRef.current = null;
      setBootstrapped(false);
      return;
    }
    window[`ga-disable-${measurementId}`] = false;
    if (!initializedRef.current) {
      const dataLayer = window.dataLayer ?? [];
      window.dataLayer = dataLayer;
      window.gtag = createGtagCommandQueue(dataLayer);
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
    }
    setBootstrapped(true);
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

  if (!eligible || !bootstrapped) return null;

  return (
    <Script
      id="karigo-ga4-loader"
      onLoad={() => setScriptLoaded(true)}
      onReady={() => setScriptLoaded(true)}
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
      strategy="afterInteractive"
    />
  );
}
