import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import type { RiderJob } from "../api/jobs.api";
import { NavLink, Screen } from "./ui";

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
  statusLabel: string;
  online: boolean;
  rideActive: boolean;
  deliveryActive: boolean;
  rideOnline: boolean;
  deliveryOnline: boolean;
  canToggleMaster: boolean;
  canToggleRide: boolean;
  canToggleDelivery: boolean;
  availabilityUpdating: boolean;
  todayEarnings: string | number;
  completedJobs: number;
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

function ModeToggle({ label, enabled, active, disabled, onPress }: { label: string; enabled: boolean; active: boolean; disabled: boolean; onPress: () => void }) {
  return <View style={styles.modeRow}>
    <View style={styles.modeCopy}>
      <Text style={styles.modeTitle}>{label}</Text>
      <Text style={styles.modeHint}>{active ? enabled ? "Receiving requests" : "Not receiving requests" : "Activation pending"}</Text>
    </View>
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={`${label} work preference`}
      accessibilityState={{ checked: enabled, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.toggle, enabled && styles.toggleOn, disabled && styles.disabled]}
    >
      <View style={[styles.toggleKnob, enabled && styles.toggleKnobOn]} />
      <Text style={[styles.toggleText, enabled && styles.toggleTextOn]}>{enabled ? "ON" : "OFF"}</Text>
    </Pressable>
  </View>;
}

