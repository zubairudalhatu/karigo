"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "../contexts/auth-context";

type NavLink = { label: string; href: string };
type NavGroup = { label: string; links: NavLink[] };

const navGroups: NavGroup[] = [
  { label: "Operations", links: [
    { label: "Dashboard", href: "/" }, { label: "Production Launch", href: "/production-launch" },
    { label: "Orders", href: "/orders" }, { label: "Dispatch", href: "/dispatch" }, { label: "Ride Operations", href: "/taxi" }
  ] },
  { label: "People & Partners", links: [
    { label: "Users", href: "/users" }, { label: "Captains", href: "/riders" }, { label: "Vendors", href: "/vendors" },
    { label: "Partner Applications", href: "/vendor-applications" }, { label: "Delivery Captain Applications", href: "/delivery-captain-applications" },
    { label: "Service Providers", href: "/sme-services/providers" }
  ] },
  { label: "Commerce & Finance", links: [
    { label: "Wallets", href: "/wallets" }, { label: "Payout Accounts", href: "/payout-accounts" },
    { label: "Settlements", href: "/settlements" }, { label: "Payment Readiness", href: "/payment-readiness" }, { label: "Utilities", href: "/utilities" }
  ] },
  { label: "SME Operations", links: [
    { label: "SME Services Summary", href: "/sme-services/summary" }, { label: "SME Operations Readiness", href: "/sme-services/readiness" },
    { label: "SME Operations Control", href: "/sme-services/launch-control" }, { label: "SME Participants", href: "/sme-services/participants" },
    { label: "SME Invitation Templates", href: "/sme-services/invitation-templates" }, { label: "SME Services", href: "/sme-services" },
    { label: "Partner Service Applications", href: "/sme-services/applications" }
  ] },
  { label: "Growth & Engagement", links: [
    { label: "Promotions", href: "/promotions" }, { label: "Referrals", href: "/referrals" },
    { label: "Ads", href: "/ads" }, { label: "Notifications", href: "/notifications" }
  ] },
  { label: "Support & Governance", links: [
    { label: "Support", href: "/support" }, { label: "Reports", href: "/reports" }, { label: "Audit Logs", href: "/audit-logs" },
    { label: "Login Activity", href: "/login-activity" }, { label: "Account Deletion", href: "/account-deletion-requests" }
  ] },
  { label: "System", links: [{ label: "Developer Settings", href: "/settings" }] }
];
const statusLabel = (value: ReactNode) => typeof value === "string" ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : value;

export function PortalShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const allLinks = navGroups.flatMap((group) => group.links);
  const activeHref = allLinks
    .map(({ href }) => href)
    .filter((href) => href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`))
    .sort((left, right) => right.length - left.length)[0];
  const activeGroupLabel = navGroups.find((group) => group.links.some((link) => link.href === activeHref))?.label;
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => Object.fromEntries(navGroups.map((group) => [group.label, group.label === activeGroupLabel])));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useEffect(() => {
    if (!activeGroupLabel) return;
    setExpandedGroups((current) => ({ ...current, [activeGroupLabel]: true }));
    setMobileNavOpen(false);
  }, [activeGroupLabel, path]);
  if (loading) return <Loading />;
  if (!user) {
    if (typeof window !== "undefined" && path !== "/login") router.replace("/login");
    return path === "/login" ? children : <Loading />;
  }
  return <main className="shell">
    <aside className={`sidebar ${mobileNavOpen ? "is-open" : ""}`} id="admin-navigation">
      <div className="sidebar-brand">
        <Image src="/karigo-logo.png" alt="KariGO Admin Portal" width={96} height={96} priority />
        <div><strong>KariGO</strong><span>Operations Control Centre</span></div>
        <button className="sidebar-close" type="button" aria-label="Close admin navigation" onClick={() => setMobileNavOpen(false)}>Close</button>
      </div>
      <nav className="nav" aria-label="Admin workspace navigation">
        {navGroups.map((group) => {
          const expanded = expandedGroups[group.label] ?? false;
          const groupId = `nav-${group.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
          return <section className="nav-group-section" key={group.label}>
            <button className="nav-group-toggle" type="button" aria-controls={groupId} aria-expanded={expanded} onClick={() => setExpandedGroups((current) => ({ ...current, [group.label]: !expanded }))}>
              <span>{group.label}</span><span aria-hidden="true">⌄</span>
            </button>
            <div className="nav-group-links" hidden={!expanded} id={groupId}>
              {group.links.map(({ label, href }) => {
                const active = href === activeHref;
                return <a key={href} href={href} aria-current={active ? "page" : undefined} onClick={() => setMobileNavOpen(false)}>{label}</a>;
              })}
            </div>
          </section>;
        })}
      </nav>
    </aside>
    <section className="content"><div className="top-actions"><button className="secondary sidebar-toggle" type="button" aria-controls="admin-navigation" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(true)}>Navigation</button><span className="muted">Signed in as <strong>{user.fullName}</strong></span><button className="secondary" onClick={async () => { await logout(); router.replace("/login"); }}>Log out</button></div>{children}</section>
  </main>;
}

export const Loading = () => <div className="loading" role="status"><span className="spinner" />Loading KariGO admin portal...</div>;
export const Empty = ({ children }: { children: ReactNode }) => <div className="empty"><strong>No records found</strong><span>{children}</span></div>;
export const ErrorMessage = ({ children }: { children?: ReactNode }) => children ? <p className="error" role="alert">{children}</p> : null;
export const Badge = ({ children }: { children: ReactNode }) => {
  const status = typeof children === "string" ? children.toUpperCase().replaceAll(" ", "_") : "";
  return <span className="badge" data-status={status}>{statusLabel(children)}</span>;
};
