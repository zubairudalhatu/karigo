import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { brand } from "@karigo/config";
import { CaptainAccess, captainAccessApi } from "../src/api/captain-access.api";
import { notificationsApi } from "../src/api/notifications.api";
import { riderApi, RiderProfile } from "../src/api/rider.api";
import { Button, Card, Field, Loading, Message, NavLink, Protected, Screen, StatusBadge, ui } from "../src/components/ui";
import { useAuth } from "../src/contexts/auth-context";
import { friendlyError } from "../src/lib/errors";
import { hasAnyCaptainApplication } from "../src/lib/captain-application-status";
import { projectCaptainOperationalState } from "../src/lib/captain-operational-state";
import { requestCaptainForegroundLocation } from "../src/lib/location";

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

function isSecureImageUrl(value: string) {
  return !value.trim() || /^https:\/\/.+\.(png|jpe?g|webp)(\?.*)?$/i.test(value.trim());
}

export default function Profile() {
  const { biometricAvailable, biometricEnabled, logout, setBiometricSignIn } = useAuth();
  const [captainAccess, setCaptainAccess] = useState<CaptainAccess | null>(null);
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [preferredAreas, setPreferredAreas] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(0);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const access = await captainAccessApi.resolve();
      const projection = projectCaptainOperationalState(access);
      setCaptainAccess(access);
      const notificationCount = projection.hasAnyActiveMode ? await notificationsApi.unreadCount().catch(() => ({ count: 0 })) : { count: 0 };
      setUnread(notificationCount.count);
      if (projection.hasActiveDeliveryMode) {
        const p = await riderApi.profile().catch(() => null);
        setProfile(p);
        setLat(String(p?.currentLatitude ?? ""));
        setLng(String(p?.currentLongitude ?? ""));
        setPhotoUrl(p?.photoUrl ?? "");
        setPreferredAreas((p?.preferredServiceAreas ?? []).join(", "));
      } else {
        setProfile(null);
      }
      setError("");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const projection = useMemo(() => projectCaptainOperationalState(captainAccess), [captainAccess]);
  const account = captainAccess?.account;
  const displayName = profile?.user?.fullName ?? account?.fullName ?? "KariGO Captain";
  const displayPhone = profile?.phoneNumber ?? account?.phoneNumber;
  const displayEmail = profile?.user?.email ?? account?.email;
  const displayPhoto = profile?.photoUrl ?? account?.profilePhotoUrl;
  const isOnline = projection.effectiveDeliveryOnline || projection.effectiveRideOnline;
  const rideProfile = captainAccess?.rideCaptainProfile;
  const modeRows = [projection.ride, projection.delivery];

  if (loading && !captainAccess) return <Loading label="Preparing Captain profile..." />;

  async function saveProfile() {
    if (!profile) return;
    try {
      if (photoUrl.trim() && !isSecureImageUrl(photoUrl)) {
        throw new Error("Profile photo must be a secure image URL ending in PNG, JPG, JPEG or WEBP.");
      }
      const updated = await riderApi.updateProfile({
        photoUrl: photoUrl.trim() || null,
        vehicleType: profile.vehicleType,
        plateNumber: profile.plateNumber,
        licenseNumber: profile.licenseNumber,
        preferredServiceAreas: preferredAreas.split(",").map((area) => area.trim()).filter(Boolean).slice(0, 8)
      });
      setProfile(updated);
      setMessage("Profile updated.");
      setError("");
    } catch (e) {
      setError(friendlyError(e));
      setMessage("");
    }
  }

  async function updateLocation() {
    if (!profile) return;
    if (profile.availabilityStatus === "OFFLINE") {
      setError("Go online before updating live location.");
      setMessage("");
      return;
    }
    try {
      const updated = await riderApi.updateLocation(Number(lat), Number(lng));
      setProfile(updated);
      setMessage("Location updated.");
      setError("");
    } catch (e) {
      setError(friendlyError(e));
      setMessage("");
    }
  }

  async function updateDeviceLocation() {
    if (!profile) return;
    if (profile.availabilityStatus === "OFFLINE") {
      setError("Go online before updating live location.");
      setMessage("");
      return;
    }
    try {
      const current = await requestCaptainForegroundLocation();
      const updated = await riderApi.updateLocation(current.latitude, current.longitude);
      setProfile(updated);
      setLat(String(updated.currentLatitude ?? current.latitude));
      setLng(String(updated.currentLongitude ?? current.longitude));
      setMessage("Live location updated from this device.");
      setError("");
    } catch (e) {
      setError(friendlyError(e));
      setMessage("");
    }
  }

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

  return <Protected><Screen title="Captain Profile" subtitle="Manage your Captain account, modes and security." refreshing={loading} onRefresh={load}><Message error>{error}</Message><Message>{message}</Message>
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
        <Text style={ui.muted}>Application: {mode.applicationLabel} · Documents: {mode.documentsLabel}</Text>
      </View>)}
      <NavLink href={hasAnyCaptainApplication(captainAccess) ? "/application-status" : "/auth/apply"} label={hasAnyCaptainApplication(captainAccess) ? "View application status" : "Start Captain application"} />
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Vehicle information</Text>
      <InfoRow label="Ride vehicle" value={rideProfile?.vehicle} />
      <InfoRow label="Ride vehicle type" value={rideProfile?.vehicleType} />
      <InfoRow label="Ride plate number" value={rideProfile?.vehiclePlateNumber} />
      <InfoRow label="Delivery vehicle" value={profile?.vehicleType} />
      <InfoRow label="Delivery plate number" value={profile?.plateNumber} />
      <InfoRow label="Driver licence" value={profile?.licenseNumber} />
      {!rideProfile?.vehicle && !profile?.vehicleType ? <Text style={ui.muted}>Vehicle details will appear after KariGO links an approved Captain profile.</Text> : null}
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Operating areas</Text>
      <InfoRow label="Ride area" value={[rideProfile?.city, rideProfile?.state].filter(Boolean).join(", ")} />
      <InfoRow label="Delivery areas" value={(profile?.preferredServiceAreas ?? []).join(", ")} />
      {!rideProfile?.city && !profile?.preferredServiceAreas?.length ? <Text style={ui.muted}>KariGO Operations manages active service areas for each Captain mode.</Text> : null}
    </Card>

    {profile ? <>
      <Card>
        <Text style={ui.sectionTitle}>Delivery profile</Text>
        <Field value={photoUrl} placeholder="Profile photo URL optional" autoCapitalize="none" onChangeText={setPhotoUrl} />
        {photoUrl.trim() && isSecureImageUrl(photoUrl) ? <Image source={{ uri: photoUrl.trim() }} style={styles.photoPreview} /> : null}
        <Field value={profile.vehicleType ?? ""} placeholder="Vehicle type" onChangeText={(vehicleType) => setProfile({ ...profile, vehicleType })} />
        <Field value={profile.plateNumber ?? ""} placeholder="Plate number" onChangeText={(plateNumber) => setProfile({ ...profile, plateNumber })} />
        <Field value={profile.licenseNumber ?? ""} placeholder="Driver licence number optional" onChangeText={(licenseNumber) => setProfile({ ...profile, licenseNumber })} />
        <Field value={preferredAreas} placeholder="Preferred delivery areas, comma-separated" onChangeText={setPreferredAreas} />
        <Button title="Save profile" onPress={saveProfile} />
      </Card>

      <Card>
        <Text style={ui.sectionTitle}>Live location</Text>
        <Text style={ui.pageIntro}>Use device GPS while you are online or on an active assignment. KariGO does not update your location while you are offline.</Text>
        <Field value={lat} onChangeText={setLat} keyboardType="decimal-pad" placeholder="Latitude" />
        <Field value={lng} onChangeText={setLng} keyboardType="decimal-pad" placeholder="Longitude" />
        <Button title="Use device GPS now" onPress={updateDeviceLocation} disabled={profile.availabilityStatus === "OFFLINE"} />
        <Button tone="muted" title="Update manual coordinates" onPress={updateLocation} disabled={profile.availabilityStatus === "OFFLINE"} />
      </Card>
    </> : null}

    <Card>
      <Text style={ui.sectionTitle}>Documents</Text>
      <Text style={ui.muted}>Document review is shown on Application Status. KariGO keeps private document files out of the app UI after submission.</Text>
      <NavLink href="/application-status" label="Open document and application status" />
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Sign-in and security</Text>
      <Text style={ui.muted}>Biometric sign-in refreshes a saved backend session after device fingerprint or face unlock. Password sign-in is required if the saved session is missing or revoked.</Text>
      <Text style={ui.muted}>Device support: {biometricAvailable ? "Available" : "Set up biometrics in your phone settings first."}</Text>
      <Button title={biometricBusy ? "Updating..." : biometricEnabled ? "Disable biometric sign-in" : "Enable biometric sign-in"} tone="muted" onPress={toggleBiometricSignIn} disabled={biometricBusy || (!biometricAvailable && !biometricEnabled)} />
      <View style={styles.legalLinks}>
        <NavLink href="/legal/privacy" label="Privacy Policy" />
        <NavLink href="/legal/terms" label="Terms" />
      </View>
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Captain links</Text>
      <View style={styles.toolGrid}>
        <View style={styles.toolCard}><Text style={styles.toolTitle}>Home</Text><NavLink href="/tabs/dashboard" label="Open Home" /></View>
        <View style={styles.toolCard}><Text style={styles.toolTitle}>Deliveries</Text><NavLink href="/jobs" label="Open deliveries" /></View>
        <View style={styles.toolCard}><Text style={styles.toolTitle}>Earnings</Text><NavLink href="/earnings" label="View earnings" /></View>
        <View style={styles.toolCard}><Text style={styles.toolTitle}>Notifications</Text><Text style={ui.muted}>{unread ? `${unread > 99 ? "99+" : unread} unread` : "No unread updates"}</Text><NavLink href="/notifications" label="Open notifications" /></View>
      </View>
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
  infoRow: { borderBottomColor: brand.colors.border, borderBottomWidth: 1, gap: 2, paddingVertical: 8 },
  infoLabel: { color: brand.colors.muted, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  infoValue: { color: brand.colors.charcoal, fontWeight: "900" },
  photoPreview: { borderRadius: 18, height: 84, width: 84 },
  legalLinks: { gap: 4 },
  toolGrid: { gap: 10 },
  toolCard: { backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, gap: 4, padding: 12 },
  toolTitle: { color: brand.colors.charcoal, fontWeight: "900" }
});
