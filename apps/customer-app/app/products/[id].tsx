import type { ProductSummary, VendorSummary } from "@karigo/shared-types";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { productsApi } from "../../src/api/products.api";
import { vendorsApi } from "../../src/api/vendors.api";
import { Button, Card, Loading, Message, Protected, Screen, ui } from "../../src/components/ui";
import { useCart } from "../../src/contexts/cart-context";
import { friendlyError, money } from "../../src/lib/errors";

export default function ProductDetails() {
  const { id, vendorId } = useLocalSearchParams<{ id: string; vendorId: string }>();
  const cart = useCart();
  const [product, setProduct] = useState<ProductSummary | null>(null);
  const [vendor, setVendor] = useState<VendorSummary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { Promise.all([vendorsApi.detail(vendorId), productsApi.list(vendorId)]).then(([v, products]) => { setVendor(v); setProduct(products.find((p) => p.id === id) ?? null); }).catch((e) => setError(friendlyError(e))); }, [id, vendorId]);
  if (!product && !error) return <Loading />;
  return <Protected><Screen title={product?.name ?? "Product"}><Message error>{error}</Message>{product ? <Card><Text style={ui.title}>{money(product.price)}</Text><Text>{product.description || "Freshly prepared for your order."}</Text><Text style={ui.muted}>{product.category}</Text><Button title={product.isAvailable ? "Add to cart" : "Unavailable"} disabled={!product.isAvailable || !vendor} onPress={() => vendor && cart.add(vendor, product)} /></Card> : null}</Screen></Protected>;
}
