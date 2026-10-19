import { ForbiddenException } from "@nestjs/common";

export const captainDeletionSelection = {
  where: { accountType: { in: ["CAPTAIN" as const, "COMPLETE_ACCOUNT" as const] }, erasureVersion: 2, status: { not: "CANCELLED" as const } },
  take: 1, select: { id: true }
};

export function assertCaptainNotDeleted(user: { accountDeletionRequests?: { id: string }[] }) {
  if (user.accountDeletionRequests?.length) throw new ForbiddenException("Permanent Captain deletion was requested. Captain onboarding and operations are unavailable.");
}
