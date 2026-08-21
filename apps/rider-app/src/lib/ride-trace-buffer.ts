import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { CaptainLocation } from "./location";

const TRACE_BUFFER_KEY = "karigo.captain.rideTraceBuffer.v1";
const MAX_BUFFERED_POINTS = 100;

export interface BufferedRideTracePoint {
  clientPointId: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  speedMetersPerSecond?: number | null;
  headingDegrees?: number | null;
  recordedAt: string;
  source: "FOREGROUND" | "BACKGROUND" | "OFFLINE_BUFFER";
}

function pointId(recordedAt: string, latitude: number, longitude: number) {
  return `${recordedAt}:${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
}

async function load() {
  try {
    const value = await SecureStore.getItemAsync(TRACE_BUFFER_KEY);
    const points = value ? JSON.parse(value) : [];
    return Array.isArray(points) ? points as BufferedRideTracePoint[] : [];
  } catch {
    return [];
  }
}

async function save(points: BufferedRideTracePoint[]) {
  if (!points.length) return SecureStore.deleteItemAsync(TRACE_BUFFER_KEY);
  return SecureStore.setItemAsync(TRACE_BUFFER_KEY, JSON.stringify(points.slice(-MAX_BUFFERED_POINTS)));
}

export function foregroundRideTracePoint(location: CaptainLocation): BufferedRideTracePoint {
  return {
    clientPointId: pointId(location.recordedAt, location.latitude, location.longitude),
    latitude: location.latitude,
    longitude: location.longitude,
    accuracyMeters: location.accuracyMeters,
    speedMetersPerSecond: location.speedMetersPerSecond,
    headingDegrees: location.headingDegrees,
    recordedAt: location.recordedAt,
    source: "FOREGROUND"
  };
}

export async function bufferBackgroundRideTrace(locations: Location.LocationObject[]) {
  const current = await load();
  const byId = new Map(current.map((point) => [point.clientPointId, point]));
  for (const location of locations) {
    const recordedAt = new Date(location.timestamp).toISOString();
    const point: BufferedRideTracePoint = {
      clientPointId: pointId(recordedAt, location.coords.latitude, location.coords.longitude),
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracyMeters: location.coords.accuracy,
      speedMetersPerSecond: location.coords.speed,
      headingDegrees: location.coords.heading,
      recordedAt,
      source: "BACKGROUND"
    };
    byId.set(point.clientPointId, point);
  }
  const points = [...byId.values()].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)).slice(-MAX_BUFFERED_POINTS);
  await save(points);
  return points;
}

export async function acknowledgeRideTracePoints(clientPointIds: string[]) {
  const acknowledged = new Set(clientPointIds);
  await save((await load()).filter((point) => !acknowledged.has(point.clientPointId)));
}