export function CaptainHomeSkeleton({ captainName }: { captainName: string }) {
  return <Screen>
    <View style={styles.mapStage}>
      <View style={styles.mapSkeleton} />
      <View style={styles.floatingHeader}>
        <Image source={require("../../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" />
        <View style={styles.skeletonChip} />
      </View>
      <View style={styles.areaPill}><Feather name="map-pin" size={15} color={brand.colors.charcoal} /><Text style={styles.areaText}>Finding your location</Text></View>
    </View>
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <Text style={styles.eyebrow}>WELCOME, {captainName.toUpperCase()}</Text>
      <Text style={styles.sheetTitle}>Getting you ready...</Text>
      <Text style={styles.body}>Checking your work status and latest assignment.</Text>
      <View style={styles.skeletonLine} /><View style={[styles.skeletonLine, styles.skeletonLineShort]} />
    </View>
  </Screen>;
}

export function CaptainHomeCockpit(props: Props) {
  const [showPreferences, setShowPreferences] = useState(false);
  const [recentering, setRecentering] = useState(false);
  const mapRef = useRef<MapView | null>(null);
  const firstFreshLocationCenteredRef = useRef(false);
  const modeLabel = props.rideOnline && props.deliveryOnline ? "Ride + Delivery" : props.rideOnline ? "Rides" : props.deliveryOnline ? "Delivery" : "Offline";

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

  return <Screen refreshing={props.loading} onRefresh={props.onRetrySync}>
    <View style={styles.mapStage}>
      {props.region && props.coordinate ? <MapView
        ref={mapRef}
        accessibilityLabel="Captain location map"
        initialRegion={props.region}
        pitchEnabled={false}
        rotateEnabled={false}
        style={styles.map}
      >
        <Marker coordinate={props.coordinate} title="Your location">
          <View style={styles.captainMarker}><Feather name="navigation" size={19} color={brand.colors.white} /></View>
        </Marker>
      </MapView> : <View style={styles.mapUnavailable}>
        <Feather name="navigation" size={32} color={brand.colors.primary} />
        <Text style={styles.mapUnavailableTitle}>We're updating your location</Text>
        <Text style={styles.body}>The map will centre automatically when your location is ready.</Text>
      </View>}

      <View style={styles.floatingHeader}>
        <Image source={require("../../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" />
        <View style={styles.headerActions}>
          <View accessibilityLabel={props.statusLabel} style={styles.headerStatus}>
            <View style={[styles.headerStatusDot, props.online ? styles.liveDotOnline : styles.liveDotOffline]} />
            <Text style={styles.headerStatusText}>{props.online ? "ONLINE" : "OFFLINE"}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Today's earnings ${compactNaira(props.todayEarnings)}`} onPress={() => router.push("/earnings")} style={styles.earningsShortcut}>
            <Text style={styles.shortcutLabel}>TODAY</Text><Text style={styles.shortcutValue}>{compactNaira(props.todayEarnings)}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} style={styles.iconButton}>
            <Feather name="bell" size={21} color={brand.colors.charcoal} />
            {props.unread > 0 ? <View style={styles.unreadBadge}><Text style={styles.unreadText}>{props.unread > 99 ? "99+" : props.unread}</Text></View> : null}
          </Pressable>
        </View>
      </View>

      <View style={styles.mapBottomOverlay}>
        <View style={styles.locationMeta}>
          <View style={styles.areaPill}><Feather name="map-pin" size={15} color={brand.colors.charcoal} /><Text style={styles.areaText}>{props.area}</Text></View>
          <View style={styles.locationPill}><View style={[styles.locationDot, props.locationLabel === "Current location" && styles.locationDotCurrent]} /><Text style={styles.locationLabel}>{props.locationLabel}</Text></View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={recentering ? "Locating" : "Recenter map on current location"} accessibilityState={{ disabled: recentering }} disabled={recentering} onPress={() => void recenterMap()} style={styles.recenterButton}>
          <Feather name="crosshair" size={21} color={brand.colors.primary} />
        </Pressable>
      </View>
    </View>

    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <Pressable accessibilityRole="button" accessibilityLabel={`${props.statusLabel}. Open work preferences`} onPress={() => setShowPreferences((value) => !value)} style={styles.masterStatusRow}>
        <View style={[styles.liveDot, props.online ? styles.liveDotOnline : styles.liveDotOffline]} />
        <Text style={styles.masterStatus}>{props.statusLabel}</Text>
        <Feather name={showPreferences ? "chevron-down" : "sliders"} size={20} color={brand.colors.charcoal} />
      </Pressable>

      {props.activeDelivery ? <View style={styles.activeWork}>
        <Text style={styles.eyebrow}>ACTIVE DELIVERY</Text>
        <Text style={styles.sheetTitle}>Continue your delivery</Text>
        <Text style={styles.reference}>{props.activeDelivery.orderNumber}</Text>
        <NavLink href={`/jobs/${props.activeDelivery.id}`} label="OPEN DELIVERY WORKSPACE" />
      </View> : props.online ? <>
        <Text style={styles.sheetTitle}>Looking for requests...</Text>
        <Text style={styles.body}>You're online for {modeLabel}. New work appears here automatically.</Text>
        <View style={styles.metrics}>
          <View style={styles.metric}><Text style={styles.metricLabel}>TODAY'S EARNINGS</Text><Text style={styles.metricValue}>{compactNaira(props.todayEarnings)}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>COMPLETED JOBS</Text><Text style={styles.metricValue}>{props.completedJobs}</Text></View>
        </View>
      </> : <>
        <Text style={styles.sheetTitle}>Go online when you're ready to work.</Text>
        <Text style={styles.body}>Your map stays current while the app is open. Open work preferences to choose Ride, Delivery, or both.</Text>
      </>}

      {showPreferences ? <View style={styles.preferences}>
        <View style={styles.preferenceHeading}><Text style={styles.preferenceTitle}>Work preferences</Text><Text style={styles.areaInline}>{props.area}</Text></View>
        <ModeToggle label="Ride" enabled={props.rideOnline} active={props.rideActive} disabled={!props.canToggleRide} onPress={props.onToggleRide} />
        <ModeToggle label="Delivery" enabled={props.deliveryOnline} active={props.deliveryActive} disabled={!props.canToggleDelivery} onPress={props.onToggleDelivery} />
      </View> : null}

      {props.locationMessage ? <Text accessibilityLiveRegion="polite" style={styles.locationMessage}>{props.locationMessage}</Text> : null}
      {props.serviceNotice ? <View style={styles.notice}><Feather name="info" size={16} color="#9A3412" /><Text style={styles.noticeText}>{props.serviceNotice}</Text></View> : null}
      {props.refreshNotice ? <Pressable accessibilityRole="button" accessibilityLabel="Retry live status update" onPress={props.onRetrySync} style={styles.syncHint}><Feather name="wifi-off" size={15} color={brand.colors.muted} /><Text style={styles.syncHintText}>Reconnecting... Tap to retry.</Text></Pressable> : null}
      {props.message ? <Text accessibilityLiveRegion="polite" style={styles.successText}>{props.message}</Text> : null}
      {props.error ? <Text accessibilityRole="alert" style={styles.errorText}>{props.error}</Text> : null}

      {!props.activeDelivery ? <Pressable accessibilityRole="button" accessibilityLabel={props.online ? "Go offline" : "Go online"} accessibilityState={{ disabled: !props.canToggleMaster || props.availabilityUpdating }} disabled={!props.canToggleMaster || props.availabilityUpdating} onPress={props.onToggleMaster} style={[styles.masterButton, props.online && styles.masterButtonOffline, (!props.canToggleMaster || props.availabilityUpdating) && styles.disabled]}>
        <Text style={[styles.masterButtonText, props.online && styles.masterButtonOfflineText]}>{props.availabilityUpdating ? "UPDATING..." : props.online ? "GO OFFLINE" : "GO ONLINE"}</Text>
      </Pressable> : null}
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  mapStage: { backgroundColor: "#E5E7EB", height: 520, marginHorizontal: -20, marginTop: -28, overflow: "hidden", position: "relative" },
  map: { height: "100%", width: "100%" },
  mapSkeleton: { backgroundColor: "#E5E7EB", height: "100%", width: "100%" },
  mapUnavailable: { alignItems: "center", backgroundColor: "#F3F4F6", flex: 1, gap: 8, justifyContent: "center", paddingHorizontal: 48 },
  mapUnavailableTitle: { color: brand.colors.charcoal, fontSize: 18, fontWeight: "900" },
  floatingHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", left: 16, position: "absolute", right: 16, top: 18 },
  logo: { backgroundColor: "rgba(255,255,255,0.96)", borderRadius: 15, height: 46, paddingHorizontal: 8, width: 86 },
  headerActions: { alignItems: "center", flexDirection: "row", gap: 6 },
  headerStatus: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 999, flexDirection: "row", gap: 5, minHeight: 36, paddingHorizontal: 8 },
  headerStatusDot: { borderRadius: 999, height: 7, width: 7 },
  headerStatusText: { color: brand.colors.charcoal, fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  earningsShortcut: { backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 15, minHeight: 46, minWidth: 78, paddingHorizontal: 8, paddingVertical: 7 },
  shortcutLabel: { color: brand.colors.muted, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  shortcutValue: { color: brand.colors.charcoal, fontSize: 14, fontWeight: "900" },
  iconButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 15, height: 46, justifyContent: "center", width: 44 },
  unreadBadge: { alignItems: "center", backgroundColor: brand.colors.primary, borderRadius: 999, minWidth: 19, paddingHorizontal: 4, paddingVertical: 2, position: "absolute", right: -3, top: -3 },
  unreadText: { color: brand.colors.white, fontSize: 9, fontWeight: "900" },
  mapBottomOverlay: { alignItems: "flex-end", bottom: 92, flexDirection: "row", justifyContent: "space-between", left: 16, position: "absolute", right: 16 },
  locationMeta: { gap: 7 },
  areaPill: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 999, flexDirection: "row", gap: 6, minHeight: 38, paddingHorizontal: 12 },
  areaText: { color: brand.colors.charcoal, fontSize: 12, fontWeight: "900" },
  locationPill: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 999, flexDirection: "row", gap: 6, minHeight: 36, paddingHorizontal: 11 },
  locationDot: { backgroundColor: "#9CA3AF", borderRadius: 999, height: 7, width: 7 },
  locationDotCurrent: { backgroundColor: "#16A34A" },
  locationLabel: { color: brand.colors.charcoal, fontSize: 11, fontWeight: "900" },
  recenterButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 999, height: 46, justifyContent: "center", width: 46 },
  captainMarker: { alignItems: "center", backgroundColor: brand.colors.primary, borderColor: brand.colors.white, borderRadius: 999, borderWidth: 3, height: 42, justifyContent: "center", width: 42 },
  sheet: { backgroundColor: brand.colors.white, borderRadius: 28, gap: 11, marginTop: -72, padding: 18, shadowColor: "#111827", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16 },
  sheetHandle: { alignSelf: "center", backgroundColor: "#D1D5DB", borderRadius: 999, height: 4, marginBottom: 2, width: 42 },
  masterStatusRow: { alignItems: "center", flexDirection: "row", gap: 9, minHeight: 44 },
  liveDot: { borderRadius: 999, height: 10, width: 10 },
  liveDotOnline: { backgroundColor: "#16A34A" },
  liveDotOffline: { backgroundColor: "#6B7280" },
  masterStatus: { color: brand.colors.charcoal, flex: 1, fontSize: 13, fontWeight: "900", letterSpacing: 0.7 },
  eyebrow: { color: brand.colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 1.1 },
  sheetTitle: { color: brand.colors.charcoal, fontSize: 22, fontWeight: "900", letterSpacing: -0.3 },
  body: { color: brand.colors.muted, fontSize: 13.5, lineHeight: 19 },
  activeWork: { gap: 7 },
  reference: { color: brand.colors.charcoal, fontWeight: "900" },
  metrics: { flexDirection: "row", gap: 8 },
  metric: { backgroundColor: "#F9FAFB", borderRadius: 15, flex: 1, gap: 3, padding: 11 },
  metricLabel: { color: brand.colors.muted, fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  metricValue: { color: brand.colors.charcoal, fontSize: 17, fontWeight: "900" },
  preferences: { borderTopColor: brand.colors.border, borderTopWidth: 1, gap: 2, paddingTop: 8 },
  preferenceHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  preferenceTitle: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "900" },
  areaInline: { color: brand.colors.muted, fontSize: 12, fontWeight: "800" },
  modeRow: { alignItems: "center", flexDirection: "row", minHeight: 58 },
  modeCopy: { flex: 1, gap: 2 },
  modeTitle: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "900" },
  modeHint: { color: brand.colors.muted, fontSize: 11.5 },
  toggle: { alignItems: "center", backgroundColor: "#E5E7EB", borderRadius: 999, flexDirection: "row", gap: 6, height: 36, justifyContent: "center", minWidth: 72, paddingHorizontal: 8 },
  toggleOn: { backgroundColor: brand.colors.charcoal },
  toggleKnob: { backgroundColor: brand.colors.white, borderRadius: 999, height: 18, width: 18 },
  toggleKnobOn: { backgroundColor: brand.colors.primary },
  toggleText: { color: brand.colors.muted, fontSize: 10, fontWeight: "900" },
  toggleTextOn: { color: brand.colors.white },
  notice: { alignItems: "flex-start", backgroundColor: "#FFF7ED", borderRadius: 12, flexDirection: "row", gap: 8, padding: 10 },
  noticeText: { color: "#9A3412", flex: 1, fontSize: 12, fontWeight: "700", lineHeight: 17 },
  locationMessage: { color: brand.colors.muted, fontSize: 11.5, fontWeight: "700", lineHeight: 17 },
  syncHint: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 6, minHeight: 36 },
  syncHintText: { color: brand.colors.muted, fontSize: 12, fontWeight: "700" },
  successText: { color: "#166534", fontSize: 12, fontWeight: "800" },
  errorText: { color: "#991B1B", fontSize: 12, fontWeight: "800", lineHeight: 17 },
  masterButton: { alignItems: "center", backgroundColor: brand.colors.primary, borderRadius: 16, justifyContent: "center", minHeight: 54 },
  masterButtonOffline: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderWidth: 1 },
  masterButtonText: { color: brand.colors.white, fontSize: 14, fontWeight: "900", letterSpacing: 0.7 },
  masterButtonOfflineText: { color: brand.colors.charcoal },
  disabled: { opacity: 0.48 },
  skeletonChip: { backgroundColor: "#D1D5DB", borderRadius: 14, height: 48, width: 110 },
  skeletonLine: { backgroundColor: "#E5E7EB", borderRadius: 999, height: 12, width: "100%" },
  skeletonLineShort: { width: "62%" }
});
