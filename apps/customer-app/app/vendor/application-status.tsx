import { useState } from "react";
import { Text } from "react-native";
import { vendorApplicationsApi, VendorApplicationStatus } from "../../src/api/vendor-applications.api";
import { KariGoAppTopBar } from "../../src/components/kari-go-app-top-bar";
import { Button, Card, Field, Message, Screen, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

export default function VendorApplicationStatusScreen() {
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<VendorApplicationStatus | null>(null);
  const [error, setError] = useState("");

  async function checkStatus() {
    setError("");
    setStatus(null);
    try {
      setStatus(await vendorApplicationsApi.status(reference, email));
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return <>
    <KariGoAppTopBar showBack title="Application Status" />
    <Screen title="Check Application Status" topPadding={false}>
      <Text style={ui.pageIntro}>Enter your application reference and application email. KariGO does not expose internal review notes in public status lookups.</Text>
      <Field placeholder="Application reference" value={reference} onChangeText={setReference} autoCapitalize="characters" />
      <Field placeholder="Application email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Button title="Check status" disabled={!reference.trim() || !email.trim()} onPress={checkStatus} />
      <Message error>{error}</Message>
      {status ? <Card>
        <Text style={ui.cardTitle}>{status.businessName}</Text>
        <Text style={ui.muted}>Reference: {status.reference}</Text>
        <Text style={ui.payable}>{status.status.replaceAll("_", " ")}</Text>
        <Text style={ui.pageIntro}>{status.message}</Text>
      </Card> : null}
    </Screen>
  </>;
}
