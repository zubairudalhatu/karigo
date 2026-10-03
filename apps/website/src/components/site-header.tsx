"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { trackAnalyticsEvent } from "../lib/analytics";

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
      { label: "Safety", href: "/safety" },
      { label: "Careers", href: "/careers" },
      { label: "Contact & support", href: "/contact" },
      { label: "Account deletion", href: "/account-deletion" }
    ]
  }
];

export function SiteHeader() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const trackNavigation = (label: string) => {
    if (label === "Customer App") trackAnalyticsEvent("customer_app_entry", { source_path: pathname, placement: "navigation" });
    if (label === "Partner Login") trackAnalyticsEvent("partner_workspace_click", { source_path: pathname, placement: "navigation" });
  };
  const closeMenu = () => {
    setMenuOpen(false);
    setOpenGroup(null);
  };

  useEffect(() => {
    closeMenu();
  }, [pathname]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) closeMenu();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <header className="site-header" ref={headerRef}>
      <Link className="brand-link" href="/" aria-label="KariGO home" onClick={closeMenu}>
        <Image src="/karigo-logo.png" alt="KariGO" width={144} height={144} priority />
      </Link>
      <button
        aria-controls="primary-navigation"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        className="menu-toggle"
        type="button"
        onClick={() => {
          setMenuOpen((current) => !current);
          setOpenGroup(null);
        }}
      >
        <span>{menuOpen ? "Close" : "Menu"}</span>
        <span className="hamburger-lines" aria-hidden="true" />
      </button>
      <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} id="primary-navigation" aria-label="Primary navigation">
        {navigation.map((group) => group.items ? <div className={`nav-group ${openGroup === group.label ? "is-open" : ""}`} key={group.label}>
          <button aria-controls={`nav-menu-${group.label.toLowerCase()}`} aria-expanded={openGroup === group.label} className="nav-group-toggle" type="button" onClick={() => setOpenGroup((current) => current === group.label ? null : group.label)}>{group.label}</button>
          <div className="nav-menu" id={`nav-menu-${group.label.toLowerCase()}`}>
            {group.items.map((item) => item.note
              ? <span className="nav-menu-note" aria-disabled="true" key={item.label}>{item.label}<small>Details coming through KariGO onboarding</small></span>
              : item.href?.startsWith("http") || item.href?.startsWith("/#")
                ? <a key={`${item.label}-${item.href}`} href={item.href} onClick={() => { trackNavigation(item.label); closeMenu(); }}>{item.label}</a>
                : <Link key={`${item.label}-${item.href}`} href={item.href!} onClick={() => { trackNavigation(item.label); closeMenu(); }}>{item.label}</Link>)}
          </div>
        </div> : <Link key={group.label} href={group.href!} onClick={closeMenu}>{group.label}</Link>)}
        <Link className="mobile-nav-cta" href="/vendors/apply" onClick={() => { trackAnalyticsEvent("primary_cta_click", { source_path: pathname, placement: "header", cta_id: "become_partner", destination_id: "vendor_application" }); closeMenu(); }}>Become a Partner</Link>
      </nav>
      <Link className="nav-cta desktop-cta" href="/vendors/apply" onClick={() => trackAnalyticsEvent("primary_cta_click", { source_path: pathname, placement: "header", cta_id: "become_partner", destination_id: "vendor_application" })}>Become a Partner</Link>
    </header>
  );
}
