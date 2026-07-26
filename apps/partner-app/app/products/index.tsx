import { brand } from "@karigo/config";
import { ProductSummary } from "@karigo/shared-types";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { partnerApi } from "../../src/api/partner.api";
import { AuthGate } from "../../src/components/auth-gate";
import { Badge, Card, EmptyState, Hero, LoadingState, MutedText, PrimaryButton, Screen } from "../../src/components/ui";
import { formatLabel, money } from "../../src/lib/labels";

function ProductsContent() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setProducts(await partnerApi.products());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Products could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleAvailability = useCallback(async (product: ProductSummary) => {
    setSavingProductId(product.id);
    setMessage(null);
    setError(null);
    try {
      await partnerApi.updateProductAvailability(product.id, { isAvailable: !product.isAvailable });
      setMessage(product.isAvailable ? "Product marked unavailable." : "Product marked available.");
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product availability could not be updated.");
    } finally {
      setSavingProductId(null);
    }
  }, [load]);

  if (loading) return <LoadingState label="Loading product catalogue..." />;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
      <Hero eyebrow="Product Seller" title="Products" subtitle="Add and update products for restaurants, grocery stores, market sellers and approved merchants." />
      <PrimaryButton label="Add product" onPress={() => router.push("/products/new")} />
      {error ? <MutedText>{error}</MutedText> : null}
      {message ? <MutedText>{message}</MutedText> : null}
      {products.length === 0 ? (
        <EmptyState title="No products yet" body="Create your first product from mobile, then use Partner Workspace for advanced upload and option management." />
      ) : (
        products.map((product) => (
          <Card key={product.id}>
            <View style={styles.row}>
              <Text style={styles.title}>{product.name}</Text>
              <Badge label={product.isAvailable ? "Available" : "Unavailable"} tone={product.isAvailable ? "success" : "warning"} />
            </View>
            <MutedText>{product.description}</MutedText>
            <MutedText>{formatLabel(product.productCategory)}{product.category ? ` - ${product.category}` : ""}</MutedText>
            <Text style={styles.amount}>{money(product.price)}</Text>
            <View style={styles.actions}>
              <PrimaryButton label="Edit" onPress={() => router.push(`/products/${product.id}`)} variant="secondary" />
              <PrimaryButton
                label={savingProductId === product.id ? "Updating..." : product.isAvailable ? "Mark unavailable" : "Mark available"}
                onPress={() => void toggleAvailability(product)}
                disabled={savingProductId === product.id}
                variant={product.isAvailable ? "secondary" : "primary"}
              />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

export default function ProductsScreen() {
  return (
    <AuthGate>
      <ProductsContent />
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  title: {
    flex: 1,
    color: brand.colors.charcoal,
    fontSize: 16,
    fontWeight: "900"
  },
  amount: {
    color: brand.colors.charcoal,
    fontSize: 18,
    fontWeight: "900"
  },
  actions: {
    gap: 8
  }
});
