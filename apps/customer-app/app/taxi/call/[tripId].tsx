import type { RideCallSession } from "@karigo/shared-types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform, StyleSheet, Text, View } from "react-native";
import { ChannelProfileType, ClientRoleType, createAgoraRtcEngine, type IRtcEngine, type IRtcEngineEventHandler } from "react-native-agora";
import { taxiApi } from "../../../src/api/taxi.api";
import { Button, Card, Message, Protected, Screen, ui } from "../../../src/components/ui";
import { friendlyError } from "../../../src/lib/errors";
import { subscribeRideRealtime } from "../../../src/lib/ride-realtime";

type CallStatus = "Preparing" | "Ringing" | "Connecting" | "Connected" | "Reconnecting" | "Ended";

async function requestMicrophone() {
  if (Platform.OS !== "android") return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: "Allow microphone for KariGO Ride calls",
    message: "KariGO uses your microphone only while you are on an in-app Ride call.",
    buttonPositive: "Allow",
    buttonNegative: "Not now"
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function elapsedText(startedAt: number | null, clock: number) {
  if (!startedAt) return "00:00";
  const seconds = Math.max(0, Math.floor((clock - startedAt) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function CustomerRideCall() {
  const params = useLocalSearchParams<{ tripId: string; sessionId?: string; mode?: string }>();
  const router = useRouter();
  const engineRef = useRef<IRtcEngine | null>(null);
  const handlerRef = useRef<IRtcEngineEventHandler | null>(null);
  const sessionRef = useRef<RideCallSession | null>(null);
  const endedRef = useRef(false);
  const [session, setSession] = useState<RideCallSession | null>(null);
  const [status, setStatus] = useState<CallStatus>("Preparing");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [clock, setClock] = useState(Date.now());

  function releaseEngine() {
    const engine = engineRef.current;
    if (!engine) return;
    if (handlerRef.current) engine.unregisterEventHandler(handlerRef.current);
    engine.leaveChannel();
    engine.release();
    engineRef.current = null;
    handlerRef.current = null;
  }

  async function reportConnected(current: RideCallSession) {
    try {
      const updated = await taxiApi.connectCall(current.rideId, current.id);
      sessionRef.current = updated;
      setSession(updated);
    } catch {
      // The other participant may have completed the idempotent transition first.
    }
  }

  async function renew(current: RideCallSession) {
    try {
      const renewed = await taxiApi.renewCallToken(current.rideId, current.id);
      if (renewed.credential) engineRef.current?.renewToken(renewed.credential.token);
      sessionRef.current = renewed;
      setSession(renewed);
    } catch (cause) {
      setError(friendlyError(cause));
    }
  }

  async function join(current: RideCallSession) {
    if (!current.credential) throw new Error("KariGO could not prepare secure call credentials. Please try again.");
    const engine = createAgoraRtcEngine();
    const handler: IRtcEngineEventHandler = {
      onJoinChannelSuccess: () => setStatus(current.state === "RINGING" ? "Ringing" : "Connecting"),
      onUserJoined: () => {
        setStatus("Connected");
        setConnectedAt((value) => value ?? Date.now());
        void reportConnected(sessionRef.current ?? current);
      },
      onUserOffline: () => setStatus("Reconnecting"),
      onTokenPrivilegeWillExpire: () => void renew(sessionRef.current ?? current),
      onRequestToken: () => void renew(sessionRef.current ?? current),
      onError: (_code, message) => setError(message || "The Ride call connection failed.")
    };
    engine.initialize({ appId: current.credential.appId });
    engine.registerEventHandler(handler);
    engine.enableAudio();
    engine.setEnableSpeakerphone(false);
    engineRef.current = engine;
    handlerRef.current = handler;
    engine.joinChannel(current.credential.token, current.credential.channel, current.credential.uid, {
      channelProfile: ChannelProfileType.ChannelProfileCommunication,
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      publishMicrophoneTrack: true,
      autoSubscribeAudio: true,
      publishCameraTrack: false
    });
  }

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!params.tripId) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      if (!await requestMicrophone()) throw new Error("Microphone permission is required only while making a KariGO Ride call.");
      const current = params.mode === "accept" && params.sessionId
        ? await taxiApi.acceptCall(params.tripId, params.sessionId)
        : await taxiApi.callSession(params.tripId);
      if (!active) return;
      sessionRef.current = current;
      setSession(current);
      setStatus(current.state === "RINGING" ? "Ringing" : "Connecting");
      await join(current);
      unsubscribe = await subscribeRideRealtime(params.tripId, {
        "ride.call.accepted": (updated) => { sessionRef.current = updated; setSession(updated); setStatus("Connecting"); },
        "ride.call.connected": (updated) => { sessionRef.current = updated; setSession(updated); setStatus("Connected"); setConnectedAt((value) => value ?? Date.now()); },
        "ride.call.declined": (updated) => { sessionRef.current = updated; setSession(updated); setStatus("Ended"); releaseEngine(); },
        "ride.call.missed": (updated) => { sessionRef.current = updated; setSession(updated); setStatus("Ended"); releaseEngine(); },
        "ride.call.remote_ended": (updated) => { sessionRef.current = updated; setSession(updated); setStatus("Ended"); releaseEngine(); }
      });
    })().catch((cause) => setError(friendlyError(cause)));
    return () => { active = false; unsubscribe?.(); releaseEngine(); };
  }, [params.tripId, params.sessionId, params.mode]);

  async function endCall() {
    if (endedRef.current) return;
    endedRef.current = true;
    try {
      if (sessionRef.current) await taxiApi.endCall(params.tripId, sessionRef.current.id);
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      releaseEngine();
      setStatus("Ended");
    }
  }

  return <Protected><Screen title="KariGO Ride call">
    <Text style={ui.muted}>Private, Ride-scoped audio call</Text>
    <Message error>{error}</Message>
    <Card>
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.timer}>{elapsedText(connectedAt, clock)}</Text>
      <Text style={ui.muted}>Ride audio is not recorded. The microphone is used only during this call.</Text>
    </Card>
    <View style={styles.controls}>
      <Button title={muted ? "Unmute" : "Mute"} tone="muted" disabled={!engineRef.current || status === "Ended"} onPress={() => { const next = !muted; engineRef.current?.muteLocalAudioStream(next); setMuted(next); }} />
      <Button title={speaker ? "Use earpiece" : "Use speaker"} tone="muted" disabled={!engineRef.current || status === "Ended"} onPress={() => { const next = !speaker; engineRef.current?.setEnableSpeakerphone(next); setSpeaker(next); }} />
      <Button title={status === "Ended" ? "Close" : "End call"} onPress={() => status === "Ended" ? router.back() : void endCall()} />
    </View>
  </Screen></Protected>;
}

const styles = StyleSheet.create({
  status: { fontSize: 22, fontWeight: "900", textAlign: "center" },
  timer: { fontSize: 34, fontWeight: "900", textAlign: "center", marginVertical: 12 },
  controls: { gap: 10 }
});
