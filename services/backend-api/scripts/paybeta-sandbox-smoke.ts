import { ConfigService } from "@nestjs/config";
import { UtilityServiceType, UtilityTransactionStatus } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve } from "path";
import { PaybetaUtilityProvider } from "../src/modules/utilities/providers/paybeta-utility.provider";

type SafeResult = {
  attempted: boolean;
  passed: boolean;
  status?: UtilityTransactionStatus;
  providerStatus?: string;
  blocker?: string;
};

const SANDBOX_URL = "https://api.sandbox.paybeta.ng";
const CONFIRMATION = "TASK-KARIOGO-PAYBETA-SANDBOX";

function parseEnv(path: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    result[key] = value;
  }
  return result;
}

function safeError(error: unknown, protectedValues: string[]): string {
  let message = error instanceof Error ? error.message : "unknown_error";
  for (const value of protectedValues) {
    if (value) message = message.split(value).join("[REDACTED]");
  }
  return message.replace(/https?:\/\/[^\s]+/g, "[URL]").slice(0, 180);
}

function purchasePassed(status: UtilityTransactionStatus): boolean {
  return status === UtilityTransactionStatus.SUCCESSFUL || status === UtilityTransactionStatus.PROCESSING;
}

async function inspectDataProductShape(apiKey: string, service: string, method: "GET" | "POST" = "POST") {
  const response = await fetch(`${SANDBOX_URL}/v2/data-bundle/list${method === "GET" ? `?service=${encodeURIComponent(service)}` : ""}`, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json", "P-API-KEY": apiKey },
    body: method === "POST" ? JSON.stringify({ service }) : undefined
  });
  const payload = await response.json() as Record<string, unknown>;
  const data = payload.data;
  const dataRecord = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
  const packages = dataRecord.packages;
  const first = Array.isArray(packages) && packages.length > 0 && typeof packages[0] === "object"
    ? packages[0] as Record<string, unknown>
    : {};
  return {
    httpStatus: response.status,
    rootStatus: typeof payload.status === "string" ? payload.status : "missing",
    message: typeof payload.message === "string" ? payload.message.slice(0, 160) : "missing",
    rootKeys: Object.keys(payload).sort(),
    dataType: Array.isArray(data) ? "array" : typeof data,
    dataKeys: Object.keys(dataRecord).sort(),
    packageCount: Array.isArray(packages) ? packages.length : null,
    firstPackageKeys: Object.keys(first).sort()
  };
}

