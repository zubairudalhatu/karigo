import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { SupportTicket, supportApi } from "../../src/api/support.api";
import { Button, Card, Field, Loading, Message, Protected, Screen, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";

export default function SupportTicketDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = () => supportApi.detail(id).then(setTicket).catch((e) => setError(friendlyError(e)));

  useEffect(() => { void load(); }, [id]);

  if (!ticket && !error) return <Loading />;

  return <Protected><Screen title={ticket?.ticketNumber ?? "Support ticket"}><Message error>{error}</Message>{ticket ? <>
    <Card><Text style={ui.title}>{ticket.subject}</Text><Text>{ticket.category} | {ticket.status} | {ticket.priority}</Text><Text>{ticket.description}</Text></Card>
    {ticket.messages.map((item) => <Card key={item.id}><Text>{item.senderRole}</Text><Text>{item.message}</Text></Card>)}
    <Field placeholder="Reply to support" value={message} onChangeText={setMessage} multiline />
    <Button title="Send reply" onPress={async () => { try { await supportApi.message(id, message); setMessage(""); await load(); } catch (e) { setError(friendlyError(e)); } }} disabled={!message || ticket.status === "CLOSED"} />
  </> : null}</Screen></Protected>;
}
