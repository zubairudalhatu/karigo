import { BadRequestException, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { PaybetaUtilityProvider } from "./providers/paybeta-utility.provider";
import { GotvAcceptanceService } from "./gotv-acceptance.service";

function setup() {
  const prisma = {
    utilityTransaction: { findUnique: jest.fn().mockResolvedValue({ status: "SUCCESSFUL", customer: { id: "owner-customer", userId: "owner" } }), create: jest.fn(), update: jest.fn() },
    customerWallet: { findUnique: jest.fn().mockResolvedValue({ availableBalance: "2500.00" }), update: jest.fn() },
    customerWalletLedgerEntry: { create: jest.fn() }, $transaction: jest.fn()
  };
  const paybeta = {
    isConfigured: jest.fn().mockReturnValue(true),
    validateCustomer: jest.fn().mockResolvedValue({ isValid: true, recipientName: "Provider test name" }),
    listProducts: jest.fn().mockResolvedValue([{ code: "GOHAN", name: "GOtv Smallie - monthly", amountKobo: 190000 }]),
    purchase: jest.fn(), quote: jest.fn(), checkStatus: jest.fn()
  };
  const service = new GotvAcceptanceService(prisma as unknown as PrismaService, paybeta as unknown as PaybetaUtilityProvider, new ConfigService({ APP_ENV: "production", UTILITY_CONVENIENCE_FEE_KOBO: 0, UTILITIES_CABLE_PROVIDER: "accelerate" }));
  return { service, prisma, paybeta };
}

describe("owner-only read-only GOtv acceptance", () => {
  beforeEach(() => jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-11T02:00:00Z")));
  afterEach(() => jest.restoreAllMocks());

  it("denies other customers before any provider or wallet access", async () => {
    const { service, prisma, paybeta } = setup();
    await expect(service.validate("ordinary", "1234567890")).rejects.toBeInstanceOf(NotFoundException);
    expect(paybeta.validateCustomer).not.toHaveBeenCalled();
    expect(paybeta.listProducts).not.toHaveBeenCalled();
    expect(prisma.customerWallet.findUnique).not.toHaveBeenCalled();
  });
  it("fails closed without the accepted owner receipt or after expiry", async () => {
    const { service, prisma } = setup();
    prisma.utilityTransaction.findUnique.mockResolvedValueOnce(null);
    await expect(service.access("owner")).rejects.toBeInstanceOf(NotFoundException);
    jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-18T00:00:00Z"));
    await expect(service.access("owner")).rejects.toBeInstanceOf(NotFoundException);
  });
  it("requires configured Production Paybeta", async () => {
    const { service, paybeta } = setup(); paybeta.isConfigured.mockReturnValue(false);
    await expect(service.access("owner")).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(paybeta.isConfigured).toHaveBeenCalledWith("production");
  });
  it("validates through explicit Paybeta GOtv and hides IUC/product codes", async () => {
    const { service, paybeta } = setup();
    const account = await service.validate("owner", "1234567890");
    expect(account.recipientName).toBe("Provider test name");
    expect(account.recipient).toBe("******7890");
    expect(account.products[0]).toMatchObject({ provider: "GOtv", currency: "NGN", amountKobo: 190000 });
    expect(JSON.stringify(account)).not.toContain("GOHAN");
    expect(JSON.stringify(account)).not.toContain("1234567890");
    expect(paybeta.validateCustomer).toHaveBeenCalledWith(expect.objectContaining({ serviceType: "CABLE_TV", providerCode: "gotv" }));
  });
  it("does not fabricate names or return verified identity on validation failure", async () => {
    const { service, paybeta } = setup();
    paybeta.validateCustomer.mockResolvedValueOnce({ isValid: true });
    expect((await service.validate("owner", "1234567890")).recipientName).toBeNull();
    paybeta.validateCustomer.mockResolvedValueOnce({ isValid: false, recipientName: "Unverified" });
    await expect(service.validate("owner", "1234567890")).rejects.toBeInstanceOf(BadRequestException);
  });
  it("quotes using freshly fetched prices while normal Cable routing remains accelerate", async () => {
    const { service, prisma, paybeta } = setup();
    const account = await service.validate("owner", "1234567890");
    paybeta.listProducts.mockResolvedValueOnce([{ code: "GOHAN", name: "Updated name", amountKobo: 200000 }]);
    const quote = await service.quote("owner", "1234567890", account.products[0].id);
    expect(quote).toMatchObject({ provider: "GOtv", providerMode: "paybeta", recipientName: "Provider test name", recipient: "******7890", amountKobo: 200000, convenienceFeeKobo: 0, totalKobo: 200000, walletBeforeKobo: 250000, projectedWalletAfterKobo: 50000, readOnly: true, paymentAllowed: false });
    expect(quote.product.name).toBe("Updated name");
    expect(prisma.utilityTransaction.create).not.toHaveBeenCalled();
    expect(prisma.utilityTransaction.update).not.toHaveBeenCalled();
    expect(prisma.customerWallet.update).not.toHaveBeenCalled();
    expect(prisma.customerWalletLedgerEntry.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(paybeta.purchase).not.toHaveBeenCalled();
    expect(paybeta.quote).not.toHaveBeenCalled();
    expect(paybeta.checkStatus).not.toHaveBeenCalled();
  });
  it("rejects removed products and repeat quotes never create purchases", async () => {
    const { service, prisma, paybeta } = setup();
    const account = await service.validate("owner", "1234567890");
    await service.quote("owner", "1234567890", account.products[0].id);
    await service.quote("owner", "1234567890", account.products[0].id);
    await expect(service.quote("owner", "1234567890", "invalid-product")).rejects.toBeInstanceOf(BadRequestException);
    expect(paybeta.purchase).not.toHaveBeenCalled();
    expect(prisma.utilityTransaction.create).not.toHaveBeenCalled();
    expect(prisma.customerWalletLedgerEntry.create).not.toHaveBeenCalled();
  });
  it("returns safe provider errors without credentials or payloads", async () => {
    const { service, paybeta } = setup();
    paybeta.validateCustomer.mockRejectedValueOnce(new Error("PRIVATE_PROVIDER_PAYLOAD"));
    await expect(service.validate("owner", "1234567890")).rejects.toThrow("GOtv account validation is temporarily unavailable.");
  });
});
