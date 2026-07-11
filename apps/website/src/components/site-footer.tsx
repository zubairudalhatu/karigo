import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <section className="footer-brand" aria-label="KariGO footer summary">
          <Image className="footer-logo" src="/karigo-logo.png" alt="KariGO" width={144} height={144} />
          <p>Delivering Nigeria. Connecting You.</p>
        </section>

        <nav className="footer-links" aria-label="Platform links">
          <h2>Platform</h2>
          <Link href="/services">Services</Link>
          <Link href="/vendors">Vendors</Link>
          <Link href="/riders">Riders & Drivers</Link>
          <Link href="/contact">Contact</Link>
        </nav>

        <nav className="footer-links" aria-label="Get started links">
          <h2>Get started</h2>
          <Link href="/vendors/apply">Vendor Application</Link>
          <a href="https://vendor.karigo.com.ng">Vendor Login</a>
          <Link href="/riders#taxi-waitlist">Taxi Waitlist</Link>
          <Link href="/riders#taxi-driver-application">Driver Readiness</Link>
          <a href="/#download">Download App</a>
        </nav>

        <nav className="footer-links" aria-label="Legal links">
          <h2>Legal</h2>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms</Link>
        </nav>

        <section className="footer-apps" aria-label="App launch status">
          <h2>App rollout</h2>
          <div className="footer-badges">
            <div className="footer-store-badge" aria-disabled="true">
              <span>Android</span>
              <strong>Google Play soon</strong>
            </div>
            <div className="footer-store-badge footer-store-badge-muted" aria-disabled="true">
              <span>iOS</span>
              <strong>Planned later</strong>
            </div>
          </div>
        </section>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2026 KariGO Express Limited</p>
      </div>
    </footer>
  );
}
