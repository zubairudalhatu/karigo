import { brand } from "@karigo/config";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { authApi } from "../../src/api/auth.api";
import { Card, Hero, MutedText, PrimaryButton, Screen, TextField } from "../../src/components/ui";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [activationIdentifier, setActivationIdentifier] = useState("");
  const [submittingReset, setSubmittingReset] = useState(false);
  const [submittingActivation, setSubmittingActivation] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestReset() {
    setError(null);
    setMessage(null);
    setSubmittingReset(true);
    try {
      const result = await authApi.requestPasswordReset({ phoneNumber });
      const mockCopy = result.mockOtp ? ` Test OTP: ${result.mockOtp}` : "";
      setMessage(`If this partner account is eligible, a password reset OTP has been sent.${mockCopy}`);
      router.push({ pathname: "/auth/reset-password", params: { phoneNumber } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset could not be started.");
    } finally {
      setSubmittingReset(false);
    }
  }

  async function requestActivationLink() {
    const identifier = activationIdentifier.trim();
    if (!identifier) return;

    setError(null);
    setMessage(null);
    setSubmittingActivation(true);
    try {
      await authApi.requestVendorActivationLink(
        identifier.includes("@") ? { email: identifier } : { phoneNumber: identifier }
      );
      setMessage("If this approved partner account is eligible, KariGO will send a fresh activation link.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation link request could not be submitted.");
    } finally {
      setSubmittingActivation(false);
    }
  }

  return (
    <Screen>
      <View style={styles.logoWrap}>
        <Image source={require("../../assets/karigo-logo.png")} resizeMode="contain" style={styles.logo} />
      </View>

      <Hero
        eyebrow="Account help"
        title="Reset your Partner password"
        subtitle="Active Partner accounts can reset by OTP. Approved partners who have not set a password should request a fresh activation link."
      />

      <Card>
        <Text style={styles.cardTitle}>Forgot password</Text>
        <TextField
          keyboardType="phone-pad"
          label="Partner phone number"
          onChangeText={setPhoneNumber}
          placeholder="080..."
          value={phoneNumber}
        />
        <PrimaryButton
          disabled={submittingReset || !phoneNumber.trim()}
          label={submittingReset ? "Sending OTP..." : "Send reset OTP"}
          onPress={() => void requestReset()}
        />
        <MutedText>Use this if you have already activated your KariGO Partner account.</MutedText>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Need your activation link?</Text>
        <TextField
          autoCapitalize="none"
          keyboardType="email-address"
          label="Approved email or phone number"
          onChangeText={setActivationIdentifier}
          placeholder="partner@example.com or 080..."
          value={activationIdentifier}
        />
        <PrimaryButton
          disabled={submittingActivation || !activationIdentifier.trim()}
          label={submittingActivation ? "Requesting..." : "Request activation link"}
          onPress={() => void requestActivationLink()}
          variant="secondary"
        />
        <MutedText>Activation links are only sent for approved partner accounts.</MutedText>
      </Card>

      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label="Back to sign in" onPress={() => router.replace("/auth/login")} variant="secondary" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoWrap: {
    alignItems: "center",
    paddingTop: 16
  },
  logo: {
    width: 180,
    height: 72
  },
  cardTitle: {
    color: brand.colors.charcoal,
    fontSize: 18,
    fontWeight: "900"
  },
  success: {
    color: brand.colors.success,
    fontWeight: "800",
    lineHeight: 20,
    textAlign: "center"
  },
  error: {
    color: brand.colors.primary,
    fontWeight: "800",
    lineHeight: 20,
    textAlign: "center"
  }
});
