"use client";

import { useEffect, useState } from "react";
import { reportsApi } from "../../src/api/reports.api";
import { PortalShell, ErrorMessage } from "../../src/components/portal";
import { friendlyError, money } from "../../src/lib/errors";

export default function Reports() {
  const [operations, setOperations] = useState<any>({});
  const [finance, setFinance] = useState<any>({});
  const [vendors, setVendors] = useState<any[]>([]);
  const [captains, setCaptains] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise
      .all([reportsApi.operations(), reportsApi.finance(), reportsApi.vendors(), reportsApi.riders(), reportsApi.promos()])
      .then(([operationsData, financeData, vendorData, captainData, promoData]) => {
        setOperations(operationsData);
        setFinance(financeData);
        setVendors(vendorData);
        setCaptains(captainData);
        setPromos(promoData);
      })
      .catch((e) => setError(friendlyError(e)));
  }, []);

  return <PortalShell>
    <h1>Reports</h1>
    <ErrorMessage>{error}</ErrorMessage>
    <div className="grid">
      {[
        ["Total orders", operations.totalOrders ?? 0],
        ["Completed", operations.completedOrders ?? 0],
        ["Cancelled", operations.cancelledOrders ?? 0],
        ["Average order", money(operations.averageOrderValue)],
        ["GMV", money(finance.grossMerchandiseValue)],
        ["Successful payments", money(finance.totalSuccessfulPayments)],
        ["Refund pending", money(finance.totalRefundPending)],
        ["Net revenue", money(finance.netRevenue)]
      ].map(([label, value]) => <article className="card" key={String(label)}><span className="muted">{label}</span><p className="metric">{value}</p></article>)}
    </div>
    <h2>Vendor performance</h2>
    <section className="section">
      {vendors.slice(0, 10).map((vendor) => <article className="card" key={vendor.id}>
        <strong>{vendor.businessName}</strong>
        <p>{vendor.completedOrders} completed · {money(vendor.grossOrderValue)} gross</p>
      </article>)}
    </section>
    <h2>Captain performance</h2>
    <section className="section">
      {captains.slice(0, 10).map((captain) => <article className="card" key={captain.id}>
        <strong>{captain.name}</strong>
        <p>{captain.completedJobs} completed · {money(captain.totalEarnings)} earned</p>
      </article>)}
    </section>
    <h2>Promo report</h2>
    <section className="section">
      {promos.map((promo) => <article className="card" key={promo.promoCode}>
        <strong>{promo.promoCode}</strong>
        <p>{promo.totalUsage ?? 0} uses · {money(promo.totalDiscountGiven)}</p>
      </article>)}
    </section>
  </PortalShell>;
}
