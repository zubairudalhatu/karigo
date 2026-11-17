import type { NoticeTarget, BranchInput } from "../api/operations.api";
export const validBusinessTime = (value: string) =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export function branchInput(value: BranchInput): BranchInput {
  return {
    name: value.name.trim(),
    address: value.address.trim(),
    city: value.city.trim(),
    state: value.state.trim(),
    area: value.area?.trim() || undefined,
    phoneNumber: value.phoneNumber?.trim() || undefined,
    isPrimary: value.isPrimary,
    status: value.status,
  };
}
export async function notificationDestination(
  target: NoticeTarget,
  detail: (id: string) => Promise<unknown>,
): Promise<string | null> {
  if (target.route === "order") {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        target.id,
      )
    )
      return null;
    await detail(target.id);
    return `/orders/${target.id}`;
  }
  return (
    (
      {
        earnings: "/earnings",
        profile: "/profile",
        documents: "/documents",
        support: "/support",
      } as Record<string, string>
    )[target.route] || null
  );
}
