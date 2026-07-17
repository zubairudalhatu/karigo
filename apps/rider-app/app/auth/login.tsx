import { Image, StyleSheet, Text } from "react-native";
import { Link, Redirect, router } from "expo-router";
import { useState } from "react";
import { brand } from "@karigo/config";
import { Button, Field, Loading, Message, PasswordField, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";
import { friendlyError } from "../../src/lib/errors";

export default function CaptainLogin() {
  const { login, loading, user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true); setError("");
    try {
      await login({ phoneNumber, password });
      router.replace("/tabs/dashboard");
    } catch (e) {
      setError(friendlyError(e, "login"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading label="Restoring Captain session..." />;
  if (user) return <Redirect href="/tabs/dashboard" />;

  return (
    <Screen>
      <Image source={require("../../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Captain login</Text>
      <Text style={styles.copy}>Sign in with your approved KariGO Captain account.</Text>
      <Field placeholder="+234..." keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} />
      <PasswordField placeholder="Password" visible={passwordVisible} onToggleVisible={() => setPasswordVisible((visible) => !visible)} value={password} onChangeText={setPassword} />
      <Message error>{error}</Message>
      <Button title={busy ? "Signing in..." : "Sign in"} disabled={busy || !phoneNumber || !password} onPress={submit} />
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
  applyLink: { color: brand.colors.primary, fontWeight: "900", paddingVertical: 8, textAlign: "center" }
});
