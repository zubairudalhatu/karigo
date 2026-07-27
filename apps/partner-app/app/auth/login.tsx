import { brand } from "@karigo/config";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Card, LoadingState, PrimaryButton, Screen, TextField } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";

export default function LoginScreen() {
  const { loading, login, user } = useAuth();
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
      setError(err instanceof Error ? err.message : "Partner sign in failed. Please try again.");
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
        {error ? <Text style={styles.error}>{error}</Text> : null}
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
  note: {
    color: brand.colors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center"
  }
});
