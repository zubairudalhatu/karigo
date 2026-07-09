import Link from "next/link";
import { site } from "../lib/site";

export function SiteFooter() {
  return (
    <footer className="site-footer" id="contact">
      <div>
        <strong>KariGO</strong>
        <p>Delivering Nigeria. Connecting You.</p>
      </div>
      <div>
        <p>Website: www.karigo.com.ng</p>
        <p>Email: <a href={`mailto:${site.email}`}>{site.email}</a></p>
        <p>Phone: <a href={`tel:${site.phone.replaceAll(" ", "")}`}>{site.phone}</a></p>
        <p>Location: {site.location}</p>
      </div>
      <nav aria-label="Footer navigation">
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/vendors/apply">Vendor Application</Link>
        <Link href="/contact">Contact</Link>
      </nav>
    </footer>
  );
}
