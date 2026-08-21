const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const workspace = read("src/components/captain-ride-workspace.tsx");
const chat = read("app/ride-chat/[tripId].tsx");
const notifications = read("src/lib/captain-notifications.ts");

function requireText(source, text, message) {
  if (!source.includes(text)) throw new Error(message);
}

requireText(workspace, "formatKobo(trip.estimatedFareKobo)", "Captain Ride fare must use explicit Kobo formatting.");
if (workspace.includes("money(trip.estimatedFareKobo)")) throw new Error("Captain Ride fare still uses ambiguous money().");
for (const action of ["Chat", "Call", "Navigation", "Safety"]) requireText(workspace, `>${action}<`, `Missing active Ride ${action} action.`);
requireText(workspace, "contactOptions(trip.id)", "Phone fallback must be fetched through the controlled Ride endpoint.");
if (/tel:\$\{trip\.customer/.test(workspace)) throw new Error("Captain workspace exposes the Customer number directly.");
for (const reply of ["I'm on my way", "I've arrived", "I'll arrive in 2 min", "Please share your exact location"]) requireText(chat, reply, `Missing Captain quick reply: ${reply}`);
requireText(chat, "messages(tripId", "Captain chat must load authoritative persisted history.");
requireText(notifications, "sticky: true", "Android Captain presence notification must remain ongoing where supported.");
requireText(notifications, "Open KariGO Captain to continue", "Active Ride notification must use safe generic copy.");
if (/pickupAddress|destinationAddress|customer.*address/i.test(notifications)) throw new Error("Presence notification contains sensitive Ride location data.");
if (chat.includes("setInterval(")) throw new Error("Ride chat must not introduce a polling loop.");

console.log("Captain H9 regression checks passed.");
