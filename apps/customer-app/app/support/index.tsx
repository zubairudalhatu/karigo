import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { SupportTicket, supportApi } from "../../src/api/support.api";
import { Button, Card, Empty, Field, Message, Protected, Screen, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

export default function SupportCentre() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [form, setForm] = useState({ category: "OTHER", subject: "", description: "", orderId: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      setTickets(await supportApi.mine());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function create() {
    setError("");
    setMessage("");
    try {
      const created = await supportApi.create({ ...form, orderId: form.orderId || undefined });
      setTickets((current) => [created, ...current.filter((ticket) => ticket.id !== created.id)]);
      setForm({ category: form.category, subject: "", description: "", orderId: "" });
      setMessage("Support ticket created successfully.");
      await load();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return <Protected><Screen title="Support centre" refreshing={refreshing} onRefresh={load}>
    <Field placeholder="Category: OTHER, ORDER_DELAY, PAYMENT_ISSUE..." value={form.category} onChangeText={(category) => setForm({ ...form, category })} autoCapitalize="characters" />
    <Field placeholder="Subject" value={form.subject} onChangeText={(subject) => setForm({ ...form, subject })} />
    <Field placeholder="Tell us what happened" value={form.description} onChangeText={(description) => setForm({ ...form, description })} multiline />
    <Field placeholder="Order ID (optional)" value={form.orderId} onChangeText={(orderId) => setForm({ ...form, orderId })} />
    <Message>{message}</Message><Message error>{error}</Message><Button title="Create ticket" onPress={create} disabled={!form.subject || !form.description || refreshing} />
    {tickets.length === 0 ? <Empty message="No support tickets yet." /> : tickets.map((ticket) => {
      const latestMessage = ticket.messages?.at(-1)?.message ?? ticket.description;
      return <Pressable key={ticket.id} onPress={() => router.push(`/support/${ticket.id}`)}>
        <Card>
          <Text style={ui.title}>{ticket.subject}</Text>
          <Text>{ticket.category} | {ticket.status} | {ticket.priority}</Text>
          <Text style={ui.muted}>{latestMessage}</Text>
        </Card>
      </Pressable>;
    })}
  </Screen></Protected>;
}
