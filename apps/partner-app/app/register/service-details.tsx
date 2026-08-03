import { useRouter } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { registrationApi } from "../../src/api/registration.api";
import { Card, Hero, MutedText, PrimaryButton, Screen, TextField } from "../../src/components/ui";
import { usePartnerRegistration } from "../../src/contexts/partner-registration-context";
import { brand } from "@karigo/config";

export default function RegisterServiceDetailsScreen() {
  const router = useRouter();
  const { registration, updateRegistration } = usePartnerRegistration();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueNext() {
    setSaving(true);
    setError(null);
    try {
      await registrationApi.savePartnerDraft({
        onboardingStage: "DOCUMENTS",
        accountType: registration.accountType,
        draftData: registration
      });
      router.push("/register/documents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Partner readiness details could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Hero eyebrow="Operations" title="Readiness details" subtitle="Add optional operating details so KariGO can review the right onboarding path." />
      <Card>
        <TextField label="Operating hours optional" placeholder="Monday-Saturday, 8am-9pm" value={registration.operatingHours} onChangeText={(operatingHours) => updateRegistration({ operatingHours })} />
        <TextField label="Service areas optional" placeholder="Tarauni, Wuse, Gwarinpa" value={registration.serviceAreas} onChangeText={(serviceAreas) => updateRegistration({ serviceAreas })} />
        <TextField label="Delivery readiness optional" placeholder="Can prepare within 30 minutes, needs KariGO pickup..." value={registration.deliveryReadiness} onChangeText={(deliveryReadiness) => updateRegistration({ deliveryReadiness })} />
        <TextField label="Delivery preference optional" value={registration.deliveryPreference} onChangeText={(deliveryPreference) => updateRegistration({ deliveryPreference })} />
        <TextField label="Average preparation time optional" value={registration.averagePreparationTime} onChangeText={(averagePreparationTime) => updateRegistration({ averagePreparationTime })} />
        <TextField label="Number of staff optional" keyboardType="numeric" value={registration.numberOfStaff} onChangeText={(numberOfStaff) => updateRegistration({ numberOfStaff })} />
        <TextField label="Catalogue category optional" value={registration.catalogueCategory} onChangeText={(catalogueCategory) => updateRegistration({ catalogueCategory })} />
        <TextField label="Estimated catalogue size optional" value={registration.estimatedCatalogueSize} onChangeText={(estimatedCatalogueSize) => updateRegistration({ estimatedCatalogueSize })} />
        <TextField
          label="Existing delivery or service process optional"
          value={registration.existingDelivery}
          multiline
          onChangeText={(existingDelivery) => updateRegistration({ existingDelivery })}
        />
        <MutedText>These details support review only. They do not activate payouts, live service dispatch or unrestricted marketplace visibility.</MutedText>
        {error ? <Text style={{ color: brand.colors.primary, fontWeight: "800" }}>{error}</Text> : null}
        <PrimaryButton label={saving ? "Saving..." : "Continue"} onPress={() => void continueNext()} disabled={saving} />
      </Card>
    </Screen>
  );
}
