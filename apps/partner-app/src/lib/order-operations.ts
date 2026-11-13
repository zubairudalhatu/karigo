import { partnerOrderActions, partnerOrderRejectionReasons } from "@karigo/shared-types";
import type { PartnerOrderAction, PartnerOrderDetailContract as Order, PartnerOrderRejectionReason, PartnerOrderVersion } from "@karigo/shared-types";

export type ResourceState<T> = { data: T | null; loading: boolean; refreshing: boolean; fresh: boolean; error: string };
export const orderGroups = ["New / action required", "Preparing / active", "Ready / courier", "Completed", "Cancelled / closed", "Other"] as const;
export type OrderGroup = typeof orderGroups[number];
const terminal = new Set(["DELIVERED", "COMPLETED", "CANCELLED", "VENDOR_REJECTED", "FAILED", "REFUNDED"]);
export function orderGroup(status: string): OrderGroup {
  if (["PAID", "VENDOR_CONFIRMING"].includes(status)) return orderGroups[0];
  if (["VENDOR_ACCEPTED", "PREPARING"].includes(status)) return orderGroups[1];
  if (["READY_FOR_PICKUP", "RIDER_ASSIGNED", "RIDER_ARRIVING_PICKUP", "PICKED_UP", "ON_THE_WAY", "ARRIVED_DESTINATION"].includes(status)) return orderGroups[2];
  if (["DELIVERED", "COMPLETED"].includes(status)) return orderGroups[3];
  if (terminal.has(status)) return orderGroups[4];
  return orderGroups[5];
}
export function availableOrderActions(order: Order | null): PartnerOrderAction[] {
  if (!order || terminal.has(order.orderStatus)) return [];
  return partnerOrderActions.filter(action => order.availableActions.includes(action));
}
const status = (error: unknown) => typeof error === "object" && error ? (error as { status?: number }).status : undefined;
const unauthorized = (error: unknown) => status(error) === 401 || status(error) === 403 || status(error) === 404;

// No persistent cache or mutation queue. Stale data remains read-only on a failed refresh.
export class OrderResource<T> {
  private state: ResourceState<T> = { data: null, loading: true, refreshing: false, fresh: false, error: "" };
  private listeners = new Set<() => void>();
  private flight: Promise<T | null> | null = null;
  private disposed = false;
  private initialGeneration: number;
  constructor(private readonly read: () => Promise<T>, private readonly generation: () => number) { this.initialGeneration = generation(); }
  current = () => !this.disposed && this.generation() === this.initialGeneration;
  snapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(value: Partial<ResourceState<T>>) { if (this.current()) { this.state = { ...this.state, ...value }; this.listeners.forEach(listener => listener()); } }
  invalidate = () => { this.set({ fresh: false }); };
  async load(): Promise<T | null> {
    if (!this.current()) return null;
    if (this.flight) return this.flight;
    this.set({ refreshing: true });
    this.flight = (async () => {
      try {
        const data = await this.read();
        if (!this.current()) return null;
        this.set({ data, fresh: true, error: "" }); return data;
      } catch (error) {
        this.set({ fresh: false, ...(unauthorized(error) ? { data: null } : {}), error: unauthorized(error)
          ? "This order workspace is unavailable. Sign in with approved business access or return to Orders."
          : "Could not refresh. A connection is required before changing an order." });
        return null;
      } finally { this.set({ loading: false, refreshing: false }); this.flight = null; }
    })();
    return this.flight;
  }
  async reload() { if (this.flight) await this.flight; return this.load(); }
  dispose = () => { this.disposed = true; this.state = { ...this.state, data: null, fresh: false }; this.listeners.clear(); };
}

export type OrderConfirmation = PartnerOrderVersion & { orderId: string; action: PartnerOrderAction };
export function confirmOrderAction(order: Order, action: PartnerOrderAction): OrderConfirmation {
  return { orderId: order.id, action, expectedStatus: order.orderStatus, expectedUpdatedAt: order.updatedAt };
}
type Transport = { detail(id: string): Promise<Order>; mutate(id: string, action: PartnerOrderAction, version: PartnerOrderVersion, reason?: PartnerOrderRejectionReason, details?: string): Promise<Order> };
export class OrderOperations {
  readonly resource: OrderResource<Order>;
  private busy = false;
  private message = "";
  private listeners = new Set<() => void>();
  constructor(private readonly id: string, private readonly transport: Transport, generation: () => number, private readonly changed: (id: string) => void) {
    this.resource = new OrderResource(() => transport.detail(id), generation);
  }
  private ui = { busy: false, message: "" };
  snapshot = () => this.ui;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private notify() { this.ui = { busy: this.busy, message: this.message }; this.listeners.forEach(listener => listener()); }
  async perform(confirmation: OrderConfirmation, reason?: PartnerOrderRejectionReason, details?: string) {
    if (this.busy || !this.resource.current()) return "blocked";
    this.busy = true; this.message = "Checking current orderâ€¦"; this.notify();
    try {
      if (!this.resource.snapshot().fresh || confirmation.orderId !== this.id || !partnerOrderActions.includes(confirmation.action)) {
        this.message = "Refresh and review the order before confirming an action."; return "blocked";
      }
      if (confirmation.action === "reject" && (!reason || !partnerOrderRejectionReasons.includes(reason) || (details?.length ?? 0) > 500)) {
        this.message = "Choose a rejection reason and keep the optional business note within 500 characters."; return "blocked";
      }
      const latest = await this.resource.reload();
      if (!latest || !this.resource.current()) { this.message = "A connection and current authorized order are required. Nothing was queued."; return "blocked"; }
      if (latest.orderStatus !== confirmation.expectedStatus || latest.updatedAt !== confirmation.expectedUpdatedAt || !availableOrderActions(latest).includes(confirmation.action)) {
        this.message = "Order status changed. Review the refreshed order and confirm again if appropriate."; return "changed";
      }
      this.message = "Saving order actionâ€¦"; this.notify();
      try {
        const result = await this.transport.mutate(this.id, confirmation.action, { expectedStatus: latest.orderStatus, expectedUpdatedAt: latest.updatedAt }, reason, details?.trim() || undefined);
        if (!this.resource.current()) return "blocked";
        this.message = result.refundReviewRequired ? "Order rejected. Payment requires refund review; this action did not execute a refund." : "Order action confirmed.";
        this.changed(this.id);
        await this.resource.reload(); return "confirmed";
      } catch (error) {
        this.message = status(error) === 409 ? "Order status changed. Review the refreshed order before acting again."
          : status(error) === 400 ? "Action not allowed. Review the order and business reason; do not include credentials or diagnostic logs."
          : unauthorized(error) ? "Your order access is unavailable. Sign in again."
          : "The action's outcome could not be confirmed. Review the refreshed status before retrying. Nothing will replay automatically.";
        this.changed(this.id); this.resource.invalidate(); await this.resource.reload();
        return status(error) === 409 ? "changed" : "uncertain";
      }
    } finally { this.busy = false; this.notify(); }
  }
  dispose = () => { this.resource.dispose(); this.listeners.clear(); };
}

const listeners = new Set<(orderId?: string) => void>();
export function notifyPartnerOrderChanged(orderId?: string) { listeners.forEach(listener => listener(orderId)); }
export function subscribePartnerOrderChanges(listener: (orderId?: string) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
