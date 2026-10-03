import { AdCampaignEventType } from "@prisma/client";
import { AdPerformanceRange } from "./dto/get-ad-performance-query.dto";

export const ADS_REPORTING_TIMEZONE = "Africa/Lagos";

export function lagosDayKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ADS_REPORTING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function performanceStart(range: AdPerformanceRange, now: Date, lifetimeStart?: Date) {
  if (range === AdPerformanceRange.LIFETIME) return lifetimeStart;
  const days = range === AdPerformanceRange.TODAY ? 1 : range === AdPerformanceRange.DAYS_7 ? 7 : 30;
  return new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
}

export function buildPerformanceSeries(
  range: AdPerformanceRange,
  events: Array<{ occurredAt: Date; eventType: AdCampaignEventType; costKobo: number }>,
  now: Date,
  lifetimeStart?: Date
) {
  const start = performanceStart(range, now, lifetimeStart ?? events[0]?.occurredAt ?? now) ?? now;
  const buckets = new Map<string, { date: string; impressions: number; clicks: number; spendKobo: number; ctr: number }>();
  for (let cursor = new Date(start); cursor <= now; cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)) {
    const date = lagosDayKey(cursor);
    buckets.set(date, { date, impressions: 0, clicks: 0, spendKobo: 0, ctr: 0 });
  }
  for (const event of events) {
    const bucket = buckets.get(lagosDayKey(event.occurredAt));
    if (!bucket) continue;
    if (event.eventType === AdCampaignEventType.IMPRESSION) bucket.impressions += 1;
    if (event.eventType === AdCampaignEventType.CLICK) bucket.clicks += 1;
    bucket.spendKobo += event.costKobo;
  }
  return [...buckets.values()].map((bucket) => ({
    ...bucket,
    ctr: bucket.impressions ? Number(((bucket.clicks / bucket.impressions) * 100).toFixed(2)) : 0
  }));
}
