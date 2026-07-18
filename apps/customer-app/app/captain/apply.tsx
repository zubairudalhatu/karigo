import { Linking, Text } from "react-native";
import { Button, Card, Protected, Screen, ui } from "../../src/components/ui";

const captainApplicationUrl = "https://www.karigo.com.ng/riders#delivery-captain-application";

export default function CustomerCaptainApplicationInfo() {
  return <Protected>
    <Screen title="Become a KariGO Captain">
      <Card>
        <Text style={ui.cardTitle}>Delivery Captain application</Text>
        <Text style={ui.muted}>KariGO Captain onboarding uses a dedicated application and review path so documents, vehicle details and account activation stay separate from your Customer account.</Text>
        <Text style={ui.muted}>Delivery Captain applications are reviewed by KariGO Operations. KariGO Rides remains readiness-only until separately approved.</Text>
        <Button title="Open Captain application" onPress={() => Linking.openURL(captainApplicationUrl)} />
      </Card>
    </Screen>
  </Protected>;
}
