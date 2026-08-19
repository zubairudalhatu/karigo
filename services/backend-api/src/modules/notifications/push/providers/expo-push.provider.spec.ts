import { ConfigService } from "@nestjs/config";
import { ExpoPushProvider } from "./expo-push.provider";

describe("ExpoPushProvider", () => {
  const config = {
    get: jest.fn((key: string, fallback?: string) => key === "EXPO_ACCESS_TOKEN" ? "test-access-token" : fallback)
  };
  const provider = new ExpoPushProvider(config as unknown as ConfigService);

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("sends high-priority safe assignment identifiers without customer data", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ status: "ok", id: "ticket-1" }] })
    } as Response);

    await expect(provider.sendPushNotification({
      toDeviceToken: "ExponentPushToken[synthetic_device_token]",
      title: "New KariGO Ride",
      body: "Open KariGO Captain to review it.",
      data: { type: "RIDER_ASSIGNED", entityType: "TaxiTrip", entityId: "trip-id" },
      metadata: { event: "RIDE_ASSIGNED", route: "/tabs/dashboard" }
    })).resolves.toEqual({ accepted: true, provider: "expo" });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body))[0];
    expect(payload).toMatchObject({
      priority: "high",
      channelId: "captain-assignments",
      data: { type: "RIDER_ASSIGNED", entityType: "TaxiTrip", entityId: "trip-id" }
    });
    expect(JSON.stringify(payload)).not.toContain("customer");
    expect((request.headers as Record<string, string>).authorization).toBe("Bearer test-access-token");
  });

  it("rejects malformed device tokens without making a provider request", async () => {
    const fetchMock = jest.spyOn(global, "fetch");
    await expect(provider.sendPushNotification({
      toDeviceToken: "invalid",
      title: "Assignment",
      body: "Open the app"
    })).resolves.toEqual({ accepted: false, provider: "expo" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
