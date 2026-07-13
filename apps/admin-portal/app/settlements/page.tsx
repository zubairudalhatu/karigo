"use client";

import { useEffect, useState } from "react";
import { settlementsApi } from "../../src/api/settlements.api";
import { PortalShell, ErrorMessage, Empty } from "../../src/components/portal";
import { friendlyError, money } from "../../src/lib/errors";

export default function Settlements() {
  const [vendorSettlements, setVendorSettlements] = useState<any[]>([]);
  const [captainEarnings, setCaptainEarnings] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => Promise
    .all([settlementsApi.vendors(), settlementsApi.riders()])
    .then(([vendors, captains]) => {
      setVendorSettlements(vendors);
      setCaptainEarnings(captains);
    })
    .catch((e) => setError(friendlyError(e)));

  useEffect(() => { void load(); }, []);

  const pay = async (kind: "vendor" | "rider", id: string) => {
    if (!confirm("Mark this payout as paid? This does not initiate a bank transfer.")) return;
    await (kind === "vendor" ? settlementsApi.payVendor(id) : settlementsApi.payRider(id));
    setMsg("Settlement marked as paid.");
    await load();
  };

  return <PortalShell>
    <h1>Settlements</h1>
    <p className="success">{msg}</p>
    <ErrorMessage>{error}</ErrorMessage>
    <h2>Vendor settlements</h2>
    <section className="section">
      {vendorSettlements.length ? vendorSettlements.map((settlement) => <article className="card" key={settlement.id}>
        <strong>{settlement.vendor.businessName} · {settlement.order.orderNumber}</strong>
        <p>{money(settlement.netAmount)} · {settlement.settlementStatus}</p>
        {settlement.settlementStatus !== "PAID" ? <button onClick={() => pay("vendor", settlement.id)}>Mark paid</button> : null}
      </article>) : <Empty>No vendor settlements.</Empty>}
    </section>
    <h2>Captain earnings</h2>
    <section className="section">
      {captainEarnings.length ? captainEarnings.map((earning) => <article className="card" key={earning.id}>
        <strong>{earning.rider.user.fullName} · {earning.order.orderNumber}</strong>
        <p>{money(earning.riderPayout)} · {earning.payoutStatus}</p>
        {earning.payoutStatus !== "PAID" ? <button onClick={() => pay("rider", earning.id)}>Mark paid</button> : null}
      </article>) : <Empty>No captain earnings.</Empty>}
    </section>
  </PortalShell>;
}
