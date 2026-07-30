import { Image, StyleSheet, Text } from "react-native";
import { Link, Redirect, router } from "expo-router";
import { useState } from "react";
import { brand } from "@karigo/config";
import { Button, Field, Loading, Message, PasswordField, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";
import { friendlyError } from "../../src/lib/errors";

export default function CaptainLogin() {
  const { biometricAvailable, biometricEnabled, login, loading, refreshWithBiometrics, user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true); setError("");
    try {
      await login({ phoneNumber, password });
      router.replace("/captain-access");
    } catch (e) {
      setError(friendlyError(e, "login"));
    } finally {
      setBusy(false);
    }
  }

  async function biometricSignIn() {
    setBusy(true);
    setError("");
    try {
      await refreshWithBiometrics();
      router.replace("/captain-access");
    } catch (e) {
      setError(friendlyError(e, "login"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading label="Restoring Captain session..." />;
  if (user) return <Redirect href="/captain-access" />;

  return (
    <Screen>
      <Image source={require("../../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Captain login</Text>
      <Text style={styles.copy}>This account can continue Captain onboarding. Sign in to proceed.</Text>
      <Field placeholder="+234..." keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} />
      <PasswordField placeholder="Password" visible={passwordVisible} onToggleVisible={() => setPasswordVisible((visible) => !visible)} value={password} onChangeText={setPassword} />
      <Message error>{error}</Message>
      <Button title={busy ? "Signing in..." : "Sign in"} disabled={busy || !phoneNumber || !password} onPress={submit} />
      {biometricEnabled ? <Button title="Sign in with biometrics" tone="muted" disabled={busy || !biometricAvailable} onPress={biometricSignIn} /> : null}
      <Link href="/auth/forgot-password" style={styles.forgotLink}>Forgot password?</Link>
      <Text style={styles.applyCopy}>New to KariGO Captain?</Text>
      <Link href="/auth/apply" style={styles.applyLink}>Apply to become a Captain</Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { alignSelf: "center", height: 90, width: 210, marginBottom: 24 },
  title: { color: brand.colors.charcoal, fontSize: 28, fontWeight: "800" },
  copy: { color: brand.colors.muted, marginBottom: 10 },
  applyCopy: { color: brand.colors.muted, marginTop: 12, textAlign: "center" },
  applyLink: { color: brand.colors.primary, fontWeight: "900", paddingVertical: 8, textAlign: "center" },
  forgotLink: { color: brand.colors.charcoal, fontWeight: "800", paddingVertical: 8, textAlign: "center" }
});
