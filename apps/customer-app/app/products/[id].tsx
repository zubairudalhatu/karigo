import type { ProductSummary, VendorSummary } from "@karigo/shared-types";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
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
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  useEffect(() => { Promise.all([vendorsApi.detail(vendorId), productsApi.list(vendorId)]).then(([v, products]) => { setVendor(v); setProduct(products.find((p) => p.id === id) ?? null); }).catch((e) => setError(friendlyError(e))); }, [id, vendorId]);
  if (!product && !error) return <Loading />;
  return <Protected><Screen title={product?.name ?? "Product"}><Message error>{error}</Message>{product ? <Card>
    <Image source={{ uri: product.imageUrl }} style={ui.productImage} />
    <Text style={ui.payable}>{money(product.price)}</Text>
    <Text style={ui.cardText}>{product.description || "Freshly prepared for your order."}</Text>
    <Text style={ui.muted}>{product.category} · {vendor?.businessName ?? product.vendorName}</Text>
    <View style={ui.priceRow}><Text style={ui.priceLabel}>Quantity</Text><Text style={ui.priceValue}>{quantity}</Text></View>
    <View style={ui.row}><Button title="Remove one" tone="muted" disabled={quantity <= 1} onPress={() => setQuantity((current) => Math.max(1, current - 1))} /><Button title="Add one" tone="muted" onPress={() => setQuantity((current) => current + 1)} /></View>
    <Button title={cart.addingProductIds.includes(product.id) ? "Added" : product.isAvailable ? `Add ${quantity} to cart` : "Unavailable"} disabled={!product.isAvailable || !vendor || cart.addingProductIds.includes(product.id)} onPress={() => {
      if (!vendor) return;
      for (let index = 0; index < quantity; index += 1) cart.add(vendor, product);
    }} />
  </Card> : null}</Screen></Protected>;
}
