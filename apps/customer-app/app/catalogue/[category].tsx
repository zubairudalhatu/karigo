import type { ProductCategory, ProductSummary, VendorSummary } from "@karigo/shared-types";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { productsApi } from "../../src/api/products.api";
import { Button, Card, Empty, Field, Loading, Message, Protected, Screen, ui } from "../../src/components/ui";
import { useCart } from "../../src/contexts/cart-context";
import { friendlyError, money } from "../../src/lib/errors";

const categoryConfig: Record<string, { heading: string; productCategory: ProductCategory; placeholder: string; empty: string }> = {
  food: {
    heading: "Food delivery",
    productCategory: "FOOD",
    placeholder: "Search meals, drinks or food vendors",
    empty: "No food vendors are available in this area yet. KariGO is expanding soon."
  },
  groceries: {
    heading: "Groceries",
    productCategory: "GROCERIES",
    placeholder: "Search rice, eggs, milk or grocery vendors",
    empty: "No grocery products are available in this area yet. KariGO is expanding soon."
  },
  "market-items": {
    heading: "Market items",
    productCategory: "MARKET_ITEMS",
    placeholder: "Search household, personal care or market vendors",
    empty: "No market items are available in this area yet. KariGO is expanding soon."
  }
};

function vendorFromProduct(product: ProductSummary): VendorSummary {
  return {
    id: product.vendorId,
    businessName: product.vendorName ?? "KariGO vendor",
    businessCategory: product.serviceCategory ?? "FOOD",
    isOpen: true,
    status: "ACTIVE"
  };
}

export default function CatalogueCategory() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const config = categoryConfig[category ?? "food"] ?? categoryConfig.food;
  const cart = useCart();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (term?: string) => {
    setLoading(true);
    setError("");
    try {
      setProducts(await productsApi.catalogue({ productCategory: config.productCategory, search: term }));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [config.productCategory]);

  useEffect(() => { void load(); }, [load]);

  const availableCount = useMemo(() => products.filter((product) => product.isAvailable).length, [products]);

  return <Protected><Screen title={config.heading}>
    <Text style={ui.pageIntro}>{availableCount} available item{availableCount === 1 ? "" : "s"} from KariGO vendors near you.</Text>
    <Field placeholder={config.placeholder} value={search} onChangeText={setSearch} onSubmitEditing={() => load(search)} />
    <View style={ui.row}><Button title="Search" tone="muted" onPress={() => load(search)} /><Button title="Clear" tone="muted" onPress={() => { setSearch(""); void load(""); }} /></View>
    <Message error>{error}</Message>
    {loading ? <Loading label={`Loading ${config.heading.toLowerCase()}...`} /> : products.length === 0 ? <Empty message={config.empty} /> : products.map((product) =>
      <Pressable key={product.id} onPress={() => router.push(`/products/${product.id}?vendorId=${product.vendorId}`)}>
        <Card>
          <Image source={{ uri: product.imageUrl }} style={ui.productImage} />
          <Text style={ui.cardTitle}>{product.name}</Text>
          <Text style={ui.muted} numberOfLines={2}>{product.description}</Text>
          <Text style={ui.muted}>{product.vendorName}</Text>
          <View style={ui.priceRow}><Text style={ui.payable}>{money(product.price)}</Text><Text style={ui.priceValue}>{product.isAvailable ? "Available" : "Unavailable"}</Text></View>
          <Button title={product.isAvailable ? "Add to cart" : "Unavailable"} disabled={!product.isAvailable} onPress={() => cart.add(vendorFromProduct(product), product)} />
        </Card>
      </Pressable>)}
  </Screen></Protected>;
}
