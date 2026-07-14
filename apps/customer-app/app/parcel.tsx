import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Address, addressesApi } from "../src/api/addresses.api";
import { ordersApi } from "../src/api/orders.api";
import { Button, Card, Field, Message, Protected, Screen, ui } from "../src/components/ui";
import { friendlyError } from "../src/lib/errors";

const itemCategories = ["Documents", "Clothing", "Electronics", "Food item", "Household item", "Other"];
const packageSizes = ["Envelope", "Small bag", "Medium package", "Large package"];

const initialForm = {
  pickupAddressId: "",
  deliveryAddressId: "",
  recipientName: "",
  recipientPhone: "",
  itemDescription: "",
  itemCategory: "Documents",
  packageSize: "Small bag",
  declaredValue: "",
  fragile: false,
  customerNote: ""
};

export default function ParcelRequest() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    addressesApi.list()
      .then((items) => {
        setAddresses(items);
        const id = items.find((address) => address.isDefault)?.id ?? items[0]?.id ?? "";
        setForm((current) => ({ ...current, pickupAddressId: id, deliveryAddressId: id }));
      })
      .catch((e) => setError(friendlyError(e)));
  }, []);

  const canSubmit = !!form.pickupAddressId && !!form.deliveryAddressId && !!form.recipientName.trim() && !!form.recipientPhone.trim() && !!form.itemDescription.trim() && !submitting;

  function enrichedNote() {
    return [
      `Parcel category: ${form.itemCategory}`,
      `Package size: ${form.packageSize}`,
      form.declaredValue.trim() ? `Declared value: ${form.declaredValue.trim()}` : "",
      `Fragile item: ${form.fragile ? "Yes" : "No"}`,
      form.customerNote.trim() ? `Customer note: ${form.customerNote.trim()}` : ""
    ].filter(Boolean).join("\n");
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const order = await ordersApi.createParcel({
        pickupAddressId: form.pickupAddressId,
        deliveryAddressId: form.deliveryAddressId,
        recipientName: form.recipientName.trim(),
        recipientPhone: form.recipientPhone.trim(),
        itemDescription: form.itemDescription.trim(),
        customerNote: enrichedNote()
      });
      router.replace(`/orders/${order.id}`);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  }

  return <Protected><Screen title="Send a parcel">
    <Text style={ui.pageIntro}>Parcel Delivery is for sending packages only. KariGO will create the request first, then confirm payment and dispatch steps safely.</Text>

    <Card>
      <Text style={ui.cardTitle}>Pickup address</Text>
      {addresses.length === 0 ? <Message error>Add a saved address before creating a parcel request.</Message> : addresses.map((address) => <Button
        key={`p-${address.id}`}
        title={`${form.pickupAddressId === address.id ? "Selected pickup" : "Pickup"}: ${address.label}`}
        tone="muted"
        onPress={() => setForm({ ...form, pickupAddressId: address.id })}
      />)}
    </Card>

    <Card>
      <Text style={ui.cardTitle}>Delivery address</Text>
      {addresses.map((address) => <Button
        key={`d-${address.id}`}
        title={`${form.deliveryAddressId === address.id ? "Selected delivery" : "Delivery"}: ${address.label}`}
        tone="muted"
        onPress={() => setForm({ ...form, deliveryAddressId: address.id })}
      />)}
    </Card>

    <Card>
      <Text style={ui.cardTitle}>Recipient</Text>
      <Field placeholder="Recipient name" value={form.recipientName} onChangeText={(recipientName) => setForm({ ...form, recipientName })} />
      <Field placeholder="Recipient phone" value={form.recipientPhone} onChangeText={(recipientPhone) => setForm({ ...form, recipientPhone })} keyboardType="phone-pad" />
    </Card>

    <Card>
      <Text style={ui.cardTitle}>Parcel details</Text>
      <Field placeholder="What are you sending?" value={form.itemDescription} onChangeText={(itemDescription) => setForm({ ...form, itemDescription })} />
      <Text style={ui.muted}>Item category</Text>
      <View style={ui.chipGrid}>
        {itemCategories.map((category) => <Button key={category} title={category} tone={form.itemCategory === category ? "primary" : "muted"} onPress={() => setForm({ ...form, itemCategory: category })} />)}
      </View>
      <Text style={ui.muted}>Package size</Text>
      <View style={ui.chipGrid}>
        {packageSizes.map((size) => <Button key={size} title={size} tone={form.packageSize === size ? "primary" : "muted"} onPress={() => setForm({ ...form, packageSize: size })} />)}
      </View>
      <Field placeholder="Declared value optional" value={form.declaredValue} onChangeText={(declaredValue) => setForm({ ...form, declaredValue })} keyboardType="number-pad" />
      <Button title={form.fragile ? "Fragile: Yes" : "Fragile: No"} tone="muted" onPress={() => setForm({ ...form, fragile: !form.fragile })} />
      <Field placeholder="Pickup or handling notes optional" value={form.customerNote} onChangeText={(customerNote) => setForm({ ...form, customerNote })} multiline />
    </Card>

    <Message error>{error}</Message>
    <Button title={submitting ? "Creating parcel request..." : "Create parcel request"} onPress={submit} disabled={!canSubmit} />
  </Screen></Protected>;
}
