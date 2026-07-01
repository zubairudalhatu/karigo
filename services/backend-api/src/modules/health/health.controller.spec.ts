import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("reports the API as healthy", () => {
    const response = new HealthController().check();

    expect(response.message).toBe("KariGO API is healthy");
    expect(response.data.service).toBe("backend-api");
    expect(response.data.status).toBe("ok");
    expect(new Date(response.data.timestamp).toString()).not.toBe("Invalid Date");
  });
});

