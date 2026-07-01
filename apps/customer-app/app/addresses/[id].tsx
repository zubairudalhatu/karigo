import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Address, addressesApi } from "../../src/api/addresses.api";
import { Button, Field, Loading, Message, Protected, Screen } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

export default function EditAddress() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [address, setAddress] = useState<Address | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { addressesApi.list().then((items) => setAddress(items.find((item) => item.id === id) ?? null)).catch((e) => setError(friendlyError(e))); }, [id]);
  if (!address && !error) return <Loading />;
  return <Protected><Screen title="Edit address"><Message error>{error}</Message>{address ? <>
    <Field value={address.label} onChangeText={(label) => setAddress({ ...address, label })} />
    <Field value={address.addressLine} onChangeText={(addressLine) => setAddress({ ...address, addressLine })} />
    <Field value={address.city} onChangeText={(city) => setAddress({ ...address, city })} />
    <Field value={address.state} onChangeText={(state) => setAddress({ ...address, state })} />
    <Field value={address.deliveryNote ?? ""} placeholder="Delivery note" onChangeText={(deliveryNote) => setAddress({ ...address, deliveryNote })} />
    <Button title="Save address" onPress={async () => { try { await addressesApi.update(id, address); router.back(); } catch (e) { setError(friendlyError(e)); } }} />
  </> : null}</Screen></Protected>;
}
