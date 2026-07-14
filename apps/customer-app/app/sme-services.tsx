import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Address, addressesApi } from "../src/api/addresses.api";
import { serviceProviderRequestsApi, ServiceProviderCategory, ServiceProviderType } from "../src/api/service-provider-requests.api";
import { Button, Card, Field, Loading, Message, Protected, Screen, ui } from "../src/components/ui";
import { friendlyError } from "../src/lib/errors";

const fallbackCatalogue: ServiceProviderCategory[] = [
  { type: "PAINTER", label: "Painter", description: "Painting and finishing support for homes, shops and offices.", readinessOnly: false, statusLabel: "Staging request" },
  { type: "PLUMBER", label: "Plumber", description: "Plumbing repairs, fittings and inspection requests.", readinessOnly: false, statusLabel: "Staging request" },
  { type: "MECHANIC", label: "Mechanic", description: "Vehicle inspection and mechanic visit requests.", readinessOnly: false, statusLabel: "Staging request" },
  { type: "ELECTRICIAN", label: "Electrician", description: "Electrical repairs, fittings and safety checks.", readinessOnly: false, statusLabel: "Staging request" },
  { type: "CLEANER", label: "Cleaner", description: "Cleaning service requests for homes, shops and offices.", readinessOnly: false, statusLabel: "Staging request" },
  { type: "CARPENTER", label: "Carpenter", description: "Furniture repair, fittings and light woodwork requests.", readinessOnly: false, statusLabel: "Staging request" },
  { type: "AC_TECHNICIAN", label: "AC technician", description: "AC inspection, servicing and repair requests.", readinessOnly: false, statusLabel: "Staging request" },
  { type: "GENERATOR_REPAIR", label: "Generator repair technician", description: "Generator inspection, servicing and repair requests.", readinessOnly: false, statusLabel: "Staging request" },
  { type: "APPLIANCE_REPAIR", label: "Appliance repair technician", description: "Home and shop appliance inspection and repair requests.", readinessOnly: false, statusLabel: "Staging request" },
  { type: "FUMIGATION", label: "Fumigation / pest control", description: "Pest-control and fumigation requests for homes, shops and offices.", readinessOnly: false, statusLabel: "Staging request" },
  { type: "WELDER", label: "Welder", description: "Metalwork, gate, burglary-proof and light fabrication requests.", readinessOnly: false, statusLabel: "Staging request" },
  { type: "TILER", label: "Tiler", description: "Tile fitting, repair and finishing requests.", readinessOnly: false, statusLabel: "Staging request" },
  { type: "CCTV_TECHNICIAN", label: "CCTV / security technician", description: "CCTV, access-control and light security-device support requests.", readinessOnly: false, statusLabel: "Staging request" },
  { type: "MOVING_HELP", label: "Moving / loading help", description: "Manual moving, loading and small relocation support requests.", readinessOnly: false, statusLabel: "Staging request" },
  { type: "HEALTH_PROFESSIONAL", label: "Doctor / health professional", description: "Readiness-only until future health-service approval.", readinessOnly: true, statusLabel: "Future approval required" },
  { type: "OTHER", label: "Other approved service provider", description: "Describe another service need for KariGO review.", readinessOnly: false, statusLabel: "Staging request" }
];

const icons: Record<ServiceProviderType, keyof typeof Feather.glyphMap> = {
  PAINTER: "edit-3",
  PLUMBER: "droplet",
  MECHANIC: "truck",
  ELECTRICIAN: "zap",
  CLEANER: "home",
  CARPENTER: "tool",
  AC_TECHNICIAN: "wind",
  GENERATOR_REPAIR: "settings",
  APPLIANCE_REPAIR: "cpu",
  FUMIGATION: "shield",
  WELDER: "aperture",
  TILER: "grid",
  CCTV_TECHNICIAN: "video",
  MOVING_HELP: "archive",
  HEALTH_PROFESSIONAL: "plus-square",
  OTHER: "briefcase"
};

