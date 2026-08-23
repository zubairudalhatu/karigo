const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const workspace = fs.readFileSync(path.join(root, "src", "components", "captain-ride-workspace.tsx"), "utf8");
const chat = fs.readFileSync(path.join(root, "app", "ride-chat", "[tripId].tsx"), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(workspace.includes('{trip.status !== "DRIVER_ASSIGNED" ? <View style={styles.mapShell}>'), "Pre-accept proposal must hide the map Safety control.");
assert(workspace.includes('{trip.status !== "DRIVER_ASSIGNED" ? <View style={styles.quickActions}>'), "Pre-accept proposal must hide Chat, Call, Navigation and Safety actions.");
for (const label of ["Chat", "Call", "Navigation", "Safety", "DECLINE", "ACCEPT RIDE"]) assert(workspace.includes(label), `Captain workspace must retain ${label}.`);
assert(workspace.includes("await onUpdated(updated)"), "Accepted state must immediately replace the proposal with authoritative cockpit state.");
assert(chat.includes('item.senderRole === "CAPTAIN" ? "You" : item.senderLabel'), "Captain own messages must display You.");

console.log("Captain H10.3 regression checks passed.");
