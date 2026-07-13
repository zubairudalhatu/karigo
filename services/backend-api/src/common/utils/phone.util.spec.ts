import { normalizePhoneNumber, NIGERIAN_PHONE_PATTERN } from "./phone.util";

describe("Nigerian phone normalization", () => {
  it.each([
    ["08012345678", "+2348012345678"],
    ["07012345678", "+2347012345678"],
    ["08112345678", "+2348112345678"],
    ["09012345678", "+2349012345678"],
    ["09112345678", "+2349112345678"],
    ["080 1234 5678", "+2348012345678"],
    ["2348012345678", "+2348012345678"],
    ["+2348012345678", "+2348012345678"]
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhoneNumber(input)).toBe(expected);
    expect(expected).toMatch(NIGERIAN_PHONE_PATTERN);
  });

  it.each(["12345", "+2346012345678", "+234801234567"])("rejects invalid Nigerian mobile shape %s", (input) => {
    expect(normalizePhoneNumber(input)).not.toMatch(NIGERIAN_PHONE_PATTERN);
  });
});
