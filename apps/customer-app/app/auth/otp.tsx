import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { Button, Field, Message, Screen, ui } from "../../src/components/ui";
import { authApi } from "../../src/api/auth.api";
import { useAuth } from "../../src/contexts/auth-context";
import { friendlyError } from "../../src/lib/errors";

export default function OtpVerification() {
  const params = useLocalSearchParams<{ phoneNumber: string; mockOtp?: string }>();
  const { verifyOtp } = useAuth();
  const [otp, setOtp] = useState(params.mockOtp ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function submit() {
    setBusy(true); setError("");
    try {
      await verifyOtp({ phoneNumber: params.phoneNumber, otp });
      router.replace("/tabs/home");
    } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  }

  async function resend() {
    setResending(true); setError(""); setMessage("");
    try {
      const result = await authApi.resendOtp({ phoneNumber: params.phoneNumber });
      if (result.mockOtp) setOtp(result.mockOtp);
      setResendCooldown(60);
      setMessage("A new verification code has been sent. Please check your phone.");
    } catch (e) { setError(friendlyError(e)); } finally { setResending(false); }
  }

  return <Screen title="Verify your phone">
    <Text style={ui.muted}>Enter the verification code sent to {params.phoneNumber}. It expires shortly.</Text>
    <Field placeholder="OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" />
    <Message error>{error}</Message>
    <Message>{message}</Message>
    <Button title={busy ? "Verifying..." : "Verify and continue"} onPress={submit} disabled={busy || otp.length < 4} />
    <Button
      title={resending ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
      onPress={resend}
      disabled={busy || resending || resendCooldown > 0}
      tone="muted"
    />
  </Screen>;
}
