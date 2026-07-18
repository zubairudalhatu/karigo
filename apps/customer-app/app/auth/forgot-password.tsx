import { router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { authApi } from "../../src/api/auth.api";
import { Button, Field, Message, NavLink, Screen, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";
import { normalizeNigerianPhoneNumber } from "../../src/lib/phone";

export default function ForgotPasswordScreen() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const normalizedPhoneNumber = normalizeNigerianPhoneNumber(phoneNumber);
      const result = await authApi.requestPasswordReset({ phoneNumber: normalizedPhoneNumber });
      router.push({
        pathname: "/auth/reset-password",
        params: {
          phoneNumber: normalizedPhoneNumber,
          mockOtp: result.mockOtp ?? ""
        }
      });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return <Screen title="Reset password">
    <Text style={ui.pageIntro}>Enter your registered Nigerian phone number. If the account is eligible, KariGO will send an OTP so you can set a new password.</Text>
    <Field placeholder="080..." value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" autoCapitalize="none" />
    <Message error>{error}</Message>
    <Button title={busy ? "Sending OTP..." : "Send reset OTP"} onPress={submit} disabled={busy || !phoneNumber.trim()} />
    <NavLink href="/auth/login" label="Back to login" />
  </Screen>;
}
