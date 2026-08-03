import type { VendorServiceInput, VendorServiceSummary } from "@karigo/shared-types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl } from "react-native";
import { partnerApi } from "../../src/api/partner.api";
import { AuthGate } from "../../src/components/auth-gate";
import { PartnerServiceForm } from "../../src/components/service-form";
import { Hero, LoadingState, MutedText, PrimaryButton, Screen } from "../../src/components/ui";

function EditServiceContent() {
  const router = useRouter();
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const [service, setService] = useState<VendorServiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!serviceId) return;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setService(await partnerApi.service(serviceId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Service could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [serviceId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(payload: VendorServiceInput) {
    if (!serviceId) return;
    setSaving(true);
    setError(null);
    try {
      await partnerApi.updateService(serviceId, payload);
      router.replace("/services");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Service could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!serviceId) return;
    setArchiving(true);
    setError(null);
    try {
      await partnerApi.archiveService(serviceId);
      router.replace("/services");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Service could not be archived.");
    } finally {
      setArchiving(false);
    }
  }

  if (loading) return <LoadingState label="Loading service..." />;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
      <Hero eyebrow="Services" title="Edit service" subtitle="Update service details, service areas, readiness state and availability from the Partner App." />
      {error ? <MutedText>{error}</MutedText> : null}
      {service ? (
        <>
          <PartnerServiceForm initialService={service} saving={saving} submitLabel="Save service changes" onSubmit={submit} />
          <PrimaryButton
            label={archiving ? "Archiving..." : "Archive service"}
            onPress={() => void archive()}
            disabled={archiving || saving}
            variant="secondary"
          />
        </>
      ) : (
        <>
          <MutedText>Service record was not found for this partner account.</MutedText>
          <PrimaryButton label="Back to services" onPress={() => router.replace("/services")} variant="secondary" />
        </>
      )}
    </Screen>
  );
}

export default function EditServiceScreen() {
  return (
    <AuthGate>
      <EditServiceContent />
    </AuthGate>
  );
}
