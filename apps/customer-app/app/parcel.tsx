import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Address, addressesApi } from "../src/api/addresses.api";
import { ordersApi } from "../src/api/orders.api";
import { Button, Field, Message, Protected, Screen } from "../src/components/ui";
import { friendlyError } from "../src/lib/errors";

export default function ParcelRequest() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState({ pickupAddressId: "", deliveryAddressId: "", recipientName: "", recipientPhone: "", itemDescription: "", customerNote: "" });
  const [error, setError] = useState("");
  useEffect(() => { addressesApi.list().then((a) => { setAddresses(a); const id = a.find((x) => x.isDefault)?.id ?? a[0]?.id ?? ""; setForm((f) => ({ ...f, pickupAddressId: id, deliveryAddressId: id })); }); }, []);
  async function submit() {
    try { const order = await ordersApi.createParcel(form); router.replace(`/orders/${order.id}`); } catch (e) { setError(friendlyError(e)); }
  }
  return <Protected><Screen title="Send a parcel">
    {addresses.map((a) => <Button key={`p-${a.id}`} title={`${form.pickupAddressId === a.id ? "Pickup ✓" : "Pickup"}: ${a.label}`} tone="muted" onPress={() => setForm({ ...form, pickupAddressId: a.id })} />)}
    {addresses.map((a) => <Button key={`d-${a.id}`} title={`${form.deliveryAddressId === a.id ? "Delivery ✓" : "Delivery"}: ${a.label}`} tone="muted" onPress={() => setForm({ ...form, deliveryAddressId: a.id })} />)}
    <Field placeholder="Recipient name" value={form.recipientName} onChangeText={(recipientName) => setForm({ ...form, recipientName })} />
    <Field placeholder="Recipient phone" value={form.recipientPhone} onChangeText={(recipientPhone) => setForm({ ...form, recipientPhone })} keyboardType="phone-pad" />
    <Field placeholder="What are you sending?" value={form.itemDescription} onChangeText={(itemDescription) => setForm({ ...form, itemDescription })} />
    <Field placeholder="Notes (optional)" value={form.customerNote} onChangeText={(customerNote) => setForm({ ...form, customerNote })} />
    <Message error>{error}</Message><Button title="Create parcel request" onPress={submit} disabled={!form.pickupAddressId || !form.deliveryAddressId || !form.recipientName || !form.recipientPhone || !form.itemDescription} />
  </Screen></Protected>;
}
