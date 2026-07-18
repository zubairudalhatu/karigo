import { router } from "expo-router";
import { Text } from "react-native";
import { Button, Card, Protected, Screen, ui } from "../../src/components/ui";

export default function ReturnsRefunds() {
  return <Protected>
    <Screen title="Returns and Refunds">
      <Text style={ui.pageIntro}>How KariGO reviews delivery issues, cancellations and refund requests.</Text>
      <Card>
        <Text style={ui.cardTitle}>Refund policy</Text>
        <Text style={ui.muted}>Refunds are reviewed by KariGO Support and processed after order/payment verification.</Text>
        <Text style={ui.muted}>Automatic wallet refunds are not active yet. Wallet credits, provider reversals and cash/POD refunds must be backed by backend or operations verification.</Text>
      </Card>

      <Card>
        <Text style={ui.cardTitle}>When to report an issue</Text>
        <Text style={ui.muted}>Wrong or missing items, damaged delivery, duplicate payment, failed payment debit, cancellation before dispatch and cancellation after dispatch should be reported with your order number.</Text>
        <Text style={ui.muted}>Please do not share OTPs, card details or payment secrets in support messages.</Text>
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Cash / Pay on Delivery</Text>
        <Text style={ui.muted}>Cash/POD orders require manual collection and reconciliation. Please pay only the amount shown in the app and wait for KariGO Support to review any refund request.</Text>
      </Card>

      <Card>
        <Text style={ui.cardTitle}>How to get help</Text>
        <Text style={ui.muted}>Open a support ticket from the app and include your order number, payment channel and a short description of the issue.</Text>
        <Button title="Open Support Centre" onPress={() => router.push("/support")} />
      </Card>
    </Screen>
  </Protected>;
}
