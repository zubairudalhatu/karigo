import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Linking, StyleSheet, Text, View } from "react-native";
import { brand } from "@karigo/config";
import { captainVehicleTypes } from "@karigo/shared-types";
import type { CaptainAccess, CaptainWorkState } from "../src/api/captain-access.api";
import { captainAccessApi } from "../src/api/captain-access.api";
import { notificationsApi } from "../src/api/notifications.api";
import { riderApi, RiderProfile } from "../src/api/rider.api";
import { Button, Card, Loading, Message, NavLink, Protected, Screen, StatusBadge, ui } from "../src/components/ui";
import { useAuth } from "../src/contexts/auth-context";
import { friendlyError } from "../src/lib/errors";
import { hasAnyCaptainApplication } from "../src/lib/captain-application-status";
import { projectCaptainOperationalState } from "../src/lib/captain-operational-state";

function initials(name?: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return (parts[0]?.[0] ?? "C") + (parts[1]?.[0] ?? "");
}

function compactValue(value?: string | number | null) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return String(value);
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  const display = compactValue(value);
  if (!display) return null;
  return <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{display}</Text>
  </View>;
}

function areaList(values?: string[] | null) {
  return values?.filter(Boolean).join("\n") || null;
}
function operatingAreaList(values?: Array<{ label?: string | null; cityName?: string | null }> | null) {
  return areaList(values?.map((area) => area.label ?? area.cityName ?? "").filter(Boolean));
}


function catalogLabel(value?: string | null) {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return null;
  return captainVehicleTypes.find((option) => option.value === normalized || option.label.toUpperCase() === normalized)?.label ??
    normalized
      .split("_")
      .filter(Boolean)
      .map((part) => part.length <= 3 ? part : `${part[0]}${part.slice(1).toLowerCase()}`)
      .join(" ");
}

