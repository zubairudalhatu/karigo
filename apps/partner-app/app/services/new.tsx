import type { VendorServiceInput } from "@karigo/shared-types";
import { useRouter } from "expo-router";
import { useState } from "react";
import { partnerApi } from "../../src/api/partner.api";
import { AuthGate } from "../../src/components/auth-gate";
import { PartnerServiceForm } from "../../src/components/service-form";
import { Hero, MutedText, Screen } from "../../src/components/ui";

function NewServiceContent() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(payload: VendorServiceInput) {
    setSaving(true);
    setError(null);
    try {
      await partnerApi.createService(payload);
      router.replace("/services");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Service could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Hero eyebrow="Services" title="Add service" subtitle="Create a controlled service listing for approved Service Providers and mixed partners." />
      {error ? <MutedText>{error}</MutedText> : null}
      <PartnerServiceForm saving={saving} submitLabel="Create service" onSubmit={submit} />
    </Screen>
  );
}

export default function NewServiceScreen() {
  return (
    <AuthGate>
      <NewServiceContent />
    </AuthGate>
  );
}
