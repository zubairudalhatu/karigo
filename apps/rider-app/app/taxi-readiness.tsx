import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { taxiApi } from "../src/api/taxi.api";
import { riderApi } from "../src/api/rider.api";
import { TaxiDriverApplicationStatus, TaxiVehicleOwnership, TaxiVehicleType } from "@karigo/shared-types";
import { Button, Card, Field, Message, Protected, Screen, StatusBadge, ui } from "../src/components/ui";
import { friendlyError } from "../src/lib/errors";

const vehicleTypes: TaxiVehicleType[] = ["SEDAN", "SUV", "MINI_BUS", "TRICYCLE", "OTHER"];
const ownershipTypes: TaxiVehicleOwnership[] = ["OWNER", "LEASED", "COMPANY_ASSIGNED", "OTHER"];

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

export default function TaxiReadiness() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<TaxiDriverApplicationStatus | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    riderApi.profile()
      .then((profile) => {
        const phoneNumber = profile.phoneNumber ?? "";
        setForm((current) => ({
          ...current,
          fullName: profile.user?.fullName ?? current.fullName,
          phoneNumber,
          email: profile.user?.email ?? "",
          vehiclePlateNumber: profile.plateNumber ?? current.vehiclePlateNumber,
          vehicleType: profile.vehicleType?.toUpperCase().includes("TRICYCLE") ? "TRICYCLE" : current.vehicleType
        }));
        if (phoneNumber) return taxiApi.applicationStatus(phoneNumber).then(setStatus).catch(() => undefined);
        return undefined;
      })
      .catch(() => undefined);
  }, []);

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

  return <Protected><Screen title="Taxi Driver Readiness">
    <Card>
      <Text style={ui.title}>Taxi is not live yet</Text>
      <Text style={ui.muted}>This form helps KariGO prepare verified driver onboarding, vehicle checks and safe taxi operations. It does not activate taxi jobs or dispatch.</Text>
    </Card>
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
