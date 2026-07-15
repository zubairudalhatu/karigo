"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { useAuth } from "../contexts/auth-context";

const nav = [["Dashboard", "/"], ["Orders", "/orders"], ["Products", "/products"], ["Settlements", "/settlements"], ["Payout account", "/payout-account"], ["Branches", "/branches"], ["Team", "/team"], ["Audit logs", "/audit-logs"], ["Support", "/support"], ["Notifications", "/notifications"], ["Profile", "/profile"]];
const statusLabel = (value: ReactNode) => typeof value === "string" ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : value;

export function DashboardShell({ children, unread = 0 }: { children: ReactNode; unread?: number }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  if (loading) return <Loading />;
  if (!user) {
    if (typeof window !== "undefined" && pathname !== "/login") router.replace("/login");
    return pathname === "/login" ? children : <Loading />;
  }
  return <main className="shell">
    <aside className="sidebar">
      <Image src="/karigo-logo.png" alt="KariGO Vendor Dashboard" width={300} height={300} priority />
      <p className="sidebar-label">Vendor workspace</p>
      <nav className="nav" aria-label="Vendor dashboard navigation">{nav.map(([label, href]) => {
        const active = href === "/" ? pathname === href : pathname.startsWith(href);
        return <a href={href} key={href} aria-current={active ? "page" : undefined}>{label}{label === "Notifications" && unread ? <span className="nav-count">{unread}</span> : null}</a>;
      })}</nav>
    </aside>
    <section className="content"><div className="top-actions"><span className="muted">Signed in as <strong>{user.fullName}</strong></span><button className="secondary" onClick={async () => { await logout(); router.replace("/login"); }}>Log out</button></div>{children}</section>
  </main>;
}

export function StatusBadge({ children }: { children: ReactNode }) {
  const status = typeof children === "string" ? children.toUpperCase().replaceAll(" ", "_") : "";
  return <span className="badge" data-status={status}>{statusLabel(children)}</span>;
}
export function Loading() { return <div className="loading" role="status"><span className="spinner" />Loading KariGO vendor dashboard...</div>; }
export function Empty({ children }: { children: ReactNode }) { return <div className="empty"><strong>Nothing here yet</strong><span>{children}</span></div>; }
export function ErrorMessage({ children }: { children?: ReactNode }) { return children ? <p className="error" role="alert">{children}</p> : null; }
