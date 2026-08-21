const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.resolve(__dirname, "../app/taxi/request.tsx"), "utf8");
const formatter = fs.readFileSync(path.resolve(__dirname, "../src/lib/rides-format.ts"), "utf8");
for (const expected of ["Minimum Ride fare applied", "Free pickup wait", "Waiting", "receipt.receiptNumber", "actualDistanceKm", "humanVehicleValue"]) {
  if (!source.includes(expected)) throw new Error(`Missing Customer H10 contract: ${expected}`);
}
console.log("Customer H10 regression checks passed.");
if (!formatter.includes("range.min === range.max")) throw new Error("Equal minimum-fare ranges must collapse to one amount");
