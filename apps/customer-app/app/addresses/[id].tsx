import { canonicalNigeriaStateCode } from "@karigo/shared-types";
import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Address, addressesApi, addressUpdateInput } from "../../src/api/addresses.api";
import { NigeriaStateSelector } from "../../src/components/nigeria-state-selector";
import { Button, Field, Loading, Message, Protected, Screen } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

export default function EditAddress() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [address, setAddress] = useState<Address | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  useEffect(() => { addressesApi.list().then((items) => {
    const stored = items.find((item) => item.id === id) ?? null;
    setAddress(stored ? { ...stored, state: canonicalNigeriaStateCode(stored.state) ?? stored.state } : null);
  }).catch((e) => setError(friendlyError(e))); }, [id]);
  function updateAddress(patch: Partial<Address>) {
    setAddress((current) => current ? { ...current, ...patch } : current);
    setError("");
  }
  function selectState(state: string) {
    if (!address) return;
    const shouldSuggestCity = !address.city.trim() || ["Abuja", "Kano"].includes(address.city.trim());
    updateAddress({ state, ...(shouldSuggestCity && state === "FCT" ? { city: "Abuja" } : {}), ...(shouldSuggestCity && state === "KANO" ? { city: "Kano" } : {}) });
  }
  async function detectLocation() {
    if (!address) return;
    setLocating(true);
    setLocationMessage("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setLocationMessage("Location permission was not granted. You can still enter the address manually.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      updateAddress({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setLocationMessage("Current location captured. Your written address was not changed.");
    } catch {
      setLocationMessage("Unable to detect location. You can still enter the address manually.");
    } finally {
      setLocating(false);
    }
  }
  async function save() {
    if (!address || saving) return;
    setSaving(true);
    setError("");
    try {
      const state = canonicalNigeriaStateCode(address.state);
      if (!state) {
        setError("Select a Nigerian State or the Federal Capital Territory.");
        setSaving(false);
        return;
      }
      await addressesApi.update(id, addressUpdateInput({ ...address, state }));
      router.replace({ pathname: "/addresses", params: { saved: "1" } });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }
  if (!address && !error) return <Loading />;
  return <Protected><Screen title="Edit address"><Message error>{error}</Message>{address ? <>
    <Field placeholder="Address label (Home, Work or Other)" value={address.label} onChangeText={(label) => updateAddress({ label })} />
    <Field placeholder="Street address, area / neighbourhood" value={address.addressLine} onChangeText={(addressLine) => updateAddress({ addressLine })} />
    <NigeriaStateSelector value={address.state} onChange={selectState} />
    <Field placeholder="City" value={address.city} onChangeText={(city) => updateAddress({ city })} />
    <Field value={address.deliveryNote ?? ""} placeholder="Delivery note (optional)" onChangeText={(deliveryNote) => updateAddress({ deliveryNote })} />
    <Button title={locating ? "Detecting location..." : "Use current location"} tone="muted" onPress={detectLocation} disabled={locating} />
    <Message>{locationMessage}</Message>
    <Button title={saving ? "Saving address..." : "Save address"} disabled={saving || !address.label.trim() || !address.addressLine.trim() || !address.city.trim() || !address.state} onPress={save} />
  </> : null}</Screen></Protected>;
}