export default function Profile() {
  const { biometricAvailable, biometricEnabled, logout, setBiometricSignIn } = useAuth();
  const [captainAccess, setCaptainAccess] = useState<CaptainAccess | null>(null);
  const [workState, setWorkState] = useState<CaptainWorkState | null>(null);
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(0);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [access, state] = await Promise.all([
        captainAccessApi.resolve(),
        captainAccessApi.workState().catch(() => null)
      ]);
      const projection = projectCaptainOperationalState(access, state);
      setCaptainAccess(access);
      setWorkState(state);
      const notificationCount = projection.hasAnyActiveMode ? await notificationsApi.unreadCount().catch(() => ({ count: 0 })) : { count: 0 };
      setUnread(notificationCount.count);
      setProfile(projection.hasActiveDeliveryMode ? await riderApi.profile().catch(() => null) : null);
      setError("");
    } catch (e) {
      setError(friendlyError(e));
      setCaptainAccess(null);
      setWorkState(null);
      setProfile(null);
      setUnread(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const projection = useMemo(() => projectCaptainOperationalState(captainAccess, workState), [captainAccess, workState]);
  const account = captainAccess?.account;
  const displayName = profile?.user?.fullName ?? account?.fullName ?? "KariGO Captain";
  const displayPhone = profile?.phoneNumber ?? account?.phoneNumber;
  const displayEmail = profile?.user?.email ?? account?.email;
  const displayPhoto = profile?.photoUrl ?? account?.profilePhotoUrl;
  const isOnline = projection.effectiveDeliveryOnline || projection.effectiveRideOnline;
  const rideProfile = captainAccess?.rideCaptainProfile;
  const modeRows = [projection.delivery, projection.ride];
  const deliveryCaptainProfile = captainAccess?.deliveryCaptainProfile;

  if (loading && !captainAccess) return <Loading label="Preparing Captain profile..." />;

  async function toggleBiometricSignIn() {
    setBiometricBusy(true);
    setError("");
    setMessage("");
    try {
      await setBiometricSignIn(!biometricEnabled);
      setMessage(!biometricEnabled ? "Biometric sign-in enabled on this device." : "Biometric sign-in disabled on this device.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBiometricBusy(false);
    }
  }

  return <Protected><Screen title="Captain Profile" subtitle="Your KariGO Captain identity, modes and account controls." refreshing={loading} onRefresh={load}><Message error>{error}</Message><Message>{message}</Message>
    <Card tone="soft">
      <View style={styles.headerRow}>
        {displayPhoto ? <Image source={{ uri: displayPhoto }} style={styles.avatarImage} /> : <View style={styles.avatar}><Text style={styles.avatarText}>{initials(displayName).toUpperCase()}</Text></View>}
        <View style={styles.headerText}>
          <Text style={ui.heroTitle}>{displayName}</Text>
          {displayPhone ? <Text style={ui.muted}>{displayPhone}</Text> : null}
          {displayEmail ? <Text style={ui.muted}>{displayEmail}</Text> : null}
        </View>
      </View>
      <View style={styles.badgeRow}>
        <StatusBadge status={projection.overallStatus} />
        <StatusBadge status={isOnline ? "Online" : "Offline" } />
      </View>
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Captain access</Text>
      <Text style={ui.muted}>{projection.overallMessage}</Text>
      {modeRows.map((mode) => <View key={mode.key} style={styles.modeRow}>
        <View style={ui.spaceBetween}>
          <Text style={styles.modeTitle}>{mode.label}</Text>
          <StatusBadge status={mode.operationsLabel} />
        </View>
        <Text style={ui.muted}>Application: {mode.applicationLabel}</Text>
        <Text style={ui.muted}>Documents: {mode.documentsLabel}</Text>
        {!mode.active && mode.eligibilityReason ? <Text style={styles.reason}>{mode.eligibilityReason}</Text> : null}
      </View>)}
      <NavLink href={hasAnyCaptainApplication(captainAccess) ? "/application-status" : "/auth/apply"} label={hasAnyCaptainApplication(captainAccess) ? "View application status" : "Start Captain application"} />
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Vehicle information</Text>
      <InfoRow label="Ride vehicle" value={rideProfile?.vehicle} />
      <InfoRow label="Ride vehicle type" value={rideProfile?.vehicleTypeLabel ?? catalogLabel(rideProfile?.vehicleType)} />
      <InfoRow label="Ride colour" value={rideProfile?.vehicleColourLabel ?? rideProfile?.vehicleColour} />
      <InfoRow label="Ride plate number" value={rideProfile?.vehiclePlateNumber} />
      <InfoRow label="Delivery vehicle" value={catalogLabel(profile?.vehicleType)} />
      <InfoRow label="Delivery plate number" value={profile?.plateNumber} />
      <InfoRow label="Driver licence" value={profile?.licenseNumber} />
      {!rideProfile?.vehicle && !profile?.vehicleType ? <Text style={ui.muted}>Vehicle details will appear after KariGO links an approved Captain profile.</Text> : null}
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Operating areas</Text>
      <InfoRow label="Approved Ride operating areas" value={operatingAreaList(rideProfile?.approvedOperatingAreas)} />
      <InfoRow label="Ride primary operating area" value={rideProfile?.primaryOperatingArea?.label ?? rideProfile?.primaryOperatingArea?.cityName} />
      <InfoRow label="Approved Delivery operating areas" value={operatingAreaList(deliveryCaptainProfile?.approvedOperatingAreas)} />
      <InfoRow label="Delivery primary operating area" value={deliveryCaptainProfile?.primaryOperatingArea?.label ?? deliveryCaptainProfile?.primaryOperatingArea?.cityName} />
      {rideProfile?.operatingAreasRequireReview || deliveryCaptainProfile?.operatingAreasRequireReview ? <Text style={ui.muted}>Operating areas require review</Text> : null}
      {!rideProfile?.approvedOperatingAreas?.length && !deliveryCaptainProfile?.approvedOperatingAreas?.length ? <Text style={ui.muted}>KariGO Operations manages active service areas for each Captain mode.</Text> : null}
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Documents</Text>
      <Text style={ui.muted}>Document review, expiry and revision requests are shown on Application Status. Private document files are not exposed in the production app UI.</Text>
      <NavLink href="/application-status" label="Open document and application status" />
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Payout account</Text>
      <Text style={ui.muted}>KariGO Operations reviews settlements separately. Payout automation and wallet withdrawals are not controlled from the Captain app.</Text>
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Notifications</Text>
      <Text style={ui.muted}>{unread ? `${unread > 99 ? "99+" : unread} unread` : "No unread updates"}</Text>
      <NavLink href="/notifications" label="View notifications" />
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Privacy and security</Text>
      <Text style={ui.muted}>Biometric sign-in refreshes a saved backend session after device fingerprint or face unlock. Password sign-in is required if the saved session is missing or revoked.</Text>
      <Text style={ui.muted}>Device support: {biometricAvailable ? "Available" : "Set up biometrics in your phone settings first."}</Text>
      <Button title={biometricBusy ? "Updating..." : biometricEnabled ? "Disable biometric sign-in" : "Enable biometric sign-in"} tone="muted" onPress={toggleBiometricSignIn} disabled={biometricBusy || (!biometricAvailable && !biometricEnabled)} />
      <View style={styles.legalLinks}>
        <NavLink href="/legal/privacy" label="Privacy Policy" />
        <NavLink href="/legal/terms" label="Terms" />
        <NavLink href="/account-deletion" label="Deactivate my Captain access" />
      </View>
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Support</Text>
      <Text style={ui.muted}>For account, assignment or document issues, contact KariGO Operations through the approved support channel shared with your Captain account.</Text>
      <Button title="Open Support" tone="muted" onPress={() => Linking.openURL("https://www.karigo.com.ng/contact")} />
    </Card>

    <Button tone="muted" title="Log out" onPress={async () => { await logout(); router.replace("/auth/login"); }} />
  </Screen></Protected>;
}

const styles = StyleSheet.create({
  headerRow: { alignItems: "center", flexDirection: "row", gap: 14 },
  headerText: { flex: 1, gap: 2 },
  avatar: { alignItems: "center", backgroundColor: brand.colors.primary, borderRadius: 28, height: 56, justifyContent: "center", width: 56 },
  avatarImage: { borderRadius: 32, height: 64, width: 64 },
  avatarText: { color: brand.colors.white, fontSize: 19, fontWeight: "900" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modeRow: { borderTopColor: brand.colors.border, borderTopWidth: 1, gap: 8, paddingTop: 12 },
  modeTitle: { color: brand.colors.charcoal, fontSize: 16, fontWeight: "900" },
  reason: { color: brand.colors.muted, fontSize: 12, fontWeight: "800" },
  infoRow: { borderBottomColor: brand.colors.border, borderBottomWidth: 1, gap: 2, paddingVertical: 8 },
  infoLabel: { color: brand.colors.muted, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  infoValue: { color: brand.colors.charcoal, fontWeight: "900", lineHeight: 21 },
  legalLinks: { gap: 4 }
});
