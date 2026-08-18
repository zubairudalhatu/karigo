import { customerAddressServiceArea, customerHasServiceAreaAddress } from "./customer-address-service-area";

describe("Customer address service-area resolution", () => {
  it.each([
    ["Abuja", "FCT"],
    ["Abuja", "Federal Capital Territory"],
    ["Abuja", "Federal Capital Territory (FCT)"]
  ])("resolves %s / %s to Abuja", (city, state) => {
    expect(customerAddressServiceArea({ city, state })).toBe("ABUJA");
  });

  it.each([
    ["Kano", "KANO"],
    ["Kano", "Kano"],
    ["Kano", "Kano State"]
  ])("resolves %s / %s to Kano", (city, state) => {
    expect(customerAddressServiceArea({ city, state })).toBe("KANO");
  });

  it("uses valid coordinates when legacy text is not resolvable", () => {
    expect(customerAddressServiceArea({ city: "Municipal", state: "Nigeria", latitude: "9.0765", longitude: "7.3986" })).toBe("ABUJA");
    expect(customerAddressServiceArea({ city: "Metropolitan", state: "Nigeria", latitude: 12.0022, longitude: 8.592 })).toBe("KANO");
  });

  it("does not allow contradictory state text to override the selected city", () => {
    expect(customerAddressServiceArea({ city: "Abuja", state: "KANO" })).toBeNull();
    expect(customerAddressServiceArea({ city: "Kano", state: "FCT" })).toBeNull();
  });

  it("accepts any saved address and does not require the default address", () => {
    expect(customerHasServiceAreaAddress([
      { city: "Lagos", state: "LAGOS" },
      { city: "Abuja", state: "FCT" }
    ], "ABUJA")).toBe(true);
  });
});
