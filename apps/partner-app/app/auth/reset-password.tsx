import { brand } from "@karigo/config";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { authApi } from "../../src/api/auth.api";
import { Card, Hero, MutedText, PrimaryButton, Screen, TextField } from "../../src/components/ui";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phoneNumber?: string }>();
  const [phoneNumber, setPhoneNumber] = useState(params.phoneNumber ?? "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = phoneNumber.trim() && otp.trim() && newPassword && newPassword === confirmPassword;

  async function submit() {
    setError(null);
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setError("Passwords must match.");
      return;
    }

    setSubmitting(true);
    try {
      await authApi.confirmPasswordReset({ phoneNumber, otp, newPassword });
      setMessage("Password reset completed. You can now sign in to KariGO Partner.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset could not be completed.");
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
        eyebrow="Secure reset"
        title="Enter your reset OTP"
        subtitle="Use the OTP sent to your partner phone number and create a new password."
      />

      <Card>
        <TextField
          keyboardType="phone-pad"
          label="Partner phone number"
          onChangeText={setPhoneNumber}
          placeholder="080..."
          value={phoneNumber}
        />
        <TextField
          keyboardType="number-pad"
          label="Reset OTP"
          onChangeText={setOtp}
          placeholder="Enter OTP"
          value={otp}
        />
        <View>
          <TextField
            label="New password"
            onChangeText={setNewPassword}
            placeholder="Create password"
            secureTextEntry={!passwordVisible}
            value={newPassword}
          />
          <Pressable onPress={() => setPasswordVisible((value) => !value)} style={styles.passwordToggle}>
            <Text style={styles.passwordToggleText}>{passwordVisible ? "Hide" : "Show"}</Text>
          </Pressable>
        </View>
        <TextField
          label="Confirm new password"
          onChangeText={setConfirmPassword}
          placeholder="Repeat password"
          secureTextEntry={!passwordVisible}
          value={confirmPassword}
        />
        <MutedText>Password must include uppercase, lowercase and a number.</MutedText>
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          disabled={submitting || !canSubmit}
          label={submitting ? "Saving password..." : "Reset password"}
          onPress={() => void submit()}
        />
        <PrimaryButton label="Back to sign in" onPress={() => router.replace("/auth/login")} variant="secondary" />
      </Card>
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
  passwordToggle: {
    position: "absolute",
    right: 14,
    bottom: 15
  },
  passwordToggleText: {
    color: brand.colors.primary,
    fontWeight: "900"
  },
  success: {
    color: brand.colors.success,
    fontWeight: "800",
    lineHeight: 20
  },
  error: {
    color: brand.colors.primary,
    fontWeight: "800",
    lineHeight: 20
  }
});
