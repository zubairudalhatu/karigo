import type { VendorSummary } from "@karigo/shared-types";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { notificationsApi } from "../../src/api/notifications.api";
import { vendorsApi } from "../../src/api/vendors.api";
import { BrandHeader, Card, Empty, Field, Loading, Message, NavLink, Protected, Screen, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

export default function CustomerHome() {
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [search, setSearch] = useState("");
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(term?: string) {
    setLoading(true); setError("");
    try {
      const [list, count] = await Promise.all([vendorsApi.list(term), notificationsApi.unreadCount()]);
      setVendors(list); setUnread(count.count);
    } catch (e) { setError(friendlyError(e)); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  return <Protected><Screen actions={<NavLink href="/notifications" label={`Activity (${unread})`} />}>
    <BrandHeader eyebrow="Food, errands and packages across Kano." />
    <View><NavLink href="/addresses" label="Addresses" /> <NavLink href="/cart" label="Cart" /> <NavLink href="/orders" label="Orders" /> <NavLink href="/profile" label="Profile" /> <NavLink href="/parcel" label="Send parcel" /> <NavLink href="/support" label="Support" /></View>
    <Text style={ui.title}>What do you need today?</Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {["Food Delivery", "Groceries", "Market Items", "Parcel Delivery", "SME Errands"].map((service) => <View key={service} style={{ backgroundColor: "#FEE2E2", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}><Text style={{ color: "#991B1B", fontWeight: "700" }}>{service}</Text></View>)}
    </View>
    <Field placeholder="Search vendors or area" value={search} onChangeText={setSearch} onSubmitEditing={() => load(search)} />
    <Message error>{error}</Message>
    {loading ? <Loading label="Finding nearby vendors..." /> : vendors.length === 0 ? <Empty message="No vendors are available in this area yet. KariGO is expanding soon." /> : vendors.map((vendor) =>
      <Pressable key={vendor.id} onPress={() => router.push(`/vendors/${vendor.id}`)}>
        <Card><Text style={ui.title}>{vendor.businessName}</Text><Text style={ui.muted}>{vendor.businessCategory} · {vendor.city}</Text><Text>{vendor.isOpen ? "Open now" : "Currently closed"}</Text></Card>
      </Pressable>)}
  </Screen></Protected>;
}
