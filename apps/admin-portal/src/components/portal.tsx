"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { useAuth } from "../contexts/auth-context";

const nav = [["Dashboard", "/"], ["Orders", "/orders"], ["Dispatch", "/dispatch"], ["Users", "/users"], ["Vendors", "/vendors"], ["Vendor Applications", "/vendor-applications"], ["SME Services Summary", "/sme-services/summary"], ["SME Pilot Readiness", "/sme-services/readiness"], ["SME Launch Control", "/sme-services/launch-control"], ["SME Services", "/sme-services"], ["SME Provider Applications", "/sme-services/applications"], ["SME Providers", "/sme-services/providers"], ["Payout Accounts", "/payout-accounts"], ["Riders", "/riders"], ["Taxi", "/taxi"], ["Settlements", "/settlements"], ["Utilities", "/utilities"], ["Support", "/support"], ["Promotions", "/promotions"], ["Reports", "/reports"], ["Notifications", "/notifications"]];
const statusLabel = (value: ReactNode) => typeof value === "string" ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : value;

export function PortalShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const path = usePathname();
  const router = useRouter();
  if (loading) return <Loading />;
  if (!user) {
    if (typeof window !== "undefined" && path !== "/login") router.replace("/login");
    return path === "/login" ? children : <Loading />;
  }
  return <main className="shell">
    <aside className="sidebar">
      <Image src="/karigo-logo.png" alt="KariGO Admin Portal" width={300} height={300} priority />
      <p className="sidebar-label">Operations control centre</p>
      <nav className="nav" aria-label="Admin portal navigation">{nav.map(([label, href]) => {
        const active = href === "/" ? path === href : path.startsWith(href);
        return <a key={href} href={href} aria-current={active ? "page" : undefined}>{label}</a>;
      })}</nav>
    </aside>
    <section className="content"><div className="top-actions"><span className="muted">Signed in as <strong>{user.fullName}</strong></span><button className="secondary" onClick={async () => { await logout(); router.replace("/login"); }}>Log out</button></div>{children}</section>
  </main>;
}

export const Loading = () => <div className="loading" role="status"><span className="spinner" />Loading KariGO admin portal...</div>;
export const Empty = ({ children }: { children: ReactNode }) => <div className="empty"><strong>No records found</strong><span>{children}</span></div>;
export const ErrorMessage = ({ children }: { children?: ReactNode }) => children ? <p className="error" role="alert">{children}</p> : null;
export const Badge = ({ children }: { children: ReactNode }) => {
  const status = typeof children === "string" ? children.toUpperCase().replaceAll(" ", "_") : "";
  return <span className="badge" data-status={status}>{statusLabel(children)}</span>;
};