export default function SmeServices() {
  const [catalogue, setCatalogue] = useState<ServiceProviderCategory[]>(fallbackCatalogue);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedType, setSelectedType] = useState<ServiceProviderType>("PAINTER");
  const [form, setForm] = useState({ serviceAddressId: "", description: "", contactPhone: "", preferredDate: "", preferredTimeWindow: "", customerNote: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createdRequestId, setCreatedRequestId] = useState("");

  useEffect(() => {
    Promise.all([
      serviceProviderRequestsApi.catalogue().catch(() => fallbackCatalogue),
      addressesApi.list()
    ])
      .then(([items, addressList]) => {
        setCatalogue(items.length ? items : fallbackCatalogue);
        setAddresses(addressList);
        const defaultAddress = addressList.find((address) => address.isDefault) ?? addressList[0];
        if (defaultAddress) setForm((current) => ({ ...current, serviceAddressId: defaultAddress.id }));
        const firstActive = (items.length ? items : fallbackCatalogue).find((item) => !item.readinessOnly);
        if (firstActive) setSelectedType(firstActive.type);
      })
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  }, []);

  const selectedCategory = useMemo(() => catalogue.find((item) => item.type === selectedType), [catalogue, selectedType]);
  const canSubmit = !!form.serviceAddressId && !!form.description.trim() && !!form.contactPhone.trim() && !selectedCategory?.readinessOnly && !submitting;

  async function submit() {
    if (!selectedCategory || selectedCategory.readinessOnly) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    setCreatedRequestId("");
    try {
      const request = await serviceProviderRequestsApi.create({
        serviceType: selectedType,
        serviceAddressId: form.serviceAddressId,
        description: form.description,
        contactPhone: form.contactPhone,
        preferredDate: form.preferredDate || undefined,
        preferredTimeWindow: form.preferredTimeWindow || undefined,
        customerNote: form.customerNote || undefined
      });
      setCreatedRequestId(request.id);
      setSuccess(`Service request ${request.requestNumber} has been submitted. KariGO will review it and contact you with the next steps.`);
      setForm((current) => ({ ...current, description: "", preferredDate: "", preferredTimeWindow: "", customerNote: "" }));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  }

  return <Protected><Screen title="SME Services">
    <Text style={ui.pageIntro}>Request approved skilled service providers for homes, shops and businesses. Parcel Delivery remains for sending packages only.</Text>
    <Card>
      <Text style={ui.cardTitle}>Track your requests</Text>
      <Text style={ui.muted}>View submitted SME Services requests, review status updates and safe next-step guidance.</Text>
      <Button title="View my SME Services requests" tone="muted" onPress={() => router.push("/sme-services/requests")} />
    </Card>
    <Card>
      <Text style={ui.cardTitle}>Choose a service provider</Text>
      <Text style={ui.muted}>Painter, plumber, mechanic, electrician, cleaner, carpenter, AC technician, generator repair, appliance repair, fumigation, welder, tiler, CCTV/security, moving help and other approved providers can be requested in staging.</Text>
      {loading ? <Loading label="Loading service categories..." /> : <View style={styles.categoryGrid}>
        {catalogue.map((item) => {
          const selected = item.type === selectedType;
          return <Pressable
            key={item.type}
            accessibilityRole="button"
            accessibilityLabel={`Select ${item.label}`}
            onPress={() => { setSelectedType(item.type); setError(""); setSuccess(""); }}
            style={[styles.categoryCard, selected && styles.categorySelected, item.readinessOnly && styles.categoryReadiness]}
          >
            <Feather name={icons[item.type]} size={19} color={item.readinessOnly ? brand.colors.muted : brand.colors.primary} />
            <Text style={styles.categoryLabel}>{item.label}</Text>
            <Text style={styles.statusLabel}>{item.statusLabel}</Text>
          </Pressable>;
        })}
      </View>}
    </Card>

    {selectedCategory?.readinessOnly ? <Message error>Doctor / health professional booking is readiness-only. KariGO will only enable this after future compliance and approval checks.</Message> : null}

    <Card>
      <Text style={ui.cardTitle}>Service location</Text>
      {addresses.length === 0 ? <Message error>Add a saved address before requesting SME Services.</Message> : addresses.map((address) => <Button
        key={address.id}
        title={`${form.serviceAddressId === address.id ? "Selected" : "Use"}: ${address.label}`}
        tone="muted"
        onPress={() => setForm({ ...form, serviceAddressId: address.id })}
      />)}
    </Card>

    <Card>
      <Text style={ui.cardTitle}>Request details</Text>
      <Field placeholder="Describe the service you need" value={form.description} onChangeText={(description) => setForm({ ...form, description })} multiline />
      <Field placeholder="Contact phone number" value={form.contactPhone} onChangeText={(contactPhone) => setForm({ ...form, contactPhone })} keyboardType="phone-pad" />
      <Field placeholder="Preferred date (optional)" value={form.preferredDate} onChangeText={(preferredDate) => setForm({ ...form, preferredDate })} />
      <Field placeholder="Preferred time window (optional)" value={form.preferredTimeWindow} onChangeText={(preferredTimeWindow) => setForm({ ...form, preferredTimeWindow })} />
      <Field placeholder="Extra note (optional)" value={form.customerNote} onChangeText={(customerNote) => setForm({ ...form, customerNote })} multiline />
    </Card>

    <Message error>{error}</Message>
    <Message>{success}</Message>
    {createdRequestId ? <Button title="View submitted request status" tone="muted" onPress={() => router.push(`/sme-services/requests/${createdRequestId}`)} /> : null}
    <Button title={submitting ? "Submitting request..." : "Submit SME Services request"} onPress={submit} disabled={!canSubmit} />
  </Screen></Protected>;
}

const styles = StyleSheet.create({
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  categoryCard: { alignItems: "center", backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, flexBasis: "47%", flexGrow: 1, gap: 6, minHeight: 110, padding: 10 },
  categorySelected: { backgroundColor: "#FEF2F2", borderColor: brand.colors.primary },
  categoryReadiness: { backgroundColor: "#F3F4F6" },
  categoryLabel: { color: brand.colors.charcoal, fontSize: 13, fontWeight: "900", textAlign: "center" },
  statusLabel: { color: brand.colors.muted, fontSize: 10.5, fontWeight: "800", textAlign: "center" }
});
