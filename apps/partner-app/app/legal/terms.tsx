import { Linking } from "react-native";
import { AuthGate } from "../../src/components/auth-gate";
import { Card, Hero, MutedText, PrimaryButton, Screen } from "../../src/components/ui";

const termsUrl = "https://www.karigo.com.ng/terms";

export default function PartnerTermsScreen() {
  return (
    <AuthGate>
      <Screen>
        <Hero eyebrow="Terms" title="Terms of Service" subtitle="Partner responsibilities for accurate catalogues, service availability and safe fulfilment." />
        <Card>
          <MutedText>Partners are responsible for accurate product or service information, availability, pricing, preparation timelines and safe customer handling.</MutedText>
          <MutedText>KariGO may restrict Partner access where orders, settlements, documents or business operations require review.</MutedText>
          <PrimaryButton label="Open full Terms" onPress={() => void Linking.openURL(termsUrl)} variant="secondary" />
        </Card>
      </Screen>
    </AuthGate>
  );
}
