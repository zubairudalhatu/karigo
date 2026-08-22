const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const expectText = (source, text, message) => { if (!source.includes(text)) throw new Error(message); };

const call = read("app/ride-call/[tripId].tsx");
const host = read("src/components/ride-communication-host.tsx");
const notifications = read("src/lib/captain-notifications.ts");
const chat = read("app/ride-chat/[tripId].tsx");
const alerts = read("src/lib/ride-alert-state.ts");
const workspace = read("src/components/captain-ride-workspace.tsx");
const config = read("app.config.ts");

for (const text of ["ride.call.remote_ended", "activeCallSession", "Reconnecting…", "Call ended", "releaseEngine", "router.replace", "1_500", "Audio only · Calls are not recorded"]) {
  expectText(call, text, `Captain remote call terminal/recovery contract is missing: ${text}`);
}
if (call.includes("recordingEnabled: true") || call.includes("startRecording")) throw new Error("Captain Ride calls must remain unrecorded");
for (const text of ["ride-calls-v2", "ride-messages-v2", "karigo_ride_call.wav", "karigo_message.wav", "RIDE_MESSAGE_FOREGROUND_SOUND", "claimRideMessageEvent", "incrementRideUnread", "New Ride message"]) {
  expectText(`${host}\n${notifications}\n${config}`, text, `Captain notification contract is missing: ${text}`);
}
for (const text of ["clearRideUnread", "acknowledgeRideMessageDelivered", "styles.mine", "styles.theirs", "Delivered", "Read", "quickReplies"]) {
  expectText(chat, text, `Captain conversation contract is missing: ${text}`);
}
for (const text of ["handledMessageEvents", "EVENT_TTL_MS", "useRideUnreadCount"]) expectText(alerts, text, `Captain dedup/unread state is missing: ${text}`);
for (const text of ["trip.ridePinRequired ? pin : undefined", "trip.status === \"ARRIVED_PICKUP\" && trip.ridePinRequired", "Chat{unreadCount", "Navigation", "Safety"]) {
  expectText(workspace, text, `Captain optional-PIN/cockpit contract is missing: ${text}`);
}
if (/karigo-(?:ride-call|message)/.test(`${host}\n${notifications}\n${config}`)) throw new Error("Captain Android notification sound basename regressed to a hyphenated resource");
console.log("Captain H10.2 communication, optional PIN and cockpit regression checks passed.");
