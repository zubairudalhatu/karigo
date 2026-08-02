import { Linking } from "react-native";
import { AuthGate } from "../src/components/auth-gate";
import { Card, Hero, MutedText, PrimaryButton, Screen } from "../src/components/ui";

const supportUrl = "https://www.karigo.com.ng/contact";

export default function PartnerSupportScreen() {
  return (
    <AuthGate>
      <Screen>
        <Hero eyebrow="Support" title="Partner Support" subtitle="Get help with orders, catalogues, services, settlements and account access." />
        <Card>
          <MutedText>Contact KariGO Support for account access, document review, orders, service listings, profile updates and settlement questions.</MutedText>
          <MutedText>Do not share passwords, OTPs, private bank credentials or payment secrets in support messages.</MutedText>
          <PrimaryButton label="Open Support" onPress={() => void Linking.openURL(supportUrl)} />
        </Card>
      </Screen>
    </AuthGate>
  );
}
