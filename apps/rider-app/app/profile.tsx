import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import { captainVehicleTypes } from "@karigo/shared-types";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { CaptainAccess, CaptainWorkState } from "../src/api/captain-access.api";
import { captainAccessApi } from "../src/api/captain-access.api";
import { notificationsApi } from "../src/api/notifications.api";
import { riderApi, RiderProfile } from "../src/api/rider.api";
import { Button, Loading, Message, Protected, Screen, StatusBadge } from "../src/components/ui";
import { useAuth } from "../src/contexts/auth-context";
import { friendlyError } from "../src/lib/errors";
import { hasAnyCaptainApplication } from "../src/lib/captain-application-status";
import { projectCaptainOperationalState } from "../src/lib/captain-operational-state";

function initials(name?: string | null) { const parts = name?.trim().split(/\s+/).filter(Boolean) ?? []; return (parts[0]?.[0] ?? "C") + (parts[1]?.[0] ?? ""); }
function catalogLabel(value?: string | null) {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return null;
  return captainVehicleTypes.find((option) => option.value === normalized || option.label.toUpperCase() === normalized)?.label ?? normalized.split("_").map((part) => part.length <= 3 ? part : `${part[0]}${part.slice(1).toLowerCase()}`).join(" ");
}
function operatingAreas(values?: Array<{ label?: string | null; cityName?: string | null }> | null) { return values?.map((area) => area.label ?? area.cityName).filter(Boolean).join(", ") || "Managed by KariGO"; }

type SettingProps = { icon: keyof typeof Feather.glyphMap; label: string; value?: string; onPress?: () => void; warning?: boolean };
function SettingRow({ icon, label, value, onPress, warning }: SettingProps) {
  return <Pressable accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={value ? `${label}, ${value}` : label} disabled={!onPress} onPress={onPress} style={styles.settingRow}>
    <View style={[styles.settingIcon, warning && styles.settingIconWarning]}><Feather name={icon} size={18} color={warning ? "#B91C1C" : brand.colors.primary} /></View>
    <View style={styles.settingCopy}><Text style={[styles.settingLabel, warning && styles.warningText]}>{label}</Text>{value ? <Text numberOfLines={2} style={styles.settingValue}>{value}</Text> : null}</View>
    {onPress ? <Feather name="chevron-right" size={19} color={brand.colors.muted} /> : null}
  </Pressable>;
}

