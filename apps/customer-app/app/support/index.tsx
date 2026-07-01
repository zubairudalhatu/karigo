import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { SupportTicket, supportApi } from "../../src/api/support.api";
import { Button, Card, Empty, Field, Message, Protected, Screen, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

export default function SupportCentre() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [form, setForm] = useState({ category: "OTHER", subject: "", description: "", orderId: "" });
  const [error, setError] = useState("");
  const load = () => supportApi.mine().then(setTickets).catch((e) => setError(friendlyError(e)));
  useEffect(() => { void load(); }, []);
  async function create() {
    try { await supportApi.create({ ...form, orderId: form.orderId || undefined }); setForm({ ...form, subject: "", description: "", orderId: "" }); await load(); }
    catch (e) { setError(friendlyError(e)); }
  }
  return <Protected><Screen title="Support centre">
    <Field placeholder="Category: OTHER, ORDER_DELAY, PAYMENT_ISSUE..." value={form.category} onChangeText={(category) => setForm({ ...form, category })} autoCapitalize="characters" />
    <Field placeholder="Subject" value={form.subject} onChangeText={(subject) => setForm({ ...form, subject })} />
    <Field placeholder="Tell us what happened" value={form.description} onChangeText={(description) => setForm({ ...form, description })} multiline />
    <Field placeholder="Order ID (optional)" value={form.orderId} onChangeText={(orderId) => setForm({ ...form, orderId })} />
    <Message error>{error}</Message><Button title="Create ticket" onPress={create} disabled={!form.subject || !form.description} />
    {tickets.length === 0 ? <Empty message="No support tickets yet." /> : tickets.map((ticket) => <Pressable key={ticket.id} onPress={() => router.push(`/support/${ticket.id}`)}><Card><Text style={ui.title}>{ticket.subject}</Text><Text>{ticket.status} · {ticket.priority}</Text></Card></Pressable>)}
  </Screen></Protected>;
}
