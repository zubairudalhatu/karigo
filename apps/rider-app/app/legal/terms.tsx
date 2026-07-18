import { Linking, Text } from "react-native";
import { Button, Card, Protected, Screen, ui } from "../../src/components/ui";

const termsUrl = "https://www.karigo.com.ng/terms";

export default function CaptainTermsScreen() {
  return <Protected>
    <Screen title="Terms">
      <Card>
        <Text style={ui.sectionTitle}>Captain terms summary</Text>
        <Text style={ui.pageIntro}>Use KariGO Captain only with your approved account, accurate vehicle/profile details and safe delivery conduct.</Text>
        <Text style={ui.muted}>Ride features, payout automation and wallet withdrawals remain disabled until separately approved.</Text>
      </Card>
      <Card>
        <Text style={ui.sectionTitle}>Full terms</Text>
        <Text style={ui.muted}>Open the public website version for the complete KariGO Terms.</Text>
        <Button title="Open full Terms" tone="muted" onPress={() => Linking.openURL(termsUrl)} />
      </Card>
    </Screen>
  </Protected>;
}
