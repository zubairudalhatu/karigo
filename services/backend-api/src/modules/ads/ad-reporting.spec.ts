import { AdCampaignEventType } from "@prisma/client";
import { buildPerformanceSeries, lagosDayKey } from "./ad-reporting";
import { AdPerformanceRange } from "./dto/get-ad-performance-query.dto";

describe("ad reporting", () => {
  it("uses Lagos boundaries and fills missing daily buckets", () => {
    const now = new Date("2026-10-03T22:30:00Z");
    expect(lagosDayKey(now)).toBe("2026-10-03");
    const series = buildPerformanceSeries(AdPerformanceRange.DAYS_7, [
      { occurredAt: new Date("2026-10-03T10:00:00Z"), eventType: AdCampaignEventType.IMPRESSION, costKobo: 0 },
      { occurredAt: new Date("2026-10-03T10:01:00Z"), eventType: AdCampaignEventType.CLICK, costKobo: 25 }
    ], now);
    expect(series).toHaveLength(7);
    expect(series.at(-1)).toMatchObject({ date: "2026-10-03", impressions: 1, clicks: 1, ctr: 100, spendKobo: 25 });
  });
});
