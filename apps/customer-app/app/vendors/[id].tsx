import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import type { ProductSummary, VendorSummary } from "@karigo/shared-types";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { productsApi } from "../../src/api/products.api";
import { vendorsApi } from "../../src/api/vendors.api";
import { Button, Card, Empty, Field, Loading, Message, NavLink, Protected, Screen, ui } from "../../src/components/ui";
import { KariGoAppTopBar } from "../../src/components/kari-go-app-top-bar";
import { useCart } from "../../src/contexts/cart-context";
import { friendlyError, money } from "../../src/lib/errors";

export default function VendorDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cart = useCart();
  const [vendor, setVendor] = useState<VendorSummary | null>(null);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([vendorsApi.detail(id), productsApi.list(id)])
      .then(([v, p]) => { setVendor(v); setProducts(p); })
      .catch((e) => setError(friendlyError(e)));
  }, [id]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      product.name.toLowerCase().includes(term)
      || product.description.toLowerCase().includes(term)
      || product.category.toLowerCase().includes(term)
    );
  }, [products, search]);

  const productCategories = useMemo(() => Array.from(new Set(products.map((product) => product.category).filter(Boolean))), [products]);

  if (!vendor && !error) return <Loading label="Loading vendor..." />;
  return <Protected>
    <KariGoAppTopBar showBack title="Vendor" rightAction={{ icon: "shopping-bag", label: "Open cart", onPress: () => router.push("/cart") }} />
    <Screen topPadding={false}>
      <Message error>{error}</Message>
      {vendor ? <>
        <Card>
          <View style={styles.hero}>
            <View style={styles.logo}><Text style={styles.logoText}>{vendor.businessName.slice(0, 1).toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={ui.heroTitle}>{vendor.businessName}</Text>
              <Text style={ui.pageIntro}>{vendor.businessCategory}</Text>
            </View>
          </View>
          <Text style={ui.muted}>{vendor.description ?? "Trusted KariGO vendor serving selected Kano areas."}</Text>
          <View style={styles.infoGrid}>
            <Info icon="map-pin" label="Area" value={`${vendor.address ?? "Selected areas"}, ${vendor.city ?? "Kano"}`} />
            <Info icon="clock" label="Hours" value={vendor.openingTime && vendor.closingTime ? `${vendor.openingTime} - ${vendor.closingTime}` : "Vendor availability may vary by location."} />
            <Info icon="truck" label="Delivery" value="KariGO delivery quote confirmed at checkout." />
            <Info icon="activity" label="Status" value={vendor.isOpen ? "Open now for KariGO orders" : "Currently closed"} />
          </View>
        </Card>

        {vendor.businessCategory.toUpperCase().includes("PHARMACY") ? <Message>This pharmacy listing is subject to availability and approved product scope. Some pharmacy products may require additional review before they can be requested.</Message> : null}

        <Card>
          <Text style={ui.cardTitle}>Storefront</Text>
          <Text style={ui.muted}>Search this vendor's menu and product catalogue.</Text>
          <Field placeholder="Search within vendor" value={search} onChangeText={setSearch} />
          {productCategories.length ? <View style={ui.chipGrid}>{productCategories.map((category) => <Text key={category} style={ui.chipText}>{category}</Text>)}</View> : null}
        </Card>
      </> : null}

      <View style={ui.spaceBetween}><Text style={ui.sectionTitle}>Menus and products</Text><NavLink href="/cart" label={`Cart (${cart.items.length})`} /></View>
      {filteredProducts.length === 0 ? <Empty message="No available products right now." /> : filteredProducts.map((product) =>
        <Card key={product.id}>
          <Image source={{ uri: product.imageUrl }} style={ui.productImage} />
          <Text style={ui.cardTitle}>{product.name}</Text>
          <Text style={ui.muted}>{product.description || "Freshly prepared for your order."}</Text>
          <View style={ui.priceRow}><Text style={ui.payable}>{money(product.price)}</Text><Text style={ui.priceValue}>{product.isAvailable ? "Available" : "Unavailable"}</Text></View>
          <NavLink href={`/products/${product.id}?vendorId=${id}`} label="View details" />
          <Button title={cart.addingProductIds.includes(product.id) ? "Added" : product.isAvailable ? "Add to cart" : "Unavailable"} disabled={!product.isAvailable || !vendor || cart.addingProductIds.includes(product.id)} onPress={() => vendor && cart.add(vendor, product)} />
        </Card>)}
    </Screen>
  </Protected>;
}

function Info({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  return <View style={styles.info}>
    <Feather name={icon} size={16} color={brand.colors.primary} />
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>;
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", flexDirection: "row", gap: 14 },
  logo: { alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 22, height: 68, justifyContent: "center", width: 68 },
  logoText: { color: brand.colors.primaryDark, fontSize: 28, fontWeight: "900" },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  info: { backgroundColor: "#F9FAFB", borderRadius: 14, flexBasis: "47%", flexGrow: 1, gap: 4, padding: 12 },
  infoLabel: { color: brand.colors.charcoal, fontSize: 12, fontWeight: "900" },
  infoValue: { color: brand.colors.muted, fontSize: 12, lineHeight: 17 }
});
