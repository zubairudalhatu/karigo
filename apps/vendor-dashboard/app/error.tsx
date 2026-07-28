"use client";

import { useEffect } from "react";

export default function PartnerWorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(`Partner Workspace render failure digest=${error.digest ?? "unavailable"} name=${error.name}`);
  }, [error]);

  return (
    <main className="recovery-page">
      <section className="card">
        <p className="muted">Partner Workspace</p>
        <h1>Your workspace could not be loaded.</h1>
        <p>KariGO could not safely load this screen. Please retry, return to login, or contact support if this continues.</p>
        <div className="actions">
          <button onClick={reset}>Retry</button>
          <a className="button-link secondary-link" href="/login">Return to login</a>
          <a className="button-link secondary-link" href="https://www.karigo.com.ng/contact">Contact support</a>
        </div>
      </section>
    </main>
  );
}
