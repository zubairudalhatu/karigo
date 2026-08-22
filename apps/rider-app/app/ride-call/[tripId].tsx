import type { RideCallSession } from "@karigo/shared-types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform, StyleSheet, Text, View } from "react-native";
import { ChannelProfileType, ClientRoleType, createAgoraRtcEngine, type IRtcEngine, type IRtcEngineEventHandler } from "react-native-agora";
import { taxiApi } from "../../src/api/taxi.api";
import { Button, Card, Message, Protected, Screen, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";
import { subscribeRideRealtime } from "../../src/lib/ride-realtime";

type CallStatus = "Preparing…" | "Calling…" | "Ringing…" | "Connecting…" | "Connected" | "Reconnecting…" | "Call ended";

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

export default function CaptainRideCall() {
  const params = useLocalSearchParams<{ tripId: string; sessionId?: string; mode?: string }>();
  const router = useRouter();
  const engineRef = useRef<IRtcEngine | null>(null);
  const handlerRef = useRef<IRtcEngineEventHandler | null>(null);
  const sessionRef = useRef<RideCallSession | null>(null);
  const endedRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [session, setSession] = useState<RideCallSession | null>(null);
  const [status, setStatus] = useState<CallStatus>("Preparing…");
  const [participantLabel, setParticipantLabel] = useState("Customer");
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

  function clearReconnectGrace() {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
  }

  function finishCall(updated?: RideCallSession | null) {
    if (updated && sessionRef.current && updated.id !== sessionRef.current.id) return;
    endedRef.current = true;
    clearReconnectGrace();
    if (updated) {
      sessionRef.current = updated;
      setSession(updated);
    }
    releaseEngine();
    setStatus("Call ended");
    if (!dismissTimerRef.current) {
      dismissTimerRef.current = setTimeout(() => {
        dismissTimerRef.current = null;
        router.replace("/tabs/dashboard" as never);
      }, 1_500);
    }
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
      onJoinChannelSuccess: () => setStatus(current.state === "RINGING" ? "Ringing…" : "Connecting…"),
      onUserJoined: () => {
        clearReconnectGrace();
        setStatus("Connected");
        setConnectedAt((value) => value ?? Date.now());
        void reportConnected(sessionRef.current ?? current);
      },
      onUserOffline: () => {
        setStatus("Reconnecting…");
        clearReconnectGrace();
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          void taxiApi.activeCallSession(current.rideId).then((authoritative) => {
            if (!authoritative || ["DECLINED", "MISSED", "ENDED", "FAILED"].includes(authoritative.state)) {
              finishCall(authoritative ?? sessionRef.current);
              return;
            }
            sessionRef.current = authoritative;
            setSession(authoritative);
          }).catch((cause) => setError(friendlyError(cause)));
        }, 4_000);
      },
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
      void taxiApi.trips().then((trips) => setParticipantLabel(trips.find((trip) => trip.id === params.tripId)?.customer?.fullName || "Customer")).catch(() => undefined);
      if (!await requestMicrophone()) throw new Error("Microphone permission is required only while making a KariGO Ride call.");
      const current = params.mode === "accept" && params.sessionId
        ? await taxiApi.acceptCall(params.tripId, params.sessionId)
        : await taxiApi.callSession(params.tripId);
      if (!active) return;
      sessionRef.current = current;
      setSession(current);
      setStatus(current.participant === "initiator" && current.state === "RINGING" ? "Calling…" : "Connecting…");
      unsubscribe = await subscribeRideRealtime(params.tripId, {
        "ride.call.accepted": (updated) => { sessionRef.current = updated; setSession(updated); setStatus("Connecting…"); },
        "ride.call.connected": (updated) => { sessionRef.current = updated; setSession(updated); setStatus("Connected"); setConnectedAt((value) => value ?? Date.now()); },
        "ride.call.declined": finishCall,
        "ride.call.missed": finishCall,
        "ride.call.remote_ended": finishCall
      }, () => void taxiApi.activeCallSession(params.tripId).then((authoritative) => {
        if (!authoritative || ["DECLINED", "MISSED", "ENDED", "FAILED"].includes(authoritative.state)) {
          finishCall(authoritative ?? sessionRef.current);
          return;
        }
        sessionRef.current = authoritative;
        setSession(authoritative);
      }).catch((cause) => setError(friendlyError(cause))));
      await join(current);
    })().catch((cause) => setError(friendlyError(cause)));
    return () => { active = false; unsubscribe?.(); clearReconnectGrace(); if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current); releaseEngine(); };
  }, [params.tripId, params.sessionId, params.mode]);

  async function endCall() {
    if (endedRef.current) return;
    endedRef.current = true;
    try {
      const ended = sessionRef.current ? await taxiApi.endCall(params.tripId, sessionRef.current.id) : null;
      finishCall(ended);
    } catch (cause) {
      setError(friendlyError(cause));
      finishCall(sessionRef.current);
    }
  }

  return <Protected><Screen title={`${participantLabel} — Ride call`} subtitle="Private, Ride-scoped audio call">
    <Message error>{error}</Message>
    <Card>
      <Text style={styles.status}>{status}</Text>
      {connectedAt ? <Text style={styles.timer}>{elapsedText(connectedAt, clock)}</Text> : null}
      <Text style={ui.muted}>Audio only · Calls are not recorded</Text>
    </Card>
    <View style={styles.controls}>
      <Button title={muted ? "Unmute" : "Mute"} tone="muted" disabled={!engineRef.current || status === "Call ended"} onPress={() => { const next = !muted; engineRef.current?.muteLocalAudioStream(next); setMuted(next); }} />
      <Button title={speaker ? "Earpiece" : "Speaker"} tone="muted" disabled={!engineRef.current || status === "Call ended"} onPress={() => { const next = !speaker; engineRef.current?.setEnableSpeakerphone(next); setSpeaker(next); }} />
      <Button title={status === "Call ended" ? "Close" : "End call"} onPress={() => status === "Call ended" ? router.replace("/tabs/dashboard" as never) : void endCall()} />
    </View>
  </Screen></Protected>;
}

const styles = StyleSheet.create({
  status: { fontSize: 22, fontWeight: "900", textAlign: "center" },
  timer: { fontSize: 34, fontWeight: "900", textAlign: "center", marginVertical: 12 },
  controls: { gap: 10 }
});
