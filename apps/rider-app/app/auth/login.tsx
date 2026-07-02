import { Image, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import { brand } from "@karigo/config";
import { Button, Field, Message, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";
import { friendlyError } from "../../src/lib/errors";

export default function RiderLogin() {
  const { login } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <Screen>
      <Image source={require("../../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Rider login</Text>
      <Text style={styles.copy}>Sign in with your approved rider account.</Text>
      <Field placeholder="+234..." keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} />
      <Field placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Message error>{error}</Message>
      <Button title={busy ? "Signing in..." : "Sign in"} disabled={busy || !phoneNumber || !password} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { alignSelf: "center", height: 90, width: 210, marginBottom: 24 },
  title: { color: brand.colors.charcoal, fontSize: 28, fontWeight: "800" },
  copy: { color: brand.colors.muted, marginBottom: 10 }
});
