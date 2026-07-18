import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { CustomerProfile, customerApi, RetentionSummary } from "../src/api/customer.api";
import { KariGoAppTopBar } from "../src/components/kari-go-app-top-bar";
import { Button, Card, Field, Loading, Message, Protected, Screen, ui } from "../src/components/ui";
import { useAuth } from "../src/contexts/auth-context";
import { friendlyError } from "../src/lib/errors";

type ProfileRoute =
  | "/orders"
  | "/profile/wallet"
  | "/profile/referrals"
  | "/addresses"
  | "/support"
  | "/notifications"
  | "/sme-services/requests"
  | "/utilities/history"
  | "/vendor/apply";

type HubItem = {
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  href: ProfileRoute;
  badge?: string;
};

type PlaceholderItem = {
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  badge: string;
};

const primaryItems: HubItem[] = [
  { title: "Orders", description: "Track active and completed deliveries.", icon: "clipboard", href: "/orders" },
  { title: "KariGO Wallet", description: "View your wallet balance and safe ledger.", icon: "credit-card", href: "/profile/wallet", badge: "View only" },
  { title: "Referral rewards", description: "View and share your KariGO referral code.", icon: "gift", href: "/profile/referrals", badge: "Tracking only" },
  { title: "Saved addresses", description: "Manage home, office and delivery locations.", icon: "map-pin", href: "/addresses" },
  { title: "Notifications", description: "Review order, support and account updates.", icon: "bell", href: "/notifications" },
  { title: "Support centre", description: "Open tickets and get help from KariGO.", icon: "headphones", href: "/support" }
];

const serviceItems: HubItem[] = [
  { title: "SME Services requests", description: "View service request status and updates.", icon: "briefcase", href: "/sme-services/requests" },
  { title: "Utility test history", description: "Review safe Bills & Utilities test records.", icon: "zap", href: "/utilities/history", badge: "Test mode" },
  { title: "Become a KariGO Vendor", description: "Apply to sell through KariGO.", icon: "shopping-bag", href: "/vendor/apply" }
];

const futureItems: PlaceholderItem[] = [
  { title: "KariGO Plus", description: "Subscription perks are a future placeholder, not a live plan.", icon: "star", badge: "Coming soon" },
  { title: "Privacy & security", description: "More account controls and notification preferences will be added later.", icon: "shield", badge: "Planned" }
];

const maxProfilePhotoDataLength = 1900000;

function initialsFor(name: string) {
  const letters = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return letters || "KG";
}

function HubLink({ item }: { item: HubItem }) {
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={item.title}
    onPress={() => router.push(item.href as never)}
    style={styles.hubLink}
  >
    <View style={styles.iconCircle}><Feather name={item.icon} size={18} color={brand.colors.primary} /></View>
    <View style={styles.hubCopy}>
      <View style={styles.hubTitleRow}>
        <Text style={styles.hubTitle}>{item.title}</Text>
        {item.badge ? <Text style={styles.smallBadge}>{item.badge}</Text> : null}
      </View>
      <Text style={styles.hubDescription}>{item.description}</Text>
    </View>
    <Feather name="chevron-right" size={18} color={brand.colors.muted} />
  </Pressable>;
}

function PlaceholderCard({ item }: { item: PlaceholderItem }) {
  return <View style={styles.placeholderCard} accessibilityLabel={`${item.title} ${item.badge}`}>
    <View style={styles.placeholderHeader}>
      <View style={styles.placeholderIcon}><Feather name={item.icon} size={18} color={brand.colors.charcoal} /></View>
      <Text style={styles.placeholderBadge}>{item.badge}</Text>
    </View>
    <Text style={styles.placeholderTitle}>{item.title}</Text>
    <Text style={styles.placeholderText}>{item.description}</Text>
  </View>;
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return <View style={styles.statPill}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>;
}

