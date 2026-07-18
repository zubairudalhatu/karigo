import { Linking, Text } from "react-native";
import { Button, Card, Protected, Screen, ui } from "../../src/components/ui";

const privacyUrl = "https://www.karigo.com.ng/privacy";

export default function CaptainPrivacyScreen() {
  return <Protected>
    <Screen title="Privacy Policy">
      <Card>
        <Text style={ui.sectionTitle}>Captain privacy summary</Text>
        <Text style={ui.pageIntro}>KariGO uses Captain account, delivery, location, vehicle, application and support information to coordinate approved delivery work and account safety.</Text>
        <Text style={ui.muted}>Live location is used only for approved operational workflows while you are online or handling assigned delivery work.</Text>
      </Card>
      <Card>
        <Text style={ui.sectionTitle}>Full policy</Text>
        <Text style={ui.muted}>Open the public website version for the complete KariGO Privacy Policy.</Text>
        <Button title="Open full Privacy Policy" tone="muted" onPress={() => Linking.openURL(privacyUrl)} />
      </Card>
    </Screen>
  </Protected>;
}
