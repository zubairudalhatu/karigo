import { Linking } from "react-native";
import { AuthGate } from "../../src/components/auth-gate";
import { Card, Hero, MutedText, PrimaryButton, Screen } from "../../src/components/ui";

const privacyUrl = "https://www.karigo.com.ng/privacy";

export default function PartnerPrivacyScreen() {
  return (
    <AuthGate>
      <Screen>
        <Hero eyebrow="Privacy" title="Privacy Policy" subtitle="How KariGO handles Partner account, business, order and support information." />
        <Card>
          <MutedText>KariGO uses Partner information to manage account access, order preparation, services, settlements, support, fraud prevention, safety and legal obligations.</MutedText>
          <MutedText>Business and operational records may be retained where required for financial, audit, security, dispute or regulatory reasons.</MutedText>
          <PrimaryButton label="Open full Privacy Policy" onPress={() => void Linking.openURL(privacyUrl)} variant="secondary" />
        </Card>
      </Screen>
    </AuthGate>
  );
}
