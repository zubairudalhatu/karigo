import { TaxiDriverApplicationStatus, TaxiDriverProfile, TaxiTrip, TaxiVehicleOwnership, TaxiVehicleType } from "@karigo/shared-types";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { riderApi } from "../src/api/rider.api";
import { taxiApi } from "../src/api/taxi.api";
import { Button, Card, Field, Message, Protected, Screen, StatusBadge, ui } from "../src/components/ui";
import { friendlyError } from "../src/lib/errors";

const vehicleTypes: TaxiVehicleType[] = ["SEDAN", "SUV", "MINI_BUS", "TRICYCLE", "OTHER"];
const ownershipTypes: TaxiVehicleOwnership[] = ["OWNER", "LEASED", "COMPANY_ASSIGNED", "OTHER"];
const testNotice = "Taxi Test Mode. No real taxi ride, fare billing or payment is active.";

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

const money = (kobo?: number | null) => `NGN ${Math.round(Number(kobo ?? 0) / 100).toLocaleString()}`;

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
      // Taxi readiness form remains useful even before an approved test profile exists.
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

  async function submit() {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const submitted = await taxiApi.submitDriverApplication({
        ...form,
        email: form.email || undefined,
        address: form.address || undefined,
        driverLicenceNumber: form.driverLicenceNumber || undefined,
        driverLicenceExpiry: form.driverLicenceExpiry || undefined,
        vehicleMake: form.vehicleMake || undefined,
        vehicleModel: form.vehicleModel || undefined,
        vehicleYear: form.vehicleYear ? Number(form.vehicleYear) : undefined,
        vehicleColour: form.vehicleColour || undefined,
        vehiclePlateNumber: form.vehiclePlateNumber || undefined,
        notes: form.notes || undefined
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
      setMessage(updated.isAvailableForTaxi ? "Taxi Test Mode availability enabled." : "Taxi Test Mode availability disabled.");
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
      if (action === "cancel") await taxiApi.cancelTrip(tripId, "Driver cancelled staging test trip");
      setTripPin("");
      setMessage("Taxi Test Mode trip updated.");
      setTrips(await taxiApi.availableTrips());
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return <Protected><Screen title="Taxi Driver Readiness">
    <Card>
      <Text style={ui.title}>Taxi is not live yet</Text>
      <Text style={ui.muted}>This form helps KariGO prepare verified driver onboarding, vehicle checks and safe taxi operations. It does not activate taxi jobs or dispatch.</Text>
    </Card>
    {taxiEnabled ? <Card>
      <Text style={ui.title}>Taxi Test Mode</Text>
      <Text style={ui.muted}>{testNotice}</Text>
      {profile ? <>
        <StatusBadge status={profile.status} />
        <Text style={ui.muted}>{profile.isAvailableForTaxi ? "Available for staging Taxi trips" : "Offline for staging Taxi trips"}</Text>
        <Button title={profile.isAvailableForTaxi ? "Go offline for Taxi Test Mode" : "Go online for Taxi Test Mode"} onPress={toggleTaxiAvailability} />
      </> : <Text style={ui.muted}>An approved Taxi test driver profile is required before Taxi Test Mode appears.</Text>}
    </Card> : null}
    {taxiEnabled && trips.length ? <Card>
      <Text style={ui.title}>Available test taxi trips</Text>
      {trips.map((trip) => <Card key={trip.id}>
        <Text style={ui.title}>{trip.tripReference}</Text>
        <Text>{trip.pickupAddress} to {trip.destinationAddress}</Text>
        <Text>{money(trip.estimatedFareKobo)}</Text>
        <StatusBadge status={trip.status} />
        <Button title="Accept trip" onPress={() => updateTrip(trip.id, "accept")} />
        <Button title="Arrived pickup" tone="muted" onPress={() => updateTrip(trip.id, "arrivedPickup")} />
        <Field placeholder="Customer trip PIN" value={tripPin} onChangeText={setTripPin} keyboardType="number-pad" />
        <Button title="Start trip with PIN" tone="muted" disabled={tripPin.length !== 6} onPress={() => updateTrip(trip.id, "start")} />
        <Button title="Arrived destination" tone="muted" onPress={() => updateTrip(trip.id, "arrivedDestination")} />
        <Button title="Complete trip" tone="muted" onPress={() => updateTrip(trip.id, "complete")} />
        <Button title="Cancel test trip" tone="danger" onPress={() => updateTrip(trip.id, "cancel")} />
      </Card>)}
    </Card> : null}
    {status ? <Card>
      <Text style={ui.title}>Application status</Text>
      <StatusBadge status={status.status} />
      <Text style={ui.muted}>{status.message}</Text>
      <Text style={ui.muted}>Reference: {status.applicationReference}</Text>
    </Card> : null}
    <Message>{message}</Message>
    <Message error>{error}</Message>
    <Field placeholder="Full name" value={form.fullName} onChangeText={(fullName) => setForm({ ...form, fullName })} />
    <Field placeholder="Phone number" keyboardType="phone-pad" value={form.phoneNumber} onChangeText={(phoneNumber) => setForm({ ...form, phoneNumber })} />
    <Field placeholder="Email optional" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(email) => setForm({ ...form, email })} />
    <Field placeholder="City" value={form.city} onChangeText={(city) => setForm({ ...form, city })} />
    <Field placeholder="State" value={form.state} onChangeText={(state) => setForm({ ...form, state })} />
    <Field placeholder="Address optional" value={form.address} onChangeText={(address) => setForm({ ...form, address })} />
    <Field placeholder="Driver licence number optional" value={form.driverLicenceNumber} onChangeText={(driverLicenceNumber) => setForm({ ...form, driverLicenceNumber })} />
    <Field placeholder="Licence expiry YYYY-MM-DD optional" value={form.driverLicenceExpiry} onChangeText={(driverLicenceExpiry) => setForm({ ...form, driverLicenceExpiry })} />
    <Field placeholder="Vehicle make optional" value={form.vehicleMake} onChangeText={(vehicleMake) => setForm({ ...form, vehicleMake })} />
    <Field placeholder="Vehicle model optional" value={form.vehicleModel} onChangeText={(vehicleModel) => setForm({ ...form, vehicleModel })} />
    <Field placeholder="Vehicle year optional" keyboardType="number-pad" value={form.vehicleYear} onChangeText={(vehicleYear) => setForm({ ...form, vehicleYear })} />
    <Field placeholder="Vehicle colour optional" value={form.vehicleColour} onChangeText={(vehicleColour) => setForm({ ...form, vehicleColour })} />
    <Field placeholder="Plate number optional" value={form.vehiclePlateNumber} onChangeText={(vehiclePlateNumber) => setForm({ ...form, vehiclePlateNumber })} />
    <Text style={ui.muted}>Vehicle type</Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{vehicleTypes.map((vehicleType) => <Button key={vehicleType} title={vehicleType.replaceAll("_", " ")} tone={form.vehicleType === vehicleType ? "primary" : "muted"} onPress={() => setForm({ ...form, vehicleType })} />)}</View>
    <Text style={ui.muted}>Vehicle ownership</Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{ownershipTypes.map((vehicleOwnership) => <Button key={vehicleOwnership} title={vehicleOwnership.replaceAll("_", " ")} tone={form.vehicleOwnership === vehicleOwnership ? "primary" : "muted"} onPress={() => setForm({ ...form, vehicleOwnership })} />)}</View>
    <Field placeholder="Readiness notes optional" value={form.notes} onChangeText={(notes) => setForm({ ...form, notes })} multiline />
    <Button title={loading ? "Submitting..." : "Apply for Taxi Readiness"} disabled={loading || !form.fullName || !form.phoneNumber || !form.city || !form.state} onPress={submit} />
  </Screen></Protected>;
}
