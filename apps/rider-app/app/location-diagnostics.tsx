import { useState } from "react";
import { Share, Text } from "react-native";
import { Button, Protected, Screen } from "../src/components/ui";
import { inspectActiveWorkLocationTask } from "../src/lib/background-location";
import { armLocationQaDiagnostics, clearLocationQaDiagnostics, LOCATION_QA_DIAGNOSTICS_AVAILABLE, readLocationQaDiagnostics } from "../src/lib/location-diagnostics";

export default function LocationDiagnostics() {
  const [status,setStatus]=useState("Off. Evidence contains no coordinates or account identifiers.");
  const [report,setReport]=useState("");
  const [busy,setBusy]=useState(false);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try { await action(); } catch { setStatus("Local evidence could not be read or saved. Try again."); }
    finally { setBusy(false); }
  }
  if (!LOCATION_QA_DIAGNOSTICS_AVAILABLE) return <Protected><Screen><Text>Diagnostics are unavailable in this release.</Text></Screen></Protected>;
  return <Protected><Screen>
    <Text accessibilityRole="header">Active-work location QA</Text>
    <Text>{status}</Text>
    <Text>This does not enable location tracking or change availability. Local evidence expires after 30 minutes and is limited to 48 events. Share only with your authorized QA operator.</Text>
    <Button disabled={busy} title="Enable local evidence for 30 minutes" onPress={()=>void run(async()=>{await armLocationQaDiagnostics();await inspectActiveWorkLocationTask();setStatus("Local evidence enabled for 30 minutes.");})} />
    <Button disabled={busy} title="Read local evidence" onPress={()=>void run(async()=>{await inspectActiveWorkLocationTask();setReport(JSON.stringify(await readLocationQaDiagnostics(),null,2));})} />
    <Button disabled={busy} title="Share sanitized evidence" onPress={()=>void run(async()=>{const text=JSON.stringify(await readLocationQaDiagnostics(),null,2);await Share.share({message:text});})} />
    <Button disabled={busy} title="Clear local evidence" onPress={()=>void run(async()=>{await clearLocationQaDiagnostics();setReport("");setStatus("Off. Evidence cleared.");})} />
    <Text selectable>{report}</Text>
  </Screen></Protected>;
}
