import type { ProductSummary, VendorSummary } from "@karigo/shared-types";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { productsApi } from "../../src/api/products.api";
import { vendorsApi } from "../../src/api/vendors.api";
import { Button, Card, Empty, Loading, Message, NavLink, Protected, Screen, ui } from "../../src/components/ui";
import { useCart } from "../../src/contexts/cart-context";
import { friendlyError, money } from "../../src/lib/errors";

export default function VendorDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cart = useCart();
  const [vendor, setVendor] = useState<VendorSummary | null>(null);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { Promise.all([vendorsApi.detail(id), productsApi.list(id)]).then(([v, p]) => { setVendor(v); setProducts(p); }).catch((e) => setError(friendlyError(e))); }, [id]);
  if (!vendor && !error) return <Loading label="Loading vendor..." />;
  return <Protected><Screen title={vendor?.businessName ?? "Vendor"} actions={<NavLink href="/cart" label={`Cart (${cart.items.length})`} />}>
    <Message error>{error}</Message>
    {vendor ? <Card><Text>{vendor.businessCategory}</Text><Text style={ui.muted}>{vendor.address}, {vendor.city}</Text></Card> : null}
    {products.length === 0 ? <Empty message="No available products right now." /> : products.map((product) =>
      <Card key={product.id}><Text style={ui.title}>{product.name}</Text><Text style={ui.muted}>{product.description || "Freshly prepared for your order."}</Text><Text>{money(product.price)}</Text><NavLink href={`/products/${product.id}?vendorId=${id}`} label="View details" /><Button title={product.isAvailable ? "Add to cart" : "Unavailable"} disabled={!product.isAvailable || !vendor} onPress={() => vendor && cart.add(vendor, product)} /></Card>)}
  </Screen></Protected>;
}
