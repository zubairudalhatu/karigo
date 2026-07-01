"use client";
import { DashboardShell } from "../../src/components/dashboard";
export default function Settlements() { return <DashboardShell><header className="topbar"><div><p className="muted">Payout readiness</p><h1>Settlements</h1></div></header><div className="notice"><strong>Vendor settlement view pending</strong><p>Settlement routes are currently admin-only. KariGO will add a vendor-specific read-only settlement endpoint before exposing payout data here.</p></div></DashboardShell>; }
