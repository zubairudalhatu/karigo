import { useRouter } from "expo-router";
import { Card, Hero, MutedText, PrimaryButton, Screen, TextField } from "../../src/components/ui";
import { usePartnerRegistration } from "../../src/contexts/partner-registration-context";

export default function RegisterServiceDetailsScreen() {
  const router = useRouter();
  const { registration, updateRegistration } = usePartnerRegistration();

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
        <PrimaryButton label="Continue" onPress={() => router.push("/register/documents")} />
      </Card>
    </Screen>
  );
}
