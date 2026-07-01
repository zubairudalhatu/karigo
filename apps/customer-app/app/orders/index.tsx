import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { Order, ordersApi } from "../../src/api/orders.api";
import { Card, Empty, Loading, Message, Protected, Screen, ui } from "../../src/components/ui";
import { friendlyError, money } from "../../src/lib/errors";

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { ordersApi.mine().then(setOrders).catch((e) => setError(friendlyError(e))).finally(() => setLoading(false)); }, []);
  return <Protected><Screen title="Your orders"><Message error>{error}</Message>
    {loading ? <Loading /> : orders.length === 0 ? <Empty message="Your KariGO orders will appear here." /> : orders.map((order) =>
      <Pressable key={order.id} onPress={() => router.push(`/orders/${order.id}`)}><Card><Text style={ui.title}>{order.orderNumber}</Text><Text>{order.orderStatus} · {order.paymentStatus}</Text><Text>{money(order.totalAmount)}</Text></Card></Pressable>)}
  </Screen></Protected>;
}
