import { TaxiDriverApplicationStatus, TaxiDriverProfile, TaxiTrip, TaxiVehicleOwnership, TaxiVehicleType } from "@karigo/shared-types";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { riderApi } from "../src/api/rider.api";
import { taxiApi } from "../src/api/taxi.api";
import { Button, Card, Field, Message, Protected, Screen, StatusBadge, ui } from "../src/components/ui";
import { friendlyError } from "../src/lib/errors";

const vehicleTypes: TaxiVehicleType[] = ["SEDAN", "SUV", "MINI_BUS", "TRICYCLE", "OTHER"];
const ownershipTypes: TaxiVehicleOwnership[] = ["OWNER", "LEASED", "COMPANY_ASSIGNED", "OTHER"];
const testNotice = "Ride Captain Test Mode. No real ride, fare billing or payment is active.";

const initialForm = {
  fullName: "",
  phoneNumber: "",
  email: "",
  city: "Kano",
  state: "Kano",
  address: "",
  driverLicenceNumber: "",
  driverLicenceExpiry: "",
  vehicleMake: "",
  vehicleModel: "",
  vehicleYear: "",
  vehicleColour: "",
  vehiclePlateNumber: "",
  vehicleType: "SEDAN" as TaxiVehicleType,
  vehicleOwnership: "OWNER" as TaxiVehicleOwnership,
  notes: ""
};

const requiredFields: Array<{ key: keyof typeof initialForm; label: string }> = [
  { key: "fullName", label: "Full name" },
  { key: "phoneNumber", label: "Phone number" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "address", label: "Residential address" },
  { key: "driverLicenceNumber", label: "Driving licence number" },
  { key: "driverLicenceExpiry", label: "Licence expiry date" },
  { key: "vehicleMake", label: "Vehicle make" },
  { key: "vehicleModel", label: "Vehicle model" },
  { key: "vehicleYear", label: "Vehicle year" },
  { key: "vehicleColour", label: "Vehicle colour" },
  { key: "vehiclePlateNumber", label: "Plate number" }
];

const money = (kobo?: number | null) => `NGN ${Math.round(Number(kobo ?? 0) / 100).toLocaleString()}`;

function chipLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default function TaxiReadiness() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<TaxiDriverApplicationStatus | null>(null);
  const [profile, setProfile] = useState<TaxiDriverProfile | null>(null);
  const [trips, setTrips] = useState<TaxiTrip[]>([]);
  const [tripPin, setTripPin] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const taxiEnabled = process.env.EXPO_PUBLIC_TAXI_SERVICE_ENABLED === "true" && process.env.EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED === "true";

  async function loadTaxiMode() {
    if (!taxiEnabled) return;
    try {
      const loadedProfile = await taxiApi.profile();
      setProfile(loadedProfile);
      setTrips(await taxiApi.availableTrips());
    } catch {
      // Ride readiness form remains useful even before an approved test profile exists.
    }
  }

  useEffect(() => {
    riderApi.profile()
      .then((riderProfile) => {
        const phoneNumber = riderProfile.phoneNumber ?? "";
        setForm((current) => ({
          ...current,
          fullName: riderProfile.user?.fullName ?? current.fullName,
          phoneNumber,
          email: riderProfile.user?.email ?? "",
          vehiclePlateNumber: riderProfile.plateNumber ?? current.vehiclePlateNumber,
          vehicleType: riderProfile.vehicleType?.toUpperCase().includes("TRICYCLE") ? "TRICYCLE" : current.vehicleType
        }));
        if (phoneNumber) return taxiApi.applicationStatus(phoneNumber).then(setStatus).catch(() => undefined);
        return undefined;
      })
      .then(() => loadTaxiMode())
      .catch(() => undefined);
  }, [taxiEnabled]);

  const missingRequiredFields = useMemo(() => requiredFields
    .filter((field) => !String(form[field.key] ?? "").trim())
    .map((field) => field.label), [form]);
  const vehicleYear = Number(form.vehicleYear);
  const vehicleYearValid = Number.isInteger(vehicleYear) && vehicleYear >= 1980 && vehicleYear <= 2100;
  const formReady = missingRequiredFields.length === 0 && vehicleYearValid;

  async function submit() {
    setLoading(true);
    setMessage("");
    setError("");
    if (!formReady) {
      setLoading(false);
      setError("Complete all required verification and vehicle fields before submitting.");
      return;
    }
    try {
      const submitted = await taxiApi.submitDriverApplication({
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        email: form.email.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim(),
        address: form.address.trim(),
        driverLicenceNumber: form.driverLicenceNumber.trim(),
        driverLicenceExpiry: form.driverLicenceExpiry.trim(),
        vehicleMake: form.vehicleMake.trim(),
        vehicleModel: form.vehicleModel.trim(),
        vehicleYear,
        vehicleColour: form.vehicleColour.trim(),
        vehiclePlateNumber: form.vehiclePlateNumber.trim(),
        vehicleType: form.vehicleType,
        vehicleOwnership: form.vehicleOwnership,
        notes: form.notes.trim() || undefined
      });
      setStatus(submitted);
      setMessage(submitted.message);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  async function toggleTaxiAvailability() {
    if (!profile) return;
    try {
      const updated = await taxiApi.updateAvailability({ isAvailableForTaxi: !profile.isAvailableForTaxi });
      setProfile(updated);
      setMessage(updated.isAvailableForTaxi ? "Ride Captain Test Mode availability enabled." : "Ride Captain Test Mode availability disabled.");
      setTrips(await taxiApi.availableTrips());
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  async function updateTrip(tripId: string, action: "accept" | "arrivedPickup" | "start" | "arrivedDestination" | "complete" | "cancel") {
    try {
      setError("");
      if (action === "accept") await taxiApi.acceptTrip(tripId);
      if (action === "arrivedPickup") await taxiApi.arrivedPickup(tripId);
      if (action === "start") await taxiApi.startTrip(tripId, tripPin);
      if (action === "arrivedDestination") await taxiApi.arrivedDestination(tripId);
      if (action === "complete") await taxiApi.completeTrip(tripId);
      if (action === "cancel") await taxiApi.cancelTrip(tripId, "Ride Captain cancelled staging test ride");
      setTripPin("");
      setMessage("Ride Captain Test Mode trip updated.");
      setTrips(await taxiApi.availableTrips());
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return <Protected><Screen title="Ride readiness" subtitle="Prepare Ride Captain and vehicle verification details before KariGO Rides is approved for launch.">
    <Card tone="soft">
      <Text style={ui.sectionTitle}>KariGO Rides is not live yet</Text>
      <Text style={ui.pageIntro}>This form helps KariGO prepare Ride Captain onboarding, vehicle checks and safe ride operations. It does not activate ride jobs, live dispatch, fare billing or payment.</Text>
    </Card>

    {taxiEnabled ? <Card>
      <Text style={ui.sectionTitle}>Ride Captain Test Mode</Text>
      <Text style={ui.muted}>{testNotice}</Text>
      {profile ? <>
        <StatusBadge status={profile.status} />
        <Text style={ui.muted}>{profile.isAvailableForTaxi ? "Available for staging ride requests" : "Offline for staging ride requests"}</Text>
        <Button title={profile.isAvailableForTaxi ? "Go offline for Ride Captain Test Mode" : "Go online for Ride Captain Test Mode"} onPress={toggleTaxiAvailability} />
      </> : <Text style={ui.muted}>An approved Ride Captain test profile is required before Test Mode appears.</Text>}
    </Card> : null}

    {taxiEnabled && trips.length ? <Card>
      <Text style={ui.sectionTitle}>Available test ride requests</Text>
      {trips.map((trip) => <Card key={trip.id}>
        <Text style={ui.sectionTitle}>{trip.tripReference}</Text>
        <Text>{trip.pickupAddress} to {trip.destinationAddress}</Text>
        <Text>{money(trip.estimatedFareKobo)}</Text>
        <StatusBadge status={trip.status} />
        <Button title="Accept trip" onPress={() => updateTrip(trip.id, "accept")} />
        <Button title="Arrived pickup" tone="muted" onPress={() => updateTrip(trip.id, "arrivedPickup")} />
        <Field placeholder="Customer trip PIN" value={tripPin} onChangeText={(value) => setTripPin(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" />
        <Button title="Start trip with PIN" tone="muted" disabled={tripPin.length !== 6} onPress={() => updateTrip(trip.id, "start")} />
        <Button title="Arrived destination" tone="muted" onPress={() => updateTrip(trip.id, "arrivedDestination")} />
        <Button title="Complete trip" tone="muted" onPress={() => updateTrip(trip.id, "complete")} />
        <Button title="Cancel test trip" tone="danger" onPress={() => updateTrip(trip.id, "cancel")} />
      </Card>)}
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
      <Text style={ui.sectionTitle}>Ride Captain identity</Text>
      <Text style={ui.pageIntro}>Required fields are used for readiness review only.</Text>
      <Field placeholder="Full name required" value={form.fullName} onChangeText={(fullName) => setForm({ ...form, fullName })} />
      <Field placeholder="Phone number required" keyboardType="phone-pad" value={form.phoneNumber} onChangeText={(phoneNumber) => setForm({ ...form, phoneNumber })} />
      <Field placeholder="Email optional" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(email) => setForm({ ...form, email })} />
      <Field placeholder="City required" value={form.city} onChangeText={(city) => setForm({ ...form, city })} />
      <Field placeholder="State required" value={form.state} onChangeText={(state) => setForm({ ...form, state })} />
      <Field placeholder="Residential address required" value={form.address} onChangeText={(address) => setForm({ ...form, address })} />
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Licence verification</Text>
      <Field placeholder="Driving licence number required" value={form.driverLicenceNumber} onChangeText={(driverLicenceNumber) => setForm({ ...form, driverLicenceNumber })} />
      <Field placeholder="Licence expiry YYYY-MM-DD required" value={form.driverLicenceExpiry} onChangeText={(driverLicenceExpiry) => setForm({ ...form, driverLicenceExpiry })} />
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Vehicle information</Text>
      <Field placeholder="Vehicle make required" value={form.vehicleMake} onChangeText={(vehicleMake) => setForm({ ...form, vehicleMake })} />
      <Field placeholder="Vehicle model required" value={form.vehicleModel} onChangeText={(vehicleModel) => setForm({ ...form, vehicleModel })} />
      <Field placeholder="Vehicle year required" keyboardType="number-pad" value={form.vehicleYear} onChangeText={(vehicleYear) => setForm({ ...form, vehicleYear: vehicleYear.replace(/\D/g, "").slice(0, 4) })} />
      {!vehicleYearValid && form.vehicleYear ? <Message error>Vehicle year must be between 1980 and 2100.</Message> : null}
      <Field placeholder="Vehicle colour required" value={form.vehicleColour} onChangeText={(vehicleColour) => setForm({ ...form, vehicleColour })} />
      <Field placeholder="Plate number required" value={form.vehiclePlateNumber} onChangeText={(vehiclePlateNumber) => setForm({ ...form, vehiclePlateNumber })} />

      <Text style={ui.muted}>Vehicle type required</Text>
      <View style={styles.chipGrid}>{vehicleTypes.map((vehicleType) => <Button key={vehicleType} title={chipLabel(vehicleType)} tone={form.vehicleType === vehicleType ? "primary" : "muted"} onPress={() => setForm({ ...form, vehicleType })} />)}</View>
      <Text style={ui.muted}>Vehicle ownership required</Text>
      <View style={styles.chipGrid}>{ownershipTypes.map((vehicleOwnership) => <Button key={vehicleOwnership} title={chipLabel(vehicleOwnership)} tone={form.vehicleOwnership === vehicleOwnership ? "primary" : "muted"} onPress={() => setForm({ ...form, vehicleOwnership })} />)}</View>
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Additional notes</Text>
      <Field placeholder="Readiness notes optional" value={form.notes} onChangeText={(notes) => setForm({ ...form, notes })} multiline />
      {missingRequiredFields.length ? <Message error>Missing required fields: {missingRequiredFields.join(", ")}</Message> : null}
      <Button title={loading ? "Submitting..." : "Apply for Ride readiness"} disabled={loading || !formReady} onPress={submit} />
    </Card>
  </Screen></Protected>;
}

const styles = StyleSheet.create({
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }
});
