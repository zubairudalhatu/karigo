import { useState } from "react";
import { Text } from "react-native";
import { authApi } from "../../src/api/auth.api";
import { Button, Card, Message, PasswordField, Protected, Screen, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password changed successfully.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return <Protected>
    <Screen title="Change password">
      <Card>
        <Text style={ui.pageIntro}>Choose a strong password and do not share it with anyone. KariGO will never ask for your password or OTP in chat.</Text>
        <PasswordField placeholder="Current password" value={currentPassword} onChangeText={setCurrentPassword} visible={passwordVisible} onToggleVisible={() => setPasswordVisible((current) => !current)} />
        <PasswordField placeholder="New password" value={newPassword} onChangeText={setNewPassword} visible={passwordVisible} onToggleVisible={() => setPasswordVisible((current) => !current)} />
        <PasswordField placeholder="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} visible={passwordVisible} onToggleVisible={() => setPasswordVisible((current) => !current)} />
        <Message>{message}</Message>
        <Message error>{error}</Message>
        <Button title={busy ? "Saving..." : "Save new password"} onPress={submit} disabled={busy || !currentPassword || !newPassword || !confirmPassword} />
      </Card>
    </Screen>
  </Protected>;
}
