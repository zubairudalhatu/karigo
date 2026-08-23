const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const request = fs.readFileSync(path.join(root, "app", "taxi", "request.tsx"), "utf8");
const history = fs.readFileSync(path.join(root, "app", "orders", "index.tsx"), "utf8");
const api = fs.readFileSync(path.join(root, "src", "api", "taxi.api.ts"), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

for (const source of [request, history]) {
  for (const label of ["Original total", "Refunded", "Current net", "Refund status"]) assert(source.includes(label), `Customer Ride receipt/history must show ${label}.`);
  assert(source.includes("Cash refund pending") && source.includes("Cash refund settled"), "Customer must see explicit Cash refund state.");
}
const receiptBlock = request.slice(request.indexOf("function RideReceipt"), request.indexOf("function ReceiptRow", request.indexOf("function RideReceipt")));
assert(!receiptBlock.includes("karigoCommissionKobo") && !receiptBlock.includes("captainNetEarningKobo"), "Customer receipt must not expose internal commission or Captain earnings.");
assert(api.includes("tripFinance") && api.includes("/finance"), "Customer-owned Ride finance endpoint must be represented in the app API.");

console.log("Customer H11 refund regression checks passed.");
