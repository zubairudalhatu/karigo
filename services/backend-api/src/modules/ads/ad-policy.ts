import { BadRequestException } from "@nestjs/common";
import { AdCampaignStatus } from "@prisma/client";

export const AD_STATUS_TRANSITIONS: Readonly<Record<AdCampaignStatus, readonly AdCampaignStatus[]>> = {
  DRAFT: [AdCampaignStatus.SUBMITTED, AdCampaignStatus.CANCELLED],
  SUBMITTED: [AdCampaignStatus.UNDER_REVIEW, AdCampaignStatus.CANCELLED],
  UNDER_REVIEW: [AdCampaignStatus.CHANGES_REQUESTED, AdCampaignStatus.APPROVED, AdCampaignStatus.REJECTED],
  CHANGES_REQUESTED: [AdCampaignStatus.SUBMITTED, AdCampaignStatus.CANCELLED],
  APPROVED: [AdCampaignStatus.SCHEDULED, AdCampaignStatus.ACTIVE, AdCampaignStatus.CANCELLED],
  SCHEDULED: [AdCampaignStatus.ACTIVE, AdCampaignStatus.PAUSED, AdCampaignStatus.EXPIRED, AdCampaignStatus.CANCELLED],
  ACTIVE: [AdCampaignStatus.PAUSED, AdCampaignStatus.COMPLETED, AdCampaignStatus.EXPIRED, AdCampaignStatus.CANCELLED],
  PAUSED: [AdCampaignStatus.ACTIVE, AdCampaignStatus.COMPLETED, AdCampaignStatus.EXPIRED, AdCampaignStatus.CANCELLED],
  COMPLETED: [],
  EXPIRED: [],
  REJECTED: [],
  CANCELLED: []
};

export const OWNER_EDITABLE_STATUSES = new Set<AdCampaignStatus>([
  AdCampaignStatus.DRAFT,
  AdCampaignStatus.CHANGES_REQUESTED,
  AdCampaignStatus.SUBMITTED,
  AdCampaignStatus.UNDER_REVIEW
]);

export const REVISION_REQUIRED_STATUSES = new Set<AdCampaignStatus>([
  AdCampaignStatus.APPROVED,
  AdCampaignStatus.SCHEDULED,
  AdCampaignStatus.ACTIVE,
  AdCampaignStatus.PAUSED
]);

export function assertAdTransition(from: AdCampaignStatus, to: AdCampaignStatus) {
  if (from === to || !AD_STATUS_TRANSITIONS[from].includes(to)) {
    throw new BadRequestException(`Campaign cannot move from ${from} to ${to}.`);
  }
}

export function normalizeApprovedDestination(value?: string | null) {
  const input = value?.trim();
  if (!input) return undefined;
  if (input.length > 500) throw new BadRequestException("Destination URL is too long.");
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new BadRequestException("Enter a valid HTTPS destination URL.");
  }
  if (url.protocol !== "https:") throw new BadRequestException("Only HTTPS destinations are allowed.");
  if (url.username || url.password) throw new BadRequestException("Destination URLs cannot contain credentials.");
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";
  return url.toString();
}

export function validateCampaignPlan(input: {
  requestedBudgetKobo?: number | null;
  dailyBudgetKobo?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
}) {
  const total = input.requestedBudgetKobo ?? 0;
  const daily = input.dailyBudgetKobo ?? null;
  if (total < 0 || (daily !== null && daily <= 0)) throw new BadRequestException("Campaign budgets must be positive.");
  if (daily !== null && daily > total) throw new BadRequestException("Daily budget cannot exceed total budget.");
  if (input.startsAt && input.endsAt && input.startsAt >= input.endsAt) {
    throw new BadRequestException("Campaign start must be before its end.");
  }
  if (input.startsAt && input.endsAt && input.endsAt.getTime() - input.startsAt.getTime() > 366 * 24 * 60 * 60 * 1000) {
    throw new BadRequestException("Campaign duration cannot exceed 366 days.");
  }
}

export function ctr(impressions: number, clicks: number) {
  return impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
}
