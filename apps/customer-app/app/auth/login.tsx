import { router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { Button, Field, Message, NavLink, PasswordField, Screen, ui } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";
import { friendlyError } from "../../src/lib/errors";

export default function CustomerLogin() {
  const { login, sessionMessage } = useAuth();
  const [phoneNumber, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true); setError("");
    try {
      await login({ phoneNumber, password });
      router.replace("/tabs/home");
    } catch (e) { setError(friendlyError(e, "login")); } finally { setBusy(false); }
  }

  return <Screen title="Customer login">
    <Text style={ui.muted}>Sign in to order, track deliveries and get support.</Text>
    <Field placeholder="+234..." value={phoneNumber} onChangeText={setPhone} keyboardType="phone-pad" autoCapitalize="none" />
    <PasswordField placeholder="Password" value={password} onChangeText={setPassword} visible={passwordVisible} onToggleVisible={() => setPasswordVisible((current) => !current)} />
    <Message>{sessionMessage}</Message>
    <Message error>{error}</Message>
    <Button title={busy ? "Signing in..." : "Sign in"} onPress={submit} disabled={busy || !phoneNumber || !password} />
    <NavLink href="/auth/signup" label="New to KariGO? Create account" />
  </Screen>;
}
