import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Address, AddressInput, addressesApi } from "../src/api/addresses.api";
import {
  PublicServiceProvider,
  serviceProviderRequestsApi,
  ServiceProviderCategory,
  ServiceProviderType
} from "../src/api/service-provider-requests.api";
import { Button, Card, Field, Loading, Message, Protected, Screen, ui } from "../src/components/ui";
import { friendlyError } from "../src/lib/errors";

const NEW_ADDRESS_ID = "NEW_SERVICE_ADDRESS";

const fallbackCatalogue: ServiceProviderCategory[] = [
  { type: "PAINTER", label: "Painter", description: "Painting and finishing support for homes, shops and offices.", readinessOnly: false, statusLabel: "Request review" },
  { type: "PLUMBER", label: "Plumber", description: "Plumbing repairs, fittings and inspection requests.", readinessOnly: false, statusLabel: "Request review" },
  { type: "MECHANIC", label: "Mechanic", description: "Vehicle inspection and mechanic visit requests.", readinessOnly: false, statusLabel: "Request review" },
  { type: "ELECTRICIAN", label: "Electrician", description: "Electrical repairs, fittings and safety checks.", readinessOnly: false, statusLabel: "Request review" },
  { type: "CLEANER", label: "Cleaner", description: "Cleaning service requests for homes, shops and offices.", readinessOnly: false, statusLabel: "Request review" },
  { type: "CARPENTER", label: "Carpenter", description: "Furniture repair, fittings and light woodwork requests.", readinessOnly: false, statusLabel: "Request review" },
  { type: "AC_TECHNICIAN", label: "AC technician", description: "AC inspection, servicing and repair requests.", readinessOnly: false, statusLabel: "Request review" },
  { type: "GENERATOR_REPAIR", label: "Generator repair technician", description: "Generator inspection, servicing and repair requests.", readinessOnly: false, statusLabel: "Request review" },
  { type: "APPLIANCE_REPAIR", label: "Appliance repair technician", description: "Home and shop appliance inspection and repair requests.", readinessOnly: false, statusLabel: "Request review" },
  { type: "FUMIGATION", label: "Fumigation / pest control", description: "Pest-control and fumigation requests for homes, shops and offices.", readinessOnly: false, statusLabel: "Request review" },
  { type: "WELDER", label: "Welder", description: "Metalwork, gate, burglary-proof and light fabrication requests.", readinessOnly: false, statusLabel: "Request review" },
  { type: "TILER", label: "Tiler", description: "Tile fitting, repair and finishing requests.", readinessOnly: false, statusLabel: "Request review" },
  { type: "CCTV_TECHNICIAN", label: "CCTV / security technician", description: "CCTV, access-control and light security-device support requests.", readinessOnly: false, statusLabel: "Request review" },
  { type: "MOVING_HELP", label: "Moving / loading help", description: "Manual moving, loading and small relocation support requests.", readinessOnly: false, statusLabel: "Request review" },
  { type: "HEALTH_PROFESSIONAL", label: "Doctor / health professional", description: "Compliance approval required before health-service booking.", readinessOnly: true, statusLabel: "Approval required" },
  { type: "OTHER", label: "Other approved service provider", description: "Describe another service need for KariGO review.", readinessOnly: false, statusLabel: "Request review" }
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

const defaultNewAddress: AddressInput = {
  label: "Service address",
  addressLine: "",
  city: "Kano",
  state: "Kano",
  country: "Nigeria",
  deliveryNote: "",
  latitude: null,
  longitude: null,
  isDefault: false
};

function providerRating(provider: PublicServiceProvider) {
  if (!provider.reviewCount || !provider.averageRating) return "No reviews yet";
  return `${provider.averageRating.toFixed(1)} (${provider.reviewCount} review${provider.reviewCount === 1 ? "" : "s"})`;
}

export default function SmeServices() {
  const [catalogue, setCatalogue] = useState<ServiceProviderCategory[]>(fallbackCatalogue);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [providers, setProviders] = useState<PublicServiceProvider[]>([]);
  const [selectedType, setSelectedType] = useState<ServiceProviderType>("PAINTER");
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [form, setForm] = useState({ serviceAddressId: "", description: "", contactPhone: "", preferredDate: "", preferredTimeWindow: "", customerNote: "" });
  const [newAddress, setNewAddress] = useState<AddressInput>(defaultNewAddress);
  const [loading, setLoading] = useState(true);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [providerError, setProviderError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [createdRequestId, setCreatedRequestId] = useState("");

  useEffect(() => {
    Promise.all([
      serviceProviderRequestsApi.catalogue().catch(() => fallbackCatalogue),
      addressesApi.list()
    ])
      .then(([items, addressList]) => {
        const nextCatalogue = items.length ? items : fallbackCatalogue;
        setCatalogue(nextCatalogue);
        setAddresses(addressList);
        const defaultAddress = addressList.find((address) => address.isDefault) ?? addressList[0];
        setForm((current) => ({ ...current, serviceAddressId: defaultAddress?.id ?? NEW_ADDRESS_ID }));
        const firstActive = nextCatalogue.find((item) => !item.readinessOnly);
        if (firstActive) setSelectedType(firstActive.type);
      })
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  }, []);

  const selectedCategory = useMemo(() => catalogue.find((item) => item.type === selectedType), [catalogue, selectedType]);
  const usingNewAddress = form.serviceAddressId === NEW_ADDRESS_ID;
  const hasUsableAddress = usingNewAddress
    ? !!newAddress.addressLine.trim() && !!newAddress.city.trim() && !!newAddress.state.trim()
    : !!form.serviceAddressId;
  const canSubmit = hasUsableAddress && !!form.description.trim() && !!form.contactPhone.trim() && !selectedCategory?.readinessOnly && !submitting;
  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId);

  useEffect(() => {
    let cancelled = false;
    if (!selectedCategory || selectedCategory.readinessOnly) {
      setProviders([]);
      setSelectedProviderId("");
      setProviderError("");
      return;
    }

    setProvidersLoading(true);
    setProviderError("");
    serviceProviderRequestsApi.providers({ serviceType: selectedType, city: "Kano" })
      .then((response) => {
        if (!cancelled) {
          setProviders(response.items);
          setSelectedProviderId((current) => response.items.some((provider) => provider.id === current) ? current : "");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setProviders([]);
          setSelectedProviderId("");
          setProviderError(friendlyError(e));
        }
      })
      .finally(() => {
        if (!cancelled) setProvidersLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedCategory, selectedType]);

  function updateNewAddress(patch: Partial<AddressInput>) {
    setNewAddress((current) => ({ ...current, ...patch }));
  }

  function detectLocation() {
    setLocationMessage("");
    setLocating(true);
    Location.requestForegroundPermissionsAsync()
      .then((permission) => {
        if (permission.status !== "granted") {
          setLocationMessage("Location permission was not granted. You can still enter the address manually.");
          return null;
        }
        return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      })
      .then((position) => {
        if (!position) return;
        updateNewAddress({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationMessage("Location captured. Please still enter the written address so KariGO operations can coordinate safely.");
      })
      .catch(() => setLocationMessage("Unable to detect location. You can still enter the address manually."))
      .finally(() => setLocating(false));
  }

  async function resolveServiceAddressId() {
    if (!usingNewAddress) return form.serviceAddressId;
    const created = await addressesApi.create({
      ...newAddress,
      label: newAddress.label.trim() || "Service address",
      addressLine: newAddress.addressLine.trim(),
      city: newAddress.city.trim(),
      state: newAddress.state.trim(),
      country: newAddress.country?.trim() || "Nigeria",
      deliveryNote: newAddress.deliveryNote?.trim() || undefined,
      isDefault: false
    });
    setAddresses((current) => [created, ...current]);
    setForm((current) => ({ ...current, serviceAddressId: created.id }));
    return created.id;
  }

  async function submit() {
    if (!selectedCategory || selectedCategory.readinessOnly || !canSubmit) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    setCreatedRequestId("");
    try {
      const serviceAddressId = await resolveServiceAddressId();
      const request = await serviceProviderRequestsApi.create({
        serviceType: selectedType,
        serviceAddressId,
        preferredProviderId: selectedProviderId || undefined,
        description: form.description,
        contactPhone: form.contactPhone,
        preferredDate: form.preferredDate || undefined,
        preferredTimeWindow: form.preferredTimeWindow || undefined,
        customerNote: form.customerNote || undefined
      });
      setCreatedRequestId(request.id);
      setSuccess(`Service request ${request.requestNumber} has been submitted. KariGO will review it and contact you with the next steps.`);
      setForm((current) => ({ ...current, serviceAddressId, description: "", preferredDate: "", preferredTimeWindow: "", customerNote: "" }));
      setNewAddress(defaultNewAddress);
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
      <Text style={ui.cardTitle}>Choose a service category</Text>
      <Text style={ui.muted}>Select the type of provider you need. Health professional booking remains disabled until compliance approval.</Text>
      {loading ? <Loading label="Loading service categories..." /> : <View style={styles.categoryGrid}>
        {catalogue.map((item) => {
          const selected = item.type === selectedType;
          return <Pressable
            key={item.type}
            accessibilityRole="button"
            accessibilityLabel={`Select ${item.label}`}
            onPress={() => { setSelectedType(item.type); setSelectedProviderId(""); setError(""); setSuccess(""); }}
            style={[styles.categoryCard, selected && styles.categorySelected, item.readinessOnly && styles.categoryReadiness]}
          >
            <Feather name={icons[item.type]} size={19} color={item.readinessOnly ? brand.colors.muted : brand.colors.primary} />
            <Text style={styles.categoryLabel}>{item.label}</Text>
            <Text style={styles.statusLabel}>{item.statusLabel}</Text>
          </Pressable>;
        })}
      </View>}
    </Card>

    {selectedCategory?.readinessOnly ? <Message error>Doctor / health professional booking requires compliance approval before KariGO can enable it.</Message> : null}

    {!selectedCategory?.readinessOnly ? <Card>
      <Text style={ui.cardTitle}>Available providers</Text>
      <Text style={ui.muted}>Choose a preferred provider or let KariGO operations match one manually. Private phone and email details stay hidden.</Text>
      <Button title={selectedProviderId ? "Let KariGO match me instead" : "Let KariGO match me"} tone="muted" onPress={() => setSelectedProviderId("")} />
      <Message error>{providerError}</Message>
      {providersLoading ? <Loading label="Finding approved providers..." /> : providers.length === 0
        ? <Text style={ui.muted}>No approved provider is listed for this category yet. KariGO can still review your request manually.</Text>
        : providers.map((provider) => {
          const selected = provider.id === selectedProviderId;
          return <Pressable
            key={provider.id}
            accessibilityRole="button"
            accessibilityLabel={`Select ${provider.displayName}`}
            onPress={() => setSelectedProviderId(selected ? "" : provider.id)}
            style={[styles.providerCard, selected && styles.providerSelected]}
          >
            <View style={styles.providerAvatar}>
              <Text style={styles.providerAvatarText}>{provider.displayName.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.providerBody}>
              <Text style={styles.providerName}>{provider.displayName}</Text>
              <Text style={ui.muted}>{provider.city}, {provider.state}</Text>
              <Text style={ui.muted}>{providerRating(provider)} · {provider.completedServices} completed</Text>
              {provider.publicBio ? <Text style={ui.muted} numberOfLines={2}>{provider.publicBio}</Text> : null}
            </View>
          </Pressable>;
        })}
      {selectedProvider ? <Message>{selectedProvider.displayName} will be sent as your preferred provider. KariGO Admin still reviews and coordinates the request manually.</Message> : null}
    </Card> : null}

    <Card>
      <Text style={ui.cardTitle}>Service location</Text>
      {addresses.map((address) => <Button
        key={address.id}
        title={`${form.serviceAddressId === address.id ? "Selected" : "Use"}: ${address.label}`}
        tone="muted"
        onPress={() => setForm({ ...form, serviceAddressId: address.id })}
      />)}
      <Button
        title={usingNewAddress ? "Entering a new service address" : "Enter a new service address"}
        tone="muted"
        onPress={() => setForm({ ...form, serviceAddressId: NEW_ADDRESS_ID })}
      />
      {usingNewAddress ? <View style={styles.newAddressFields}>
        <Field placeholder="Address label" value={newAddress.label} onChangeText={(label) => updateNewAddress({ label })} />
        <Field placeholder="Service address" value={newAddress.addressLine} onChangeText={(addressLine) => updateNewAddress({ addressLine })} multiline />
        <Field placeholder="City" value={newAddress.city} onChangeText={(city) => updateNewAddress({ city })} />
        <Field placeholder="State" value={newAddress.state} onChangeText={(state) => updateNewAddress({ state })} />
        <Field placeholder="Delivery/service note (optional)" value={newAddress.deliveryNote ?? ""} onChangeText={(deliveryNote) => updateNewAddress({ deliveryNote })} multiline />
        <Button title={locating ? "Detecting location..." : "Use current location"} tone="muted" onPress={detectLocation} disabled={locating} />
        {newAddress.latitude && newAddress.longitude ? <Text style={ui.muted}>Approximate location captured for operations review.</Text> : null}
        <Message>{locationMessage}</Message>
      </View> : null}
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
  statusLabel: { color: brand.colors.muted, fontSize: 10.5, fontWeight: "800", textAlign: "center" },
  providerCard: { alignItems: "flex-start", backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 12, padding: 12 },
  providerSelected: { backgroundColor: "#FEF2F2", borderColor: brand.colors.primary },
  providerAvatar: { alignItems: "center", backgroundColor: "#FEE2E2", borderRadius: 18, height: 44, justifyContent: "center", width: 44 },
  providerAvatarText: { color: brand.colors.primaryDark, fontSize: 18, fontWeight: "900" },
  providerBody: { flex: 1, gap: 3 },
  providerName: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "900" },
  newAddressFields: { gap: 10 }
});
