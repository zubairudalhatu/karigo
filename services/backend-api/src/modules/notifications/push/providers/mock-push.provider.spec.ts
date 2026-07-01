import { Logger } from "@nestjs/common";
import { MockPushProvider } from "./mock-push.provider";

describe("MockPushProvider", () => {
  afterEach(() => jest.restoreAllMocks());

  it("masks device tokens and omits payload data from logs", async () => {
    const log = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    const provider = new MockPushProvider();

    await provider.sendPushNotification({
      toDeviceToken: "ExponentPushToken[synthetic-device-token]",
      title: "Operational update",
      body: "Private body",
      data: { privateReference: "private-ref" }
    });

    const output = log.mock.calls.flat().join(" ");
    expect(output).not.toContain("ExponentPushToken[synthetic-device-token]");
    expect(output).not.toContain("Private body");
    expect(output).not.toContain("private-ref");
  });
});
