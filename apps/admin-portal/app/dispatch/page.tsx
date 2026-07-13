"use client";

import { useEffect, useState } from "react";
import { ordersApi, AdminOrder } from "../../src/api/orders.api";
import { dispatchApi, AvailableRider } from "../../src/api/dispatch.api";
import { PortalShell, ErrorMessage, Empty } from "../../src/components/portal";
import { friendlyError } from "../../src/lib/errors";

export default function Dispatch() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [captains, setCaptains] = useState<AvailableRider[]>([]);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = () => Promise
    .all([ordersApi.list("status=READY_FOR_PICKUP"), dispatchApi.available()])
    .then(([loadedOrders, loadedCaptains]) => {
      setOrders(loadedOrders);
      setCaptains(loadedCaptains);
    })
    .catch((e) => setError(friendlyError(e)));

  useEffect(() => { void load(); }, []);

  return <PortalShell>
    <h1>Dispatch board</h1>
    <p className="success">{msg}</p>
    <ErrorMessage>{error}</ErrorMessage>
    <section className="section">
      {orders.length ? orders.map((order) => <article className="card" key={order.id}>
        <h2><a href={`/orders/${order.id}`}>{order.orderNumber}</a></h2>
        <p>{order.vendor?.businessName} · {order.customer.user.fullName}</p>
        <select value={choice[order.id] ?? ""} onChange={(event) => setChoice({ ...choice, [order.id]: event.target.value })}>
          <option value="">Select Delivery Captain</option>
          {captains.map((captain) => <option key={captain.id} value={captain.id}>{captain.name} · {captain.vehicleType ?? "Vehicle"}</option>)}
        </select>
        <button disabled={!choice[order.id]} onClick={async () => {
          await dispatchApi.assign(order.id, choice[order.id]);
          setMsg("Delivery Captain assigned successfully.");
          await load();
        }}>Assign Captain</button>
      </article>) : <Empty>No orders are ready for pickup.</Empty>}
    </section>
  </PortalShell>;
}
