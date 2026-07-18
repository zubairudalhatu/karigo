import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const BIOMETRIC_ENABLED_KEY = "karigo_customer_biometric_sign_in_enabled";

export interface BiometricCapability {
  available: boolean;
  hasHardware: boolean;
  enrolled: boolean;
}

export async function getBiometricCapability(): Promise<BiometricCapability> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
  return { available: hasHardware && enrolled, hasHardware, enrolled };
}

export async function getBiometricSignInEnabled() {
  return (await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY)) === "true";
}

export async function setBiometricSignInEnabled(enabled: boolean) {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true");
  } else {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  }
}

export async function authenticateWithBiometrics(promptMessage: string) {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: "Cancel",
    disableDeviceFallback: false
  });
  if (!result.success) {
    throw new Error("Biometric sign-in was not confirmed.");
  }
}
