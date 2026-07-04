import type { ProductCategory, ProductSummary, VendorSummary } from "@karigo/shared-types";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { notificationsApi } from "../../src/api/notifications.api";
import { productsApi } from "../../src/api/products.api";
import { BrandHeader, Button, Card, Empty, Field, Loading, Message, NavLink, Protected, Screen, ui } from "../../src/components/ui";
import { useCart } from "../../src/contexts/cart-context";
import { friendlyError, money } from "../../src/lib/errors";

const serviceOptions = [
  { label: "Food Delivery", heading: "Food delivery", category: "FOOD" as const, href: "/catalogue/food" },
  { label: "Groceries", heading: "Groceries", category: "GROCERIES" as const, href: "/catalogue/groceries" },
  { label: "Market Items", heading: "Market items", category: "MARKET_ITEMS" as const, href: "/catalogue/market-items" },
  { label: "Parcel Delivery", heading: "Send a parcel", href: "/parcel" },
  { label: "SME Errands", heading: "Request an errand", href: "/parcel?mode=errand" }
];

const categorySections: { title: string; category: ProductCategory; href: string; empty: string }[] = [
  { title: "Food near you", category: "FOOD", href: "/catalogue/food", empty: "Food vendors are coming to this area soon." },
  { title: "Groceries near you", category: "GROCERIES", href: "/catalogue/groceries", empty: "Grocery products are coming to this area soon." },
  { title: "Market items near you", category: "MARKET_ITEMS", href: "/catalogue/market-items", empty: "Market items are coming to this area soon." }
];

function vendorFromProduct(product: ProductSummary): VendorSummary {
  return {
    id: product.vendorId,
    businessName: product.vendorName ?? "KariGO vendor",
    businessCategory: product.serviceCategory ?? "FOOD",
    isOpen: true,
    status: "ACTIVE"
  };
}

export default function CustomerHome() {
  const cart = useCart();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [search, setSearch] = useState("");
  const [_unread, setUnread] = useState(0);
  const [activeCategory, setActiveCategory] = useState<ProductCategory | "PARCEL" | "ERRAND">("FOOD");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(term?: string) {
    setLoading(true); setError("");
    try {
      const [list, count] = await Promise.all([productsApi.catalogue({ search: term }), notificationsApi.unreadCount()]);
      setProducts(list); setUnread(count.count);
    } catch (e) { setError(friendlyError(e)); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const grouped = useMemo(() => Object.fromEntries(categorySections.map((section) => [
    section.category,
    products.filter((product) => product.productCategory === section.category).slice(0, 4)
  ])) as Record<ProductCategory, ProductSummary[]>, [products]);

  return <Protected><Screen>
    <BrandHeader eyebrow="Food, groceries, parcels and errands across Kano." />
    <Text style={ui.heroTitle}>What do you need today?</Text>
    <View style={ui.chipGrid}>
      {serviceOptions.map((service) => <Pressable
        key={service.label}
        accessibilityRole="button"
        onPress={() => {
          setActiveCategory(service.category ?? (service.label === "Parcel Delivery" ? "PARCEL" : "ERRAND"));
          router.push(service.href as never);
        }}
        style={[ui.chip, activeCategory === (service.category ?? (service.label === "Parcel Delivery" ? "PARCEL" : "ERRAND")) && ui.chipSoft]}
      ><Text style={[ui.chipText, activeCategory === (service.category ?? (service.label === "Parcel Delivery" ? "PARCEL" : "ERRAND")) && ui.chipTextSoft]}>{service.label}</Text></Pressable>)}
    </View>
    <Field placeholder="Search food, groceries, vendors or area" value={search} onChangeText={setSearch} onSubmitEditing={() => load(search)} />
    <Message error>{error}</Message>
    {loading ? <Loading label="Finding nearby products..." /> : categorySections.map((section) => <View key={section.category} style={{ gap: 10 }}>
      <View style={ui.spaceBetween}><Text style={ui.sectionTitle}>{section.title}</Text><NavLink href={section.href} label="See all" /></View>
      {grouped[section.category].length === 0 ? <Empty message={section.empty} /> : grouped[section.category].map((product) =>
        <Pressable key={product.id} onPress={() => router.push(`/products/${product.id}?vendorId=${product.vendorId}`)}>
          <Card>
            <Image source={{ uri: product.imageUrl }} style={ui.productImage} />
            <Text style={ui.cardTitle}>{product.name}</Text>
            <Text style={ui.muted} numberOfLines={2}>{product.description}</Text>
            <Text style={ui.muted}>{product.vendorName}</Text>
            <View style={ui.priceRow}><Text style={ui.payable}>{money(product.price)}</Text><Text style={ui.priceValue}>{product.isAvailable ? "Available" : "Unavailable"}</Text></View>
            <Button title={cart.addingProductIds.includes(product.id) ? "Added" : product.isAvailable ? "Add to cart" : "Unavailable"} disabled={!product.isAvailable || cart.addingProductIds.includes(product.id)} onPress={() => cart.add(vendorFromProduct(product), product)} />
          </Card>
        </Pressable>)}
    </View>)}
  </Screen></Protected>;
}
