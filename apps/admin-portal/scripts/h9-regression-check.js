const fs = require("node:fs");
const path = require("node:path");

const page = fs.readFileSync(path.resolve(__dirname, "../app/taxi/page.tsx"), "utf8");
if (!page.includes("formatKobo(trip.estimatedFareKobo)")) throw new Error("Admin Ride fare must use explicit Kobo formatting.");
if (page.includes("Math.round(trip.estimatedFareKobo / 100)")) throw new Error("Admin Ride fare still uses local ambiguous conversion.");
if (!page.includes("conversationSummary.messageCount")) throw new Error("Admin Ride summary must show conversation counts.");
if (!page.includes("callSessionSummary?.state")) throw new Error("Admin Ride summary must show call-session state.");
if (!page.includes("Private message content is available only through audited support access.")) throw new Error("Admin summary must not expose private chat content.");

console.log("Admin H9 regression checks passed.");
