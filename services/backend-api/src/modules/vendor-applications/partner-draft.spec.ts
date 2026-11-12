import { partnerDraft } from "@karigo/shared-types";

describe("Credential-free Partner drafts", () => {
  it.each(["password", "passwordConfirmation", "otp", "verificationCode", "accessToken", "refreshToken", "session", "apiKey", "resetToken", "verificationTicket", "challenge", "__proto__"])("drops/rejects forbidden field %s", field => {
    const input = JSON.parse(JSON.stringify({ businessName: "Synthetic business", [field]: "synthetic-secret" }));
    expect(JSON.stringify(partnerDraft(input))).not.toContain("synthetic-secret");
    expect(() => partnerDraft(input, true)).toThrow();
  });
  it("rejects nested payloads and wrong types rather than retaining arbitrary JSON", () => {
    expect(() => partnerDraft({ businessName: { password: "secret" } }, true)).toThrow();
    expect(() => partnerDraft({ declarationAccepted: "yes" }, true)).toThrow();
    expect(() => partnerDraft([], true)).toThrow();
  });
  it("retains allowed business and consent fields only", () => {
    expect(partnerDraft({ businessName: "Business", declarationAccepted: true }, true)).toEqual({ businessName: "Business", declarationAccepted: true });
  });
});