export default function Profile() {
  const { logout, user } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [retention, setRetention] = useState<RetentionSummary | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);

  useEffect(() => {
    Promise.all([customerApi.profile(), customerApi.retention().catch(() => null)])
      .then(([p, r]) => {
        setProfile(p);
        setRetention(r);
      })
      .catch((e) => setError(friendlyError(e)));
  }, []);

  const displayName = profile?.fullName || user?.fullName || "KariGO Customer";
  const displayPhone = profile?.phoneNumber || user?.phoneNumber || "";
  const displayEmail = profile?.email || user?.email || "";
  const initials = useMemo(() => initialsFor(displayName), [displayName]);

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      setProfile(await customerApi.update({ fullName: profile.fullName, email: profile.email || undefined }));
      setSuccess("Your profile details have been updated.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  async function pickProfilePhoto() {
    if (!profile || photoSaving) return;
    setPhotoSaving(true);
    setError("");
    setSuccess("");
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Please allow photo access to upload a profile photo.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.45,
        base64: true
      });

      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) {
        setError("Unable to read the selected photo. Please try another image.");
        return;
      }

      const mimeType = asset.mimeType ?? "image/jpeg";
      const profilePhotoUrl = `data:${mimeType};base64,${asset.base64}`;
      if (profilePhotoUrl.length > maxProfilePhotoDataLength) {
        setError("Please choose a smaller profile photo.");
        return;
      }

      setProfile(await customerApi.update({ profilePhotoUrl }));
      setSuccess("Profile photo updated.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setPhotoSaving(false);
    }
  }

  async function removeProfilePhoto() {
    if (!profile || photoSaving) return;
    setPhotoSaving(true);
    setError("");
    setSuccess("");
    try {
      setProfile(await customerApi.update({ profilePhotoUrl: null }));
      setSuccess("Profile photo removed.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setPhotoSaving(false);
    }
  }

  if (!profile && !error) return <Loading />;

  return <Protected>
    <KariGoAppTopBar title="Account" rightAction={{ icon: "help-circle", label: "Open support", onPress: () => router.push("/support") }} />
    <Screen topPadding={false}>
      <Message error>{error}</Message>
      <Message>{success}</Message>
      {profile ? <>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            {profile.profilePhotoUrl ? <Image source={{ uri: profile.profilePhotoUrl }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{initials}</Text>}
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>Your KariGO account</Text>
            <Text style={styles.heroTitle}>{displayName}</Text>
            <Text style={styles.heroSubtitle}>Manage your orders, wallet, addresses and support.</Text>
            <View style={styles.contactRow}>
              {displayPhone ? <Text style={styles.contactText}>{displayPhone}</Text> : null}
              {displayEmail ? <Text style={styles.contactText}>{displayEmail}</Text> : <Text style={styles.contactText}>Add your email below</Text>}
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Edit account details" onPress={() => setSuccess("Update your name or email in Account details below.")} style={styles.editButton}>
            <Feather name="edit-3" size={17} color={brand.colors.primary} />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <StatPill label="Orders" value={retention?.totalOrders ?? 0} />
          <StatPill label="Completed" value={retention?.completedOrders ?? 0} />
          <StatPill label="Promos used" value={retention?.promoUsageCount ?? 0} />
        </View>

        <Card>
          <Text style={ui.cardTitle}>Account details</Text>
          <Text style={ui.muted}>Keep your name and email current for receipts, support and service updates.</Text>
          <View style={styles.photoActions}>
            <Button title={photoSaving ? "Updating photo..." : profile.profilePhotoUrl ? "Change profile photo" : "Upload profile photo"} tone="muted" disabled={photoSaving} onPress={pickProfilePhoto} />
            {profile.profilePhotoUrl ? <Button title="Remove photo" tone="muted" disabled={photoSaving} onPress={removeProfilePhoto} /> : null}
          </View>
          <Field
            accessibilityLabel="Full name"
            placeholder="Full name"
            value={profile.fullName}
            onChangeText={(fullName) => setProfile({ ...profile, fullName })}
          />
          <Field
            value={profile.email ?? ""}
            placeholder="Email"
            onChangeText={(email) => setProfile({ ...profile, email })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button title={saving ? "Saving..." : "Save profile"} disabled={saving} onPress={saveProfile} />
        </Card>

        <Card>
          <Text style={ui.cardTitle}>Manage your KariGO</Text>
          <Text style={ui.muted}>Quick access to the things customers use most.</Text>
          {primaryItems.map((item) => <HubLink key={item.title} item={item} />)}
        </Card>

        <Card>
          <Text style={ui.cardTitle}>Services and applications</Text>
          <Text style={ui.muted}>Track services, utility tests and vendor onboarding.</Text>
          {serviceItems.map((item) => <HubLink key={item.title} item={item} />)}
        </Card>

        <Card>
          <Text style={ui.cardTitle}>Coming next</Text>
          <Text style={ui.muted}>These areas are profile placeholders only. Subscription actions are not active, and wallet/referral rewards remain tracking-only.</Text>
          <View style={styles.placeholderGrid}>
            {futureItems.map((item) => <PlaceholderCard key={item.title} item={item} />)}
          </View>
        </Card>

        <Card>
          <Text style={ui.cardTitle}>Need help?</Text>
          <Text style={ui.muted}>Support remains the safest place for account, refund and delivery questions during launch testing.</Text>
          <View style={styles.actionRow}>
            <Button title="Open support centre" tone="muted" onPress={() => router.push("/support")} />
            <Button title="Log out" tone="muted" onPress={async () => { await logout(); router.replace("/auth/login"); }} />
          </View>
        </Card>
      </> : null}
    </Screen>
  </Protected>;
}

const styles = StyleSheet.create({
  actionRow: { gap: 10 },
  avatar: { alignItems: "center", backgroundColor: brand.colors.white, borderRadius: 999, height: 70, justifyContent: "center", overflow: "hidden", width: 70 },
  avatarImage: { height: "100%", width: "100%" },
  avatarText: { color: brand.colors.primary, fontSize: 22, fontWeight: "900" },
  contactRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  contactText: { color: brand.colors.white, fontSize: 13, fontWeight: "700", opacity: 0.92 },
  editButton: { alignItems: "center", backgroundColor: brand.colors.white, borderRadius: 999, height: 38, justifyContent: "center", width: 38 },
  eyebrow: { color: brand.colors.white, fontSize: 12, fontWeight: "900", letterSpacing: 0.7, textTransform: "uppercase" },
  hero: { alignItems: "center", backgroundColor: brand.colors.primary, borderRadius: 28, flexDirection: "row", gap: 14, padding: 18 },
  heroCopy: { flex: 1, gap: 5 },
  heroSubtitle: { color: brand.colors.white, fontSize: 14, lineHeight: 20, opacity: 0.95 },
  heroTitle: { color: brand.colors.white, fontSize: 22, fontWeight: "900", letterSpacing: -0.25 },
  hubCopy: { flex: 1, gap: 3 },
  hubDescription: { color: brand.colors.muted, fontSize: 13, lineHeight: 18 },
  hubLink: { alignItems: "center", borderColor: brand.colors.border, borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 12, padding: 12 },
  hubTitle: { color: brand.colors.charcoal, flexShrink: 1, fontSize: 15, fontWeight: "900" },
  hubTitleRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconCircle: { alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 999, height: 38, justifyContent: "center", width: 38 },
  placeholderBadge: { backgroundColor: "#F3F4F6", borderRadius: 999, color: brand.colors.charcoal, fontSize: 11, fontWeight: "900", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4 },
  placeholderCard: { backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 18, borderWidth: 1, flexBasis: "47%", flexGrow: 1, gap: 8, padding: 12 },
  placeholderGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  placeholderHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  placeholderIcon: { alignItems: "center", backgroundColor: brand.colors.white, borderRadius: 999, height: 34, justifyContent: "center", width: 34 },
  placeholderText: { color: brand.colors.muted, fontSize: 12, lineHeight: 17 },
  placeholderTitle: { color: brand.colors.charcoal, fontSize: 14, fontWeight: "900" },
  photoActions: { gap: 10 },
  smallBadge: { backgroundColor: "#FFF7ED", borderRadius: 999, color: brand.colors.warning, fontSize: 11, fontWeight: "900", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 3 },
  statLabel: { color: brand.colors.muted, fontSize: 11, fontWeight: "800", textAlign: "center" },
  statPill: { alignItems: "center", backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 18, borderWidth: 1, flex: 1, gap: 2, padding: 12 },
  statValue: { color: brand.colors.charcoal, fontSize: 18, fontWeight: "900" },
  statsRow: { flexDirection: "row", gap: 10 }
});
