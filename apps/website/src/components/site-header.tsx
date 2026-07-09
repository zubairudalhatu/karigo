import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand-link" href="/" aria-label="KariGO home">
        <Image src="/karigo-logo.png" alt="KariGO" width={112} height={112} priority />
      </Link>
      <nav className="main-nav" aria-label="Primary navigation">
        <Link href="/services">Services</Link>
        <Link href="/vendors">Vendors</Link>
        <Link href="/riders">Riders & Drivers</Link>
        <a href="/#download">Download App</a>
        <Link href="/contact">Contact</Link>
      </nav>
      <Link className="nav-cta" href="/vendors/apply">Become a Vendor</Link>
    </header>
  );
}
