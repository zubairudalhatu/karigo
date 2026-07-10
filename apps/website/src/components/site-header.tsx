"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { label: "Services", href: "/services" },
  { label: "Vendors", href: "/vendors" },
  { label: "Vendor Login", href: "https://vendor.karigo.com.ng" },
  { label: "Riders & Drivers", href: "/riders" },
  { label: "Download App", href: "/#download" },
  { label: "Contact", href: "/contact" }
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <Link className="brand-link" href="/" aria-label="KariGO home">
        <Image src="/karigo-logo.png" alt="KariGO" width={144} height={144} priority />
      </Link>
      <button
        aria-controls="primary-navigation"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        className="menu-toggle"
        type="button"
        onClick={() => setMenuOpen((current) => !current)}
      >
        <span>{menuOpen ? "Close" : "Menu"}</span>
        <span className="hamburger-lines" aria-hidden="true" />
      </button>
      <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} id="primary-navigation" aria-label="Primary navigation">
        {navLinks.map((link) => (
          link.href.startsWith("http") || link.href.startsWith("/#")
            ? <a key={link.href} href={link.href} onClick={closeMenu}>{link.label}</a>
            : <Link key={link.href} href={link.href} onClick={closeMenu}>{link.label}</Link>
        ))}
        <Link className="mobile-nav-cta" href="/vendors/apply" onClick={closeMenu}>Become a Vendor</Link>
      </nav>
      <Link className="nav-cta desktop-cta" href="/vendors/apply">Become a Vendor</Link>
    </header>
  );
}
