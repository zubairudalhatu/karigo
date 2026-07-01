import { router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { Button, Field, Message, NavLink, Screen, ui } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";
import { friendlyError } from "../../src/lib/errors";

export default function CustomerLogin() {
  const { login } = useAuth();
  const [phoneNumber, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true); setError("");
    try {
      await login({ phoneNumber, password });
      router.replace("/tabs/home");
    } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  }

  return <Screen title="Customer login">
    <Text style={ui.muted}>Sign in to order, track deliveries and get support.</Text>
    <Field placeholder="+234..." value={phoneNumber} onChangeText={setPhone} keyboardType="phone-pad" autoCapitalize="none" />
    <Field placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
    <Message error>{error}</Message>
    <Button title={busy ? "Signing in..." : "Sign in"} onPress={submit} disabled={busy || !phoneNumber || !password} />
    <NavLink href="/auth/signup" label="New to KariGO? Create account" />
  </Screen>;
}
