import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { riderApi, RiderProfile } from "../src/api/rider.api";
import { Button, Card, Field, Loading, Message, Protected, Screen, ui } from "../src/components/ui";
import { useAuth } from "../src/contexts/auth-context";
import { friendlyError } from "../src/lib/errors";
export default function Profile() {
  const { logout } = useAuth(); const [profile, setProfile] = useState<RiderProfile | null>(null); const [lat, setLat] = useState(""); const [lng, setLng] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  useEffect(() => { riderApi.profile().then((p) => { setProfile(p); setLat(String(p.currentLatitude ?? "")); setLng(String(p.currentLongitude ?? "")); }).catch((e) => setError(friendlyError(e))); }, []);
  if (!profile && !error) return <Loading />;
  return <Protected><Screen title="Rider profile"><Message error>{error}</Message><Message>{message}</Message>{profile ? <>
    <Card><Text style={ui.title}>{profile.user?.fullName ?? profile.riderCode}</Text><Text>{profile.riderCode} · {profile.verificationStatus}</Text><Text>{profile.totalDeliveries} completed deliveries</Text></Card>
    <Field value={profile.vehicleType ?? ""} placeholder="Vehicle type" onChangeText={(vehicleType) => setProfile({ ...profile, vehicleType })} /><Field value={profile.plateNumber ?? ""} placeholder="Plate number" onChangeText={(plateNumber) => setProfile({ ...profile, plateNumber })} /><Button title="Save profile" onPress={async () => { try { setProfile(await riderApi.updateProfile({ vehicleType: profile.vehicleType, plateNumber: profile.plateNumber })); setMessage("Profile updated."); } catch (e) { setError(friendlyError(e)); } }} />
    <Card><Text style={ui.title}>Manual location update</Text><Text style={ui.muted}>Live GPS is not connected yet. Enter coordinates when dispatch needs your latest location.</Text><Field value={lat} onChangeText={setLat} keyboardType="decimal-pad" placeholder="Latitude" /><Field value={lng} onChangeText={setLng} keyboardType="decimal-pad" placeholder="Longitude" /><Button tone="muted" title="Update location" onPress={async () => { try { setProfile(await riderApi.updateLocation(Number(lat), Number(lng))); setMessage("Location updated."); } catch (e) { setError(friendlyError(e)); } }} /></Card>
    <Button tone="muted" title="Log out" onPress={async () => { await logout(); router.replace("/auth/login"); }} />
  </> : null}</Screen></Protected>;
}
