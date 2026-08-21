import { Text } from "react-native";
import { Card, Protected, Screen, ui } from "../src/components/ui";

export default function RideSafety() {
  return <Protected><Screen title="Ride Safety" subtitle="Keep these checks available throughout active work.">
    <Card tone="soft"><Text style={ui.sectionTitle}>During an active Ride</Text><Text style={ui.muted}>Confirm the Customer and Ride reference in KariGO. Never ask for passwords, payment secrets or a Ride PIN before pickup.</Text></Card>
    <Card><Text style={ui.sectionTitle}>Immediate danger</Text><Text style={ui.muted}>Move to a safe place and contact the appropriate local emergency service. KariGO does not fabricate an emergency-service connection from this screen.</Text></Card>
    <Card><Text style={ui.sectionTitle}>Support or report an issue</Text><Text style={ui.muted}>Keep the Ride reference and timeline intact so KariGO Operations can review the Ride. Conversation summaries are retained without exposing private chat on ordinary admin cards.</Text></Card>
  </Screen></Protected>;
}
