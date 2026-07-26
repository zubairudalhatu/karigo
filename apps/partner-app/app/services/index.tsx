import { brand } from "@karigo/config";
import { VendorServiceSummary } from "@karigo/shared-types";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { partnerApi } from "../../src/api/partner.api";
import { AuthGate } from "../../src/components/auth-gate";
import { Badge, Card, EmptyState, Hero, LoadingState, MutedText, Screen } from "../../src/components/ui";

function ServicesContent() {
  const [services, setServices] = useState<VendorServiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setServices(await partnerApi.services());
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

  if (loading) return <LoadingState label="Loading service catalogue..." />;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
      <Hero eyebrow="Service Provider" title="Services" subtitle="Service catalogue visibility for approved SME service providers and mixed partners." />
      {error ? <MutedText>{error}</MutedText> : null}
      {services.length === 0 ? (
        <EmptyState title="No services yet" body="Services can be added from Partner Workspace. Mobile service management can be expanded once launch usage is validated." />
      ) : (
        services.map((service) => (
          <Card key={service.id}>
            <View style={styles.row}>
              <Text style={styles.title}>{service.name}</Text>
              <Badge label={service.readinessOnly ? "Readiness" : service.status} tone={service.isAvailable ? "success" : "warning"} />
            </View>
            <MutedText>{service.description}</MutedText>
            <MutedText>{service.serviceAreas.join(", ") || "Service area pending"}</MutedText>
            {service.priceNote ? <Text style={styles.priceNote}>{service.priceNote}</Text> : null}
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
  }
});
