import { router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { Button, Field, Message, NavLink, PasswordField, Screen, ui } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";
import { friendlyError } from "../../src/lib/errors";

export default function SignUp() {
  const { register } = useAuth();
  const [fullName, setName] = useState("");
  const [phoneNumber, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true); setError("");
    try {
      const cleanReferralCode = referralCode.trim().toUpperCase();
      const result = await register({
        fullName,
        phoneNumber,
        email: email || undefined,
        password,
        referralCode: cleanReferralCode || undefined
      });
      router.push({ pathname: "/auth/otp", params: { phoneNumber, mockOtp: result.mockOtp ?? "" } });
    } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  }

  return <Screen title="Create your account">
    <Field placeholder="Full name" value={fullName} onChangeText={setName} />
    <Field placeholder="+234..." value={phoneNumber} onChangeText={setPhone} keyboardType="phone-pad" />
    <Field placeholder="Email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
    <PasswordField placeholder="Password: uppercase, lowercase and number" value={password} onChangeText={setPassword} visible={passwordVisible} onToggleVisible={() => setPasswordVisible((current) => !current)} />
    <Field
      placeholder="Referral code (optional)"
      value={referralCode}
      onChangeText={(value) => setReferralCode(value.trim().toUpperCase())}
      autoCapitalize="characters"
      autoCorrect={false}
    />
    <Text style={ui.muted}>Referral codes are optional. Rewards are tracked for future review and are not issued automatically.</Text>
    <Message error>{error}</Message>
    <Button title={busy ? "Creating account..." : "Create account"} onPress={submit} disabled={busy || !fullName || !phoneNumber || !password} />
    <NavLink href="/auth/login" label="Already registered? Sign in" />
  </Screen>;
}
