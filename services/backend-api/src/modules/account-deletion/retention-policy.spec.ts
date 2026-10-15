import { Prisma } from "@prisma/client";
import { accountingDayStart, accountingMonthStart, addMonths, DAY_MS, financialExpiry, holdActive, isHeld, receiptExpired, retentionExpiry, ScopedHold } from "./retention-policy";
import { RETENTION_SOURCES } from "./data-retention.service";

describe("Approved retention policy boundaries", () => {
  const now = new Date("2026-10-15T12:00:00Z");
  it("retains through seven complete years after the confirmed financial year end", () => {
    const yearEnd = { month: 12, day: 31 };
    expect(financialExpiry(new Date("2026-01-01T00:00:00Z"), yearEnd).toISOString()).toBe("2033-12-31T23:00:00.000Z");
    expect(financialExpiry(new Date("2026-12-31T22:59:59.999Z"), yearEnd).toISOString()).toBe("2033-12-31T23:00:00.000Z");
    expect(financialExpiry(new Date("2026-12-31T23:00:00Z"), yearEnd).toISOString()).toBe("2034-12-31T23:00:00.000Z");
    expect(financialExpiry(new Date("2027-01-01T00:00:00Z"), yearEnd).toISOString()).toBe("2034-12-31T23:00:00.000Z");
    expect(() => retentionExpiry("FINANCIAL", now)).toThrow("year-end");
  });
  it("does not assign Nigeria New Year transactions to the preceding financial year", () => {
    const at = new Date("2019-12-31T23:30:00Z"); // 1 January 2020, 00:30 WAT
    expect(accountingDayStart(at).toISOString()).toBe("2019-12-31T23:00:00.000Z");
    expect(accountingMonthStart(at).toISOString()).toBe("2019-12-31T23:00:00.000Z");
    expect(financialExpiry(accountingMonthStart(at), { month: 12, day: 31 }).toISOString()).toBe("2027-12-31T23:00:00.000Z");
    expect(financialExpiry(at, { month: 12, day: 31 }).toISOString()).toBe("2027-12-31T23:00:00.000Z");
    expect(financialExpiry(new Date("2026-06-30T23:00:00Z"), { month: 6, day: 30 }).toISOString()).toBe("2034-06-30T23:00:00.000Z");
  });
  it("uses calendar months and an actual resolution/closure trigger", () => {
    expect(addMonths(new Date("2024-02-29T12:00:00Z"), 24).toISOString()).toBe("2026-02-28T12:00:00.000Z");
    expect(retentionExpiry("SECURITY", now).toISOString()).toBe("2028-10-15T12:00:00.000Z");
    expect(retentionExpiry("SUPPORT", now).toISOString()).toBe("2028-10-15T12:00:00.000Z");
    expect(retentionExpiry("CASE", now).toISOString()).toBe("2033-10-15T12:00:00.000Z");
    expect(retentionExpiry("DELETION_AUDIT", now).toISOString()).toBe("2033-10-15T12:00:00.000Z");
    expect(retentionExpiry("EXPORT", now).getTime() - now.getTime()).toBe(30 * DAY_MS);
    expect(() => retentionExpiry("CASE", new Date("invalid"))).toThrow();
  });
  it("never expires processing receipts and denies both lookup capabilities at 90 days", () => {
    const request = { status: "COMPLETED", completedAt: now };
    expect(receiptExpired(request, new Date(now.getTime() + 90 * DAY_MS - 1))).toBe(false);
    expect(receiptExpired(request, new Date(now.getTime() + 90 * DAY_MS))).toBe(true);
    expect(receiptExpired(request, new Date(now.getTime() + 90 * DAY_MS))).toBe(true);
    expect(request.completedAt).toEqual(now); // audit is not removed by denial
    expect(receiptExpired({ status: "PROCESSING", completedAt: null }, new Date("2040-01-01"))).toBe(false);
  });
  it("scopes active, expired, renewed, released and court/regulatory holds to records", () => {
    const base: ScopedHold = { resourceType: "UtilityTransaction", resourceId: "fixture", kind: "INTERNAL", startedAt: new Date("2025-10-15T12:00:00Z"),
      nextReviewAt: new Date("2026-01-13"), expiresAt: now, releasedAt: null };
    expect(isHeld([], base.resourceType, base.resourceId, now)).toBe(false);
    expect(holdActive(base, now)).toBe(false);
    const renewed = { ...base, expiresAt: addMonths(now, 12) };
    expect(holdActive(renewed, now)).toBe(true);
    expect(isHeld([renewed], base.resourceType, "unrelated", now)).toBe(false);
    expect(holdActive({ ...renewed, releasedAt: now }, now)).toBe(false);
    for (const kind of ["LEGAL", "COURT", "REGULATORY"]) expect(holdActive({ ...base, kind, expiresAt: null }, new Date("2040-01-01"))).toBe(true);
  });
  it("uses real model fields and enum statuses rather than invented provider states", () => {
    for (const source of RETENTION_SOURCES) {
      const model = Prisma.dmmf.datamodel.models.find(m => m.name === source.model)!;
      expect(model).toBeDefined(); expect(model.fields.some(f => f.name === source.trigger && f.type === "DateTime")).toBe(true);
      for (const [field, filter] of Object.entries(source.where ?? {})) {
        const spec = model.fields.find(f => f.name === field)!; expect(spec).toBeDefined();
        if (spec.kind !== "enum") continue;
        const values = Prisma.dmmf.datamodel.enums.find(e => e.name === spec.type)!.values.map(v => v.name);
        const actual = typeof filter === "string" ? [filter] : (filter as { in?: string[] }).in ?? [];
        actual.forEach(v => expect(values).toContain(v));
      }
    }
  });
});
