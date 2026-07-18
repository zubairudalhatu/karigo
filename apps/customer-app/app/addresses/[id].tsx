import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Address, addressesApi } from "../../src/api/addresses.api";
import { Button, Field, Loading, Message, Protected, Screen } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

export default function EditAddress() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [address, setAddress] = useState<Address | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  useEffect(() => { addressesApi.list().then((items) => setAddress(items.find((item) => item.id === id) ?? null)).catch((e) => setError(friendlyError(e))); }, [id]);
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
      setAddress({ ...address, latitude: position.coords.latitude, longitude: position.coords.longitude });
      setLocationMessage("Approximate location updated. Please keep the written address accurate.");
    } catch {
      setLocationMessage("Unable to detect location. You can still enter the address manually.");
    } finally {
      setLocating(false);
    }
  }
  if (!address && !error) return <Loading />;
  return <Protected><Screen title="Edit address"><Message error>{error}</Message>{address ? <>
    <Field value={address.label} onChangeText={(label) => setAddress({ ...address, label })} />
    <Field value={address.addressLine} onChangeText={(addressLine) => setAddress({ ...address, addressLine })} />
    <Field value={address.city} onChangeText={(city) => setAddress({ ...address, city })} />
    <Field value={address.state} onChangeText={(state) => setAddress({ ...address, state })} />
    <Field value={address.deliveryNote ?? ""} placeholder="Delivery note" onChangeText={(deliveryNote) => setAddress({ ...address, deliveryNote })} />
    <Button title={locating ? "Detecting location..." : "Use current location"} tone="muted" onPress={detectLocation} disabled={locating} />
    <Message>{locationMessage}</Message>
    <Button title="Save address" onPress={async () => { try { await addressesApi.update(id, address); router.back(); } catch (e) { setError(friendlyError(e)); } }} />
  </> : null}</Screen></Protected>;
}
