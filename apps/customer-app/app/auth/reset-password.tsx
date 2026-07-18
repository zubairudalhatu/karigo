import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { authApi } from "../../src/api/auth.api";
import { Button, Field, Message, PasswordField, Screen, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";
import { normalizeNigerianPhoneNumber } from "../../src/lib/phone";

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ phoneNumber?: string; mockOtp?: string }>();
  const [phoneNumber, setPhoneNumber] = useState(params.phoneNumber ?? "");
  const [otp, setOtp] = useState(params.mockOtp ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await authApi.confirmPasswordReset({
        phoneNumber: normalizeNigerianPhoneNumber(phoneNumber),
        otp,
        newPassword
      });
      setMessage("Password reset complete. Please sign in with your new password.");
      setTimeout(() => router.replace("/auth/login"), 800);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return <Screen title="Enter OTP">
    <Text style={ui.pageIntro}>Use the OTP sent to your phone and choose a new password. KariGO will never ask you to share this OTP with anyone.</Text>
    <Field placeholder="080..." value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" autoCapitalize="none" />
    <Field placeholder="OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" />
    <PasswordField placeholder="New password" value={newPassword} onChangeText={setNewPassword} visible={passwordVisible} onToggleVisible={() => setPasswordVisible((current) => !current)} />
    <PasswordField placeholder="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} visible={passwordVisible} onToggleVisible={() => setPasswordVisible((current) => !current)} />
    <Message>{message}</Message>
    <Message error>{error}</Message>
    <Button title={busy ? "Resetting..." : "Reset password"} onPress={submit} disabled={busy || !phoneNumber || !otp || !newPassword || !confirmPassword} />
  </Screen>;
}
