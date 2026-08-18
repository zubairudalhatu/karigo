import { canonicalNigeriaStateCode, nigeriaStateByValue } from "@karigo/shared-types";
import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { Address, addressesApi } from "../src/api/addresses.api";
import { NigeriaStateSelector } from "../src/components/nigeria-state-selector";
import { Button, Card, Empty, Field, Loading, Message, Protected, Screen, ui } from "../src/components/ui";
import { friendlyError } from "../src/lib/errors";

export default function Addresses() {
  const { saved } = useLocalSearchParams<{ saved?: string }>();
  const [items, setItems] = useState<Address[]>([]);
  const [form, setForm] = useState({ label: "Home", addressLine: "", city: "Kano", state: "KANO", deliveryNote: "", latitude: null as number | null, longitude: null as number | null });
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const load = () => addressesApi.list().then(setItems).catch((e) => setError(friendlyError(e))).finally(() => setLoading(false));
  useEffect(() => { void load(); }, []);
  useEffect(() => { if (saved === "1") setSuccess("Address saved."); }, [saved]);
  function updateForm(patch: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...patch }));
    setError("");
    setSuccess("");
  }
  function selectState(state: string) {
    const shouldSuggestCity = !form.city.trim() || ["Abuja", "Kano"].includes(form.city.trim());
    updateForm({
      state,
      ...(shouldSuggestCity && state === "FCT" ? { city: "Abuja" } : {}),
      ...(shouldSuggestCity && state === "KANO" ? { city: "Kano" } : {})
    });
  }
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
      updateForm({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setLocationMessage("Current location captured. Your written address was not changed.");
    } catch {
      setLocationMessage("Unable to detect location. You can still enter the address manually.");
    } finally {
      setLocating(false);
    }
  }
  async function create() {
    if (saving) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const state = canonicalNigeriaStateCode(form.state);
      if (!state) {
        setError("Select a Nigerian State or the Federal Capital Territory.");
        setSaving(false);
        return;
      }
      await addressesApi.create({
        label: form.label.trim(),
        addressLine: form.addressLine.trim(),
        city: form.city.trim(),
        state,
        deliveryNote: form.deliveryNote.trim() || null,
        latitude: form.latitude,
        longitude: form.longitude,
        isDefault: items.length === 0
      });
      setForm((current) => ({ ...current, addressLine: "", deliveryNote: "", latitude: null, longitude: null }));
      setLocationMessage("");
      await load();
      setSuccess("Address saved.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }
  return <Protected><Screen title="Saved addresses">
    <Message>{success}</Message>
    <Field placeholder="Address label (Home, Work or Other)" value={form.label} onChangeText={(label) => updateForm({ label })} />
    <Field placeholder="Street address, area / neighbourhood" value={form.addressLine} onChangeText={(addressLine) => updateForm({ addressLine })} />
    <NigeriaStateSelector value={form.state} onChange={selectState} />
    <Field placeholder="City" value={form.city} onChangeText={(city) => updateForm({ city })} />
    <Field placeholder="Delivery note (optional)" value={form.deliveryNote} onChangeText={(deliveryNote) => updateForm({ deliveryNote })} />
    <Button title={locating ? "Detecting location..." : "Use current location"} tone="muted" onPress={detectLocation} disabled={locating} />
    <Message>{locationMessage}</Message>
    <Button title={saving ? "Saving address..." : "Add address"} onPress={create} disabled={saving || !form.label.trim() || !form.addressLine.trim() || !form.city.trim() || !form.state} /><Message error>{error}</Message>
    {loading ? <Loading /> : items.length === 0 ? <Empty message="Add an address before checkout." /> : items.map((item) =>
      <Card key={item.id}><Text style={ui.title}>{item.label}{item.isDefault ? " · Default" : ""}</Text><Text>{item.addressLine}, {item.city}, {nigeriaStateByValue(item.state)?.name ?? item.state}</Text>
        <Button title="Edit" tone="muted" onPress={() => router.push(`/addresses/${item.id}`)} />
        {!item.isDefault ? <Button title="Set default" tone="muted" onPress={async () => { await addressesApi.setDefault(item.id); await load(); }} /> : null}
        <Button title="Delete" tone="danger" onPress={async () => { try { await addressesApi.remove(item.id); await load(); } catch (e) { setError(friendlyError(e)); } }} />
      </Card>)}
  </Screen></Protected>;
}
