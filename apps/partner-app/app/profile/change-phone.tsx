import { router } from "expo-router";
import { useState } from "react";
import { authApi } from "../../src/api/auth.api";
import { Card, Hero, MutedText, PrimaryButton, Screen, TextField } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";

export default function PartnerPhoneChange() {
  const { logout } = useAuth(); const [newPhoneNumber, setNewPhoneNumber] = useState(""); const [currentPassword, setCurrentPassword] = useState(""); const [otp, setOtp] = useState(""); const [requestId, setRequestId] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function submit() { setBusy(true); setMessage(""); try { if (!requestId) { const result = await authApi.startPhoneChange({ newPhoneNumber, currentPassword }); setRequestId(result.requestId); setMessage(`Verification code sent to ${result.newPhoneNumberMasked}.`); } else { await authApi.confirmPhoneChange({ requestId, otp }); await logout(); router.replace("/auth/login"); } } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Phone change could not be completed."); } finally { setBusy(false); } }
  return <Screen><Hero eyebrow="Account security" title="Change phone number" subtitle="Confirm your password and verify the new number before KariGO changes your Partner identity." /><Card>{message ? <MutedText>{message}</MutedText> : null}{requestId ? <TextField label="Verification code" keyboardType="number-pad" maxLength={6} value={otp} onChangeText={(value) => setOtp(value.replace(/\D/g, ""))} /> : <><TextField label="New phone number" keyboardType="phone-pad" value={newPhoneNumber} onChangeText={setNewPhoneNumber} /><TextField label="Current password" secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} /></>}<PrimaryButton label={busy ? "Working..." : requestId ? "Verify and change" : "Send verification code"} disabled={busy} onPress={() => void submit()} /><MutedText>All sessions are revoked after a change. Payout and sensitive security actions are held for 24 hours. Lost-SIM recovery requires audited Support review.</MutedText></Card></Screen>;
}
