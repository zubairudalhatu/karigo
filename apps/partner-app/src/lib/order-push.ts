// Notification data is an invalidation hint, never authorization or order state.
export function partnerOrderId(value: unknown): value is string { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }
export async function resolvePartnerOrderPush(data: Record<string, unknown>, deps: {
  current(): boolean; approved(): Promise<boolean>; detail(id: string): Promise<unknown>;
}): Promise<string | null> {
  if (!deps.current() || data.appSurface !== "PARTNER_APP" || data.route !== "order" || !partnerOrderId(data.entityId)) return null;
  try {
    if (!await deps.approved() || !deps.current()) return null;
    await deps.detail(data.entityId);
    return deps.current() ? data.entityId : null;
  } catch { return null; }
}

export class PartnerPushClaims {
  private seen = new Set<string>();
  claim(id: string) {
    if (this.seen.has(id)) return false;
    this.seen.add(id); if (this.seen.size > 128) this.seen.delete(this.seen.values().next().value!);
    return true;
  }
}
