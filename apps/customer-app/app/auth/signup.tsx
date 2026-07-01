import { router } from "expo-router";
import { useState } from "react";
import { Button, Field, Message, NavLink, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";
import { friendlyError } from "../../src/lib/errors";

export default function SignUp() {
  const { register } = useAuth();
  const [fullName, setName] = useState("");
  const [phoneNumber, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true); setError("");
    try {
      const result = await register({ fullName, phoneNumber, email: email || undefined, password });
      router.push({ pathname: "/auth/otp", params: { phoneNumber, mockOtp: result.mockOtp ?? "" } });
    } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  }

  return <Screen title="Create your account">
    <Field placeholder="Full name" value={fullName} onChangeText={setName} />
    <Field placeholder="+234..." value={phoneNumber} onChangeText={setPhone} keyboardType="phone-pad" />
    <Field placeholder="Email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
    <Field placeholder="Password: uppercase, lowercase and number" value={password} onChangeText={setPassword} secureTextEntry />
    <Message error>{error}</Message>
    <Button title={busy ? "Creating account..." : "Create account"} onPress={submit} disabled={busy || !fullName || !phoneNumber || !password} />
    <NavLink href="/auth/login" label="Already registered? Sign in" />
  </Screen>;
}
