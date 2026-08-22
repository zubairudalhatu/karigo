const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const config = read("app.config.ts");
const request = read("app/taxi/request.tsx");
const chat = read("app/taxi/chat/[tripId].tsx");
const call = read("app/taxi/call/[tripId].tsx");
const realtime = read("src/lib/ride-realtime.ts");
const host = read("src/components/ride-communication-host.tsx");
const packageJson = JSON.parse(read("package.json"));

if (packageJson.dependencies["react-native-agora"] !== "^4.6.2") throw new Error("Customer Agora SDK version is not pinned");
if (packageJson.dependencies["socket.io-client"] !== "^4.8.3") throw new Error("Customer Socket.IO client version is not pinned");
const blockedPermissions = config.slice(config.indexOf("blockedPermissions"), config.indexOf("allowBackup"));
if (blockedPermissions.includes("RECORD_AUDIO")) throw new Error("Customer RECORD_AUDIO remains blocked");
if (!config.includes('"android.permission.RECORD_AUDIO"') || config.includes("microphonePermission: false")) throw new Error("Customer generated manifest would not retain RECORD_AUDIO");
if (!config.includes("NSMicrophoneUsageDescription") || !config.includes('versionCode: isStaging ? 1 : 17')) throw new Error("Customer native call configuration is incomplete");
if (!config.includes("karigo-ride-call.wav") || !config.includes("karigo-message.wav")) throw new Error("Customer notification sounds are not registered with Expo");
if (config.includes("EXPO_PUBLIC_AGORA_APP_CERTIFICATE")) throw new Error("Agora Certificate must never be public");
for (const file of ["assets/sounds/karigo-ride-call.wav", "assets/sounds/karigo-message.wav"]) {
  if (!fs.existsSync(path.join(root, file)) || fs.statSync(path.join(root, file)).size < 1_000) throw new Error(`Missing Customer sound asset: ${file}`);
}
for (const expected of ["createAgoraRtcEngine", "requestMicrophone", "onTokenPrivilegeWillExpire", "muteLocalAudioStream", "setEnableSpeakerphone", "endCall"]) {
  if (!call.includes(expected)) throw new Error(`Missing Customer call contract: ${expected}`);
}
for (const expected of ["ride.message.new", "ride.message.delivered", "ride.message.read", "acknowledgeRideMessageDelivered"]) {
  if (!chat.includes(expected) && !realtime.includes(expected)) throw new Error(`Missing Customer realtime chat contract: ${expected}`);
}
if (!request.includes('subscribeRideRealtime(created.id') || !request.includes("60_000")) throw new Error("Customer lifecycle realtime/recovery contract is missing");
if (request.includes("setInterval(() => void refreshActiveTrip(), pollMs)")) throw new Error("Customer repeated lifecycle polling loop was restored");
if (!host.includes("RIDE_CALL_INCOMING") || !host.includes("Vibration.vibrate") || !host.includes("karigo-ride-call.wav")) throw new Error("Customer incoming-call alert contract is missing");
if (!request.includes("conversationSummary?.unreadCount")) throw new Error("Customer Ride unread badge is missing");
console.log("Customer H10.1 realtime/call regression checks passed.");
