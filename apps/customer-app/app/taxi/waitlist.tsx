import { useState } from "react";
import { Text } from "react-native";
import { taxiApi } from "../../src/api/taxi.api";
import { KariGoAppTopBar } from "../../src/components/kari-go-app-top-bar";
import { Button, Card, Field, Message, Protected, Screen, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

const initialForm = {
  fullName: "",
  phoneNumber: "",
  email: "",
  city: "Kano",
  state: "Kano",
  pickupArea: "",
  note: ""
};

export default function TaxiWaitlist() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const entry = await taxiApi.joinWaitlist({
        fullName: form.fullName,
        phoneNumber: form.phoneNumber,
        email: form.email || undefined,
        city: form.city,
        state: form.state,
        pickupArea: form.pickupArea || undefined,
        note: form.note || undefined
      });
      setMessage(`You have joined the KariGO Rides waitlist for ${entry.city}. We will contact you when Ride service is available in your area.`);
      setForm(initialForm);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  return <Protected>
    <KariGoAppTopBar showBack title="Ride Waitlist" />
    <Screen title="Join Ride Waitlist" topPadding={false}>
      <Card>
        <Text style={ui.cardTitle}>KariGO Rides interest</Text>
        <Text style={ui.pageIntro}>KariGO is reviewing Ride interest, verified Ride Captains, vehicle checks, fare controls and safe ride operations before dispatch activation.</Text>
      </Card>
      <Message>{message}</Message>
      <Message error>{error}</Message>
      <Field placeholder="Full name" value={form.fullName} onChangeText={(fullName) => setForm({ ...form, fullName })} />
      <Field placeholder="Phone number" keyboardType="phone-pad" value={form.phoneNumber} onChangeText={(phoneNumber) => setForm({ ...form, phoneNumber })} />
      <Field placeholder="Email optional" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(email) => setForm({ ...form, email })} />
      <Field placeholder="City" value={form.city} onChangeText={(city) => setForm({ ...form, city })} />
      <Field placeholder="State" value={form.state} onChangeText={(state) => setForm({ ...form, state })} />
      <Field placeholder="Pickup area optional" value={form.pickupArea} onChangeText={(pickupArea) => setForm({ ...form, pickupArea })} />
      <Field placeholder="Tell us your ride needs optional" value={form.note} onChangeText={(note) => setForm({ ...form, note })} multiline />
      <Button title={loading ? "Joining..." : "Join Ride Waitlist"} disabled={loading || !form.fullName || !form.phoneNumber || !form.city || !form.state} onPress={submit} />
    </Screen>
  </Protected>;
}
