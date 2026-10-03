"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ANALYTICS_CONSENT_OPEN_EVENT,
  ANALYTICS_CONSENT_STORAGE_KEY,
  AnalyticsConsentChoice,
  parseAnalyticsConsent,
  serializeAnalyticsConsent
} from "../lib/analytics";

type AnalyticsConsentContextValue = {
  choice: AnalyticsConsentChoice | null;
  hydrated: boolean;
};

const AnalyticsConsentContext = createContext<AnalyticsConsentContextValue>({ choice: null, hydrated: false });

export function useAnalyticsConsent() {
  return useContext(AnalyticsConsentContext);
}

export function AnalyticsConsentProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<AnalyticsConsentChoice | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const firstActionRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let saved = null;
    try {
      saved = parseAnalyticsConsent(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY));
    } catch {
      saved = null;
    }
    setChoice(saved?.analytics ?? null);
    setPreferencesOpen(!saved);
    setHydrated(true);
  }, []);

  useEffect(() => {
    const openPreferences = () => {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setPreferencesOpen(true);
    };
    window.addEventListener(ANALYTICS_CONSENT_OPEN_EVENT, openPreferences);
    return () => window.removeEventListener(ANALYTICS_CONSENT_OPEN_EVENT, openPreferences);
  }, []);

  useEffect(() => {
    if (preferencesOpen) firstActionRef.current?.focus();
  }, [preferencesOpen]);

  function saveChoice(nextChoice: AnalyticsConsentChoice) {
    try {
      window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, serializeAnalyticsConsent(nextChoice));
    } catch {
      // The in-memory choice still applies for this page when storage is unavailable.
    }
    setChoice(nextChoice);
    setPreferencesOpen(false);
    window.setTimeout(() => returnFocusRef.current?.focus(), 0);
  }

  function closeExistingPreferences() {
    if (!choice) return;
    setPreferencesOpen(false);
    window.setTimeout(() => returnFocusRef.current?.focus(), 0);
  }

  const contextValue = useMemo(() => ({ choice, hydrated }), [choice, hydrated]);

  return (
    <AnalyticsConsentContext.Provider value={contextValue}>
      {children}
      {hydrated && preferencesOpen ? (
        <section
          aria-describedby="analytics-consent-description"
          aria-labelledby="analytics-consent-title"
          aria-modal="false"
          className="analytics-consent-panel"
          onKeyDown={(event) => {
            if (event.key === "Escape" && choice) closeExistingPreferences();
          }}
          role="dialog"
        >
          <div>
            <p className="eyebrow">Privacy choice</p>
            <h2 id="analytics-consent-title">Website analytics</h2>
            <p id="analytics-consent-description">
              KariGO would like to use privacy-safe Google Analytics on public pages to understand aggregate usage and improve navigation. Analytics stays off unless you accept. Form contents, payment references, account identifiers, tokens and uploaded documents are not analytics data.
            </p>
            <p><a href="/privacy">Read the privacy notice</a></p>
          </div>
          <div className="analytics-consent-actions">
            <button className="analytics-consent-action" onClick={() => saveChoice("rejected")} ref={firstActionRef} type="button">
              Reject analytics
            </button>
            <button className="analytics-consent-action" onClick={() => saveChoice("accepted")} type="button">
              Accept analytics
            </button>
            {choice ? <button className="analytics-consent-close" onClick={closeExistingPreferences} type="button">Keep current choice</button> : null}
          </div>
        </section>
      ) : null}
    </AnalyticsConsentContext.Provider>
  );
}

export function CookieSettingsButton() {
  return (
    <button
      className="cookie-settings-button"
      onClick={() => window.dispatchEvent(new Event(ANALYTICS_CONSENT_OPEN_EVENT))}
      type="button"
    >
      Cookie settings
    </button>
  );
}
