const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const formatter = read("src/lib/rides-format.ts");
const tracking = read("app/taxi/request.tsx");
const chat = read("app/taxi/chat/[tripId].tsx");

if (!formatter.includes("formatKobo(value, fallback)")) throw new Error("Customer Ride fare must use the shared Kobo contract.");
if (formatter.includes("numeric / 100")) throw new Error("Customer fare formatter still performs local ambiguous conversion.");
for (const text of ["Chat with Captain", "Contact Captain", "Call in KariGO", "Call by phone"]) {
  if (!tracking.includes(text)) throw new Error(`Missing Customer Ride contact UX: ${text}`);
}
if (/tel:\$\{captain\.contactPhoneNumber/.test(tracking)) throw new Error("Customer tracking exposes the Captain number directly.");
if (!chat.includes("conversation?.readOnly")) throw new Error("Completed Ride chat must become read-only.");
if (!chat.includes("messages(tripId")) throw new Error("Customer chat must load authoritative persisted history.");
if (chat.includes("setInterval(")) throw new Error("Customer Ride chat must not introduce polling.");

console.log("Customer H9 regression checks passed.");
