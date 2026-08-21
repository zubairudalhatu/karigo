"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type NavigationItem = { label: string; href?: string; note?: boolean };
type NavigationGroup = { label: string; href?: string; items?: NavigationItem[] };

const navigation: NavigationGroup[] = [
  {
    label: "Services",
    items: [
      { label: "All services", href: "/services" },
      { label: "Food Delivery", href: "/services#everyday-delivery" },
      { label: "Groceries & Market", href: "/services#everyday-delivery" },
      { label: "Parcel Delivery", href: "/services#everyday-delivery" },
      { label: "SME Services", href: "/services#local-services" },
      { label: "Utilities & Bills", href: "/services#utilities" }
    ]
  },
  { label: "Rides", href: "/riders#ride-waitlist" },
  {
    label: "Partners",
    items: [
      { label: "Partner information", href: "/vendors" },
      { label: "Become a Partner", href: "/vendors/apply" },
      { label: "Partner Login", href: "https://vendor.karigo.com.ng" }
    ]
  },
  {
    label: "Captains",
    items: [
      { label: "Captain information", href: "/riders" },
      { label: "Ride Captain", href: "/riders#ride-captain-application" },
      { label: "Delivery Captain", href: "/riders#delivery-captain-application" }
    ]
  },
  {
    label: "Apps",
    items: [
      { label: "Customer App", href: "/app" },
      { label: "Captain App", note: true },
      { label: "Partner App", note: true },
      { label: "Download links", href: "/#download" }
    ]
  },
  {
    label: "Help",
    items: [
      { label: "Contact & support", href: "/contact" }
    ]
  }
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
        {navigation.map((group) => group.items ? <details className="nav-group" key={group.label}>
          <summary>{group.label}</summary>
          <div className="nav-menu">
            {group.items.map((item) => item.note
              ? <span className="nav-menu-note" aria-disabled="true" key={item.label}>{item.label}<small>Details coming through KariGO onboarding</small></span>
              : item.href?.startsWith("http") || item.href?.startsWith("/#")
                ? <a key={`${item.label}-${item.href}`} href={item.href} onClick={closeMenu}>{item.label}</a>
                : <Link key={`${item.label}-${item.href}`} href={item.href!} onClick={closeMenu}>{item.label}</Link>)}
          </div>
        </details> : <Link key={group.label} href={group.href!} onClick={closeMenu}>{group.label}</Link>)}
        <Link className="mobile-nav-cta" href="/vendors/apply" onClick={closeMenu}>Become a Partner</Link>
      </nav>
      <Link className="nav-cta desktop-cta" href="/vendors/apply">Become a Partner</Link>
    </header>
  );
}
