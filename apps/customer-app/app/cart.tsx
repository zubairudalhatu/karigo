import { router } from "expo-router";
import { Text } from "react-native";
import { Button, Card, Empty, Protected, Screen, ui } from "../src/components/ui";
import { useCart } from "../src/contexts/cart-context";
import { money } from "../src/lib/errors";

export default function Cart() {
  const cart = useCart();
  return <Protected><Screen title="Your cart">
    {cart.items.length === 0 ? <Empty message="Your cart is empty. Add items from a vendor to get started." /> : <>
      <Text style={ui.muted}>Ordering from {cart.vendor?.businessName}</Text>
      {cart.items.map(({ product, quantity }) => <Card key={product.id}><Text style={ui.title}>{product.name}</Text><Text>{money(product.price)} × {quantity}</Text><Button title="Add one" tone="muted" onPress={() => cart.change(product.id, quantity + 1)} /><Button title="Remove one" tone="muted" onPress={() => cart.change(product.id, quantity - 1)} /></Card>)}
      <Card><Text style={ui.title}>Estimated subtotal: {money(cart.subtotal)}</Text><Text style={ui.muted}>KariGO confirms the final subtotal, discount, delivery fee and total on the server.</Text></Card>
      <Button title="Continue to checkout" onPress={() => router.push("/checkout")} />
      <Button title="Clear cart" tone="muted" onPress={cart.clear} />
    </>}
  </Screen></Protected>;
}
