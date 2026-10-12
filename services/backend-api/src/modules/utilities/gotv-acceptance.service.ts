import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UtilityServiceType, UtilityTransactionStatus } from "@prisma/client";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";
import { UtilitiesService } from "./utilities.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PaybetaCatalogueProduct, PaybetaUtilityProvider } from "./providers/paybeta-utility.provider";

// Temporary owner-only read gate. Resolve ownership from the already accepted
// production receipt; no customer identifiers or credentials are embedded here.
const OWNER_RECEIPT = "KGO-UTIL-1791675364743-79934E";
const EXPIRES_AT = Date.parse("2026-10-18T00:00:00Z");

@Injectable()
export class GotvAcceptanceService {
  constructor(private readonly prisma: PrismaService, private readonly paybeta: PaybetaUtilityProvider, private readonly config: ConfigService, private readonly utilities: UtilitiesService) {}

  private async owner(userId: string) {
    // The live service retains APP_ENV=staging historically. Scope by verified
    // receipt ownership and Production Paybeta configuration, not that label.
    if (Date.now() >= EXPIRES_AT) throw new NotFoundException();
    const receipt = await this.prisma.utilityTransaction.findUnique({
      where: { reference: OWNER_RECEIPT },
      select: { status: true, customer: { select: { id: true, userId: true } } }
    });
    if (!receipt || receipt.status !== UtilityTransactionStatus.SUCCESSFUL || receipt.customer.userId !== userId) throw new NotFoundException();
    if (!this.paybeta.isConfigured("production")) throw new ServiceUnavailableException("Cable validation is temporarily unavailable.");
    return receipt.customer;
  }

  async access(userId: string) {
    await this.owner(userId);
    return { provider: "GOtv", readOnly: true as const, paymentAllowed: false as const };
  }

  private id(code: string) { return createHash("sha256").update(`gotv:${code}`).digest("hex"); }
  private publicProduct(product: PaybetaCatalogueProduct) {
    return { id: this.id(product.code), name: product.name, amountKobo: product.amountKobo, provider: "GOtv", currency: "NGN" };
  }

  private async account(recipient: string) {
    if (!/^\d{6,20}$/.test(recipient)) throw new BadRequestException("Enter a valid GOtv IUC.");
    let validation;
    try { validation = await this.paybeta.validateCustomer({ serviceType: UtilityServiceType.CABLE_TV, providerCode: "gotv", recipient, amountKobo: 0 }); }
    catch { throw new ServiceUnavailableException("GOtv account validation is temporarily unavailable."); }
    if (!validation.isValid) throw new BadRequestException("GOtv could not verify this account.");
    return { recipientName: validation.recipientName ?? null, recipient: `${"*".repeat(recipient.length - 4)}${recipient.slice(-4)}`, recipientVerified: true as const };
  }

  private async products() {
    try {
      const products = await this.paybeta.listProducts(UtilityServiceType.CABLE_TV, "gotv");
      if (!products.length) throw new Error("EMPTY_CATALOGUE");
      return products;
    } catch { throw new ServiceUnavailableException("GOtv bouquets are temporarily unavailable."); }
  }

  async validate(userId: string, recipient: string) {
    await this.owner(userId);
    const account = await this.account(recipient);
    const products = await this.products();
    return { ...account, provider: "GOtv", products: products.map(product => this.publicProduct(product)), readOnly: true as const, paymentAllowed: false as const };
  }

  async quote(userId: string, recipient: string, productId: string) {
    const customer = await this.owner(userId);
    const account = await this.account(recipient);
    const product = (await this.products()).find(product => this.id(product.code) === productId);
    if (!product) throw new BadRequestException("Select an available GOtv bouquet.");
    const fee = Number(this.config.get("UTILITY_CONVENIENCE_FEE_KOBO", 0));
    if (!Number.isSafeInteger(fee) || fee < 0) throw new ServiceUnavailableException("Cable quote is temporarily unavailable.");
    const wallet = await this.prisma.customerWallet.findUnique({ where: { customerId: customer.id }, select: { availableBalance: true } });
    const walletBeforeKobo = Math.round(Number(wallet?.availableBalance ?? 0) * 100);
    const totalKobo = product.amountKobo + fee;
    // Only SELECTs and Paybeta inquiry/catalogue endpoints. Never call quote(),
    // purchase(), reconciliation, ledger writes or wallet reservation here.
    const balance = await this.paybeta.getBalance();
    const jolli = product.code === "GOTVNJ2" && product.name === "GOtv Jolli Bouquet" && product.amountKobo === 580000;
    const idempotencyKey = `gotv-jolli-acceptance-${this.id(customer.id).slice(0, 32)}`;
    const expiresAt = Date.now() + 5 * 60_000;
    const paymentAllowed = jolli && Boolean(account.recipientName) && walletBeforeKobo >= totalKobo && balance.availableBalanceKobo >= product.amountKobo + 10000;
    const paymentToken = paymentAllowed ? this.sign({ userId, recipientHash: this.id(recipient), productId, amountKobo: product.amountKobo, fee, expiresAt, idempotencyKey }) : null;
    return { ...account, quoteReference: `KGO-GOTV-QUOTE-${randomUUID()}`, provider: "GOtv", providerMode: "paybeta", product: this.publicProduct(product), currency: "NGN", amountKobo: product.amountKobo, convenienceFeeKobo: fee, totalKobo, walletBeforeKobo, projectedWalletAfterKobo: walletBeforeKobo - totalKobo, providerAvailableBalanceKobo: balance.availableBalanceKobo, expiresAt, idempotencyKey, paymentToken, readOnly: true as const, paymentAllowed };
  }

  private sign(payload: Record<string, unknown>) {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = createHmac("sha256", this.config.getOrThrow<string>("JWT_SECRET")).update(`gotv-acceptance:${body}`).digest("base64url");
    return `${body}.${signature}`;
  }

  async pay(userId: string, recipient: string, paymentToken: string) {
    await this.owner(userId);
    let payload: Record<string, unknown>;
    try {
      const [body, signature, extra] = paymentToken.split(".");
      if (!body || !signature || extra) throw new Error();
      payload = JSON.parse(Buffer.from(body, "base64url").toString());
      const expected = this.sign(payload).split(".")[1];
      const actualBytes = Buffer.from(signature), expectedBytes = Buffer.from(expected);
      if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) throw new Error();
      if (payload.userId !== userId || payload.recipientHash !== this.id(recipient) || typeof payload.expiresAt !== "number" || payload.expiresAt <= Date.now()) throw new Error();
    } catch { throw new BadRequestException("Refresh and review your GOtv quote before confirming payment."); }
    const customer = await this.owner(userId);
    const key = `gotv-jolli-acceptance-${this.id(customer.id).slice(0, 32)}`;
    if (payload.idempotencyKey !== key) throw new BadRequestException("Invalid acceptance reference.");
    // Replay returns the existing receipt. It must never call validation or vend again.
    const existing = await this.utilities.controlledGotvResult(userId, key);
    if (existing) return existing;
    const refreshed = await this.quote(userId, recipient, String(payload.productId));
    if (!refreshed.paymentAllowed || payload.amountKobo !== refreshed.amountKobo || payload.fee !== refreshed.convenienceFeeKobo) throw new BadRequestException("GOtv quote changed or funding is insufficient. Review again before payment.");
    return this.utilities.payControlledGotv(userId, { recipient, recipientName: refreshed.recipientName!, amountKobo: refreshed.amountKobo, feeKobo: refreshed.convenienceFeeKobo, idempotencyKey: key });
  }
}
