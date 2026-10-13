import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { AppState, Linking, Text } from "react-native";
import { useAuth } from "../contexts/auth-context";
import { iosPushPermission, registerCustomerIosPush, type IosPushState } from "../lib/customer-ios-push";
import { Button, Card, Message, ui } from "./ui";

export function IosNotificationSettings() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<IosPushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const state = iosPushPermission(await Notifications.getPermissionsAsync());
        if (!active) return;
        setPermission(state); setRegistered(false);
        if (state === "granted" && user) {
          const saved = await registerCustomerIosPush(user.id);
          if (active) { setRegistered(saved); setError(""); }
        }
      } catch { if (active) setError("Could not complete notification setup. Please try again."); }
    };
    void refresh();
    const appState = AppState.addEventListener("change", (state) => { if (state === "active") void refresh(); });
    const token = Notifications.addPushTokenListener(() => { void refresh(); });
    return () => { active = false; appState.remove(); token.remove(); };
  }, [user?.id]);
  async function enable() {
    if (busy || !user) return;
    setBusy(true); setError("");
    try {
      const saved = await registerCustomerIosPush(user.id, true);
      setRegistered(saved);
      setPermission(iosPushPermission(await Notifications.getPermissionsAsync()));
    } catch { setError("Could not register this iPhone for notifications. Please try again."); }
    finally { setBusy(false); }
  }
  return <Card>
    <Text style={ui.cardTitle}>Push notifications</Text>
    <Text accessibilityLiveRegion="polite" style={ui.muted}>{permission === null ? "Checking notification permission…"
      : permission === "undetermined" ? "Permission not requested"
        : permission === "denied" ? "Notifications disabled" : "Notifications enabled"}</Text>
    {permission === "granted" ? <Text style={ui.muted}>{registered ? "This iPhone is registered for KariGO updates." : "Device registration is not complete."}</Text> : null}
    <Message error>{error}</Message>
    {permission === "undetermined" ? <Button title={busy ? "Enabling…" : "Enable notifications"} disabled={busy} onPress={() => void enable()} /> : null}
    {permission === "denied" ? <Button title="Open Settings" onPress={() => void Linking.openSettings().catch(() => setError("Please open iPhone Settings to enable KariGO notifications."))} /> : null}
    {permission === "granted" && !registered ? <Button title={busy ? "Registering…" : "Retry device registration"} disabled={busy} onPress={() => void enable()} /> : null}
  </Card>;
}
