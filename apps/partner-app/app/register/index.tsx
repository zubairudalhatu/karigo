import { brand } from "@karigo/config";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { authApi } from "../../src/api/auth.api";
import { Card, Hero, MutedText, PrimaryButton, Screen, TextField } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";
import { usePartnerRegistration } from "../../src/contexts/partner-registration-context";
import { normalizeNigerianPhoneNumber } from "../../src/lib/phone";

export default function RegisterStartScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { registration, updateRegistration } = usePartnerRegistration();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      if (user) {
        updateRegistration({
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          businessPhoneNumber: user.phoneNumber,
          contactPhoneNumber: user.phoneNumber,
          email: user.email ?? registration.email,
          businessEmail: user.email ?? registration.email,
          contactEmail: user.email ?? registration.email,
          contactFullName: user.fullName
        });
        router.push("/register/account-type");
        return;
      }

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
      else if (result.nextStep === "SIGN_IN_REQUIRED") {
        setMessage(result.message ?? "Your KariGO account has been recognised. Sign in to continue Partner onboarding.");
        router.replace("/auth/login");
      }
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
        title={user ? "Continue Partner onboarding" : "Create your KariGO Partner account"}
        subtitle={user ? "Your KariGO account has been recognised. Continue to create your Partner profile." : "Product Sellers, Service Providers and mixed partners can start onboarding directly in the app."}
      />
      <Card>
        <TextField label="Full name" editable={!user} value={user?.fullName ?? registration.fullName} onChangeText={(fullName) => updateRegistration({ fullName })} />
        <TextField label="Phone number" editable={!user} placeholder="080..." keyboardType="phone-pad" value={user?.phoneNumber ?? registration.phoneNumber} onChangeText={(phoneNumber) => updateRegistration({ phoneNumber })} />
        <TextField label="Email optional" editable={!user} autoCapitalize="none" keyboardType="email-address" value={user?.email ?? registration.email} onChangeText={(email) => updateRegistration({ email })} />
        {message ? <MutedText>{message}</MutedText> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          label={submitting ? "Starting..." : user ? "Continue Partner onboarding" : "Start onboarding"}
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
