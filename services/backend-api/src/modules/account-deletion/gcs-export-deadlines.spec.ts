import { enforceExportDeadlines, ExportDeadlineEvidence, ExportHttpError, ExportObject, ExportStorage, GcsExportStorage } from "./gcs-export-deadlines";

const now = new Date("2026-10-15T12:00:00Z");
const object = (days: number, changes: Partial<ExportObject> = {}): ExportObject => ({ name: "temporary/v1/synthetic.json",
  generation: "123", metageneration: "2", timeCreated: new Date(now.getTime() - days * 86400000).toISOString(), ...changes });
function fixture(items: ExportObject[]) {
  const storage: jest.Mocked<ExportStorage> = { list: jest.fn().mockResolvedValue({ items }), get: jest.fn().mockImplementation(async name => items.find(x => x.name === name) ?? null), remove: jest.fn().mockResolvedValue(204) };
  const evidence: jest.Mocked<ExportDeadlineEvidence> = { audit: jest.fn().mockResolvedValue(undefined), alert: jest.fn().mockResolvedValue(undefined) };
  return { storage, evidence };
}
describe("Managed GCS export deadline control (synthetic only)", () => {
  it("starts disposal at day 29, warns at day 28 and never deletes early", async () => {
    for (const [days, eligible, approaching] of [[27.99, 0, 0], [28, 0, 1], [29, 1, 0]]) {
      const { storage, evidence } = fixture([object(days)]);
      const result = await enforceExportDeadlines(storage, evidence, { now, dispose: true });
      expect(result.eligible).toBe(eligible); expect(result.approaching).toBe(approaching);
      expect(storage.remove).toHaveBeenCalledTimes(eligible);
      if (eligible) expect(evidence.audit).toHaveBeenCalledWith(expect.objectContaining({ result: "DELETED" }));
    }
  });
  it("defaults to dry-run and reports an unheld 30-day deadline breach", async () => {
    const { storage, evidence } = fixture([object(30)]);
    const result = await enforceExportDeadlines(storage, evidence, { now });
    expect(result).toMatchObject({ dryRun: true, overdue: 1 }); expect(storage.remove).not.toHaveBeenCalled();
    expect(evidence.alert).toHaveBeenCalled();
  });
  it.each([{ temporaryHold: true }, { eventBasedHold: true }, { retention: { retainUntilTime: "2030-01-01" } }])("respects fresh object hold %j", async changes => {
    const { storage, evidence } = fixture([object(31)]); storage.get.mockResolvedValue(object(31, changes));
    const result = await enforceExportDeadlines(storage, evidence, { now, dispose: true });
    expect(result).toMatchObject({ held: 1, deleted: 0, overdue: 0 }); expect(storage.remove).not.toHaveBeenCalled();
  });
  it("does not repeat a concurrent hold/precondition rejection and alerts", async () => {
    const { storage, evidence } = fixture([object(30)]); storage.remove.mockResolvedValue(412);
    const result = await enforceExportDeadlines(storage, evidence, { now, dispose: true });
    expect(result).toMatchObject({ failed: 1, overdue: 1 }); expect(storage.remove).toHaveBeenCalledTimes(1);
  });
  it("bounds transient deletion retries and handles prior disposal idempotently", async () => {
    const { storage, evidence } = fixture([object(30)]); storage.remove.mockResolvedValueOnce(503).mockResolvedValueOnce(429).mockResolvedValueOnce(404);
    const sleep = jest.fn().mockResolvedValue(undefined);
    const result = await enforceExportDeadlines(storage, evidence, { now, dispose: true, sleep });
    expect(storage.remove).toHaveBeenCalledTimes(3); expect(result).toMatchObject({ alreadyAbsent: 1, failed: 0 });
    expect(evidence.audit).toHaveBeenCalledWith(expect.objectContaining({ result: "ALREADY_ABSENT" }));
  });
  it("fails safely on missing audit custody and never logs an object name", async () => {
    const { storage, evidence } = fixture([object(30)]); evidence.audit.mockRejectedValue(new Error("private provider payload"));
    const result = await enforceExportDeadlines(storage, evidence, { now, dispose: true });
    expect(result.failed).toBe(1); expect(result.overdue).toBe(1); // verification outstanding
    expect(JSON.stringify(result)).not.toContain("synthetic.json");
    expect(JSON.stringify(evidence.audit.mock.calls)).not.toContain("synthetic.json");
    expect(JSON.stringify(evidence.alert.mock.calls)).not.toContain("private provider payload");
  });
  it("refuses unknown paths/creation dates and incomplete inventories", async () => {
    const { storage, evidence } = fixture([object(30, { name: "unrelated/fixture" }), object(30, { timeCreated: "invalid" })]);
    storage.list.mockResolvedValue({ items: [object(30, { timeCreated: "invalid" })], nextPageToken: "repeated" });
    const result = await enforceExportDeadlines(storage, evidence, { now, dispose: true });
    expect(result.complete).toBe(false); expect(result.invalid).toBeGreaterThan(0); expect(storage.remove).not.toHaveBeenCalled();
  });
  it("guards the transport against out-of-prefix deletes before requesting a token", async () => {
    const token = jest.fn(); const storage = new GcsExportStorage(token);
    await expect(storage.remove(object(30, { name: "other/fixture" }))).rejects.toThrow("INVALID_EXPORT_TARGET");
    await expect(storage.remove(object(30, { generation: "" }))).rejects.toThrow("INVALID_EXPORT_PRECONDITION");
    expect(token).not.toHaveBeenCalled();
  });
  it("never treats storage outages or alert delivery failures as success", async () => {
    const { storage, evidence } = fixture([]); storage.list.mockRejectedValue(new ExportHttpError(403));
    evidence.alert.mockRejectedValue(new Error("alert unavailable"));
    await expect(enforceExportDeadlines(storage, evidence, { now })).rejects.toThrow("alert unavailable");
    expect(storage.list).toHaveBeenCalledTimes(1);
  });
  it("pins the bucket/prefix and atomically guards generation and metadata on DELETE", async () => {
    const fetcher = jest.fn().mockResolvedValue({ status: 204 });
    const storage = new GcsExportStorage(async () => "synthetic-token-not-a-credential", fetcher);
    await storage.remove(object(29));
    expect(fetcher.mock.calls[0][0]).toContain("/b/karigo-retention-exports-private/o/temporary%2Fv1%2Fsynthetic.json?");
    expect(fetcher.mock.calls[0][0]).toContain("ifGenerationMatch=123&ifMetagenerationMatch=2");
    expect(fetcher.mock.calls[0][1].method).toBe("DELETE");
  });
});
