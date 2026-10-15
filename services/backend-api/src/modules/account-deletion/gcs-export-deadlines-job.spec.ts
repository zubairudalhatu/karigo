import { executeAndReport, metadataToken, reportToBackend, runSyntheticExportJob } from "./gcs-export-deadlines-job";

describe("Independent synthetic-only export job", () => {
  const now = new Date("2026-10-15T12:00:00Z");
  it("reports sanitized failure even when the controller cannot complete", async () => {
    const report = jest.fn().mockResolvedValue(undefined);
    await executeAndReport("https://backend.test/api/v1/internal/retention-alerts/report", async () => { throw new Error("private/path token must-not-leak"); }, report, now);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report.mock.calls[0][0]).toMatchObject({ success: false, failureCode: "CONTROLLER_FAILED", overdue: 0 });
    expect(JSON.stringify(report.mock.calls)).not.toContain("must-not-leak");
  });
  it("uses metadata ID token and pinned audience without carrying the email secret", async () => {
    const fetcher = jest.fn().mockResolvedValueOnce({ ok: true, text: async () => "fixture-identity" }).mockResolvedValueOnce({ ok: true });
    const endpoint = "https://backend.test/api/v1/internal/retention-alerts/report";
    await reportToBackend({ success: true }, endpoint, fetcher);
    expect(fetcher.mock.calls[0][0]).toContain(encodeURIComponent(endpoint));
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe("Bearer fixture-identity");
    expect(fetcher.mock.calls[1][1].redirect).toBe("error");
  });
  it("refuses insecure report destinations before obtaining identity", async () => {
    const fetcher = jest.fn();
    await expect(reportToBackend({}, "http://backend.test/api/v1/internal/retention-alerts/report", fetcher)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("can scan/dispose synthetic fixtures only and awaits audit/heartbeat delivery", async () => {
    const item = { name: "temporary/v1/synthetic-verification/fixture.json", generation: "1", metageneration: "1", timeCreated: "2026-09-15T12:00:00Z" };
    const fetcher = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ items: [item] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => item }).mockResolvedValueOnce({ status: 204 });
    const log = jest.fn().mockResolvedValue(undefined);
    const result = await runSyntheticExportJob({ token: async () => "synthetic", fetcher, now, log });
    expect(result.deleted).toBe(1); expect(fetcher.mock.calls[0][0]).toContain("prefix=temporary%2Fv1%2Fsynthetic-verification%2F");
    expect(log).toHaveBeenCalledWith("INFO", expect.objectContaining({ kind: "export_disposal" }));
    expect(log).toHaveBeenCalledWith("INFO", expect.objectContaining({ kind: "export_deadline_heartbeat", syntheticOnly: true }));
    expect(JSON.stringify(log.mock.calls)).not.toContain(item.name);
  });
  it("rejects a real-prefix object even if a list response contains one", async () => {
    const fetcher = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [{ name: "temporary/v1/real.json", generation: "1", metageneration: "1", timeCreated: "2026-09-01" }] }) });
    const result = await runSyntheticExportJob({ token: async () => "synthetic", fetcher, now, log: async () => undefined });
    expect(result.failed).toBe(1); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("does not mark a run successful if heartbeat delivery fails", async () => {
    const fetcher = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });
    await expect(runSyntheticExportJob({ token: async () => "synthetic", fetcher, now,
      log: async () => { throw new Error("synthetic sink down"); } })).rejects.toThrow("sink down");
  });
  it("uses only the fixed metadata identity endpoint, with no key-file fallback", async () => {
    const fetcher = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: "synthetic" }) });
    expect(await metadataToken(fetcher)).toBe("synthetic");
    expect(fetcher.mock.calls[0][0]).toBe("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token");
  });
});
