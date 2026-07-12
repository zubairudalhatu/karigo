import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { DeliveryStatus, jobsApi, RiderJob, RiderRejectionReason } from "../../src/api/jobs.api";
import { Button, Card, Field, Loading, Message, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError, money } from "../../src/lib/errors";

const nextStatus: Record<string, DeliveryStatus | undefined> = {
  RIDER_ARRIVING_PICKUP: "PICKED_UP",
  PICKED_UP: "ON_THE_WAY",
  ON_THE_WAY: "ARRIVED_DESTINATION",
  ARRIVED_DESTINATION: "DELIVERED"
};

const labels: Record<DeliveryStatus, string> = {
  PICKED_UP: "Confirm pickup",
  ON_THE_WAY: "Start delivery",
  ARRIVED_DESTINATION: "Arrived at destination",
  DELIVERED: "Mark delivered"
};

const rejectionReasons: Array<{ value: RiderRejectionReason; label: string }> = [
  { value: "TOO_FAR", label: "Too far" },
  { value: "VEHICLE_ISSUE", label: "Vehicle issue" },
  { value: "EMERGENCY", label: "Emergency" },
  { value: "UNABLE_TO_CONTACT", label: "Cannot contact" },
  { value: "OTHER", label: "Other" }
];

const addressText = (address?: RiderJob["deliveryAddress"]) => [address?.addressLine, address?.city, address?.state].filter(Boolean).join(", ");

async function openMaps(query: string) {
  if (!query.trim()) return;
  await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
}

export default function JobDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<RiderJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reason, setReason] = useState<RiderRejectionReason>("TOO_FAR");
  const [details, setDetails] = useState("");
  const [otp, setOtp] = useState("");

  async function load() {
    setLoading(true);
    try {
      setJob(await jobsApi.detail(id));
      setError("");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [id]);
  if (!job && !error) return <Loading label="Loading job..." />;

  const next = job ? nextStatus[job.orderStatus] : undefined;
  const pickupLocation = job?.vendor ? [job.vendor.address, job.vendor.city].filter(Boolean).join(", ") : addressText(job?.pickupAddress);
  const deliveryLocation = addressText(job?.deliveryAddress);

  async function action(run: () => Promise<unknown>, message: string) {
    try {
      await run();
      setSuccess(message);
      setError("");
      await load();
      return true;
    } catch (e) {
      setSuccess("");
      setError(friendlyError(e));
      return false;
    }
  }

  return <Protected><Screen title={job?.orderNumber ?? "Job details"} refreshing={loading} onRefresh={load}><Message error>{error}</Message><Message>{success}</Message>{job ? <>
    <Card><Text style={ui.title}>{job.orderStatus.replaceAll("_", " ")}</Text><StatusBadge status={job.orderStatus} /><Text>{job.vendor?.businessName ?? job.serviceCategory}</Text><Text style={ui.muted}>{job.itemDescription || "Delivery order"} - {money(job.deliveryFee)} delivery fee</Text>{job.customerNote ? <Text style={ui.muted}>Customer note: {job.customerNote}</Text> : null}</Card>
    <Card><Text style={ui.title}>Pickup</Text><Text>{pickupLocation || "Pickup location unavailable"}</Text><Button tone="muted" title="Open pickup in maps" disabled={!pickupLocation} onPress={() => openMaps(pickupLocation)} /></Card>
    <Card><Text style={ui.title}>Delivery</Text><Text>{deliveryLocation || "Delivery location unavailable"}</Text><Text style={ui.muted}>{job.deliveryAddress?.deliveryNote}</Text><Button tone="muted" title="Open delivery in maps" disabled={!deliveryLocation} onPress={() => openMaps(deliveryLocation)} /></Card>
    {job.orderStatus === "RIDER_ASSIGNED" ? <><Button title="Accept job and head to pickup" onPress={() => action(() => jobsApi.accept(job.id), "Job accepted. You are heading to pickup.")} /><Card><Text style={ui.title}>Cannot take this job?</Text><Text style={ui.muted}>Choose a safe reason. Dispatch will review and reassign the delivery.</Text><View style={styles.reasonGrid}>{rejectionReasons.map((item) => <Button key={item.value} title={item.label} tone={reason === item.value ? "primary" : "muted"} onPress={() => setReason(item.value)} />)}</View><Field value={details} onChangeText={setDetails} placeholder="Optional details" /><Button tone="muted" title="Reject job" onPress={() => action(() => jobsApi.reject(job.id, reason, details || undefined), "Job rejected. Admin dispatch will reassign it.")} /></Card></> : null}
    {next ? <Button title={labels[next]} onPress={() => action(() => jobsApi.status(job.id, next), "Delivery status updated.")} /> : null}
    {job.orderStatus === "ARRIVED_DESTINATION" ? <Card><Text style={ui.title}>Customer handoff</Text><Text style={ui.muted}>Only mark delivered after the customer has received the order. The OTP completion step appears after delivery is marked.</Text></Card> : null}
    {job.orderStatus === "DELIVERED" ? <Card><Text style={ui.title}>Complete with customer OTP</Text><Text style={ui.muted}>Ask the customer to reveal the six-digit delivery code. Do not request or store it anywhere else.</Text><Field keyboardType="number-pad" maxLength={6} value={otp} onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit delivery OTP" /><Button disabled={otp.length !== 6} title="Complete delivery" onPress={async () => { if (await action(() => jobsApi.complete(job.id, otp), "Delivery completed successfully.")) router.replace("/earnings"); }} /></Card> : null}
    <Card><Text style={ui.title}>Activity</Text>{job.statusHistory?.map((item) => <Text key={item.id}>{item.newStatus.replaceAll("_", " ")} - {new Date(item.createdAt).toLocaleString()}</Text>)}</Card>
  </> : null}</Screen></Protected>;
}

const styles = StyleSheet.create({
  reasonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }
});
