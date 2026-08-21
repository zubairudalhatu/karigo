import type { RideConversationPage, RideMessage } from "@karigo/shared-types";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { taxiApi } from "../../src/api/taxi.api";
import { Button, Card, Field, Message, Protected, Screen, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

const quickReplies = ["I'm on my way", "I've arrived", "I'll arrive in 2 min", "Please share your exact location"];

export default function CaptainRideChat() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [conversation, setConversation] = useState<RideConversationPage | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load(before?: string) {
    if (!tripId || loading) return;
    setLoading(true);
    try {
      const page = await taxiApi.messages(tripId, before);
      setConversation((current) => before && current ? { ...page, messages: [...page.messages, ...current.messages] } : page);
      const unread = [...page.messages].reverse().find((item) => item.senderRole === "CUSTOMER" && !item.readAt);
      if (unread) await taxiApi.markMessagesRead(tripId, unread.id);
      setError("");
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setLoading(false);
    }
  }

  async function send(message = draft) {
    const text = message.trim();
    if (!tripId || !text || saving || conversation?.readOnly) return;
    setSaving(true);
    try {
      await taxiApi.sendMessage(tripId, text);
      setDraft("");
      await load();
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { void load(); }, [tripId]);

  return <Protected><Screen title={conversation?.participantLabel || "Customer chat"} subtitle={conversation ? `Ride ${conversation.rideReference}` : "Ride-scoped conversation"} refreshing={loading} onRefresh={() => load()}>
    <Message error>{error}</Message>
    {conversation?.nextBefore ? <Button title="Load earlier messages" tone="muted" disabled={loading} onPress={() => load(conversation.nextBefore ?? undefined)} /> : null}
    <View style={styles.history}>
      {conversation?.messages.length ? conversation.messages.map((item: RideMessage) => <Card key={item.id} tone={item.senderRole === "CAPTAIN" ? "soft" : "default"}>
        <Text style={styles.sender}>{item.senderLabel}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={ui.muted}>{new Date(item.createdAt).toLocaleString()} · {item.readAt ? "Read" : item.deliveryState === "DELIVERED" ? "Delivered" : "Sent"}</Text>
      </Card>) : <Text style={ui.muted}>No messages yet. Use chat only for this Ride.</Text>}
    </View>
    {conversation?.readOnly ? <Card tone="soft"><Text style={styles.sender}>Conversation closed</Text><Text style={ui.muted}>Ride history remains available for support, but new messages are disabled.</Text></Card> : <>
      <View style={styles.quickReplies}>{quickReplies.map((reply) => <Pressable key={reply} accessibilityRole="button" disabled={saving} onPress={() => void send(reply)} style={styles.chip}><Text style={styles.chipText}>{reply}</Text></Pressable>)}</View>
      <Field multiline maxLength={500} placeholder="Message Customer" value={draft} onChangeText={setDraft} />
      <Button title={saving ? "Sending..." : "Send message"} disabled={saving || !draft.trim()} onPress={() => void send()} />
    </>}
    <Text style={ui.muted}>Never share Ride PINs, passwords or payment details in chat. Messages are retained for 90 days for Ride support.</Text>
  </Screen></Protected>;
}

const styles = StyleSheet.create({
  history: { gap: 8 },
  sender: { fontWeight: "900" },
  message: { fontSize: 16, lineHeight: 22 },
  quickReplies: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: "#F3F4F6", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { fontWeight: "800" }
});
