const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const expectText = (source, text, message) => { if (!source.includes(text)) throw new Error(message); };

const call = read("app/taxi/call/[tripId].tsx");
const host = read("src/components/ride-communication-host.tsx");
const chat = read("app/taxi/chat/[tripId].tsx");
const alerts = read("src/lib/ride-alert-state.ts");
const profile = read("app/profile.tsx");
const request = read("app/taxi/request.tsx");
const config = read("app.config.ts");

for (const text of ["ride.call.remote_ended", "activeCallSession", "Reconnecting…", "Call ended", "releaseEngine", "router.replace", "1_500", "Audio only · Calls are not recorded"]) {
  expectText(call, text, `Customer remote call terminal/recovery contract is missing: ${text}`);
}
if (call.includes("recordingEnabled: true") || call.includes("startRecording")) throw new Error("Customer Ride calls must remain unrecorded");
for (const text of ["ride-calls-v2", "ride-messages-v2", "karigo_ride_call.wav", "karigo_message.wav", "RIDE_MESSAGE_FOREGROUND_SOUND", "claimRideMessageEvent", "incrementRideUnread", "New Ride message"]) {
  expectText(`${host}\n${config}`, text, `Customer notification contract is missing: ${text}`);
}
for (const text of ["clearRideUnread", "acknowledgeRideMessageDelivered", "styles.mine", "styles.theirs", "Delivered", "Read"]) {
  expectText(chat, text, `Customer conversation contract is missing: ${text}`);
}
for (const text of ["handledMessageEvents", "EVENT_TTL_MS", "useRideUnreadCount"]) expectText(alerts, text, `Customer dedup/unread state is missing: ${text}`);
for (const text of ["Require Ride PIN", "Require a PIN before my Ride starts", "requireRidePin", "future Rides"]) expectText(profile, text, `Customer Ride Safety preference is missing: ${text}`);
for (const text of ["Ride PIN protection:", "trip.ridePinRequired", "Profile → Ride Safety", "Wallet", "Unavailable", "Loading all available category prices", "Pickup waiting is free for 5 minutes", "Chat${unreadCount", "Safety", "Share"]) {
  expectText(request, text, `Customer Ride request/tracking refinement is missing: ${text}`);
}
if (/karigo-(?:ride-call|message)/.test(`${host}\n${config}`)) throw new Error("Customer Android notification sound basename regressed to a hyphenated resource");
if (!/^ride-(?:calls|messages)-v2$/m.test("ride-calls-v2\nride-messages-v2")) throw new Error("Customer versioned Ride channel identifiers are invalid");
console.log("Customer H10.2 communication, optional PIN and Ride UX regression checks passed.");
