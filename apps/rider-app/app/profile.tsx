import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { brand } from "@karigo/config";
import { riderApi, RiderProfile } from "../src/api/rider.api";
import { Button, Card, Field, Loading, Message, NavLink, Protected, Screen, StatusBadge, ui } from "../src/components/ui";
import { useAuth } from "../src/contexts/auth-context";
import { friendlyError } from "../src/lib/errors";
import { captainModes } from "../src/lib/captain-modes";
import { requestCaptainForegroundLocation } from "../src/lib/location";

function initials(name?: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return (parts[0]?.[0] ?? "R") + (parts[1]?.[0] ?? "");
}

export default function Profile() {
  const { biometricAvailable, biometricEnabled, logout, setBiometricSignIn } = useAuth();
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [preferredAreas, setPreferredAreas] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [biometricBusy, setBiometricBusy] = useState(false);

  useEffect(() => {
    riderApi.profile()
      .then((p) => {
        setProfile(p);
        setLat(String(p.currentLatitude ?? ""));
        setLng(String(p.currentLongitude ?? ""));
        setPhotoUrl(p.photoUrl ?? "");
        setPreferredAreas((p.preferredServiceAreas ?? []).join(", "));
      })
      .catch((e) => setError(friendlyError(e)));
  }, []);

  if (!profile && !error) return <Loading />;

  async function saveProfile() {
    if (!profile) return;
    try {
      if (photoUrl.trim() && !isSecureImageUrl(photoUrl)) {
        throw new Error("Profile photo must be a secure image URL ending in PNG, JPG, JPEG or WEBP.");
      }
      setProfile(await riderApi.updateProfile({
        photoUrl: photoUrl.trim() || null,
        vehicleType: profile.vehicleType,
        plateNumber: profile.plateNumber,
        licenseNumber: profile.licenseNumber,
        preferredServiceAreas: preferredAreas.split(",").map((area) => area.trim()).filter(Boolean).slice(0, 8)
      }));
      setMessage("Profile updated.");
      setError("");
    } catch (e) {
      setError(friendlyError(e));
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
      setProfile(await riderApi.updateLocation(Number(lat), Number(lng)));
      setMessage("Location updated.");
      setError("");
    } catch (e) {
      setError(friendlyError(e));
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

  const modes = captainModes(profile);
  const isOnline = profile?.availabilityStatus === "ONLINE";

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

  return <Protected><Screen title="Captain Profile" subtitle="Manage your Captain record, vehicle details and live location."><Message error>{error}</Message><Message>{message}</Message>{profile ? <>
    <Card tone="soft">
      <View style={styles.headerRow}>
        {profile.photoUrl ? <Image source={{ uri: profile.photoUrl }} style={styles.avatarImage} /> : <View style={styles.avatar}><Text style={styles.avatarText}>{initials(profile.user?.fullName).toUpperCase()}</Text></View>}
        <View style={styles.headerText}>
          <Text style={ui.heroTitle}>{profile.user?.fullName ?? profile.riderCode}</Text>
          <Text style={ui.muted}>{profile.phoneNumber}</Text>
          {profile.user?.email ? <Text style={ui.muted}>{profile.user.email}</Text> : null}
        </View>
      </View>
      <View style={styles.badgeRow}>
        <StatusBadge status={profile.verificationStatus} />
        <StatusBadge status={isOnline ? "Online" : profile.availabilityStatus} />
      </View>
      <View style={styles.statsGrid}>
        <View style={styles.statBox}><Text style={styles.statValue}>{profile.totalDeliveries}</Text><Text style={ui.muted}>Completed deliveries</Text></View>
        <View style={styles.statBox}><Text style={styles.statValue}>{isOnline ? "Online" : "Offline"}</Text><Text style={ui.muted}>Availability</Text></View>
      </View>
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Captain modes</Text>
      {modes.map((mode) => <View key={mode.key} style={styles.modeRow}>
        <View style={ui.spaceBetween}>
          <Text style={ui.sectionTitle}>{mode.label}</Text>
          <StatusBadge status={mode.badge} />
        </View>
        <Text style={ui.muted}>{mode.description}</Text>
      </View>)}
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Ride service areas</Text>
      <Text style={ui.muted}>Optional preferred areas are stored for future KariGO Rides review only. They do not activate ride dispatch or automatic matching.</Text>
      <Field value={preferredAreas} placeholder="Preferred areas, comma-separated" onChangeText={setPreferredAreas} />
    </Card>
    <Card>
      <Text style={ui.sectionTitle}>Vehicle details</Text>
      <Field value={photoUrl} placeholder="Profile photo URL optional" autoCapitalize="none" onChangeText={setPhotoUrl} />
      {photoUrl.trim() && isSecureImageUrl(photoUrl) ? <Image source={{ uri: photoUrl.trim() }} style={styles.photoPreview} /> : null}
      <Text style={ui.muted}>Device upload is not enabled in this build. Add a secure image URL now; permanent in-app upload will follow backend storage approval.</Text>
      <Field value={profile.vehicleType ?? ""} placeholder="Vehicle type" onChangeText={(vehicleType) => setProfile({ ...profile, vehicleType })} />
      <Field value={profile.plateNumber ?? ""} placeholder="Plate number" onChangeText={(plateNumber) => setProfile({ ...profile, plateNumber })} />
      <Field value={profile.licenseNumber ?? ""} placeholder="Driver licence number optional" onChangeText={(licenseNumber) => setProfile({ ...profile, licenseNumber })} />
      <Button title="Save profile" onPress={saveProfile} />
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Live location</Text>
      <Text style={ui.pageIntro}>Use device GPS while you are online or on an active delivery. KariGO does not update your location while you are offline.</Text>
      <Field value={lat} onChangeText={setLat} keyboardType="decimal-pad" placeholder="Latitude" />
      <Field value={lng} onChangeText={setLng} keyboardType="decimal-pad" placeholder="Longitude" />
      <Button title="Use device GPS now" onPress={updateDeviceLocation} disabled={profile.availabilityStatus === "OFFLINE"} />
      <Button tone="muted" title="Update manual coordinates" onPress={updateLocation} disabled={profile.availabilityStatus === "OFFLINE"} />
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Privacy and security</Text>
      <Text style={ui.muted}>Biometric sign-in refreshes a saved backend session after device fingerprint or face unlock. Password sign-in is required if the saved session is missing or revoked.</Text>
      <Text style={ui.muted}>Device support: {biometricAvailable ? "Available" : "Set up biometrics in your phone settings first."}</Text>
      <Button title={biometricBusy ? "Updating..." : biometricEnabled ? "Disable biometric sign-in" : "Enable biometric sign-in"} tone="muted" onPress={toggleBiometricSignIn} disabled={biometricBusy || (!biometricAvailable && !biometricEnabled)} />
      <View style={styles.legalLinks}>
        <NavLink href="/legal/privacy" label="Privacy Policy" />
        <NavLink href="/legal/terms" label="Terms" />
      </View>
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Captain tools</Text>
      <View style={styles.toolGrid}>
        <View style={styles.toolCard}><Text style={styles.toolTitle}>Delivery availability</Text><Text style={ui.muted}>Use Home to go online or offline.</Text></View>
        <View style={styles.toolCard}><Text style={styles.toolTitle}>Assigned deliveries</Text><NavLink href="/jobs" label="Open deliveries" /></View>
        <View style={styles.toolCard}><Text style={styles.toolTitle}>Earnings</Text><NavLink href="/earnings" label="View earnings" /></View>
        <View style={styles.toolCard}><Text style={styles.toolTitle}>Support</Text><Text style={ui.muted}>Use the approved support channel for urgent dispatch issues.</Text></View>
        <View style={styles.toolCard}><Text style={styles.toolTitle}>Activity feed and notifications</Text><NavLink href="/notifications" label="Open notifications" /></View>
      </View>
    </Card>

    <Button tone="muted" title="Log out" onPress={async () => { await logout(); router.replace("/auth/login"); }} />
  </> : null}</Screen></Protected>;
}

const styles = StyleSheet.create({
  headerRow: { alignItems: "center", flexDirection: "row", gap: 14 },
  headerText: { flex: 1, gap: 2 },
  avatar: { alignItems: "center", backgroundColor: brand.colors.primary, borderRadius: 28, height: 56, justifyContent: "center", width: 56 },
  avatarImage: { borderRadius: 32, height: 64, width: 64 },
  avatarText: { color: brand.colors.white, fontSize: 19, fontWeight: "900" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statsGrid: { gap: 10 },
  statBox: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, gap: 3, padding: 12 },
  statValue: { color: brand.colors.charcoal, fontSize: 18, fontWeight: "900" },
  photoPreview: { borderRadius: 18, height: 84, width: 84 },
  legalLinks: { gap: 4 },
  modeRow: { borderTopColor: brand.colors.border, borderTopWidth: 1, gap: 8, paddingTop: 12 },
  toolGrid: { gap: 10 },
  toolCard: { backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, gap: 4, padding: 12 },
  toolTitle: { color: brand.colors.charcoal, fontWeight: "900" }
});

function isSecureImageUrl(value: string) {
  return !value.trim() || /^https:\/\/.+\.(png|jpe?g|webp)(\?.*)?$/i.test(value.trim());
}
