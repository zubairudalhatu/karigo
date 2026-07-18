import { TaxiFareEstimate, TaxiTrip } from "@karigo/shared-types";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { taxiApi } from "../../src/api/taxi.api";
import { KariGoAppTopBar } from "../../src/components/kari-go-app-top-bar";
import { Button, Card, Field, Message, Protected, Screen, StatusBadge, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

const rideReviewNotice = "KariGO Rides remains controlled by operations flags. No ride dispatch or ride payment is active unless approved.";
const initialForm = {
  pickupAddress: "",
  destinationAddress: "",
  estimatedDistanceKm: "6.5",
  estimatedDurationMin: "18",
  customerNote: ""
};

const money = (kobo?: number | null) => `NGN ${Math.round(Number(kobo ?? 0) / 100).toLocaleString()}`;

export default function TaxiRequest() {
  const [form, setForm] = useState(initialForm);
  const [estimate, setEstimate] = useState<TaxiFareEstimate | null>(null);
  const [trips, setTrips] = useState<TaxiTrip[]>([]);
  const [created, setCreated] = useState<TaxiTrip | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const taxiEnabled = process.env.EXPO_PUBLIC_TAXI_SERVICE_ENABLED === "true" && process.env.EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED === "true";

  async function loadTrips() {
    if (!taxiEnabled) return;
    try {
      setTrips(await taxiApi.trips());
    } catch {
      // Keep the request form usable even if history is temporarily unavailable.
    }
  }

  useEffect(() => { void loadTrips(); }, [taxiEnabled]);

  async function estimateFare() {
    setLoading(true);
    setError("");
    setCreated(null);
    try {
      setEstimate(await taxiApi.fareEstimate({
        pickupAddress: form.pickupAddress,
        destinationAddress: form.destinationAddress,
        estimatedDistanceKm: Number(form.estimatedDistanceKm),
        estimatedDurationMin: Number(form.estimatedDurationMin)
      }));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  async function createTrip() {
    setLoading(true);
    setError("");
    try {
      const trip = await taxiApi.createTrip({
        pickupAddress: form.pickupAddress,
        destinationAddress: form.destinationAddress,
        estimatedDistanceKm: Number(form.estimatedDistanceKm),
        estimatedDurationMin: Number(form.estimatedDurationMin),
        customerNote: form.customerNote || undefined
      });
      setCreated(trip);
      setEstimate(null);
      await loadTrips();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  return <Protected>
    <KariGoAppTopBar showBack title="Ride Review" />
    <Screen title={taxiEnabled ? "Request Review Ride" : "KariGO Rides interest"} topPadding={false}>
      <Card><Text style={ui.cardTitle}>{taxiEnabled ? "Ride operations review" : "Join the Ride Waitlist"}</Text><Text style={ui.pageIntro}>{taxiEnabled ? rideReviewNotice : "KariGO Rides requires operations approval before public booking. Please use the waitlist while KariGO reviews verified Ride Captains, fare controls and safety operations."}</Text></Card>
      {!taxiEnabled ? <Button title="Join Ride Waitlist" onPress={() => router.push("/taxi/waitlist")} /> : <>
        <Message error>{error}</Message>
        <Field placeholder="Pickup address" value={form.pickupAddress} onChangeText={(pickupAddress) => setForm({ ...form, pickupAddress })} />
        <Field placeholder="Destination address" value={form.destinationAddress} onChangeText={(destinationAddress) => setForm({ ...form, destinationAddress })} />
        <Field placeholder="Estimated distance km" keyboardType="decimal-pad" value={form.estimatedDistanceKm} onChangeText={(estimatedDistanceKm) => setForm({ ...form, estimatedDistanceKm })} />
        <Field placeholder="Estimated duration minutes" keyboardType="number-pad" value={form.estimatedDurationMin} onChangeText={(estimatedDurationMin) => setForm({ ...form, estimatedDurationMin })} />
        <Field placeholder="Note optional" value={form.customerNote} onChangeText={(customerNote) => setForm({ ...form, customerNote })} />
        <Button title={loading ? "Estimating..." : "Estimate Fare"} disabled={loading || !form.pickupAddress || !form.destinationAddress} onPress={estimateFare} />
        {estimate ? <Card>
          <Text style={ui.cardTitle}>Fare estimate</Text>
          <Text style={ui.priceValue}>{money(estimate.estimatedFareKobo)}</Text>
          <Text style={ui.muted}>{estimate.estimatedDistanceKm} km - {estimate.estimatedDurationMin} min</Text>
          <Text style={ui.muted}>{rideReviewNotice}</Text>
          <Button title={loading ? "Creating..." : "Confirm Review Ride"} disabled={loading} onPress={createTrip} />
        </Card> : null}
        {created ? <Card>
          <Text style={ui.cardTitle}>Review ride request created</Text>
          <Text>Reference: {created.tripReference}</Text>
          <StatusBadge status={created.status} />
          {created.tripPin ? <Text style={ui.otpCode}>{created.tripPin.slice(0, 3)} {created.tripPin.slice(3)}</Text> : null}
          <Text style={ui.muted}>Only share this ride PIN with the approved Ride Captain after pickup.</Text>
        </Card> : null}
        <Text style={ui.sectionTitle}>Recent ride requests</Text>
        {trips.map((trip) => <Card key={trip.id}>
          <Text style={ui.cardTitle}>{trip.tripReference}</Text>
          <Text>{trip.pickupAddress} to {trip.destinationAddress}</Text>
          <Text>{money(trip.estimatedFareKobo)}</Text>
          <StatusBadge status={trip.status} />
          {trip.driver ? <Text style={ui.muted}>Ride Captain: {trip.driver.fullName} - {trip.driver.vehiclePlateNumber ?? "vehicle pending"}</Text> : <Text style={ui.muted}>Ride Captain not assigned yet.</Text>}
        </Card>)}
      </>}
    </Screen>
  </Protected>;
}
