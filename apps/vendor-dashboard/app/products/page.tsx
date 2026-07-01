"use client";
import { DashboardShell } from "../../src/components/dashboard";
export default function Products() { return <DashboardShell><header className="topbar"><div><p className="muted">Menu readiness</p><h1>Products</h1></div></header><div className="notice"><strong>Vendor product management API required</strong><p>The backend currently exposes only the public product listing route. Product create, edit, availability, and delete controls remain disabled until vendor-owned management endpoints are implemented.</p></div></DashboardShell>; }
