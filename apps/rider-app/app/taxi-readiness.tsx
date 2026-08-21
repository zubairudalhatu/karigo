import { formatKobo, TaxiDriverApplicationStatus, TaxiDriverProfile, TaxiTrip } from "@karigo/shared-types";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { riderApi } from "../src/api/rider.api";
import { taxiApi } from "../src/api/taxi.api";
import { Button, Card, Field, Message, Protected, Screen, StatusBadge, ui } from "../src/components/ui";
import { useAuth } from "../src/contexts/auth-context";
import { ridesProductionEnabled } from "../src/lib/captain-modes";
import { friendlyError } from "../src/lib/errors";
import { requestCaptainForegroundLocation, toOperationalLocationPayload } from "../src/lib/location";
import { captainAvailabilityErrorMessage } from "../src/lib/network-errors";

const rideOperationsNotice = "Manage current availability and assigned Ride requests.";
const blockedRideOperationsCopy = "Ride Captain activation is pending.";
const closedTripStatuses = new Set(["COMPLETED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_DRIVER", "CANCELLED_BY_ADMIN", "EXPIRED"]);

export default function TaxiReadiness() {
  const { user } = useAuth();
  const [status, setStatus] = useState<TaxiDriverApplicationStatus | null>(null);
  const [profile, setProfile] = useState<TaxiDriverProfile | null>(null);
  const [trips, setTrips] = useState<TaxiTrip[]>([]);
  const [tripPin, setTripPin] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const taxiEnabled = ridesProductionEnabled();

  async function loadTaxiMode() {
    if (!taxiEnabled) return;
    try {
      const loadedProfile = await taxiApi.profile();
      setProfile(loadedProfile);
      setTrips(await taxiApi.availableTrips());
    } catch {
      // The application form remains useful before an approved Ride operations profile exists.
    }
  }

  useEffect(() => {
    if (user) {
      void taxiApi.currentUserApplicationStatus().then(setStatus).catch(() => undefined);
    }
    riderApi.profile()
      .then((riderProfile) => {
        const phoneNumber = riderProfile.phoneNumber ?? user?.phoneNumber ?? "";
        if (phoneNumber) return taxiApi.applicationStatus(phoneNumber).then(setStatus).catch(() => undefined);
        return undefined;
      })
      .then(() => loadTaxiMode())
      .catch(() => undefined);
  }, [taxiEnabled, user]);

  async function toggleTaxiAvailability() {
    if (!profile) return;
    try {
      setError("");
      const next = !profile.isAvailableForTaxi;
      const location = next ? await requestCaptainForegroundLocation(true) : null;
      const updated = await taxiApi.updateAvailability({
        isAvailableForTaxi: next,
        ...(location ? toOperationalLocationPayload(location) : {})
      });
      setProfile(updated);
      setMessage(updated.isAvailableForTaxi ? "Ride availability enabled and your live location was shared with KariGO Operations." : "Ride availability disabled.");
      setTrips(await taxiApi.availableTrips());
    } catch (e) {
      setError(captainAvailabilityErrorMessage(e, { service: "Ride", area: profile.city }));
      setMessage("");
    }
  }

  async function updateTrip(tripId: string, action: "accept" | "decline" | "arrivedPickup" | "start" | "arrivedDestination" | "complete" | "cancel") {
    try {
      setError("");
      if (action === "accept") await taxiApi.acceptTrip(tripId);
      if (action === "decline") await taxiApi.declineTrip(tripId, declineReason.trim());
      const location = action === "arrivedPickup" || action === "arrivedDestination"
        ? await requestCaptainForegroundLocation(true)
        : null;
      const evidence = location ? { ...toOperationalLocationPayload(location), recordedAt: location.recordedAt } : null;
      if (action === "arrivedPickup" && evidence) await taxiApi.arrivedPickup(tripId, evidence);
      if (action === "start") await taxiApi.startTrip(tripId, tripPin);
      if (action === "arrivedDestination" && evidence) await taxiApi.arrivedDestination(tripId, evidence);
      if (action === "complete") await taxiApi.completeTrip(tripId);
      if (action === "cancel") await taxiApi.cancelTrip(tripId, "Ride Captain cancelled assigned Ride request");
      setTripPin("");
      setDeclineReason("");
      setMessage("Ride trip updated.");
      setTrips(await taxiApi.availableTrips());
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return <Protected><Screen title={taxiEnabled ? "Ride operations" : "Ride review"} subtitle={taxiEnabled ? "Receive and progress Operations-assigned KariGO Rides requests." : "Prepare Ride Captain and vehicle verification details before Ride activation is approved for your account."}>
    <Card tone="soft">
      <Text style={ui.sectionTitle}>{taxiEnabled ? "Ride workspace" : "Ride review"}</Text>
      <Text style={ui.pageIntro}>{taxiEnabled ? rideOperationsNotice : "Complete Ride Captain details for KariGO review."}</Text>
    </Card>

    {taxiEnabled ? <Card>
      <Text style={ui.sectionTitle}>Availability</Text>
      {profile ? <>
        <StatusBadge status={profile.status} />
        <Text style={ui.muted}>{profile.isAvailableForTaxi ? "Online for Ride assignments" : "Go online to become available for Ride assignments."}</Text>
        <Button title={profile.isAvailableForTaxi ? "Go offline for Rides" : "Go online for Rides"} onPress={toggleTaxiAvailability} />
      </> : <Text style={ui.muted}>{blockedRideOperationsCopy}</Text>}
    </Card> : null}

    {taxiEnabled && trips.length ? <Card>
      <Text style={ui.sectionTitle}>Assigned ride trips</Text>
      {trips.map((trip) => <Card key={trip.id}>
        <Text style={ui.sectionTitle}>{trip.tripReference}</Text>
        <Text>{trip.pickupAddress} to {trip.destinationAddress}</Text>
        <Text>{formatKobo(trip.estimatedFareKobo)}</Text>
        <StatusBadge status={trip.status} />
        {trip.status === "DRIVER_ASSIGNED" ? <>
          <Button title="Accept assigned ride" onPress={() => updateTrip(trip.id, "accept")} />
          <Field placeholder="Reason if declining" value={declineReason} onChangeText={setDeclineReason} />
          <Button title="Decline assignment" tone="danger" disabled={declineReason.trim().length < 5} onPress={() => updateTrip(trip.id, "decline")} />
        </> : null}
        {trip.status === "ACCEPTED" ? <Button title="Arrived at pickup" tone="muted" onPress={() => updateTrip(trip.id, "arrivedPickup")} /> : null}
        {trip.status === "ARRIVED_PICKUP" ? <>
          <Field placeholder="Customer trip PIN" value={tripPin} onChangeText={(value) => setTripPin(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" />
          <Button title="Start trip with PIN" tone="muted" disabled={tripPin.length !== 6} onPress={() => updateTrip(trip.id, "start")} />
        </> : null}
        {trip.status === "STARTED" ? <Button title="Arrived at destination" tone="muted" onPress={() => updateTrip(trip.id, "arrivedDestination")} /> : null}
        {trip.status === "ARRIVED_DESTINATION" ? <Button title="Complete trip" tone="muted" onPress={() => updateTrip(trip.id, "complete")} /> : null}
        {!closedTripStatuses.has(trip.status) ? <Button title="Cancel assigned ride" tone="danger" onPress={() => updateTrip(trip.id, "cancel")} /> : null}
      </Card>)}
    </Card> : null}
    {taxiEnabled && profile && !trips.length ? <Card>
      <Text style={ui.sectionTitle}>No active Ride</Text>
      <Text style={ui.muted}>Go online to become available for Ride assignments.</Text>
    </Card> : null}

    {status ? <Card>
      <Text style={ui.sectionTitle}>Application status</Text>
      <StatusBadge status={status.status} />
      <Text style={ui.muted}>{status.message}</Text>
      <Text style={ui.muted}>Reference: {status.applicationReference}</Text>
    </Card> : null}

    <Message>{message}</Message>
    <Message error>{error}</Message>

    <Card>
      <Text style={ui.sectionTitle}>Guided Ride Captain application</Text>
      <Text style={ui.pageIntro}>Use the guided Captain application to select residential location, preferred operating areas, vehicle make/model/year/colour, licence expiry and secure document uploads.</Text>
      <Button title="Open guided Captain application" onPress={() => router.push("/auth/apply")} />
    </Card>
  </Screen></Protected>;
}
