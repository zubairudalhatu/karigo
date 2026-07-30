const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.resolve(__dirname, "../src/api.ts"), "utf8");
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

expect(source.includes("onForbidden?"), "Shared API client should expose a separate forbidden callback.");
expect(source.includes("response.status === 401") && source.includes("options.refreshAuth"), "Shared API client should refresh only on 401.");
expect(!source.includes("response.status === 401 || response.status === 403"), "Shared API client must not combine 401 and 403 as session-invalid states.");
expect(source.includes("await options.onUnauthorized?.(response.status)") && !source.includes("(response.status === 401 || response.status === 403)"), "onUnauthorized should be reserved for final 401 responses.");
expect(source.includes("response.status === 403") && source.includes("await options.onForbidden?.(response.status)"), "403 should remain a structured forbidden error without clearing auth by default.");

if (failures.length) {
  console.error("API client regression check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("API client regression check passed.");
