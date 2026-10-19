import { PermissionsAndroid, Platform } from "react-native";

export type MicrophonePermission = "allowed" | "denied" | "blocked";

// Invoked only from the Ride-call screen. No module-level native permission calls.
export async function requestCallMicrophone(): Promise<MicrophonePermission> {
  if (Platform.OS === "ios") {
    // Lazy load: the existing Android runtime does not need this new iOS module.
    const audio = require("expo-audio") as typeof import("expo-audio");
    const current = await audio.getRecordingPermissionsAsync();
    if (current.granted) return "allowed";
    if (!current.canAskAgain) return "blocked";
    const result = await audio.requestRecordingPermissionsAsync();
    return result.granted ? "allowed" : result.canAskAgain ? "denied" : "blocked";
  }
  if (Platform.OS !== "android") return "denied";
  if (await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO)) return "allowed";
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: "Allow microphone for KariGO Ride calls",
    message: "KariGO uses your microphone only while you are on an in-app Ride call.",
    buttonPositive: "Allow",
    buttonNegative: "Not now"
  });
  return result === PermissionsAndroid.RESULTS.GRANTED ? "allowed"
    : result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? "blocked" : "denied";
}
