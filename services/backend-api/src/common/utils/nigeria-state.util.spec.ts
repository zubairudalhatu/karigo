import { canonicalNigeriaStateCode } from "./nigeria-state.util";

describe("canonicalNigeriaStateCode", () => {
  it.each([
    ["FCT", "FCT"],
    ["Federal Capital Territory", "FCT"],
    ["Federal Capital Territory (FCT)", "FCT"],
    ["Kano", "KANO"],
    ["Kano State", "KANO"],
    ["Akwa Ibom State", "AKWA_IBOM"]
  ])("normalizes %s to %s", (value, expected) => {
    expect(canonicalNigeriaStateCode(value)).toBe(expected);
  });

  it("fails safely for non-state text", () => {
    expect(canonicalNigeriaStateCode("Nigeria")).toBeNull();
  });
});
