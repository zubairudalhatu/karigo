import Image from "next/image";
import Link from "next/link";

const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/karigoapp", icon: "instagram" },
  { label: "X", href: "https://x.com/karigoapp", icon: "x" },
  { label: "TikTok", href: "https://www.tiktok.com/@karigoapp", icon: "tiktok" },
  { label: "Facebook", href: "https://www.facebook.com/karigoapp", icon: "facebook" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/karigoapp", icon: "linkedin" }
];

function SocialIcon({ name }: { name: string }) {
  if (name === "instagram") {
    return (
      <svg aria-hidden="true" className="social-icon" fill="none" viewBox="0 0 24 24">
        <rect height="15" rx="4" stroke="currentColor" strokeWidth="2" width="15" x="4.5" y="4.5" />
        <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" />
        <circle cx="16.8" cy="7.2" fill="currentColor" r="1" />
      </svg>
    );
  }

  if (name === "x") {
    return (
      <svg aria-hidden="true" className="social-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" viewBox="0 0 24 24">
        <path d="M5 5l14 14" />
        <path d="M19 5L5 19" />
      </svg>
    );
  }

  if (name === "tiktok") {
    return (
      <svg aria-hidden="true" className="social-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M13 4v10.5a4 4 0 1 1-4-4" />
        <path d="M13 4c1 3.2 3.1 5.1 6 5.4" />
      </svg>
    );
  }

  if (name === "facebook") {
    return (
      <svg aria-hidden="true" className="social-icon" fill="currentColor" viewBox="0 0 24 24">
        <path d="M13.6 21v-8h2.7l.4-3.1h-3.1V8c0-.9.3-1.5 1.6-1.5h1.7V3.7c-.8-.1-1.6-.2-2.5-.2-2.5 0-4.2 1.5-4.2 4.2v2.2H7.4V13h2.8v8h3.4z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="social-icon" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6.4 8.8H3.6V21h2.8V8.8zM5 3a1.7 1.7 0 1 0 0 3.4A1.7 1.7 0 0 0 5 3zM20.4 14.3c0-3.5-1.8-5.8-4.8-5.8-1.6 0-2.7.7-3.4 1.8V8.8H9.5V21h2.8v-6.2c0-2.1.9-3.3 2.6-3.3 1.6 0 2.6 1.1 2.6 3.3V21h2.9v-6.7z" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <section className="footer-brand" aria-label="KariGO footer summary">
          <Image className="footer-logo" src="/karigo-logo.png" alt="KariGO" width={144} height={144} />
          <p>Delivering Nigeria. Connecting You.</p>
          <div className="footer-social" aria-label="KariGO social media links">
            <p>Follow <strong>@karigoapp</strong></p>
            <div className="social-links">
              {socialLinks.map((link) => (
                <a key={link.href} aria-label={`KariGO on ${link.label}`} href={link.href} rel="noopener noreferrer" target="_blank">
                  <SocialIcon name={link.icon} />
                </a>
              ))}
            </div>
          </div>
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
