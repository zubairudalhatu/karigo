import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text } from "react-native";
import { partnerApi, PartnerOnboardingState, PartnerProfile, PartnerProfileUpdateInput } from "../../src/api/partner.api";
import { AuthGate } from "../../src/components/auth-gate";
import { Card, Hero, LoadingState, MutedText, PrimaryButton, Screen, TextField } from "../../src/components/ui";
import { pickAndUploadImage } from "../../src/lib/upload-pickers";

interface ProfileFormState {
  businessName: string;
  description: string;
  phoneNumber: string;
  email: string;
  address: string;
  city: string;
  state: string;
  openingTime: string;
  closingTime: string;
  logoUrl: string;
  coverImageUrl: string;
}

function profileToForm(profile: PartnerProfile): ProfileFormState {
  return {
    businessName: profile.businessName ?? "",
    description: profile.description ?? "",
    phoneNumber: profile.phoneNumber ?? "",
    email: profile.email ?? "",
    address: profile.address ?? "",
    city: profile.city ?? "",
    state: profile.state ?? "",
    openingTime: profile.openingTime ?? "",
    closingTime: profile.closingTime ?? "",
    logoUrl: profile.logoUrl ?? "",
    coverImageUrl: profile.coverImageUrl ?? ""
  };
}

const clean = (value: string) => value.trim() || undefined;

function toPayload(form: ProfileFormState): PartnerProfileUpdateInput {
  return {
    businessName: clean(form.businessName),
    description: clean(form.description),
    phoneNumber: clean(form.phoneNumber),
    email: clean(form.email),
    address: clean(form.address),
    city: clean(form.city),
    state: clean(form.state),
    openingTime: clean(form.openingTime),
    closingTime: clean(form.closingTime),
    logoUrl: clean(form.logoUrl),
    coverImageUrl: clean(form.coverImageUrl)
  };
}

function EditProfileContent() {
  const router = useRouter();
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [partnerState, setPartnerState] = useState<PartnerOnboardingState | null>(null);
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const onboardingState = await partnerApi.onboardingState();
      setPartnerState(onboardingState);
      if (onboardingState.state !== "approved") {
        setProfile(null);
        setForm(null);
        return;
      }
      const nextProfile = await partnerApi.profile();
      setProfile(nextProfile);
      setForm(profileToForm(nextProfile));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Partner profile could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    if (!form) return;
    if (form.businessName.trim().length < 2) {
      setError("Business name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updatedProfile = await partnerApi.updateProfile(toPayload(form));
      setProfile(updatedProfile);
      setForm(profileToForm(updatedProfile));
      setMessage("Partner profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Partner profile could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadBrandImage(kind: "logo" | "cover") {
    if (!form) return;
    const setBusy = kind === "logo" ? setUploadingLogo : setUploadingCover;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const uploaded = await pickAndUploadImage(kind);
      if (uploaded) {
        setForm(kind === "logo" ? { ...form, logoUrl: uploaded.url } : { ...form, coverImageUrl: uploaded.url });
        setMessage(`${kind === "logo" ? "Logo" : "Cover image"} uploaded. Save profile to keep it.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `${kind === "logo" ? "Logo" : "Cover image"} could not be uploaded.`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Loading partner profile..." />;

  if (partnerState?.state && partnerState.state !== "approved") {
    const canContinue = ["application_not_started", "application_in_progress", "correction_required"].includes(partnerState.state);
    return (
      <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
        <Hero eyebrow="Partner application" title="Partner profile editing is not active yet" subtitle={partnerState.message} />
        <Card>
          <MutedText>
            KariGO opens profile editing after Operations approves the Partner application. This account can continue or view the current application state instead.
          </MutedText>
          {partnerState.correctionNote ? <MutedText>{partnerState.correctionNote}</MutedText> : null}
          {canContinue ? <PrimaryButton label={partnerState.state === "correction_required" ? "Update requested information" : "Continue application"} onPress={() => router.replace("/register")} /> : null}
          <PrimaryButton label="Back to Partner home" onPress={() => router.replace("/")} variant="secondary" />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
      <Hero eyebrow="Profile" title="Edit partner profile" subtitle="Keep your public business details clean for KariGO review and customer-facing surfaces." />
      {error ? <MutedText>{error}</MutedText> : null}
      {message ? <MutedText>{message}</MutedText> : null}
      {form ? (
        <Card>
          <TextField label="Business name" value={form.businessName} onChangeText={(businessName) => setForm({ ...form, businessName })} />
          <TextField
            label="Description"
            value={form.description}
            multiline
            onChangeText={(description) => setForm({ ...form, description })}
            style={styles.multiline}
          />
          <TextField label="Phone number" value={form.phoneNumber} keyboardType="phone-pad" onChangeText={(phoneNumber) => setForm({ ...form, phoneNumber })} />
          <TextField label="Email" value={form.email} autoCapitalize="none" keyboardType="email-address" onChangeText={(email) => setForm({ ...form, email })} />
          <TextField label="Address" value={form.address} onChangeText={(address) => setForm({ ...form, address })} />
          <TextField label="City" value={form.city} onChangeText={(city) => setForm({ ...form, city })} />
          <TextField label="State" value={form.state} onChangeText={(state) => setForm({ ...form, state })} />
          <TextField label="Opening time" placeholder="08:00" value={form.openingTime} onChangeText={(openingTime) => setForm({ ...form, openingTime })} />
          <TextField label="Closing time" placeholder="21:00" value={form.closingTime} onChangeText={(closingTime) => setForm({ ...form, closingTime })} />
          <TextField label="Logo URL" placeholder="https://..." value={form.logoUrl} autoCapitalize="none" onChangeText={(logoUrl) => setForm({ ...form, logoUrl })} />
          <PrimaryButton
            label={uploadingLogo ? "Uploading logo..." : "Upload logo"}
            onPress={() => void uploadBrandImage("logo")}
            disabled={uploadingLogo || saving}
            variant="secondary"
          />
          <TextField label="Cover image URL" placeholder="https://..." value={form.coverImageUrl} autoCapitalize="none" onChangeText={(coverImageUrl) => setForm({ ...form, coverImageUrl })} />
          <PrimaryButton
            label={uploadingCover ? "Uploading cover..." : "Upload cover image"}
            onPress={() => void uploadBrandImage("cover")}
            disabled={uploadingCover || saving}
            variant="secondary"
          />
          <MutedText>Choose logo and cover images from your device or paste approved HTTPS URLs. Save profile after upload to keep the new branding.</MutedText>
          <PrimaryButton label={saving ? "Saving..." : "Save profile"} onPress={() => void submit()} disabled={saving} />
          <PrimaryButton label="Back to profile" onPress={() => router.replace("/profile")} variant="secondary" disabled={saving} />
        </Card>
      ) : (
        <Card>
          <Text style={styles.emptyTitle}>Partner profile not active yet</Text>
          <MutedText>Profile editing opens after KariGO Operations approves the Partner application.</MutedText>
          <PrimaryButton label="Back to Partner home" onPress={() => router.replace("/")} variant="secondary" />
        </Card>
      )}
    </Screen>
  );
}

export default function EditProfileScreen() {
  return (
    <AuthGate>
      <EditProfileContent />
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  multiline: {
    minHeight: 96,
    textAlignVertical: "top"
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "900"
  }
});
