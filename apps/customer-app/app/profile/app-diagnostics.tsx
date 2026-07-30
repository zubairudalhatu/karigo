import { brand } from "@karigo/config";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { KariGoAppTopBar } from "../../src/components/kari-go-app-top-bar";
import { Button, Card, Message, Protected, Screen, ui } from "../../src/components/ui";
import {
  checkForCustomerUpdate,
  CustomerUpdateDiagnostics,
  getCustomerUpdateDiagnostics,
  reloadCustomerAppForUpdate
} from "../../src/lib/customer-updates";

function DiagnosticRow({ label, value }: { label: string; value: string | boolean }) {
  return <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{String(value)}</Text>
  </View>;
}

export default function AppDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<CustomerUpdateDiagnostics>(() => getCustomerUpdateDiagnostics());
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function refreshDiagnostics() {
    setDiagnostics(getCustomerUpdateDiagnostics());
  }

  async function checkForUpdate() {
    setChecking(true);
    setMessage("");
    setError("");
    try {
      const result = await checkForCustomerUpdate();
      if (result.status === "failed") setError(result.message);
      else setMessage(result.message);
      refreshDiagnostics();
    } finally {
      setChecking(false);
    }
  }

  async function applyDownloadedUpdate() {
    setMessage("");
    setError("");
    try {
      const result = await reloadCustomerAppForUpdate();
      if (!result.ready) {
        setMessage(result.message);
        refreshDiagnostics();
      }
    } catch {
      setError("Downloaded update could not be applied safely. Please close and reopen KariGO.");
      refreshDiagnostics();
    }
  }

  return <Protected>
    <KariGoAppTopBar showBack title="App diagnostics" />
    <Screen topPadding={false}>
      <Message>{message}</Message>
      <Message error>{error}</Message>

      <Card>
        <Text style={ui.cardTitle}>App diagnostics</Text>
        <Text style={ui.muted}>Use this screen to confirm whether the installed app is running the embedded bundle or a downloaded OTA update.</Text>
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Release identity</Text>
        <DiagnosticRow label="App version" value={diagnostics.appVersion} />
        <DiagnosticRow label="Android versionCode" value={diagnostics.androidVersionCode} />
        <DiagnosticRow label="Runtime version" value={diagnostics.runtimeVersion} />
        <DiagnosticRow label="EAS channel" value={diagnostics.channel} />
        <DiagnosticRow label="Update ID" value={diagnostics.updateId} />
        <DiagnosticRow label="Update created" value={diagnostics.createdAt} />
        <DiagnosticRow label="Source" value={diagnostics.source} />
        <DiagnosticRow label="Environment" value={diagnostics.appEnvironment} />
        <DiagnosticRow label="API host" value={diagnostics.apiHost} />
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Update status</Text>
        <DiagnosticRow label="Update available" value={diagnostics.updateAvailable} />
        <DiagnosticRow label="Recently downloaded" value={diagnostics.recentlyDownloaded} />
        <DiagnosticRow label="Last check" value={diagnostics.lastCheckResult} />
        <DiagnosticRow label="Last checked at" value={diagnostics.lastCheckAt || "Not checked"} />
        <DiagnosticRow label="Last safe error" value={diagnostics.lastUpdateError || "None"} />
        <DiagnosticRow label="Emergency launch" value={diagnostics.emergencyLaunch} />
        <View style={styles.actions}>
          <Button title={checking ? "Checking..." : "Check for app update"} disabled={checking} onPress={() => void checkForUpdate()} />
          <Button title="Restart to apply downloaded update" tone="muted" disabled={!diagnostics.recentlyDownloaded} onPress={() => void applyDownloadedUpdate()} />
          <Button title="Refresh diagnostics" tone="muted" onPress={refreshDiagnostics} />
        </View>
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Safety</Text>
        <Text style={ui.muted}>This screen does not show API keys, JWTs, refresh tokens, cookies, credentials or secret environment values.</Text>
      </Card>
    </Screen>
  </Protected>;
}

const styles = StyleSheet.create({
  actions: { gap: 10 },
  label: { color: brand.colors.muted, flex: 0.45, fontSize: 13, fontWeight: "800" },
  row: { alignItems: "flex-start", borderBottomColor: brand.colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 12, paddingVertical: 9 },
  value: { color: brand.colors.charcoal, flex: 0.55, fontSize: 13, fontWeight: "800", lineHeight: 18 }
});
