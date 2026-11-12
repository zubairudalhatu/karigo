import { PartnerDeletionController } from "./partner-deletion.controller";
import { AccountDeletionService } from "./account-deletion.service";
import { PartnerPrincipal } from "../auth/partner-session";

it("does not erase a newly signed-in account using a previous account's confirmation", async () => {
  const write = jest.fn();
  const controller = new PartnerDeletionController({ requestPartnerPermanent: write } as unknown as AccountDeletionService);
  await expect(controller.request({ id: "new-account" } as PartnerPrincipal, {
    expectedUserId: "previous-account", confirmation: "DELETE", receiptToken: "a".repeat(43)
  })).rejects.toThrow("Account changed");
  expect(write).not.toHaveBeenCalled();
});
