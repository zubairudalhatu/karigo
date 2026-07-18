"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ordersApi } from "../../../src/api/orders.api";
import { dispatchApi, AvailableRider } from "../../../src/api/dispatch.api";
import { paymentsApi } from "../../../src/api/payments.api";
import { Badge, ErrorMessage, Loading, PortalShell } from "../../../src/components/portal";
import { friendlyError, money } from "../../../src/lib/errors";

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [captains, setCaptains] = useState<AvailableRider[]>([]);
  const [captainId, setCaptainId] = useState("");
  const [note, setNote] = useState("");
  const [cashNote, setCashNote] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = () => Promise
    .all([ordersApi.detail(id), dispatchApi.available().catch(() => [])])
    .then(([orderData, captainData]) => {
      setOrder(orderData);
      setCaptains(captainData);
    })
    .catch((e) => setError(friendlyError(e)));

  useEffect(() => { void load(); }, [id]);

  if (!order && !error) return <PortalShell><Loading /></PortalShell>;

  async function assign(reassign = false) {
    if (reassign && !confirm("Reassign this Delivery Captain?")) return;
    try {
      await (reassign ? dispatchApi.reassign(id, captainId) : dispatchApi.assign(id, captainId));
      setMsg(reassign ? "Delivery Captain reassigned successfully." : "Delivery Captain assigned successfully.");
      await load();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return <PortalShell>
    <h1>{order?.orderNumber}</h1>
    <ErrorMessage>{error}</ErrorMessage>
    <p className="success">{msg}</p>
    {order ? <div className="detail-grid">
      <div className="section">
        <article className="card">
          <h2>Order</h2>
          <Badge>{order.orderStatus}</Badge>
          <p>Customer: {order.customer.user.fullName}</p>
          <p>Vendor: {order.vendor?.businessName ?? "-"}</p>
          <p>Delivery Captain: {order.rider?.riderCode ?? "Unassigned"}</p>
          {order.items?.map((item: any) => <div className="item" key={item.id}>
            <span>{item.quantity} × {item.productName}</span>
            <strong>{money(item.totalPrice)}</strong>
          </div>)}
        </article>
        <article className="card">
          <h2>Status history</h2>
          {order.statusHistory?.map((entry: any) => <p key={entry.id}>{entry.newStatus} · <span className="muted">{new Date(entry.createdAt).toLocaleString()}</span></p>)}
        </article>
      </div>
      <aside className="section">
        <article className="card">
          <h2>Financial</h2>
          <p>Total: {money(order.totalAmount)}</p>
          <p>Payment method: {order.paymentMethod === "CASH_ON_DELIVERY" ? "Cash / Pay on Delivery" : order.paymentMethod === "WALLET" ? "KariGO Wallet" : order.paymentMethod === "SQUAD" ? "Squad by GTBank" : order.paymentStatus}</p>
          {order.paymentMethod === "CASH_ON_DELIVERY" ? <div>
            <p>Cash status: {order.cashCollectionStatus?.replaceAll("_", " ") ?? "PENDING COLLECTION"}</p>
            <p>Expected cash: {money(order.totalAmount)}</p>
            <p>Cash collected amount: {order.cashCollectedAmount ? money(order.cashCollectedAmount) : "Not recorded"}</p>
            <p>Collected at: {order.cashCollectedAt ? new Date(order.cashCollectedAt).toLocaleString() : "Not recorded"}</p>
            <p>Reconciled at: {order.cashReconciledAt ? new Date(order.cashReconciledAt).toLocaleString() : "Not reconciled"}</p>
            {order.cashReconciliationNote ? <p className="muted">Reconciliation note: {order.cashReconciliationNote}</p> : null}
            {order.cashCollectionStatus !== "RECONCILED" ? <>
              <textarea value={cashNote} onChange={(event) => setCashNote(event.target.value)} placeholder="Cash reconciliation note required" />
              <button disabled={cashNote.trim().length < 5} onClick={async () => {
                if (!confirm("Mark this Cash/POD order reconciled? This does not trigger payout automation.")) return;
                await ordersApi.reconcileCash(id, cashNote);
                setMsg("Cash/POD order reconciled.");
                setCashNote("");
                await load();
              }}>Mark cash reconciled</button>
            </> : null}
          </div> : null}
          {order.payments?.map((payment: any) => <div key={payment.id}>
            <p>{payment.gateway}: {payment.paymentStatus} · {money(payment.amount)}</p>
            {payment.paymentStatus === "REFUND_PENDING" ? <button onClick={async () => {
              if (confirm("Approve this refund?")) {
                await paymentsApi.approveRefund(payment.id);
                setMsg("Refund approved.");
                await load();
              }
            }}>Approve refund</button> : null}
          </div>)}
        </article>
        <article className="card">
          <h2>Dispatch</h2>
          <select value={captainId} onChange={(event) => setCaptainId(event.target.value)}>
            <option value="">Select available Delivery Captain</option>
            {captains.map((captain) => <option key={captain.id} value={captain.id}>{captain.name} ({captain.riderCode})</option>)}
          </select>
          <div className="actions">
            <button disabled={!captainId} onClick={() => assign(false)}>Assign Captain</button>
            <button className="secondary" disabled={!captainId || !order.rider} onClick={() => assign(true)}>Reassign Captain</button>
          </div>
        </article>
        <article className="card">
          <h2>Internal note</h2>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} />
          <button onClick={async () => {
            await ordersApi.note(id, note);
            setMsg("Order note added.");
            setNote("");
          }}>Add note</button>
        </article>
      </aside>
    </div> : null}
  </PortalShell>;
}
