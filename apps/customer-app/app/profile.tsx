import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { CustomerProfile, customerApi, RetentionSummary } from "../src/api/customer.api";
import { Button, Card, Field, Loading, Message, NavLink, Protected, Screen, ui } from "../src/components/ui";
import { useAuth } from "../src/contexts/auth-context";
import { friendlyError } from "../src/lib/errors";

export default function Profile() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [retention, setRetention] = useState<RetentionSummary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { Promise.all([customerApi.profile(), customerApi.retention().catch(() => null)]).then(([p, r]) => { setProfile(p); setRetention(r); }).catch((e) => setError(friendlyError(e))); }, []);
  if (!profile && !error) return <Loading />;
  return <Protected><Screen title="Your profile"><Message error>{error}</Message>{profile ? <>
    <Field value={profile.fullName} onChangeText={(fullName) => setProfile({ ...profile, fullName })} />
    <Field value={profile.email ?? ""} placeholder="Email" onChangeText={(email) => setProfile({ ...profile, email })} keyboardType="email-address" autoCapitalize="none" />
    <Text style={ui.muted}>{profile.phoneNumber}</Text><Button title="Save profile" onPress={async () => { try { setProfile(await customerApi.update({ fullName: profile.fullName, email: profile.email || undefined })); } catch (e) { setError(friendlyError(e)); } }} />
    <Card><Text style={ui.cardTitle}>Account actions</Text><NavLink href="/addresses" label="Saved addresses" /><NavLink href="/support" label="Support centre" /><NavLink href="/notifications" label="Notifications" /></Card>
    <Card><Text style={ui.cardTitle}>Your KariGO activity</Text><Text>{retention?.totalOrders ?? 0} orders · {retention?.completedOrders ?? 0} completed</Text><Text>{retention?.promoUsageCount ?? 0} promos used</Text></Card>
    <Button title="Log out" tone="muted" onPress={async () => { await logout(); router.replace("/auth/login"); }} />
  </> : null}</Screen></Protected>;
}
