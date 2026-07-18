import { Linking, Text } from "react-native";
import { Button, Card, Protected, Screen, ui } from "../../src/components/ui";

const termsUrl = "https://www.karigo.com.ng/terms";

export default function InAppTermsScreen() {
  return <Protected>
    <Screen title="Terms">
      <Card>
        <Text style={ui.cardTitle}>Customer responsibilities</Text>
        <Text style={ui.cardText}>Use KariGO with accurate account details, delivery addresses, order details and service request information.</Text>
        <Text style={ui.muted}>Pay only through payment methods shown in the app and wait for KariGO backend verification before treating online payments as successful.</Text>
      </Card>
      <Card>
        <Text style={ui.cardTitle}>Service availability</Text>
        <Text style={ui.muted}>KariGO launch services focus on approved cities and controlled features. Rides, utilities, refunds, payouts and wallet automation remain gated until separately enabled.</Text>
      </Card>
      <Card>
        <Text style={ui.cardTitle}>Full terms</Text>
        <Text style={ui.muted}>Open the public website version for complete Terms and future legal updates.</Text>
        <Button title="Open full Terms" tone="muted" onPress={() => Linking.openURL(termsUrl)} />
      </Card>
    </Screen>
  </Protected>;
}
