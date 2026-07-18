import { Linking, Text } from "react-native";
import { Button, Card, Protected, Screen, ui } from "../../src/components/ui";

const privacyUrl = "https://www.karigo.com.ng/privacy";

export default function InAppPrivacyPolicyScreen() {
  return <Protected>
    <Screen title="Privacy Policy">
      <Card>
        <Text style={ui.cardTitle}>KariGO privacy summary</Text>
        <Text style={ui.cardText}>KariGO uses account, delivery, location, payment and support information to operate delivery, wallet, SME Services and customer support workflows.</Text>
        <Text style={ui.muted}>We collect only what is needed to provide the service, verify accounts, process orders, prevent fraud, support customers and meet legal or operational obligations.</Text>
      </Card>
      <Card>
        <Text style={ui.cardTitle}>Sensitive information</Text>
        <Text style={ui.muted}>Never share OTPs, passwords, payment card details or delivery codes with anyone outside the correct in-app flow. KariGO will not ask for those secrets in chat.</Text>
        <Text style={ui.muted}>Payment confirmation is handled by the backend and payment provider. Wallet balances change only after verified server-side events.</Text>
      </Card>
      <Card>
        <Text style={ui.cardTitle}>Full policy</Text>
        <Text style={ui.muted}>Open the public website version for the complete Privacy Policy and future legal updates.</Text>
        <Button title="Open full Privacy Policy" tone="muted" onPress={() => Linking.openURL(privacyUrl)} />
      </Card>
    </Screen>
  </Protected>;
}
