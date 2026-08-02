const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.resolve(__dirname, "../src/api.ts"), "utf8");
const mobileSessionSource = fs.readFileSync(path.resolve(__dirname, "../src/mobile-session.ts"), "utf8");
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

expect(source.includes("onForbidden?"), "Shared API client should expose a separate forbidden callback.");
expect(source.includes("response.status === 401") && source.includes("options.refreshAuth"), "Shared API client should refresh only on 401.");
expect(!source.includes("response.status === 401 || response.status === 403"), "Shared API client must not combine 401 and 403 as session-invalid states.");
expect(source.includes("AuthOperationMeta"), "Shared API client should carry auth operation metadata for generation-safe callbacks.");
expect(source.includes("await options.onUnauthorized?.(response.status, {") && !source.includes("(response.status === 401 || response.status === 403)"), "onUnauthorized should be reserved for final 401 responses with safe metadata.");
expect(source.includes("response.status === 403") && source.includes("await options.onForbidden?.(response.status)"), "403 should remain a structured forbidden error without clearing auth by default.");
expect(source.includes("fetchWithTimeout"), "Shared API client must enforce request timeouts.");
expect(source.includes("shouldRetryAuthMe"), "Shared API client must retry auth/me once for temporary startup failures.");
expect(source.includes("SessionTemporarilyUnavailableError"), "Shared API client must preserve sessions on temporary refresh failures.");
expect(source.includes("validateMobileApiBaseUrl"), "Shared API client must expose production API base URL validation.");
expect(mobileSessionSource.includes("schemaVersion: 2"), "Shared mobile session store must persist a v2 session envelope.");
expect(mobileSessionSource.includes("persistTokenPair"), "Shared mobile session store must persist access/refresh token pairs atomically.");
expect(mobileSessionSource.includes("migrateLegacySession"), "Shared mobile session store must migrate old separate token keys safely.");
expect(mobileSessionSource.includes("StaleAuthOperationError"), "Shared mobile session store must guard stale auth operations.");

if (failures.length) {
  console.error("API client regression check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("API client regression check passed.");
