import { brand } from "@karigo/config";
import { KariGoApiError, ProductSummary, VendorServiceSummary } from "@karigo/shared-types";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, Linking, RefreshControl, StyleSheet, Text, View } from "react-native";
import { partnerApi, PartnerOnboardingDocument, PartnerOrderSummary, PartnerProfile } from "../src/api/partner.api";
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
}

const initialState: DashboardState = {
  profile: null,
  orders: [],
  products: [],
  services: [],
  documents: []
};

function partnerType(products: ProductSummary[], services: VendorServiceSummary[]) {
  if (products.length > 0 && services.length > 0) return "Both";
  if (services.length > 0) return "Service Provider";
  if (products.length > 0) return "Product Seller";
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
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    setMissingProfile(false);

    try {
      const [profile, orders, products, services, documents] = await Promise.all([
        partnerApi.profile(),
        partnerApi.orders().catch(() => []),
        partnerApi.products().catch(() => []),
        partnerApi.services().catch(() => []),
        partnerApi.documents().catch(() => [])
      ]);
      setData({ profile, orders, products, services, documents });
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

  if (loading) return <LoadingState />;

  if (missingProfile) {
    return (
      <Screen>
        <Hero
          eyebrow="Partner profile"
          title="Your partner profile is not active."
          subtitle="This account is signed in, but no active KariGO Partner profile is linked to it."
        />
        <Card>
          <MutedText>
            If this is a new account, start Partner Onboarding. If this account was closed or removed, contact KariGO support.
          </MutedText>
          <PrimaryButton label="Start Partner Onboarding" onPress={() => void Linking.openURL("https://vendor.karigo.com.ng/register")} />
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
  const documentPending = data.documents.filter((document) => document.verificationStatus !== "APPROVED").length;
  const profileWarning = partnerProfileWarning(data.profile);

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
          {data.profile?.city ?? "City pending"}, {data.profile?.state ?? "State pending"} - {partnerType(data.products, data.services)}
        </MutedText>
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
        <StatCard label="Products" value={data.products.length} />
        <StatCard label="Services" value={data.services.length} />
      </View>

      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Onboarding readiness</Text>
          <Badge label={documentPending > 0 ? "Needs review" : "Ready check"} tone={documentPending > 0 ? "warning" : "info"} />
        </View>
        <MutedText>
          Upload and verification workflows stay tied to the approved Partner Workspace. This app currently gives mobile visibility and route access.
        </MutedText>
        <PrimaryButton label="View documents" onPress={() => router.push("/documents")} variant="secondary" />
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