export default function Profile() {
  const { biometricAvailable, biometricEnabled, logout, setBiometricSignIn } = useAuth();
  const [captainAccess, setCaptainAccess] = useState<CaptainAccess | null>(null);
  const [workState, setWorkState] = useState<CaptainWorkState | null>(null);
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [unread, setUnread] = useState(0);
  const [biometricBusy, setBiometricBusy] = useState(false); const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [access, state] = await Promise.all([captainAccessApi.resolve(), captainAccessApi.workState().catch(() => null)]);
      const projection = projectCaptainOperationalState(access, state); setCaptainAccess(access); setWorkState(state);
      setUnread(projection.hasAnyActiveMode ? (await notificationsApi.unreadCount().catch(() => ({ count: 0 }))).count : 0);
      setProfile(projection.hasActiveDeliveryMode ? await riderApi.profile().catch(() => null) : null); setError("");
    } catch (cause) { setError(friendlyError(cause)); setCaptainAccess(null); setWorkState(null); setProfile(null); setUnread(0); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const projection = useMemo(() => projectCaptainOperationalState(captainAccess, workState), [captainAccess, workState]);
  if (loading && !captainAccess) return <Loading label="Preparing Captain profile..." />;

  const account = captainAccess?.account; const rideProfile = captainAccess?.rideCaptainProfile; const deliveryProfile = captainAccess?.deliveryCaptainProfile;
  const displayName = profile?.user?.fullName ?? account?.fullName ?? "KariGO Captain";
  const displayPhone = profile?.phoneNumber ?? account?.phoneNumber; const displayPhoto = profile?.photoUrl ?? account?.profilePhotoUrl;
  const captainCode = deliveryProfile?.riderCode ?? profile?.riderCode ?? (captainAccess?.rideCaptainApplication.exists ? captainAccess.rideCaptainApplication.applicationReference : null);
  const vehicle = rideProfile?.vehicle ?? catalogLabel(profile?.vehicleType) ?? "Vehicle details pending";
  const area = operatingAreas(rideProfile?.approvedOperatingAreas?.length ? rideProfile.approvedOperatingAreas : deliveryProfile?.approvedOperatingAreas);
  const workPreference = `${projection.ride.active ? workState?.desiredRideOnline ? "Ride on" : "Ride off" : "Ride inactive"} • ${projection.delivery.active ? workState?.desiredDeliveryOnline ? "Delivery on" : "Delivery off" : "Delivery inactive"}`;

  async function toggleBiometricSignIn() {
    setBiometricBusy(true); setError(""); setMessage("");
    try { await setBiometricSignIn(!biometricEnabled); setMessage(!biometricEnabled ? "Biometric sign-in enabled on this device." : "Biometric sign-in disabled on this device."); }
    catch (cause) { setError(friendlyError(cause)); } finally { setBiometricBusy(false); }
  }

  return <Protected><Screen title="Profile" subtitle="Your Captain account and settings." refreshing={loading} onRefresh={load}>
    <Message error>{error}</Message><Message>{message}</Message>
    <View style={styles.identity}>
      {displayPhoto ? <Image source={{ uri: displayPhoto }} style={styles.avatarImage} /> : <View style={styles.avatar}><Text style={styles.avatarText}>{initials(displayName).toUpperCase()}</Text></View>}
      <View style={styles.identityCopy}><Text style={styles.name}>{displayName}</Text>{displayPhone ? <Text style={styles.phone}>{displayPhone}</Text> : null}<View style={styles.badges}><StatusBadge status={projection.overallStatus} />{captainCode ? <Text style={styles.code}>{captainCode}</Text> : null}</View></View>
    </View>

    <Text style={styles.sectionLabel}>DRIVING</Text>
    <View style={styles.settingsSurface}>
      <SettingRow icon="truck" label="Vehicle" value={vehicle} onPress={() => router.push("/application-status")} />
      <SettingRow icon="map-pin" label="Operating areas" value={area} onPress={() => router.push("/application-status")} />
      <SettingRow icon="sliders" label="Work preferences" value={workPreference} onPress={() => router.push("/tabs/dashboard")} />
      <SettingRow icon="file-text" label="Application and documents" value={hasAnyCaptainApplication(captainAccess) ? "View status" : "Start application"} onPress={() => router.push(hasAnyCaptainApplication(captainAccess) ? "/application-status" : "/auth/apply")} />
    </View>
    <Text style={styles.guardrail}>KariGO controls matching. Automatic matching and auto-accept remain off.</Text>

    <Text style={styles.sectionLabel}>ACCOUNT</Text>
    <View style={styles.settingsSurface}>
      <SettingRow icon="credit-card" label="Payout account" value="Settlements are reviewed by KariGO" />
      <SettingRow icon="bell" label="Notifications" value={unread ? `${unread > 99 ? "99+" : unread} unread` : "No unread updates"} onPress={() => router.push("/notifications")} />
      <SettingRow icon="navigation" label="Navigation" value="Device maps" />
      <SettingRow icon="lock" label="Biometric sign-in" value={biometricEnabled ? "On" : biometricAvailable ? "Off" : "Set up on your phone first"} onPress={biometricAvailable || biometricEnabled ? () => void toggleBiometricSignIn() : undefined} />
      {biometricBusy ? <Text style={styles.updating}>Updating biometric preference...</Text> : null}
    </View>

    <Text style={styles.sectionLabel}>SAFETY & HELP</Text>
    <View style={styles.settingsSurface}>
      <SettingRow icon="shield" label="Safety Centre" value="Safety guidance and alerts" onPress={() => router.push("/notifications")} />
      <SettingRow icon="help-circle" label="Support" value="Account, assignment or document help" onPress={() => void Linking.openURL("https://www.karigo.com.ng/contact")} />
      <SettingRow icon="alert-circle" label="Report an issue" onPress={() => void Linking.openURL("https://www.karigo.com.ng/contact")} />
    </View>

    <Text style={styles.sectionLabel}>LEGAL</Text>
    <View style={styles.settingsSurface}>
      <SettingRow icon="eye" label="Privacy Policy" onPress={() => router.push("/legal/privacy")} />
      <SettingRow icon="book-open" label="Terms" onPress={() => router.push("/legal/terms")} />
      <SettingRow icon="info" label="About KariGO" value="Captain 1.1" />
      <SettingRow icon="user-x" label="Deactivate Captain access" warning onPress={() => router.push("/account-deletion")} />
    </View>
    <Button tone="muted" title="Log out" onPress={async () => { await logout(); router.replace("/auth/login"); }} />
  </Screen></Protected>;
}

const styles = StyleSheet.create({
  identity: { alignItems: "center", backgroundColor: brand.colors.charcoal, borderRadius: 24, flexDirection: "row", gap: 14, padding: 18 },
  identityCopy: { flex: 1, gap: 4 }, name: { color: brand.colors.white, fontSize: 22, fontWeight: "900" }, phone: { color: "#D1D5DB", fontSize: 13 }, badges: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 }, code: { color: "#FDE68A", fontSize: 11, fontWeight: "900" },
  avatar: { alignItems: "center", backgroundColor: brand.colors.primary, borderRadius: 30, height: 60, justifyContent: "center", width: 60 }, avatarImage: { borderRadius: 30, height: 60, width: 60 }, avatarText: { color: brand.colors.white, fontSize: 20, fontWeight: "900" },
  sectionLabel: { color: brand.colors.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginBottom: -7, marginTop: 3 },
  settingsSurface: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 20, borderWidth: 1, overflow: "hidden", paddingHorizontal: 14 },
  settingRow: { alignItems: "center", borderBottomColor: brand.colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 11, minHeight: 66, paddingVertical: 9 },
  settingIcon: { alignItems: "center", backgroundColor: "#FFF1ED", borderRadius: 12, height: 38, justifyContent: "center", width: 38 }, settingIconWarning: { backgroundColor: "#FEF2F2" },
  settingCopy: { flex: 1, gap: 2 }, settingLabel: { color: brand.colors.charcoal, fontSize: 14, fontWeight: "900" }, settingValue: { color: brand.colors.muted, fontSize: 11.5, lineHeight: 16 }, warningText: { color: "#B91C1C" },
  guardrail: { color: brand.colors.muted, fontSize: 11.5, lineHeight: 17, paddingHorizontal: 4 }, updating: { color: brand.colors.muted, fontSize: 11.5, paddingBottom: 10 }
});
