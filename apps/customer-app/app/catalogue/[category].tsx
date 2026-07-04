import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import type { ProductCategory, ProductSummary, ServiceCategory, VendorSummary } from "@karigo/shared-types";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { productsApi } from "../../src/api/products.api";
import { vendorsApi } from "../../src/api/vendors.api";
import { Card, Empty, Field, Loading, Message, Protected, Screen, ui } from "../../src/components/ui";
import { KariGoAppTopBar } from "../../src/components/kari-go-app-top-bar";
import { friendlyError, money } from "../../src/lib/errors";

const categoryConfig: Record<string, {
  heading: string;
  serviceCategory: ServiceCategory;
  productCategory?: ProductCategory;
  placeholder: string;
  empty: string;
  safetyNote?: string;
}> = {
  food: {
    heading: "Food delivery",
    serviceCategory: "FOOD",
    productCategory: "FOOD",
    placeholder: "Search restaurants, meals or food categories",
    empty: "No food vendors are available in this area yet. KariGO is expanding soon."
  },
  groceries: {
    heading: "Groceries",
    serviceCategory: "GROCERY",
    productCategory: "GROCERIES",
    placeholder: "Search grocery vendors, rice, eggs or milk",
    empty: "No grocery vendors are available in this area yet. KariGO is expanding soon."
  },
  "market-items": {
    heading: "Market items",
    serviceCategory: "MARKET",
    productCategory: "MARKET_ITEMS",
    placeholder: "Search market vendors, household items or categories",
    empty: "No market vendors are available in this area yet. KariGO is expanding soon."
  },
  pharmacy: {
    heading: "Pharmacy",
    serviceCategory: "PHARMACY",
    placeholder: "Search approved pharmacy vendors",
    empty: "No approved pharmacy vendor is available right now.",
    safetyNote: "This pharmacy listing is subject to availability and approved product scope. Some pharmacy products may require additional review before they can be requested."
  }
};

function VendorCard({ vendor, compact = false }: { vendor: VendorSummary; compact?: boolean }) {
  return <Card>
    <View style={styles.vendorRow}>
      <View style={[styles.vendorLogo, compact && styles.vendorLogoCompact]}><Text style={styles.vendorLogoText}>{vendor.businessName.slice(0, 1).toUpperCase()}</Text></View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={ui.cardTitle}>{vendor.businessName}</Text>
        <Text style={ui.muted}>{vendor.businessCategory} · {vendor.city ?? "Kano"}</Text>
        <Text style={ui.muted}>{vendor.isOpen ? "Available for orders" : "Currently closed"}</Text>
      </View>
    </View>
    {vendor.description ? <Text style={ui.pageIntro} numberOfLines={2}>{vendor.description}</Text> : null}
    <Pressable accessibilityRole="button" accessibilityLabel={`View ${vendor.businessName} store`} onPress={() => router.push(`/vendors/${vendor.id}`)}>
      <Text style={styles.link}>View Store</Text>
    </Pressable>
  </Card>;
}

