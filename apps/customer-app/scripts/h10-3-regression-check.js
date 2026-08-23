const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const request = fs.readFileSync(path.join(root, "app", "taxi", "request.tsx"), "utf8");
const chat = fs.readFileSync(path.join(root, "app", "taxi", "chat", "[tripId].tsx"), "utf8");
const api = fs.readFileSync(path.join(root, "src", "api", "taxi.api.ts"), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(request.includes('const captainAccepted = !["REQUESTED", "DRIVER_ASSIGNED"].includes(trip.status)'), "Customer Chat/Call must be acceptance-gated.");
assert(request.includes("Waiting for Captain acceptance"), "Customer must see the Captain acceptance waiting state.");
assert(!request.includes('title="Phone fallback"'), "Standalone Phone fallback button must be removed.");
assert(request.includes('title="Call"') && request.includes('text: "Call in KariGO"') && request.includes('text: "Call by phone"'), "Controlled Call hierarchy must remain.");
assert(request.includes("activeRideSnapshotsByUser") && request.includes("Returning to your Ride…"), "User-scoped active Ride recovery must preserve useful content.");
assert(request.includes("Email receipt again") && api.includes("resendReceiptEmail"), "Customer receipt resend must remain available when eligible.");
assert(chat.includes('item.senderRole === "CUSTOMER" ? "You" : item.senderLabel'), "Customer own messages must display You.");

console.log("Customer H10.3 regression checks passed.");
