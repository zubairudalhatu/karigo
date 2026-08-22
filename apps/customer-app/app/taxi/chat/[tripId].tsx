import type { RideConversationPage, RideMessage } from "@karigo/shared-types";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { acknowledgeRideMessageDelivered, setActiveRideConversation, subscribeRideRealtime } from "../../../src/lib/ride-realtime";
import { taxiApi } from "../../../src/api/taxi.api";
import { Button, Card, Field, Message, Protected, Screen, ui } from "../../../src/components/ui";
import { friendlyError } from "../../../src/lib/errors";

export default function CustomerRideChat() {
function mergeMessage(current: RideConversationPage | null, message: RideMessage) {
  if (!current) return current;
  const existing = current.messages.findIndex((item) => item.id === message.id);
  const messages = existing >= 0
    ? current.messages.map((item) => item.id === message.id ? { ...item, ...message } : item)
    : [...current.messages, message];
  return { ...current, messages, messageCount: Math.max(current.messageCount, messages.length) };
}

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
      const unread = [...page.messages].reverse().find((item) => item.senderRole === "CAPTAIN" && !item.readAt);
      if (unread) await taxiApi.markMessagesRead(tripId, unread.id);
      setError("");
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    const text = draft.trim();
    if (!tripId || !text || saving || conversation?.readOnly) return;
    setSaving(true);
    try {
      const message = await taxiApi.sendMessage(tripId, text);
      setConversation((current) => mergeMessage(current, message));
      setDraft("");
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void load();
    setActiveRideConversation(tripId);
    if (!tripId) return;
    let cleanup: (() => void) | undefined;
    void subscribeRideRealtime(tripId, {
      "ride.message.new": (message) => {
        setConversation((current) => mergeMessage(current, message));
        if (message.senderRole === "CAPTAIN") {
          void acknowledgeRideMessageDelivered(tripId, message.id);
          void taxiApi.markMessagesRead(tripId, message.id);
        }
      },
      "ride.message.delivered": ({ messageId, deliveredAt }) => {
        setConversation((current) => current ? {
          ...current,
          messages: current.messages.map((item) => item.id === messageId ? { ...item, deliveryState: "DELIVERED", deliveredAt } : item)
        } : current);
      },
      "ride.message.read": ({ lastMessageId, readAt }) => {
        setConversation((current) => {
          if (!current) return current;
          const boundary = current.messages.find((item) => item.id === lastMessageId)?.createdAt;
          return {
            ...current,
            unreadCount: 0,
            messages: current.messages.map((item) => !boundary || item.createdAt <= boundary
              ? { ...item, deliveryState: "READ", readAt }
              : item)
          };
        });
      }
    }).then((unsubscribe) => { cleanup = unsubscribe; }).catch((cause) => setError(friendlyError(cause)));
    return () => { setActiveRideConversation(null); cleanup?.(); };
  }, [tripId]);

  return <Protected><Screen title={conversation?.participantLabel || "Captain chat"} refreshing={loading} onRefresh={() => load()}>
    <Text style={ui.muted}>{conversation ? `Ride ${conversation.rideReference}` : "Ride-scoped conversation"}</Text>
    <Message error>{error}</Message>
    {conversation?.nextBefore ? <Button title="Load earlier messages" tone="muted" disabled={loading} onPress={() => load(conversation.nextBefore ?? undefined)} /> : null}
    <View style={styles.history}>
      {conversation?.messages.length ? conversation.messages.map((item: RideMessage) => <Card key={item.id}>
        <Text style={styles.sender}>{item.senderLabel}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={ui.muted}>{new Date(item.createdAt).toLocaleString()} · {item.readAt ? "Read" : item.deliveryState === "DELIVERED" ? "Delivered" : "Sent"}</Text>
      </Card>) : <Text style={ui.muted}>No messages yet. This conversation is available only for your assigned Ride.</Text>}
    </View>
    {conversation?.readOnly ? <Card><Text style={styles.sender}>Conversation closed</Text><Text style={ui.muted}>Ride history remains available for support, but new messages are disabled.</Text></Card> : <>
      <Field multiline maxLength={500} placeholder="Message Captain" value={draft} onChangeText={setDraft} />
      <Button title={saving ? "Sending..." : "Send message"} disabled={saving || !draft.trim()} onPress={() => void send()} />
    </>}
    <Text style={ui.muted}>Never share Ride PINs, passwords or payment details in chat. Messages are retained for 90 days for Ride support.</Text>
  </Screen></Protected>;
}

const styles = StyleSheet.create({
  history: { gap: 8 },
  sender: { fontWeight: "900" },
  message: { fontSize: 16, lineHeight: 22 }
});
