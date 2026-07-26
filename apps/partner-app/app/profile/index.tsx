import { brand } from "@karigo/config";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { partnerApi, PartnerProfile } from "../../src/api/partner.api";
import { AuthGate } from "../../src/components/auth-gate";
import { Badge, Card, Hero, LoadingState, MutedText, PrimaryButton, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";

function ProfileContent() {
  const { logout, user } = useAuth();
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setProfile(await partnerApi.profile());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Partner profile could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState label="Loading Partner profile..." />;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
      <Hero eyebrow="Profile" title="Partner profile" subtitle="Account and business visibility for approved KariGO partners." />
      {error ? <MutedText>{error}</MutedText> : null}
      <Card>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.fullName?.slice(0, 1).toUpperCase() || "P"}</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.name}>{user?.fullName ?? "Partner user"}</Text>
            <MutedText>{user?.phoneNumber ?? "Phone pending"}</MutedText>
          </View>
          <Badge label={profile?.status ?? "Profile"} tone={profile?.isOpen ? "success" : "warning"} />
        </View>
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>{profile?.businessName ?? "Business profile pending"}</Text>
        <MutedText>{profile?.address ?? "Address pending"}</MutedText>
        <MutedText>{profile?.city ?? "City pending"}, {profile?.state ?? "State pending"}</MutedText>
        <MutedText>{profile?.description ?? "Description can be maintained from Partner Workspace."}</MutedText>
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Mobile foundation scope</Text>
        <MutedText>
          This first Partner app release provides mobile sign-in, profile visibility and activity views. Full create/edit workflows will be added after pilot feedback.
        </MutedText>
      </Card>
      <PrimaryButton label="Log out" onPress={() => void logout()} variant="secondary" />
    </Screen>
  );
}

export default function ProfileScreen() {
  return (
    <AuthGate>
      <ProfileContent />
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  avatar: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: brand.colors.primary
  },
  avatarText: {
    color: brand.colors.white,
    fontSize: 20,
    fontWeight: "900"
  },
  profileText: {
    flex: 1
  },
  name: {
    color: brand.colors.charcoal,
    fontSize: 17,
    fontWeight: "900"
  },
  sectionTitle: {
    color: brand.colors.charcoal,
    fontSize: 17,
    fontWeight: "900"
  }
});
