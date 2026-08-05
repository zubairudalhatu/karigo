import { brand } from "@karigo/config";
import { KariGoApiError, LaunchAvailabilityResponse, PartnerCapabilities, ProductSummary, VendorServiceSummary } from "@karigo/shared-types";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, Linking, RefreshControl, StyleSheet, Text, View } from "react-native";
import { partnerApi, PartnerOnboardingDocument, PartnerOnboardingState, PartnerOrderSummary, PartnerProfile } from "../src/api/partner.api";
import { launchApi } from "../src/api/launch.api";
import { AuthGate } from "../src/components/auth-gate";
import { Badge, Card, EmptyState, Hero, LoadingState, MutedText, PrimaryButton, Screen, StatCard } from "../src/components/ui";
import { useAuth } from "../src/contexts/auth-context";
import { formatLabel, statusTone } from "../src/lib/labels";
import { partnerProfileWarning } from "../src/lib/partner-profile";

interface DashboardState {
  profile: PartnerProfile | null;
  orders: PartnerOrderSummary[];
  products: ProductSummary[];
  services: VendorServiceSummary[];
  documents: PartnerOnboardingDocument[];
  capabilities: PartnerCapabilities | null;
}

const initialState: DashboardState = {
  profile: null,
  orders: [],
  products: [],
  services: [],
  documents: [],
  capabilities: null
};

function partnerTypeLabel(partnerType?: PartnerCapabilities["partnerType"]) {
  if (partnerType === "BOTH") return "Product Seller and Service Provider";
  if (partnerType === "SERVICE_PROVIDER") return "Service Provider";
  if (partnerType === "PRODUCT_SELLER") return "Product Seller";
  return "Partner account";
}

function isMissingProfile(error: unknown) {
  return error instanceof KariGoApiError && error.message.toLowerCase().includes("vendor profile not found");
}

