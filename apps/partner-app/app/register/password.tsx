import { brand } from "@karigo/config";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { authApi } from "../../src/api/auth.api";
import { Card, Hero, MutedText, PrimaryButton, Screen, TextField } from "../../src/components/ui";
import { usePartnerRegistration } from "../../src/contexts/partner-registration-context";

export default function RegisterPasswordScreen() {
  const router = useRouter();
  const { registration, updateRegistration } = usePartnerRegistration();
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (registration.password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await authApi.createVendorApplicantPassword({
        phoneNumber: registration.phoneNumber,
        password: registration.password
      });
      router.push("/register/account-type");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password could not be created.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Hero eyebrow="Account setup" title="Create your password" subtitle="This password will be used after KariGO approves and activates your Partner account." />
      <Card>
        <View>
          <TextField
            label="Password"
            value={registration.password}
            secureTextEntry={!passwordVisible}
            onChangeText={(password) => updateRegistration({ password })}
          />
          <Pressable onPress={() => setPasswordVisible((value) => !value)} style={styles.passwordToggle}>
            <Text style={styles.passwordToggleText}>{passwordVisible ? "Hide" : "Show"}</Text>
          </Pressable>
        </View>
        <TextField label="Confirm password" value={confirmPassword} secureTextEntry={!passwordVisible} onChangeText={setConfirmPassword} />
        <MutedText>Use at least 8 characters. KariGO will never ask you to share this password or an OTP.</MutedText>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          label={submitting ? "Saving..." : "Create password"}
          onPress={() => void submit()}
          disabled={submitting || registration.password.length < 8 || confirmPassword.length < 8}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  passwordToggle: {
    position: "absolute",
    right: 14,
    bottom: 15
  },
  passwordToggleText: {
    color: brand.colors.primary,
    fontWeight: "900"
  },
  error: {
    color: brand.colors.primary,
    fontWeight: "800"
  }
});
