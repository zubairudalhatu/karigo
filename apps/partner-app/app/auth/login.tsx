import { ApiNetworkError, ApiTimeoutError, SessionTemporarilyUnavailableError, brand } from "@karigo/config";
import { KariGoApiError } from "@karigo/shared-types";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Card, LoadingState, PrimaryButton, Screen, TextField } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";

function partnerLoginErrorMessage(error: unknown) {
  if (error instanceof ApiNetworkError) {
    return "No internet connection. Check your network and try again.";
  }
  if (error instanceof ApiTimeoutError) {
    return "The sign-in request timed out. Please try again.";
  }
  if (error instanceof SessionTemporarilyUnavailableError) {
    return "KariGO Partner is temporarily unavailable. Your saved login was kept.";
  }
  if (error instanceof KariGoApiError) {
    if (error.status === 401 || error.status === 400) {
      return "Invalid phone number or password.";
    }
    if (error.status === 429) {
      return "Too many sign-in attempts. Please wait a moment and try again.";
    }
    if (error.status && error.status >= 500) {
      return "Server temporarily unavailable. Please try again shortly.";
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "Partner sign in failed. Please try again.";
}

export default function LoginScreen() {
  const { loading, login, resetSavedLogin, sessionMessage, sessionRepairRequired, user } = useAuth();
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <LoadingState label="Checking Partner session..." />;
  if (user) return <Redirect href="/" />;

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await login({ phoneNumber, password });
    } catch (err) {
      setError(partnerLoginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function resetLocalSession() {
    setError(null);
    setSubmitting(true);
    try {
      await resetSavedLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saved login could not be reset. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.logoWrap}>
        <Image source={require("../../assets/karigo-logo.png")} resizeMode="contain" style={styles.logo} />
      </View>
      <Card>
        <Text style={styles.title}>KariGO Partner</Text>
        <Text style={styles.subtitle}>Sign in to manage products, services, orders and onboarding from your phone.</Text>
        <TextField
          autoCapitalize="none"
          keyboardType="phone-pad"
          label="Phone number"
          onChangeText={setPhoneNumber}
          placeholder="080..."
          value={phoneNumber}
        />
        <View>
          <TextField
            label="Password"
            onChangeText={setPassword}
            placeholder="Enter password"
            secureTextEntry={!passwordVisible}
            value={password}
          />
          <Pressable onPress={() => setPasswordVisible((value) => !value)} style={styles.passwordToggle}>
            <Text style={styles.passwordToggleText}>{passwordVisible ? "Hide" : "Show"}</Text>
          </Pressable>
        </View>
        {sessionMessage ? <Text style={styles.sessionMessage}>{sessionMessage}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={sessionRepairRequired ? "Reset saved login" : "Reset saved login on this device"} onPress={resetLocalSession} variant="secondary" />
        <PrimaryButton
          disabled={submitting || !phoneNumber.trim() || !password}
          label={submitting ? "Signing in..." : "Sign in"}
          onPress={submit}
        />
        <PrimaryButton label="Forgot password" onPress={() => router.push("/auth/forgot-password")} variant="secondary" />
        <PrimaryButton
          label="Start Partner Onboarding"
          onPress={() => router.push("/register")}
          variant="secondary"
        />
      </Card>
      <Text style={styles.note}>
        Product Sellers, Service Providers and mixed partners use the same approved Partner Workspace account.
      </Text>
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
  title: {
    color: brand.colors.charcoal,
    fontSize: 26,
    fontWeight: "900"
  },
  subtitle: {
    color: brand.colors.muted,
    fontSize: 15,
    lineHeight: 22
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
  error: {
    color: brand.colors.primary,
    fontWeight: "800"
  },
  sessionMessage: {
    color: brand.colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  note: {
    color: brand.colors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center"
  }
});
