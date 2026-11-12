import { useAuth } from "../../src/contexts/auth-context";
import { useEffect, useState } from "react";
import { Switch, Text, Linking } from "react-native";
import { AuthGate } from "../../src/components/auth-gate";
import { Card, Hero, MutedText, PrimaryButton, Screen } from "../../src/components/ui";
import { enablePartnerPush, partnerPushPreferences, updatePartnerPushPreferences, PartnerNotificationPreferences } from "../../src/lib/partner-push";

function Preferences() {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [value, setValue] = useState<PartnerNotificationPreferences>({ enabled: false, orders: true, settlements: false });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true; setLoaded(false);
    void partnerPushPreferences().then(result => { if (active) { setValue(result); setLoaded(true); } })
      .catch(() => { if (active) setMessage("Notifications require an approved Partner profile."); });
    return () => { active = false; };
  }, [user?.id]);
  async function save(enable: boolean) {
    setBusy(true); setMessage("");
    try {
      if (enable) await enablePartnerPush(value);
      else await updatePartnerPushPreferences({ ...value, enabled: false });
      setValue(await partnerPushPreferences()); setMessage("Notification preferences saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Notification settings could not be saved."); }
    finally { setBusy(false); }
  }
  return <Screen><Hero title="Partner notifications" subtitle="Choose operational updates for this business." />
    <Card><MutedText>Lock-screen messages contain only a general update. Open Partner to view order or settlement details.</MutedText>
      <Text>Orders and status updates</Text><Switch accessibilityLabel="Order notifications" disabled={busy || !loaded} value={value.orders} onValueChange={orders => setValue({ ...value, orders })} />
      <Text>Paid settlement updates</Text><Switch accessibilityLabel="Settlement notifications" disabled={busy || !loaded} value={value.settlements} onValueChange={settlements => setValue({ ...value, settlements })} />
      <PrimaryButton label="Enable / save notifications" disabled={busy || !loaded} onPress={() => void save(true)} />
      <PrimaryButton label="Disable Partner notifications" disabled={busy || !loaded} variant="secondary" onPress={() => void save(false)} />
      <PrimaryButton label="Device notification Settings" variant="secondary" onPress={() => void Linking.openSettings()} />
      <MutedText>{message}</MutedText></Card></Screen>;
}
export default function NotificationSettings() { return <AuthGate><Preferences /></AuthGate>; }
