import { router } from "expo-router";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { Address, addressesApi } from "../src/api/addresses.api";
import { Button, Card, Empty, Field, Loading, Message, Protected, Screen, ui } from "../src/components/ui";
import { friendlyError } from "../src/lib/errors";

export default function Addresses() {
  const [items, setItems] = useState<Address[]>([]);
  const [form, setForm] = useState({ label: "Home", addressLine: "", city: "Kano", state: "Kano", deliveryNote: "", latitude: null as number | null, longitude: null as number | null });
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const load = () => addressesApi.list().then(setItems).catch((e) => setError(friendlyError(e))).finally(() => setLoading(false));
  useEffect(() => { void load(); }, []);
  async function detectLocation() {
    setLocating(true);
    setLocationMessage("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setLocationMessage("Location permission was not granted. You can still enter the address manually.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setForm((current) => ({ ...current, latitude: position.coords.latitude, longitude: position.coords.longitude }));
      setLocationMessage("Approximate location captured. Please still enter the written address for dispatch.");
    } catch {
      setLocationMessage("Unable to detect location. You can still enter the address manually.");
    } finally {
      setLocating(false);
    }
  }
  async function create() {
    setError("");
    try { await addressesApi.create({ ...form, isDefault: items.length === 0 }); setForm({ ...form, addressLine: "", deliveryNote: "", latitude: null, longitude: null }); setLocationMessage(""); await load(); }
    catch (e) { setError(friendlyError(e)); }
  }
  return <Protected><Screen title="Saved addresses">
    <Field placeholder="Label" value={form.label} onChangeText={(label) => setForm({ ...form, label })} />
    <Field placeholder="Address line" value={form.addressLine} onChangeText={(addressLine) => setForm({ ...form, addressLine })} />
    <Field placeholder="City" value={form.city} onChangeText={(city) => setForm({ ...form, city })} />
    <Field placeholder="State" value={form.state} onChangeText={(state) => setForm({ ...form, state })} />
    <Field placeholder="Delivery note (optional)" value={form.deliveryNote} onChangeText={(deliveryNote) => setForm({ ...form, deliveryNote })} />
    <Button title={locating ? "Detecting location..." : "Use current location"} tone="muted" onPress={detectLocation} disabled={locating} />
    <Message>{locationMessage}</Message>
    <Button title="Add address" onPress={create} disabled={!form.addressLine} /><Message error>{error}</Message>
    {loading ? <Loading /> : items.length === 0 ? <Empty message="Add an address before checkout." /> : items.map((item) =>
      <Card key={item.id}><Text style={ui.title}>{item.label}{item.isDefault ? " · Default" : ""}</Text><Text>{item.addressLine}, {item.city}</Text>
        <Button title="Edit" tone="muted" onPress={() => router.push(`/addresses/${item.id}`)} />
        {!item.isDefault ? <Button title="Set default" tone="muted" onPress={async () => { await addressesApi.setDefault(item.id); await load(); }} /> : null}
        <Button title="Delete" tone="danger" onPress={async () => { try { await addressesApi.remove(item.id); await load(); } catch (e) { setError(friendlyError(e)); } }} />
      </Card>)}
  </Screen></Protected>;
}
