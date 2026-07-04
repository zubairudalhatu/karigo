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
    <BrandHeader eyebrow="Food, groceries, parcels and errands across Kano." />
    <View style={ui.quickNav}><NavLink href="/addresses" label="Addresses" /><NavLink href="/cart" label="Cart" /><NavLink href="/orders" label="Orders" /><NavLink href="/profile" label="Profile" /><NavLink href="/parcel" label="Send parcel" /><NavLink href="/support" label="Support" /></View>
    <Text style={ui.heroTitle}>What do you need today?</Text>
    <View style={ui.chipGrid}>
      {["Food Delivery", "Groceries", "Market Items", "Parcel Delivery", "SME Errands"].map((service) => <View key={service} style={[ui.chip, ui.chipSoft]}><Text style={[ui.chipText, ui.chipTextSoft]}>{service}</Text></View>)}
    </View>
    <Field placeholder="Search food, groceries, vendors or area" value={search} onChangeText={setSearch} onSubmitEditing={() => load(search)} />
    <Message error>{error}</Message>
    <Text style={ui.sectionTitle}>Vendors near you</Text>
    {loading ? <Loading label="Finding nearby vendors..." /> : vendors.length === 0 ? <Empty message="No vendors are available in this area yet. KariGO is expanding soon." /> : vendors.map((vendor) =>
      <Pressable key={vendor.id} onPress={() => router.push(`/vendors/${vendor.id}`)}>
        <Card>
          <View style={ui.vendorCard}>
            <View style={ui.vendorImage}>
              <Text style={ui.vendorImageText}>{vendor.businessName.slice(0, 1).toUpperCase()}</Text>
              {!vendor.isOpen ? <View style={ui.vendorOverlay}><Text style={ui.vendorOverlayText}>Currently closed</Text></View> : null}
            </View>
            <View style={ui.spaceBetween}>
              <View>
                <Text style={ui.cardTitle}>{vendor.businessName}</Text>
                <Text style={ui.muted}>{vendor.businessCategory} · {vendor.city}</Text>
              </View>
              <Text accessibilityLabel="Favourite vendor" style={ui.favorite}>♡</Text>
            </View>
            <View style={ui.chipGrid}>
              <View style={ui.chip}><Text style={ui.chipText}>{vendor.isOpen ? "Open now" : "Closed"}</Text></View>
              <View style={ui.chip}><Text style={ui.chipText}>KariGO delivery</Text></View>
            </View>
          </View>
        </Card>
      </Pressable>)}
  </Screen></Protected>;
}
