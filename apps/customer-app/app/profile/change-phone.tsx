import { router } from "expo-router";
import { useState } from "react";
import { TextInput } from "react-native";
import { authApi } from "../../src/api/auth.api";
import { Button, Card, Message, PasswordField, Protected, Screen, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

export default function ChangePhoneScreen() {
  const [newPhoneNumber, setNewPhoneNumber] = useState(""); const [currentPassword, setCurrentPassword] = useState(""); const [otp, setOtp] = useState("");
  const [requestId, setRequestId] = useState(""); const [visible, setVisible] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function submit() { setBusy(true); setError(""); try { if (!requestId) { const result = await authApi.startPhoneChange({ newPhoneNumber, currentPassword }); setRequestId(result.requestId); setMessage(`Verification code sent to ${result.newPhoneNumberMasked}.`); } else { await authApi.confirmPhoneChange({ requestId, otp }); setMessage("Phone changed. Sign in again on all devices."); setTimeout(() => router.replace("/auth/login"), 800); } } catch (cause) { setError(friendlyError(cause)); } finally { setBusy(false); } }
  return <Protected><Screen title="Change phone number"><Card><Message>{message}</Message><Message error>{error}</Message>{!requestId ? <><TextInput accessibilityLabel="New phone number" keyboardType="phone-pad" placeholder="New phone number" placeholderTextColor="#6B7280" value={newPhoneNumber} onChangeText={setNewPhoneNumber} style={ui.input} /><PasswordField placeholder="Current password" value={currentPassword} onChangeText={setCurrentPassword} visible={visible} onToggleVisible={() => setVisible(!visible)} /></> : <TextInput accessibilityLabel="Verification code" keyboardType="number-pad" maxLength={6} placeholder="6-digit verification code" placeholderTextColor="#6B7280" value={otp} onChangeText={(value) => setOtp(value.replace(/\D/g, ""))} style={ui.input} />}<Button title={busy ? "Verifying..." : requestId ? "Verify and change number" : "Send verification code"} disabled={busy || (!requestId ? !newPhoneNumber || !currentPassword : otp.length !== 6)} onPress={() => void submit()} /><Message>Lost your old SIM? Contact KariGO Support for identity-reviewed recovery. OTP cannot be bypassed.</Message></Card></Screen></Protected>;
}
