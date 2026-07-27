import { brand } from "@karigo/config";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { authApi } from "../../src/api/auth.api";
import { Card, Hero, MutedText, PrimaryButton, Screen, TextField } from "../../src/components/ui";
import { usePartnerRegistration } from "../../src/contexts/partner-registration-context";
import { normalizeNigerianPhoneNumber } from "../../src/lib/phone";

export default function RegisterStartScreen() {
  const router = useRouter();
  const { registration, updateRegistration } = usePartnerRegistration();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const phoneNumber = normalizeNigerianPhoneNumber(registration.phoneNumber);
      const result = await authApi.createVendorApplicantAccount({
        fullName: registration.fullName.trim(),
        phoneNumber,
        email: registration.email.trim() || undefined
      });
      updateRegistration({
        phoneNumber,
        businessPhoneNumber: phoneNumber,
        contactPhoneNumber: phoneNumber,
        businessEmail: registration.email.trim(),
        contactEmail: registration.email.trim(),
        contactFullName: registration.fullName.trim()
      });
      setMessage("Applicant account accepted.");
      if (result.nextStep === "OTP_REQUIRED") router.push("/register/verify");
      else if (result.nextStep === "PASSWORD_REQUIRED") router.push("/register/password");
      else router.push("/register/account-type");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Partner onboarding could not be started.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.logoWrap}>
        <Image source={require("../../assets/karigo-logo.png")} resizeMode="contain" style={styles.logo} />
      </View>
      <Hero
        eyebrow="Partner onboarding"
        title="Create your KariGO Partner account"
        subtitle="Product Sellers, Service Providers and mixed partners can start onboarding directly in the app."
      />
      <Card>
        <TextField label="Full name" value={registration.fullName} onChangeText={(fullName) => updateRegistration({ fullName })} />
        <TextField label="Phone number" placeholder="080..." keyboardType="phone-pad" value={registration.phoneNumber} onChangeText={(phoneNumber) => updateRegistration({ phoneNumber })} />
        <TextField label="Email optional" autoCapitalize="none" keyboardType="email-address" value={registration.email} onChangeText={(email) => updateRegistration({ email })} />
        {message ? <MutedText>{message}</MutedText> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          label={submitting ? "Starting..." : "Start onboarding"}
          onPress={() => void submit()}
          disabled={submitting || !registration.fullName.trim() || !registration.phoneNumber.trim()}
        />
        <PrimaryButton label="Back to sign in" onPress={() => router.replace("/auth/login")} variant="secondary" />
      </Card>
      <MutedText>Approval is not automatic. KariGO will review every partner application before marketplace access.</MutedText>
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
  error: {
    color: brand.colors.primary,
    fontWeight: "800"
  }
});
