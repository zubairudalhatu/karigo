import { brand } from "@karigo/config";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { authApi } from "../../src/api/auth.api";
import { Card, Hero, MutedText, PrimaryButton, Screen, TextField } from "../../src/components/ui";
import { usePartnerRegistration } from "../../src/contexts/partner-registration-context";

export default function RegisterVerifyScreen() {
  const router = useRouter();
  const { registration, updateRegistration } = usePartnerRegistration();
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await authApi.verifyVendorApplicantOtp({
        phoneNumber: registration.phoneNumber,
        otp: registration.otp.trim()
      });
      setMessage("Phone number verified.");
      if (result.nextStep === "PASSWORD_REQUIRED") router.push("/register/password");
      else router.push("/register/account-type");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP could not be verified.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setResending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await authApi.resendVendorApplicantOtp({ phoneNumber: registration.phoneNumber });
      setMessage(result.mockOtp ? `OTP resent. Mock OTP: ${result.mockOtp}` : "If eligible, a new OTP has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP could not be resent.");
    } finally {
      setResending(false);
    }
  }

  return (
    <Screen>
      <Hero eyebrow="Phone verification" title="Enter your OTP" subtitle={`We sent a verification code to ${registration.phoneNumber || "your phone number"}.`} />
      <Card>
        <TextField label="OTP" keyboardType="number-pad" value={registration.otp} onChangeText={(otp) => updateRegistration({ otp })} />
        {message ? <MutedText>{message}</MutedText> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={submitting ? "Verifying..." : "Verify phone"} onPress={() => void verify()} disabled={submitting || registration.otp.trim().length < 4} />
        <PrimaryButton label={resending ? "Resending..." : "Resend OTP"} onPress={() => void resend()} disabled={resending || !registration.phoneNumber} variant="secondary" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    color: brand.colors.primary,
    fontWeight: "800"
  }
});
