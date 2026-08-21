const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.resolve(__dirname, "../app/taxi/request.tsx"), "utf8");
for (const expected of ["Minimum Ride fare applied", "Free pickup wait", "Waiting", "receipt.receiptNumber", "actualDistanceKm", "humanVehicleValue"]) {
  if (!source.includes(expected)) throw new Error(`Missing Customer H10 contract: ${expected}`);
}
console.log("Customer H10 regression checks passed.");
