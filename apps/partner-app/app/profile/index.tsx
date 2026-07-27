import { brand } from "@karigo/config";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { partnerApi, PartnerOnboardingState, PartnerProfile } from "../../src/api/partner.api";
import { AuthGate } from "../../src/components/auth-gate";
import { Badge, Card, Hero, LoadingState, MutedText, PrimaryButton, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";
import { formatLabel, statusTone } from "../../src/lib/labels";
import { partnerProfileWarning } from "../../src/lib/partner-profile";

function ProfileContent() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [partnerState, setPartnerState] = useState<PartnerOnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const onboardingState = await partnerApi.onboardingState();
      setPartnerState(onboardingState);
      if (onboardingState.state !== "approved") {
        setProfile(null);
        return;
      }
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
  const profileWarning = partnerProfileWarning(profile);

  if (partnerState?.state && partnerState.state !== "approved") {
    const canContinue = ["application_not_started", "application_in_progress", "correction_required"].includes(partnerState.state);
    const title = partnerState.state === "application_submitted"
      ? "Application under review"
      : partnerState.state === "rejected"
        ? "Application not approved"
        : partnerState.state === "restricted"
          ? "Partner access restricted"
          : "Partner profile not active yet";

    return (
      <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
        <Hero eyebrow="Partner application" title={title} subtitle={partnerState.message} />
        <Card>
          <MutedText>
            Your Customer account remains active. KariGO will unlock Partner profile editing only after Operations approves the Partner application.
          </MutedText>
          {partnerState.correctionNote ? <MutedText>{partnerState.correctionNote}</MutedText> : null}
          {canContinue ? <PrimaryButton label={partnerState.state === "correction_required" ? "Update requested information" : "Continue application"} onPress={() => router.push("/register")} /> : null}
          <PrimaryButton label="Back to Partner home" onPress={() => router.replace("/")} variant="secondary" />
        </Card>
        <PrimaryButton label="Log out" onPress={() => void logout()} variant="secondary" />
      </Screen>
    );
  }

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
          <Badge label={formatLabel(profile?.status, "Profile")} tone={statusTone(profile?.status)} />
        </View>
      </Card>
      {profileWarning ? (
        <Card>
          <View style={styles.warningHeader}>
            <Text style={styles.sectionTitle}>{profileWarning.title}</Text>
            <Badge label="Review only" tone="warning" />
          </View>
          <MutedText>{profileWarning.body}</MutedText>
        </Card>
      ) : null}
      <Card>
        <Text style={styles.sectionTitle}>{profile?.businessName ?? "Business profile pending"}</Text>
        <MutedText>{profile?.address ?? "Address pending"}</MutedText>
        <MutedText>{profile?.city ?? "City pending"}, {profile?.state ?? "State pending"}</MutedText>
        <MutedText>{profile?.description ?? "Description can be maintained from Partner Workspace."}</MutedText>
        <Badge label={profile?.isOpen ? "Online" : "Offline"} tone={profile?.isOpen ? "success" : "warning"} />
        {profile ? <PrimaryButton label="Edit partner profile" onPress={() => router.push("/profile/edit")} /> : null}
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Settlement readiness</Text>
        <MutedText>
          View earnings and maintain payout account details for future manual settlement review. This does not trigger automated payouts.
        </MutedText>
        <PrimaryButton label="View earnings" onPress={() => router.push("/earnings")} variant="secondary" />
        <PrimaryButton label="Payout account" onPress={() => router.push("/payout")} variant="secondary" />
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
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  }
});
