import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RiderJob } from "../api/jobs.api";
import { NavLink } from "./ui";

type Coordinate = { latitude: number; longitude: number };

function compactNaira(value: string | number) {
  const amount = Number(value);
  return `₦${(Number.isFinite(amount) ? amount : 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

type Props = {
  captainName: string;
  coordinate: Coordinate | null;
  region: Region | null;
  area: string;
  approvedAreas: string[];
  statusLabel: string;
  online: boolean;
  rideActive: boolean;
  deliveryActive: boolean;
  rideDesiredOnline: boolean;
  deliveryDesiredOnline: boolean;
  rideEffectiveOnline: boolean;
  deliveryEffectiveOnline: boolean;
  canToggleMaster: boolean;
  canToggleRide: boolean;
  canToggleDelivery: boolean;
  availabilityUpdating: boolean;
  availabilityChecking: boolean;
  todayEarnings: string | number;
  unread: number;
  activeDelivery?: RiderJob | null;
  serviceNotice?: string | null;
  refreshNotice?: string;
  message?: string;
  error?: string;
  loading?: boolean;
  locationLabel: "Locating..." | "Current location" | "Last known location" | "Location unavailable" | string;
  locationMessage?: string;
  onToggleMaster: () => void;
  onToggleRide: () => void;
  onToggleDelivery: () => void;
  onRecenter: () => Promise<Coordinate | null>;
  onRetrySync: () => void;
};

function ModeToggle({ label, enabled, effective, active, disabled, onPress }: { label: string; enabled: boolean; effective: boolean; active: boolean; disabled: boolean; onPress: () => void }) {
  return <View style={styles.modeRow}>
    <View style={styles.modeCopy}>
      <Text style={styles.modeTitle}>{label}</Text>
      <Text style={styles.modeHint}>{active
        ? effective ? "Receiving requests" : enabled ? "Preference saved — unavailable" : "Not receiving requests"
        : "Activation pending"}</Text>
    </View>
    <Pressable accessibilityRole="switch" accessibilityLabel={`${label} work preference`} accessibilityState={{ checked: enabled, disabled }} disabled={disabled} onPress={onPress} style={[styles.toggle, enabled && styles.toggleOn, disabled && styles.disabled]}>
      <View style={[styles.toggleKnob, enabled && styles.toggleKnobOn]} />
      <Text style={[styles.toggleText, enabled && styles.toggleTextOn]}>{enabled ? "ON" : "OFF"}</Text>
    </Pressable>
  </View>;
}

export function CaptainHomeSkeleton({ captainName }: { captainName: string }) {
  const insets = useSafeAreaInsets();
  return <View style={styles.cockpit}>
    <View style={styles.mapSkeleton} />
    <View style={[styles.floatingHeader, { top: insets.top + 10 }]}>
      <View style={styles.logoControl}><Image source={require("../../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" /></View>
      <View style={styles.skeletonEarnings} />
      <View style={styles.skeletonBell} />
    </View>
    <View style={[styles.skeletonAction, { bottom: Math.max(insets.bottom, 8) + 82 }]}>
      <Text style={styles.skeletonTitle}>Getting {captainName} ready...</Text>
      <View style={styles.skeletonLine} />
    </View>
  </View>;
}

export function CaptainHomeCockpit(props: Props) {
  const insets = useSafeAreaInsets();
  const [showPreferences, setShowPreferences] = useState(false);
  const [recentering, setRecentering] = useState(false);
  const mapRef = useRef<MapView | null>(null);
  const firstFreshLocationCenteredRef = useRef(false);
  const navClearance = Math.max(insets.bottom, 8) + 72;
  const actionBottom = navClearance + 10;

  useEffect(() => {
    if (props.locationLabel !== "Current location" || !props.coordinate || firstFreshLocationCenteredRef.current) return;
    firstFreshLocationCenteredRef.current = true;
    mapRef.current?.animateToRegion({ ...props.coordinate, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 450);
  }, [props.coordinate?.latitude, props.coordinate?.longitude, props.locationLabel]);

  async function recenterMap() {
    if (recentering) return;
    setRecentering(true);
    try {
      const coordinate = await props.onRecenter();
      if (coordinate) mapRef.current?.animateToRegion({ ...coordinate, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 350);
    } finally {
      setRecentering(false);
    }
  }

  const actionHeight = props.activeDelivery ? 126 : props.online ? 76 : 68;
  const noticeBottom = actionBottom + actionHeight + 10;

  return <View style={styles.cockpit}>
    {props.region && props.coordinate ? <MapView ref={mapRef} accessibilityLabel="Captain location map" initialRegion={props.region} pitchEnabled={false} rotateEnabled={false} style={StyleSheet.absoluteFillObject}>
      <Marker coordinate={props.coordinate} title="Your location"><View style={styles.captainMarker}><Feather name="navigation" size={19} color={brand.colors.white} /></View></Marker>
    </MapView> : <View style={styles.mapUnavailable}>
      <Feather name="navigation" size={32} color={brand.colors.primary} />
      <Text style={styles.mapUnavailableTitle}>We're updating your location</Text>
      <Text style={styles.mapUnavailableCopy}>The map will centre when your location is ready.</Text>
    </View>}

    <View pointerEvents="box-none" style={[styles.floatingHeader, { top: insets.top + 10 }]}>
      <View style={styles.logoControl}><Image source={require("../../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" /></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Today's earnings ${compactNaira(props.todayEarnings)}`} onPress={() => router.push("/earnings")} style={styles.earningsShortcut}>
        <Text style={styles.shortcutLabel}>TODAY</Text><Text style={styles.shortcutValue}>{compactNaira(props.todayEarnings)}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} style={styles.iconButton}>
        <Feather name="bell" size={21} color={brand.colors.charcoal} />
        {props.unread > 0 ? <View style={styles.unreadBadge}><Text style={styles.unreadText}>{props.unread > 99 ? "99+" : props.unread}</Text></View> : null}
      </Pressable>
    </View>

    <View style={[styles.locationMeta, { top: insets.top + 72 }]}>
      <View style={styles.areaPill}><Feather name="map-pin" size={13} color={brand.colors.charcoal} /><Text style={styles.areaText}>{props.area}</Text></View>
      <View style={styles.locationPill}><View style={[styles.locationDot, props.locationLabel === "Current location" && styles.locationDotCurrent]} /><Text style={styles.locationLabel}>{props.locationLabel}</Text></View>
    </View>

    <Pressable accessibilityRole="button" accessibilityLabel={recentering ? "Locating" : "Recenter map on current location"} accessibilityState={{ disabled: recentering }} disabled={recentering} onPress={() => void recenterMap()} style={[styles.recenterButton, { bottom: noticeBottom + 2 }]}>
      <Feather name="crosshair" size={21} color={brand.colors.primary} />
    </Pressable>

    <View pointerEvents="box-none" style={[styles.noticeStack, { bottom: noticeBottom }]}>
      {props.serviceNotice ? <View style={styles.notice}><Feather name="info" size={15} color="#9A3412" /><Text numberOfLines={2} style={styles.noticeText}>{props.serviceNotice}</Text></View> : null}
      {props.locationMessage ? <Text accessibilityLiveRegion="polite" style={styles.locationMessage}>{props.locationMessage}</Text> : null}
      {props.refreshNotice ? <Pressable accessibilityRole="button" accessibilityLabel="Retry live status update" onPress={props.onRetrySync} style={styles.syncHint}><Feather name="wifi-off" size={14} color={brand.colors.muted} /><Text style={styles.syncHintText}>Reconnecting... Tap to retry.</Text></Pressable> : null}
      {props.message ? <Text accessibilityLiveRegion="polite" style={styles.successText}>{props.message}</Text> : null}
      {props.error ? <Text accessibilityRole="alert" style={styles.errorText}>{props.error}</Text> : null}
    </View>

    <View style={[styles.actionSurface, props.activeDelivery && styles.actionSurfaceExpanded, { bottom: actionBottom }]}>
      {props.activeDelivery ? <>
        <View style={styles.actionHeading}><View style={styles.liveDotOnline} /><Text style={styles.actionEyebrow}>ACTIVE DELIVERY</Text></View>
        <View style={styles.activeWorkRow}><View><Text style={styles.actionTitle}>Continue your delivery</Text><Text style={styles.reference}>{props.activeDelivery.orderNumber}</Text></View><NavLink href={`/jobs/${props.activeDelivery.id}`} label="OPEN" /></View>
      </> : props.online ? <>
        <View style={styles.onlineRow}><View style={styles.actionHeading}><View style={styles.liveDotOnline} /><View><Text style={styles.actionEyebrow}>LOOKING FOR REQUESTS</Text><Text style={styles.actionSupport}>{props.rideEffectiveOnline && props.deliveryEffectiveOnline ? "Ride + Delivery" : props.rideEffectiveOnline ? "Rides" : "Delivery"}</Text></View></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Go offline" accessibilityState={{ disabled: !props.canToggleMaster || props.availabilityUpdating }} disabled={!props.canToggleMaster || props.availabilityUpdating} onPress={props.onToggleMaster} style={[styles.offlineButton, (!props.canToggleMaster || props.availabilityUpdating) && styles.disabled]}><Text style={styles.offlineButtonText}>{props.availabilityUpdating ? "UPDATING..." : "GO OFFLINE"}</Text></Pressable>
        </View>
      </> : <View style={styles.offlineRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${props.statusLabel}. Open work preferences`} onPress={() => setShowPreferences(true)} style={styles.preferencesButton}><Feather name="sliders" size={21} color={brand.colors.charcoal} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Go online" accessibilityState={{ disabled: !props.canToggleMaster || props.availabilityUpdating }} disabled={!props.canToggleMaster || props.availabilityUpdating} onPress={props.onToggleMaster} style={[styles.onlineButton, (!props.canToggleMaster || props.availabilityUpdating) && styles.disabled]}><Text numberOfLines={1} style={styles.onlineButtonText}>{props.availabilityUpdating ? "UPDATING..." : props.availabilityChecking ? "CHECKING AVAILABILITY..." : "GO ONLINE"}</Text></Pressable>
      </View>}
    </View>

    {showPreferences ? <View style={styles.overlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close work preferences" onPress={() => setShowPreferences(false)} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.preferencesSheet, { bottom: navClearance }]}>
        <View style={styles.preferenceHeading}><View><Text style={styles.preferenceTitle}>Work preferences</Text><Text style={styles.preferenceSubtitle}>Choose the requests you want to receive.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close work preferences" onPress={() => setShowPreferences(false)} style={styles.closeButton}><Feather name="x" size={21} color={brand.colors.charcoal} /></Pressable></View>
        <ModeToggle label="Ride" enabled={props.rideDesiredOnline} effective={props.rideEffectiveOnline} active={props.rideActive} disabled={!props.canToggleRide} onPress={props.onToggleRide} />
        <ModeToggle label="Delivery" enabled={props.deliveryDesiredOnline} effective={props.deliveryEffectiveOnline} active={props.deliveryActive} disabled={!props.canToggleDelivery} onPress={props.onToggleDelivery} />
        <View style={styles.areaDetails}><Text style={styles.areaDetailLabel}>Current area</Text><Text style={styles.areaDetailValue}>{props.area}</Text><Text style={styles.areaDetailLabel}>Approved areas</Text><Text style={styles.areaDetailValue}>{props.approvedAreas.length ? props.approvedAreas.join(", ") : "Confirming approved areas"}</Text></View>
      </View>
    </View> : null}
  </View>;
}

const floatingShadow = { shadowColor: "#111827", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 10, elevation: 5 } as const;

const styles = StyleSheet.create({
  cockpit: { backgroundColor: "#E5E7EB", flex: 1, overflow: "hidden" },
  mapSkeleton: { ...StyleSheet.absoluteFillObject, backgroundColor: "#E5E7EB" },
  mapUnavailable: { ...StyleSheet.absoluteFillObject, alignItems: "center", backgroundColor: "#F3F4F6", gap: 8, justifyContent: "center", paddingHorizontal: 48 },
  mapUnavailableTitle: { color: brand.colors.charcoal, fontSize: 18, fontWeight: "900" },
  mapUnavailableCopy: { color: brand.colors.muted, fontSize: 13, textAlign: "center" },
  floatingHeader: { alignItems: "center", flexDirection: "row", height: 48, justifyContent: "space-between", left: 14, position: "absolute", right: 14 },
  logoControl: { ...floatingShadow, alignItems: "center", backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 15, height: 46, justifyContent: "center", width: 86 },
  logo: { height: 34, width: 70 },
  earningsShortcut: { ...floatingShadow, alignItems: "center", backgroundColor: "rgba(255,255,255,0.98)", borderRadius: 15, left: "50%", marginLeft: -50, minHeight: 48, paddingHorizontal: 10, paddingVertical: 6, position: "absolute", width: 100 },
  shortcutLabel: { color: brand.colors.muted, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  shortcutValue: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "900" },
  iconButton: { ...floatingShadow, alignItems: "center", backgroundColor: "rgba(255,255,255,0.98)", borderRadius: 15, height: 46, justifyContent: "center", width: 46 },
  unreadBadge: { alignItems: "center", backgroundColor: brand.colors.primary, borderRadius: 999, minWidth: 19, paddingHorizontal: 4, paddingVertical: 2, position: "absolute", right: -3, top: -3 },
  unreadText: { color: brand.colors.white, fontSize: 9, fontWeight: "900" },
  locationMeta: { gap: 6, left: 14, position: "absolute" },
  areaPill: { ...floatingShadow, alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 999, flexDirection: "row", gap: 5, minHeight: 32, paddingHorizontal: 10 },
  areaText: { color: brand.colors.charcoal, fontSize: 11, fontWeight: "900" },
  locationPill: { ...floatingShadow, alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 999, flexDirection: "row", gap: 6, minHeight: 32, paddingHorizontal: 10 },
  locationDot: { backgroundColor: "#9CA3AF", borderRadius: 999, height: 7, width: 7 },
  locationDotCurrent: { backgroundColor: "#16A34A" },
  locationLabel: { color: brand.colors.charcoal, fontSize: 10.5, fontWeight: "900" },
  recenterButton: { ...floatingShadow, alignItems: "center", backgroundColor: "rgba(255,255,255,0.98)", borderRadius: 999, height: 46, justifyContent: "center", position: "absolute", right: 16, width: 46 },
  captainMarker: { alignItems: "center", backgroundColor: brand.colors.primary, borderColor: brand.colors.white, borderRadius: 999, borderWidth: 3, height: 42, justifyContent: "center", width: 42 },
  noticeStack: { gap: 6, left: 16, position: "absolute", right: 74 },
  notice: { ...floatingShadow, alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(255,247,237,0.98)", borderRadius: 999, flexDirection: "row", gap: 7, minHeight: 36, paddingHorizontal: 11, paddingVertical: 6 },
  noticeText: { color: "#9A3412", flexShrink: 1, fontSize: 11.5, fontWeight: "800", lineHeight: 15 },
  locationMessage: { ...floatingShadow, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 999, color: brand.colors.muted, fontSize: 11, fontWeight: "700", overflow: "hidden", paddingHorizontal: 11, paddingVertical: 8 },
  syncHint: { ...floatingShadow, alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 999, flexDirection: "row", gap: 6, minHeight: 36, paddingHorizontal: 11 },
  syncHintText: { color: brand.colors.muted, fontSize: 11.5, fontWeight: "700" },
  successText: { ...floatingShadow, alignSelf: "flex-start", backgroundColor: "rgba(240,253,244,0.98)", borderRadius: 999, color: "#166534", fontSize: 11.5, fontWeight: "800", overflow: "hidden", paddingHorizontal: 11, paddingVertical: 8 },
  errorText: { ...floatingShadow, alignSelf: "flex-start", backgroundColor: "rgba(254,242,242,0.99)", borderRadius: 14, color: "#991B1B", fontSize: 12, fontWeight: "800", lineHeight: 17, overflow: "hidden", paddingHorizontal: 11, paddingVertical: 9 },
  actionSurface: { ...floatingShadow, backgroundColor: "rgba(255,255,255,0.98)", borderRadius: 22, left: 14, minHeight: 68, padding: 8, position: "absolute", right: 14 },
  actionSurfaceExpanded: { padding: 14 },
  offlineRow: { flexDirection: "row", gap: 8 },
  preferencesButton: { alignItems: "center", backgroundColor: "#F3F4F6", borderRadius: 16, height: 52, justifyContent: "center", width: 52 },
  onlineButton: { alignItems: "center", backgroundColor: brand.colors.primary, borderRadius: 16, flex: 1, height: 52, justifyContent: "center" },
  onlineButtonText: { color: brand.colors.white, fontSize: 14, fontWeight: "900", letterSpacing: 0.8 },
  onlineRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 58, paddingHorizontal: 6 },
  actionHeading: { alignItems: "center", flexDirection: "row", gap: 8 },
  liveDotOnline: { backgroundColor: "#16A34A", borderRadius: 999, height: 9, width: 9 },
  actionEyebrow: { color: brand.colors.charcoal, fontSize: 11, fontWeight: "900", letterSpacing: 0.7 },
  actionSupport: { color: brand.colors.muted, fontSize: 11.5, marginTop: 2 },
  offlineButton: { alignItems: "center", borderColor: brand.colors.border, borderRadius: 14, borderWidth: 1, justifyContent: "center", minHeight: 42, paddingHorizontal: 14 },
  offlineButtonText: { color: brand.colors.charcoal, fontSize: 11, fontWeight: "900" },
  activeWorkRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  actionTitle: { color: brand.colors.charcoal, fontSize: 17, fontWeight: "900" },
  reference: { color: brand.colors.muted, fontSize: 12, fontWeight: "800", marginTop: 3 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(17,24,39,0.28)" },
  preferencesSheet: { ...floatingShadow, backgroundColor: brand.colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, gap: 5, left: 0, padding: 18, position: "absolute", right: 0 },
  preferenceHeading: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  preferenceTitle: { color: brand.colors.charcoal, fontSize: 20, fontWeight: "900" },
  preferenceSubtitle: { color: brand.colors.muted, fontSize: 12, marginTop: 3 },
  closeButton: { alignItems: "center", backgroundColor: "#F3F4F6", borderRadius: 999, height: 38, justifyContent: "center", width: 38 },
  modeRow: { alignItems: "center", borderBottomColor: brand.colors.border, borderBottomWidth: 1, flexDirection: "row", minHeight: 62 },
  modeCopy: { flex: 1, gap: 2 },
  modeTitle: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "900" },
  modeHint: { color: brand.colors.muted, fontSize: 11.5 },
  toggle: { alignItems: "center", backgroundColor: "#E5E7EB", borderRadius: 999, flexDirection: "row", gap: 6, height: 36, justifyContent: "center", minWidth: 72, paddingHorizontal: 8 },
  toggleOn: { backgroundColor: brand.colors.charcoal },
  toggleKnob: { backgroundColor: brand.colors.white, borderRadius: 999, height: 18, width: 18 },
  toggleKnobOn: { backgroundColor: brand.colors.primary },
  toggleText: { color: brand.colors.muted, fontSize: 10, fontWeight: "900" },
  toggleTextOn: { color: brand.colors.white },
  areaDetails: { backgroundColor: "#F9FAFB", borderRadius: 15, gap: 3, marginTop: 9, padding: 12 },
  areaDetailLabel: { color: brand.colors.muted, fontSize: 9.5, fontWeight: "900", letterSpacing: 0.6, marginTop: 3, textTransform: "uppercase" },
  areaDetailValue: { color: brand.colors.charcoal, fontSize: 12.5, fontWeight: "800" },
  disabled: { opacity: 0.48 },
  skeletonEarnings: { backgroundColor: "#D1D5DB", borderRadius: 15, height: 48, left: "50%", marginLeft: -50, position: "absolute", width: 100 },
  skeletonBell: { backgroundColor: "#D1D5DB", borderRadius: 15, height: 46, width: 46 },
  skeletonAction: { ...floatingShadow, backgroundColor: brand.colors.white, borderRadius: 22, gap: 10, left: 14, padding: 16, position: "absolute", right: 14 },
  skeletonTitle: { color: brand.colors.charcoal, fontSize: 16, fontWeight: "900" },
  skeletonLine: { backgroundColor: "#E5E7EB", borderRadius: 999, height: 12, width: "70%" }
});
