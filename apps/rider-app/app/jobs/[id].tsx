import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Text } from "react-native";
import { DeliveryStatus, jobsApi, RiderJob, RiderRejectionReason } from "../../src/api/jobs.api";
import { Button, Card, Field, Loading, Message, Protected, Screen, ui } from "../../src/components/ui";
import { friendlyError, money } from "../../src/lib/errors";

const nextStatus: Record<string, DeliveryStatus | undefined> = {
  RIDER_ARRIVING_PICKUP: "PICKED_UP", PICKED_UP: "ON_THE_WAY", ON_THE_WAY: "ARRIVED_DESTINATION", ARRIVED_DESTINATION: "DELIVERED"
};
const labels: Record<DeliveryStatus, string> = {
  PICKED_UP: "Confirm pickup", ON_THE_WAY: "Start delivery", ARRIVED_DESTINATION: "Confirm arrival", DELIVERED: "Mark delivered"
};
const addressText = (address?: RiderJob["deliveryAddress"]) => [address?.addressLine, address?.city, address?.state].filter(Boolean).join(", ");

export default function JobDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<RiderJob | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reason, setReason] = useState<RiderRejectionReason>("TOO_FAR");
  const [details, setDetails] = useState("");
  const [otp, setOtp] = useState("");
  const load = () => jobsApi.detail(id).then(setJob).catch((e) => setError(friendlyError(e)));
  useEffect(() => { void load(); }, [id]);
  if (!job && !error) return <Loading label="Loading job..." />;
  const next = job ? nextStatus[job.orderStatus] : undefined;
  async function action(run: () => Promise<unknown>, message: string) {
    try { await run(); setSuccess(message); setError(""); await load(); return true; } catch (e) { setError(friendlyError(e)); return false; }
  }
  return <Protected><Screen title={job?.orderNumber ?? "Job details"}><Message error>{error}</Message><Message>{success}</Message>{job ? <>
    <Card><Text style={ui.title}>{job.orderStatus.replaceAll("_", " ")}</Text><Text>{job.vendor?.businessName ?? job.serviceCategory}</Text><Text style={ui.muted}>{job.itemDescription || "Delivery order"} · {money(job.deliveryFee)}</Text></Card>
    <Card><Text style={ui.title}>Pickup</Text><Text>{job.vendor ? [job.vendor.address, job.vendor.city].filter(Boolean).join(", ") : addressText(job.pickupAddress)}</Text><Button tone="muted" title="Open pickup in maps" onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.vendor ? [job.vendor.address, job.vendor.city].filter(Boolean).join(", ") : addressText(job.pickupAddress))}`)} /></Card>
    <Card><Text style={ui.title}>Delivery</Text><Text>{addressText(job.deliveryAddress)}</Text><Text style={ui.muted}>{job.deliveryAddress?.deliveryNote}</Text><Button tone="muted" title="Open delivery in maps" onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText(job.deliveryAddress))}`)} /></Card>
    {job.orderStatus === "RIDER_ASSIGNED" ? <><Button title="Accept job" onPress={() => action(() => jobsApi.accept(job.id), "Job accepted. Head to pickup.")} /><Card><Text style={ui.title}>Cannot take this job?</Text><Field value={reason} onChangeText={(v) => setReason(v as RiderRejectionReason)} placeholder="TOO_FAR, VEHICLE_ISSUE, EMERGENCY, UNABLE_TO_CONTACT or OTHER" /><Field value={details} onChangeText={setDetails} placeholder="Optional details" /><Button tone="muted" title="Reject job" onPress={() => action(() => jobsApi.reject(job.id, reason, details || undefined), "Job rejected. Admin dispatch will reassign it.")} /></Card></> : null}
    {next ? <Button title={labels[next]} onPress={() => action(() => jobsApi.status(job.id, next), "Delivery status updated.")} /> : null}
    {job.orderStatus === "DELIVERED" || job.orderStatus === "ARRIVED_DESTINATION" ? <Card><Text style={ui.title}>Complete with customer OTP</Text><Field keyboardType="number-pad" maxLength={6} value={otp} onChangeText={setOtp} placeholder="6-digit delivery OTP" /><Button disabled={otp.length !== 6} title="Complete delivery" onPress={async () => { if (await action(() => jobsApi.complete(job.id, otp), "Delivery completed successfully.")) router.replace("/earnings"); }} /></Card> : null}
    <Card><Text style={ui.title}>Activity</Text>{job.statusHistory?.map((item) => <Text key={item.id}>{item.newStatus.replaceAll("_", " ")} · {new Date(item.createdAt).toLocaleString()}</Text>)}</Card>
  </> : null}</Screen></Protected>;
}
