import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

type NativeEvent = { at: number; stage: string; [key: string]: string | number | boolean };
export type NativeLocationEvidence = { enabled: boolean; maxEvents: number; retentionSeconds: number; events: NativeEvent[] };
type NativeDiagnostics = {
  karigoNativeLocationQaArm?: () => Promise<boolean>;
  karigoNativeLocationQaRead?: () => Promise<NativeLocationEvidence>;
  karigoNativeLocationQaClear?: () => Promise<void>;
};
export const nativeLocationQaExpected = Platform.OS === 'ios' && process.env.EXPO_PUBLIC_CAPTAIN_NATIVE_LOCATION_QA === 'true';
const nativeModule = nativeLocationQaExpected
  ? requireOptionalNativeModule<NativeDiagnostics>('ExpoTaskManager') : null;
export const nativeLocationQaAvailable = Boolean(nativeModule?.karigoNativeLocationQaArm && nativeModule?.karigoNativeLocationQaRead && nativeModule?.karigoNativeLocationQaClear);
export async function armNativeLocationEvidence() {
  if (!nativeLocationQaAvailable) return false;
  return nativeModule!.karigoNativeLocationQaArm!();
}
export async function readNativeLocationEvidence(): Promise<NativeLocationEvidence | null> {
  return nativeLocationQaAvailable ? nativeModule!.karigoNativeLocationQaRead!() : null;
}
export async function clearNativeLocationEvidence() {
  if (nativeLocationQaAvailable) await nativeModule!.karigoNativeLocationQaClear!();
}
