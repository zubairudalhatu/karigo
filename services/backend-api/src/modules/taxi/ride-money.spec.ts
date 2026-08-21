import { formatKobo, formatNaira } from "@karigo/shared-types";

describe("Ride money-unit contract", () => {
  it.each([
    [0, "NGN 0.00"],
    [100, "NGN 1.00"],
    [17500, "NGN 175.00"],
    [22400, "NGN 224.00"],
    [1750000, "NGN 17,500.00"]
  ])("formats %i kobo exactly once", (kobo, expected) => {
    expect(formatKobo(kobo)).toBe(expected);
  });

  it("does not divide an already-naira earnings value", () => {
    expect(formatNaira(175)).toBe("NGN 175.00");
    expect(formatNaira("17500.50")).toBe("NGN 17,500.50");
  });
});
