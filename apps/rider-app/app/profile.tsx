import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { brand } from "@karigo/config";
import { riderApi, RiderProfile } from "../src/api/rider.api";
import { Button, Card, Field, Loading, Message, NavLink, Protected, Screen, StatusBadge, ui } from "../src/components/ui";
import { useAuth } from "../src/contexts/auth-context";
import { friendlyError } from "../src/lib/errors";
import { captainModes } from "../src/lib/captain-modes";

function initials(name?: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return (parts[0]?.[0] ?? "R") + (parts[1]?.[0] ?? "");
}

export default function Profile() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    riderApi.profile()
      .then((p) => {
        setProfile(p);
        setLat(String(p.currentLatitude ?? ""));
        setLng(String(p.currentLongitude ?? ""));
      })
      .catch((e) => setError(friendlyError(e)));
  }, []);

  if (!profile && !error) return <Loading />;

  async function saveProfile() {
    if (!profile) return;
    try {
      setProfile(await riderApi.updateProfile({ vehicleType: profile.vehicleType, plateNumber: profile.plateNumber }));
      setMessage("Profile updated.");
      setError("");
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  async function updateLocation() {
    if (!profile) return;
    try {
      setProfile(await riderApi.updateLocation(Number(lat), Number(lng)));
      setMessage("Location updated.");
      setError("");
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  const modes = captainModes(profile);

  return <Protected><Screen title="Captain Profile" subtitle="Manage your Captain record, vehicle details and staging location."><Message error>{error}</Message><Message>{message}</Message>{profile ? <>
    <Card tone="soft">
      <View style={styles.headerRow}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials(profile.user?.fullName).toUpperCase()}</Text></View>
        <View style={styles.headerText}>
          <Text style={ui.heroTitle}>{profile.user?.fullName ?? profile.riderCode}</Text>
          <Text style={ui.muted}>{profile.phoneNumber}</Text>
          {profile.user?.email ? <Text style={ui.muted}>{profile.user.email}</Text> : null}
        </View>
      </View>
      <View style={styles.badgeRow}>
        <StatusBadge status={profile.verificationStatus} />
        <StatusBadge status={profile.availabilityStatus} />
      </View>
      <Text style={ui.pageIntro}>{profile.totalDeliveries} completed deliveries recorded in KariGO.</Text>
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
      <Text style={ui.sectionTitle}>Vehicle details</Text>
      <Field value={profile.vehicleType ?? ""} placeholder="Vehicle type" onChangeText={(vehicleType) => setProfile({ ...profile, vehicleType })} />
      <Field value={profile.plateNumber ?? ""} placeholder="Plate number" onChangeText={(plateNumber) => setProfile({ ...profile, plateNumber })} />
      <Button title="Save profile" onPress={saveProfile} />
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Manual location update</Text>
      <Text style={ui.pageIntro}>Live GPS is not connected yet. Enter coordinates only when dispatch needs your latest staging location.</Text>
      <Field value={lat} onChangeText={setLat} keyboardType="decimal-pad" placeholder="Latitude" />
      <Field value={lng} onChangeText={setLng} keyboardType="decimal-pad" placeholder="Longitude" />
      <Button tone="muted" title="Update location" onPress={updateLocation} />
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Captain tools</Text>
      <NavLink href="/notifications" label="Activity feed and notifications" />
      <NavLink href="/taxi-readiness" label="Driver Captain Readiness" />
    </Card>

    <Button tone="muted" title="Log out" onPress={async () => { await logout(); router.replace("/auth/login"); }} />
  </> : null}</Screen></Protected>;
}

const styles = StyleSheet.create({
  headerRow: { alignItems: "center", flexDirection: "row", gap: 14 },
  headerText: { flex: 1, gap: 2 },
  avatar: { alignItems: "center", backgroundColor: brand.colors.primary, borderRadius: 28, height: 56, justifyContent: "center", width: 56 },
  avatarText: { color: brand.colors.white, fontSize: 19, fontWeight: "900" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modeRow: { borderTopColor: brand.colors.border, borderTopWidth: 1, gap: 8, paddingTop: 12 }
});