function DashboardContent() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardState>(initialState);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [missingProfile, setMissingProfile] = useState(false);
  const [partnerState, setPartnerState] = useState<PartnerOnboardingState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [launchAvailability, setLaunchAvailability] = useState<LaunchAvailabilityResponse | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    setMissingProfile(false);
    setPartnerState(null);

    try {
      const onboardingState = await partnerApi.onboardingState();
      setPartnerState(onboardingState);
      if (onboardingState.state !== "approved") {
        setMissingProfile(true);
        return;
      }

      const capabilities = await partnerApi.capabilities();
      const [profile, orders, products, services, documents] = await Promise.all([
        partnerApi.profile(),
        partnerApi.orders().catch(() => []),
        capabilities.canManageProducts ? partnerApi.products().catch(() => []) : Promise.resolve([]),
        capabilities.canManageServices ? partnerApi.services().catch(() => []) : Promise.resolve([]),
        partnerApi.documents().catch(() => [])
      ]);
      setData({ profile, orders, products, services, documents, capabilities });
      setLaunchAvailability(await launchApi.myAvailability(profile.city).catch(() => null));
    } catch (err) {
      if (isMissingProfile(err)) {
        setMissingProfile(true);
      } else {
        setError(err instanceof Error ? err.message : "Partner dashboard could not be loaded.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleAvailability = useCallback(async () => {
    if (!data.profile) return;
    setAvailabilitySaving(true);
    setAvailabilityMessage(null);
    try {
      const updatedProfile = await partnerApi.updateProfile({ isOpen: !data.profile.isOpen });
      setData((current) => ({ ...current, profile: updatedProfile }));
      setAvailabilityMessage(updatedProfile.isOpen ? "Partner profile is now Online." : "Partner profile is now Offline.");
    } catch (err) {
      setAvailabilityMessage(err instanceof Error ? err.message : "Availability could not be updated.");
    } finally {
      setAvailabilitySaving(false);
    }
  }, [data.profile]);

  if (loading) return <LoadingState />;

  if (missingProfile) {
    const state = partnerState?.state ?? "application_not_started";
    const isCorrection = state === "correction_required";
    const canContinue = state === "application_not_started" || state === "application_in_progress" || isCorrection;
    const title = state === "application_submitted"
      ? "Your Partner application is under review."
      : state === "restricted"
        ? "Partner access needs support."
        : state === "rejected"
          ? "Partner application was not approved."
          : "Your KariGO account has been recognised.";
    const body = isCorrection && partnerState?.correctionNote
      ? partnerState.correctionNote
      : partnerState?.message ?? "Continue to create your Partner profile with your existing KariGO account.";
    return (
      <Screen>
        <Hero
          eyebrow="Partner profile"
          title={title}
          subtitle={body}
        />
        <Card>
          <MutedText>
            {partnerState?.account?.phoneNumber
              ? `Signed in as ${partnerState.account.fullName} (${partnerState.account.phoneNumber}).`
              : "Your central KariGO account remains active for Customer access."}
          </MutedText>
          {canContinue ? <PrimaryButton label={isCorrection ? "Update application" : "Continue Partner onboarding"} onPress={() => router.push("/register")} /> : null}
          <PrimaryButton label="Contact Support" onPress={() => void Linking.openURL("https://www.karigo.com.ng/contact")} variant="secondary" />
          <PrimaryButton label="Log out" onPress={() => void logout()} variant="secondary" />
        </Card>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Hero eyebrow="Partner app" title="Dashboard could not be loaded." subtitle={error} />
        <PrimaryButton label="Try again" onPress={() => void load()} />
      </Screen>
    );
  }

  const activeOrders = data.orders.filter((order) => !["DELIVERED", "CANCELLED", "REJECTED"].includes(order.orderStatus));
  const profileWarning = partnerProfileWarning(data.profile);
  const canManageProducts = data.capabilities?.canManageProducts ?? false;
  const canManageServices = data.capabilities?.canManageServices ?? false;
  const relevantLaunchServices = launchAvailability?.services.filter((item) =>
    (canManageServices && item.serviceType === "SME_SERVICES") ||
    (canManageProducts && ["FOOD", "GROCERIES", "MARKETPLACE"].includes(item.serviceType))
  ) ?? [];
  const launchAcceptingActivity = relevantLaunchServices.length === 0 || relevantLaunchServices.some((item) => item.available);
  const launchMessage = relevantLaunchServices.find((item) => !item.available)?.message;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
      <View style={styles.header}>
        <Image source={require("../assets/karigo-logo.png")} resizeMode="contain" style={styles.logo} />
        <Badge label={formatLabel(data.profile?.status, "Partner")} tone={statusTone(data.profile?.status)} />
      </View>

      <Hero
        eyebrow="KariGO Partner"
        title={`Welcome${user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}`}
        subtitle="Manage your Partner Workspace from mobile. Product Seller, Service Provider and mixed partner workflows will continue to expand here."
      />

      <Card>
        <Text style={styles.businessName}>{data.profile?.businessName ?? "Partner profile"}</Text>
        <MutedText>
          {data.profile?.city ?? "City pending"}, {data.profile?.state ?? "State pending"} - {partnerTypeLabel(data.capabilities?.partnerType)}
        </MutedText>
      </Card>

      {launchAvailability ? <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>City operations</Text>
          <Badge label={launchAcceptingActivity ? "Accepting activity" : "Customer activity paused"} tone={launchAcceptingActivity ? "success" : "warning"} />
        </View>
        <MutedText>{launchAcceptingActivity ? `KariGO services are available for this Partner capability in ${launchAvailability.city.name}.` : launchMessage ?? "New Customer activity is not available for this Partner capability right now."}</MutedText>
        <MutedText>Catalogue management and historical orders remain available during a service pause.</MutedText>
      </Card> : null}

      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Availability</Text>
          <Badge label={data.profile?.isOpen ? "Online" : "Offline"} tone={data.profile?.isOpen ? "success" : "warning"} />
        </View>
        <MutedText>
          Go Online when your team can receive KariGO activity. Go Offline when you need to pause incoming marketplace visibility.
        </MutedText>
        {availabilityMessage ? <MutedText>{availabilityMessage}</MutedText> : null}
        <PrimaryButton
          label={availabilitySaving ? "Updating..." : data.profile?.isOpen ? "Go Offline" : "Go Online"}
          onPress={() => void toggleAvailability()}
          disabled={!data.profile || !!profileWarning || availabilitySaving || (!data.profile.isOpen && !launchAcceptingActivity)}
          variant={data.profile?.isOpen ? "secondary" : "primary"}
        />
      </Card>

      {profileWarning ? (
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{profileWarning.title}</Text>
            <Badge label="Review only" tone="warning" />
          </View>
          <MutedText>{profileWarning.body}</MutedText>
        </Card>
      ) : null}

      <View style={styles.statsRow}>
        <StatCard label="Active orders" value={activeOrders.length} />
        {canManageProducts ? <StatCard label="Products" value={data.products.length} /> : null}
        {canManageServices ? <StatCard label="Services" value={data.services.length} /> : null}
      </View>

      <Card>
        <Text style={styles.cardTitle}>Operations shortcuts</Text>
        {canManageProducts ? <PrimaryButton label="Add product" onPress={() => router.push("/products/new")} /> : null}
        {canManageServices ? <PrimaryButton label="Add service" onPress={() => router.push("/services/new")} /> : null}
        <PrimaryButton label="View orders" onPress={() => router.push("/orders")} variant="secondary" />
        <PrimaryButton label="View earnings and settlements" onPress={() => router.push("/earnings")} variant="secondary" />
      </Card>

      {activeOrders[0] ? (
        <Card>
          <Text style={styles.cardTitle}>Latest active order</Text>
          <Text style={styles.businessName}>{activeOrders[0].orderNumber}</Text>
          <MutedText>{formatLabel(activeOrders[0].orderStatus)} - {activeOrders[0].itemsCount} item(s)</MutedText>
          <PrimaryButton label="Open order detail" onPress={() => router.push(`/orders/${activeOrders[0].id}`)} />
        </Card>
      ) : (
        <EmptyState title="No active orders yet" body="New product orders will appear here once customers place orders for this partner account." />
      )}
    </Screen>
  );
}

export default function DashboardScreen() {
  return (
    <AuthGate>
      <DashboardContent />
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  logo: {
    width: 128,
    height: 48
  },
  businessName: {
    color: brand.colors.charcoal,
    fontSize: 18,
    fontWeight: "900"
  },
  statsRow: {
    flexDirection: "row",
    gap: 10
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  cardTitle: {
    color: brand.colors.charcoal,
    fontSize: 16,
    fontWeight: "900"
  }
});
