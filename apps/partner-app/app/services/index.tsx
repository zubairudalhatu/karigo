import { brand } from "@karigo/config";
import type { PartnerCapabilities, VendorServiceSummary } from "@karigo/shared-types";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { partnerApi } from "../../src/api/partner.api";
import { AuthGate } from "../../src/components/auth-gate";
import { Badge, Card, EmptyState, Hero, LoadingState, MutedText, PrimaryButton, Screen } from "../../src/components/ui";
import { formatLabel, money, statusTone } from "../../src/lib/labels";

function ServicesContent() {
  const router = useRouter();
  const [services, setServices] = useState<VendorServiceSummary[]>([]);
  const [capabilities, setCapabilities] = useState<PartnerCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingServiceId, setSavingServiceId] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const nextCapabilities = await partnerApi.capabilities();
      setCapabilities(nextCapabilities);
      setServices(nextCapabilities.canManageServices ? await partnerApi.services() : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Services could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const canManageServices = capabilities?.canManageServices ?? false;

  const toggleAvailability = useCallback(async (service: VendorServiceSummary) => {
    setSavingServiceId(service.id);
    setMessage(null);
    setError(null);
    try {
      await partnerApi.updateService(service.id, { isAvailable: !service.isAvailable });
      setMessage(service.isAvailable ? "Service marked unavailable." : "Service marked available.");
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Service availability could not be updated.");
    } finally {
      setSavingServiceId(null);
    }
  }, [load]);

  const archiveService = useCallback(async (service: VendorServiceSummary) => {
    setSavingServiceId(service.id);
    setMessage(null);
    setError(null);
    try {
      await partnerApi.archiveService(service.id);
      setMessage("Service archived.");
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Service could not be archived.");
    } finally {
      setSavingServiceId(null);
    }
  }, [load]);

  if (loading) return <LoadingState label="Loading service catalogue..." />;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
      <Hero eyebrow="Service Provider" title="Services" subtitle="Service catalogue visibility for approved SME service providers and mixed partners." />
      {canManageServices ? <PrimaryButton label="Add service" onPress={() => router.push("/services/new")} /> : null}
      {error ? <Card><MutedText>{error}</MutedText><PrimaryButton label="Retry" onPress={() => void load()} variant="secondary" /></Card> : null}
      {message ? <MutedText>{message}</MutedText> : null}
      {!canManageServices ? (
        <EmptyState
          title="Services unavailable for this account"
          body={capabilities?.partnerType === "PRODUCT_SELLER"
            ? "This Partner profile is set up as a Product Seller. Use Products to manage catalogue items, or contact KariGO if your business should also manage services."
            : capabilities?.message ?? "Service Provider or mixed Partner capability is required to manage services."}
        />
      ) : services.length === 0 ? (
        <EmptyState title="No services yet" body="Add your first service from mobile, then use Partner Workspace for advanced operational review if KariGO requests more detail." />
      ) : (
        services.map((service) => (
          <Card key={service.id}>
            <View style={styles.row}>
              <Text style={styles.title}>{service.name}</Text>
              <Badge
                label={service.readinessOnly ? "Readiness only" : formatLabel(service.status)}
                tone={service.readinessOnly ? "warning" : statusTone(service.status)}
              />
            </View>
            <MutedText>{service.description}</MutedText>
            <MutedText>{formatLabel(service.serviceType)} - {service.serviceAreas.join(", ") || "Service area pending"}</MutedText>
            {service.basePrice ? <Text style={styles.amount}>{money(service.basePrice)}</Text> : null}
            {service.priceNote ? <Text style={styles.priceNote}>{service.priceNote}</Text> : null}
            <View style={styles.actions}>
              <PrimaryButton label="Edit" onPress={() => router.push(`/services/${service.id}`)} variant="secondary" />
              <PrimaryButton
                label={savingServiceId === service.id ? "Updating..." : service.isAvailable ? "Mark unavailable" : "Mark available"}
                onPress={() => void toggleAvailability(service)}
                disabled={savingServiceId === service.id}
                variant={service.isAvailable ? "secondary" : "primary"}
              />
              <PrimaryButton
                label={savingServiceId === service.id ? "Archiving..." : "Archive"}
                onPress={() => void archiveService(service)}
                disabled={savingServiceId === service.id}
                variant="secondary"
              />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

export default function ServicesScreen() {
  return (
    <AuthGate>
      <ServicesContent />
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  title: {
    flex: 1,
    color: brand.colors.charcoal,
    fontSize: 16,
    fontWeight: "900"
  },
  priceNote: {
    color: brand.colors.charcoal,
    fontSize: 14,
    fontWeight: "800"
  },
  amount: {
    color: brand.colors.charcoal,
    fontSize: 18,
    fontWeight: "900"
  },
  actions: {
    gap: 8
  }
});
