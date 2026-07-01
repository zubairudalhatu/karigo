import { Logger } from "@nestjs/common";
import { MockEmailProvider } from "./mock-email.provider";

describe("MockEmailProvider", () => {
  afterEach(() => jest.restoreAllMocks());

  it("masks the recipient and does not log message bodies or metadata", async () => {
    const log = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    const provider = new MockEmailProvider();

    await provider.sendEmail({
      to: "synthetic.user@example.test",
      subject: "Operational update",
      htmlBody: "<p>Private body</p>",
      textBody: "Private body",
      metadata: { privateReference: "private-ref" }
    });

    const output = log.mock.calls.flat().join(" ");
    expect(output).toContain("sy***@example.test");
    expect(output).not.toContain("synthetic.user@example.test");
    expect(output).not.toContain("Private body");
    expect(output).not.toContain("private-ref");
  });
});