function ProductPreview({ product }: { product: ProductSummary }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${product.name}`} onPress={() => router.push(`/products/${product.id}?vendorId=${product.vendorId}`)}>
    <Card>
      <Image source={{ uri: product.imageUrl }} style={ui.productImage} />
      <Text style={ui.cardTitle}>{product.name}</Text>
      <Text style={ui.muted}>{product.vendorName}</Text>
      <View style={ui.priceRow}><Text style={ui.priceValue}>{money(product.price)}</Text><Text style={styles.link}>View product</Text></View>
    </Card>
  </Pressable>;
}

export default function CatalogueCategory() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const config = categoryConfig[category ?? "food"] ?? categoryConfig.food;
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (term?: string) => {
    setLoading(true);
    setError("");
    try {
      const [vendorList, productList] = await Promise.all([
        vendorsApi.list({ serviceCategory: config.serviceCategory, search: term }),
        config.productCategory ? productsApi.catalogue({ productCategory: config.productCategory, search: term }) : Promise.resolve([])
      ]);
      setVendors(vendorList);
      setProducts(productList.slice(0, 8));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [config.productCategory, config.serviceCategory]);

  useEffect(() => { void load(); }, [load]);

  const featured = useMemo(() => vendors.filter((vendor) => vendor.isOpen).slice(0, 3), [vendors]);
  const restaurants = config.serviceCategory === "FOOD" ? vendors : [];
  const groceryMarket = ["GROCERY", "MARKET"].includes(config.serviceCategory) ? vendors : [];
  const pharmacy = config.serviceCategory === "PHARMACY" ? vendors : [];

  return <Protected>
    <KariGoAppTopBar showBack title="Browse" rightAction={{ icon: "bell", label: "Open notifications", onPress: () => router.push("/notifications") }} />
    <Screen topPadding={false}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={ui.heroTitle}>Browse</Text>
          <Text style={ui.pageIntro}>Discover trusted vendors near you.</Text>
        </View>
        <Feather name="search" size={24} color={brand.colors.primary} />
      </View>
      <Field placeholder={config.placeholder} value={search} onChangeText={setSearch} onSubmitEditing={() => load(search)} />
      <View style={ui.row}>
        <Pressable accessibilityRole="button" onPress={() => load(search)} style={styles.filterButton}><Text style={styles.filterText}>Search</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => { setSearch(""); void load(""); }} style={styles.filterButton}><Text style={styles.filterText}>Clear</Text></Pressable>
      </View>
      {config.safetyNote ? <Message>{config.safetyNote}</Message> : null}
      <Message error>{error}</Message>

      {loading ? <Loading label={`Loading ${config.heading.toLowerCase()} vendors...`} /> : vendors.length === 0 ? <Empty message={config.empty} /> : <>
        <Text style={ui.sectionTitle}>Featured Vendors</Text>
        {featured.length === 0 ? <Empty message="No featured vendor is available for this category yet." /> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredCarousel}>
          {featured.map((vendor) => <View key={vendor.id} style={styles.featuredSlide}><VendorCard vendor={vendor} compact /></View>)}
        </ScrollView>}
        {featured.length > 1 ? <View style={styles.dots}>{featured.map((vendor) => <View key={vendor.id} style={styles.dot} />)}</View> : null}

        {restaurants.length ? <><Text style={ui.sectionTitle}>Top Restaurants</Text>{restaurants.map((vendor) => <VendorCard key={vendor.id} vendor={vendor} />)}</> : null}
        {groceryMarket.length ? <><Text style={ui.sectionTitle}>Top Grocery and Market Vendors</Text>{groceryMarket.map((vendor) => <VendorCard key={vendor.id} vendor={vendor} />)}</> : null}
        {pharmacy.length ? <><Text style={ui.sectionTitle}>Top Pharmacy Vendors</Text>{pharmacy.map((vendor) => <VendorCard key={vendor.id} vendor={vendor} />)}</> : null}

        <Text style={ui.sectionTitle}>Top Menus and Products</Text>
        {products.length === 0 ? <Empty message="No available products are published for this category yet." /> : products.map((product) => <ProductPreview key={product.id} product={product} />)}
      </>}
    </Screen>
  </Protected>;
}

const styles = StyleSheet.create({
  headingRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  filterButton: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  filterText: { color: brand.colors.charcoal, fontWeight: "800" },
  featuredCarousel: { gap: 12, paddingRight: 10 },
  featuredSlide: { width: 292 },
  dots: { alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center" },
  dot: { backgroundColor: brand.colors.primary, borderRadius: 999, height: 7, width: 18 },
  vendorRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  vendorLogo: { alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 20, height: 62, justifyContent: "center", width: 62 },
  vendorLogoCompact: { height: 52, width: 52 },
  vendorLogoText: { color: brand.colors.primaryDark, fontSize: 22, fontWeight: "900" },
  link: { color: brand.colors.primary, fontWeight: "900" }
});
