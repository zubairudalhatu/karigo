import { brand } from "@karigo/config";
import { ProductSummary } from "@karigo/shared-types";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { partnerApi } from "../../src/api/partner.api";
import { AuthGate } from "../../src/components/auth-gate";
import { Badge, Card, EmptyState, Hero, LoadingState, MutedText, Screen } from "../../src/components/ui";

function ProductsContent() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <LoadingState label="Loading product catalogue..." />;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
      <Hero eyebrow="Product Seller" title="Products" subtitle="Mobile catalogue visibility for restaurants, grocery stores, market sellers and approved merchants." />
      {error ? <MutedText>{error}</MutedText> : null}
      {products.length === 0 ? (
        <EmptyState title="No products yet" body="Product creation and uploads remain available from Partner Workspace. Mobile editing can be expanded in a later task." />
      ) : (
        products.map((product) => (
          <Card key={product.id}>
            <View style={styles.row}>
              <Text style={styles.title}>{product.name}</Text>
              <Badge label={product.isAvailable ? "Available" : "Unavailable"} tone={product.isAvailable ? "success" : "warning"} />
            </View>
            <MutedText>{product.description}</MutedText>
            <Text style={styles.amount}>NGN {Number(product.price).toLocaleString()}</Text>
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
  }
});