async function main() {
  const execute = process.argv.includes("--execute");
  const electricityOnly = process.argv.includes("--electricity-only");
  if (execute && process.env.CONFIRM_PAYBETA_SANDBOX !== CONFIRMATION) {
    throw new Error(`Set CONFIRM_PAYBETA_SANDBOX=${CONFIRMATION} to authorize sandbox purchases`);
  }

  const envPath = resolve(process.env.PAYBETA_SANDBOX_ENV_FILE ?? "");
  const secrets = parseEnv(envPath);
  const apiKey = secrets.PAYBETA_SANDBOX_API_KEY || secrets.PAYBETA_API_KEY;
  if (!apiKey) throw new Error("Sandbox API key is missing from the approved local secret file");

  const config = new ConfigService({
    PAYBETA_BASE_URL: SANDBOX_URL,
    PAYBETA_API_KEY: apiKey,
    PAYBETA_TIMEOUT_MS: 20_000,
    PAYBETA_RETRY_ATTEMPTS: 2,
    PAYBETA_RETRY_DELAY_MS: 250
  });
  const provider = new PaybetaUtilityProvider(config);
  const summary: Record<string, unknown> = {
    environment: "sandbox",
    configured: provider.isConfigured(),
    secretKeyTransmitted: false,
    execute
  };

  const balanceBefore = await provider.getBalance();
  const [airtimeProviders, dataProviders, electricityProviders, cableProviders] = await Promise.all([
    provider.listProviders(UtilityServiceType.AIRTIME),
    provider.listProviders(UtilityServiceType.DATA),
    provider.listProviders(UtilityServiceType.ELECTRICITY),
    provider.listProviders(UtilityServiceType.CABLE_TV)
  ]);
  const dataProvider = dataProviders.find((item) => item.code.includes("mtn")) ?? dataProviders[0];
  const cableProvider = cableProviders.find((item) => item.code === "gotv") ?? cableProviders[0];
  const electricityProvider = electricityProviders.find((item) => item.code.includes("ikeja")) ?? electricityProviders[0];
  const airtimeProvider = airtimeProviders.find((item) => item.code.includes("mtn")) ?? airtimeProviders[0];
  if (!airtimeProvider || !dataProvider || !electricityProvider || !cableProvider) {
    throw new Error("Sandbox provider discovery returned an incomplete utility catalogue");
  }

  const [dataProducts, cableProducts] = await Promise.all([
    provider.listProducts(UtilityServiceType.DATA, dataProvider.code),
    provider.listProducts(UtilityServiceType.CABLE_TV, cableProvider.code)
  ]);
  const dataProduct = [...dataProducts].sort((a, b) => a.amountKobo - b.amountKobo)[0];
  const cableProduct = [...cableProducts].sort((a, b) => a.amountKobo - b.amountKobo)[0];
  if (!dataProduct || !cableProduct) {
    const dataProductShape = !dataProduct ? {
      normalizedCode: await inspectDataProductShape(apiKey, dataProvider.code),
      providerSlug: await inspectDataProductShape(apiKey, dataProvider.code.replace(/_data$/, "-data")),
      sandboxGet: await inspectDataProductShape(apiKey, dataProvider.code, "GET")
    } : undefined;
    console.log(JSON.stringify({
      environment: "sandbox",
      passed: false,
      blocker: "Sandbox product discovery returned an incomplete product catalogue",
      counts: {
        airtimeProviders: airtimeProviders.length,
        dataProviders: dataProviders.length,
        electricityProviders: electricityProviders.length,
        cableProviders: cableProviders.length,
        dataProducts: dataProducts.length,
        cableProducts: cableProducts.length
      },
      dataProductShape
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  const phone = secrets.PAYBETA_SANDBOX_TEST_PHONE || "08138539550";
  const meter = secrets.PAYBETA_SANDBOX_TEST_METER || "0111100049";
  const smartcard = secrets.PAYBETA_SANDBOX_TEST_SMARTCARD || "8072916698";
  const electricityValidation = await provider.validateCustomer({
    serviceType: UtilityServiceType.ELECTRICITY,
    providerCode: electricityProvider.code,
    amountKobo: 50_000,
    recipient: meter,
    meterType: "PREPAID"
  });
  const cableValidation = await provider.validateCustomer({
    serviceType: UtilityServiceType.CABLE_TV,
    providerCode: cableProvider.code,
    productCode: cableProduct.code,
    amountKobo: cableProduct.amountKobo,
    recipient: smartcard
  });

  summary.discovery = {
    airtimeProviders: airtimeProviders.length,
    dataProviders: dataProviders.length,
    electricityProviders: electricityProviders.length,
    cableProviders: cableProviders.length,
    dataProducts: dataProducts.length,
    cableProducts: cableProducts.length
  };
  summary.validation = {
    electricity: electricityValidation.isValid,
    cable: cableValidation.isValid
  };

  if (!execute) {
    summary.balanceReadable = Number.isFinite(balanceBefore.availableBalanceKobo);
    summary.webhook = provider.webhookAuthenticationStatus();
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  if (!electricityValidation.isValid || !cableValidation.isValid) {
    throw new Error("Sandbox customer validation failed; no purchase was attempted");
  }

  const purchases: Array<{
    name: string;
    serviceType: UtilityServiceType;
    input: Parameters<PaybetaUtilityProvider["purchase"]>[0];
  }> = [
    {
      name: "airtime",
      serviceType: UtilityServiceType.AIRTIME,
      input: {
        serviceType: UtilityServiceType.AIRTIME,
        providerCode: airtimeProvider.code,
        amountKobo: 10_000,
        totalKobo: 10_000,
        recipient: phone,
        reference: provider.createReference()
      }
    },
    {
      name: "data",
      serviceType: UtilityServiceType.DATA,
      input: {
        serviceType: UtilityServiceType.DATA,
        providerCode: dataProvider.code,
        productCode: dataProduct.code,
        amountKobo: dataProduct.amountKobo,
        totalKobo: dataProduct.amountKobo,
        recipient: phone,
        reference: provider.createReference()
      }
    },
    {
      name: "electricity",
      serviceType: UtilityServiceType.ELECTRICITY,
      input: {
        serviceType: UtilityServiceType.ELECTRICITY,
        providerCode: electricityProvider.code,
        amountKobo: 200_000,
        totalKobo: 200_000,
        recipient: meter,
        recipientName: electricityValidation.recipientName,
        recipientAddress: electricityValidation.recipientAddress,
        meterType: "PREPAID",
        reference: provider.createReference()
      }
    },
    {
      name: "cable",
      serviceType: UtilityServiceType.CABLE_TV,
      input: {
        serviceType: UtilityServiceType.CABLE_TV,
        providerCode: cableProvider.code,
        productCode: cableProduct.code,
        amountKobo: cableProduct.amountKobo,
        totalKobo: cableProduct.amountKobo,
        recipient: smartcard,
        recipientName: cableValidation.recipientName,
        reference: provider.createReference()
      }
    }
  ];

  const selectedPurchases = electricityOnly
    ? purchases.filter((item) => item.serviceType === UtilityServiceType.ELECTRICITY)
    : purchases;

  const results: Record<string, SafeResult> = {};
  for (const item of selectedPurchases) {
    try {
      const result = await provider.purchase(item.input);
      results[item.name] = {
        attempted: true,
        passed: purchasePassed(result.status),
        status: result.status,
        providerStatus: result.providerStatus
      };
    } catch (error) {
      results[item.name] = {
        attempted: true,
        passed: false,
        blocker: safeError(error, [apiKey, secrets.PAYBETA_SANDBOX_SECRET_KEY])
      };
    }
  }

  const queryTarget = selectedPurchases.find((item) => results[item.name]?.passed) ?? selectedPurchases[0];
  const queried = await provider.checkStatus(queryTarget.input.reference, queryTarget.serviceType);
  const duplicate = await provider.purchase(queryTarget.input);
  const invalidQuery = await provider.checkStatus(provider.createReference(), UtilityServiceType.AIRTIME);
  const balanceAfter = await provider.getBalance();

  summary.purchases = results;
  summary.transactionQuery = {
    passed: queried.providerStatus !== "PAYBETA_STATUS_UNAVAILABLE",
    status: queried.status,
    providerStatus: queried.providerStatus
  };
  summary.pendingSafety = {
    passed: duplicate.providerStatus === "PAYBETA_DUPLICATE_REFERENCE_BLOCKED",
    providerStatus: duplicate.providerStatus
  };
  summary.failedStatusNormalization = {
    passed: invalidQuery.status === UtilityTransactionStatus.FAILED,
    status: invalidQuery.status,
    providerStatus: invalidQuery.providerStatus
  };
  summary.balance = {
    readableBefore: Number.isFinite(balanceBefore.availableBalanceKobo),
    readableAfter: Number.isFinite(balanceAfter.availableBalanceKobo),
    changed: balanceAfter.availableBalanceKobo !== balanceBefore.availableBalanceKobo
  };
  summary.webhook = provider.webhookAuthenticationStatus();
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  console.error(JSON.stringify({ environment: "sandbox", passed: false, blocker: message.slice(0, 180) }));
  process.exitCode = 1;
});
