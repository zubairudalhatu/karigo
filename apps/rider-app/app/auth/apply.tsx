import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { brand } from "@karigo/config";
import {
  deliveryCaptainApplicationsApi,
  DeliveryCaptainVehicleType
} from "../../src/api/delivery-captain-applications.api";
import { Button, Card, Field, Message, Screen, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";
import { normalizeNigerianPhoneNumber } from "../../src/lib/phone";

const vehicleOptions: Array<{ label: string; value: DeliveryCaptainVehicleType }> = [
  { label: "Motorcycle", value: "MOTORCYCLE" },
  { label: "Bicycle", value: "BICYCLE" },
  { label: "Tricycle", value: "TRICYCLE" },
  { label: "Car", value: "CAR" },
  { label: "Van", value: "VAN" },
  { label: "Other", value: "OTHER" }
];

const initialForm = {
  fullName: "",
  phoneNumber: "",
  email: "",
  city: "Kano",
  state: "Kano",
  address: "",
  preferredZone: "",
  vehicleType: "MOTORCYCLE" as DeliveryCaptainVehicleType,
  vehiclePlateNumber: "",
  licenceNumber: "",
  profilePhotoUrl: "",
  licenceImageUrl: "",
  vehicleParticularsUrl: "",
  insuranceDocumentUrl: "",
  riderExperience: "",
  deliveryCaptainInterest: true,
  rideCaptainReviewInterest: false,
  guarantorName: "",
  guarantorPhone: "",
  confirmed: false
};

function ToggleRow({ label, checked, onPress, helper }: { label: string; checked: boolean; onPress: () => void; helper?: string }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} style={styles.toggleRow}>
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}><Text style={styles.checkboxMark}>{checked ? "OK" : ""}</Text></View>
    <View style={styles.toggleText}>
      <Text style={styles.toggleLabel}>{label}</Text>
      {helper ? <Text style={ui.muted}>{helper}</Text> : null}
    </View>
  </Pressable>;
}

function isSecureImageUrl(value: string) {
  return !value.trim() || /^https:\/\/.+\.(png|jpe?g|webp)(\?.*)?$/i.test(value.trim());
}

function isSecureDocumentUrl(value: string) {
  return !value.trim() || /^https:\/\/.+/i.test(value.trim());
}

function documentPayload(form: typeof initialForm) {
  return [
    form.licenceImageUrl.trim() ? {
      documentType: "DRIVER_LICENCE_IMAGE",
      documentName: "Driver licence image",
      documentUrl: form.licenceImageUrl.trim()
    } : null,
    form.vehicleParticularsUrl.trim() ? {
      documentType: "VEHICLE_PARTICULARS",
      documentName: "Vehicle particulars",
      documentUrl: form.vehicleParticularsUrl.trim()
    } : null,
    form.insuranceDocumentUrl.trim() ? {
      documentType: "INSURANCE_DOCUMENT",
      documentName: "Insurance document",
      documentUrl: form.insuranceDocumentUrl.trim()
    } : null
  ].filter((document): document is { documentType: string; documentName: string; documentUrl: string } => Boolean(document));
}

export default function CaptainApplication() {
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setSuccess("");
    setError("");
    try {
      if (!form.confirmed) throw new Error("Please confirm that the information provided is accurate.");
      if (!isSecureImageUrl(form.profilePhotoUrl)) throw new Error("Profile photo must be a secure image URL ending in PNG, JPG, JPEG or WEBP.");
      if (![form.licenceImageUrl, form.vehicleParticularsUrl, form.insuranceDocumentUrl].every(isSecureDocumentUrl)) {
        throw new Error("Document links must be secure HTTPS links.");
      }

      const notes = [
        `Delivery Captain interest: ${form.deliveryCaptainInterest ? "Yes" : "No"}`,
        `Ride Captain review interest: ${form.rideCaptainReviewInterest ? "Yes" : "No"}`,
        form.licenceNumber.trim() ? `Driver licence number: ${form.licenceNumber.trim()}` : "Driver licence number: Not provided",
        !form.address.trim() ? "Address not provided in app application; collect during review." : ""
      ].filter(Boolean).join("\n");

      await deliveryCaptainApplicationsApi.submit({
        fullName: form.fullName,
        phoneNumber: normalizeNigerianPhoneNumber(form.phoneNumber),
        email: form.email || undefined,
        city: form.city,
        state: form.state,
        address: form.address.trim() || "Not provided in Captain app application; collect during review.",
        preferredZone: form.preferredZone || undefined,
        vehicleType: form.vehicleType,
        vehiclePlateNumber: form.vehiclePlateNumber || undefined,
        riderExperience: form.riderExperience || undefined,
        profilePhotoUrl: form.profilePhotoUrl || undefined,
        documents: documentPayload(form),
        guarantorName: form.guarantorName,
        guarantorPhone: normalizeNigerianPhoneNumber(form.guarantorPhone),
        notes,
        declarationAccepted: form.confirmed,
        privacyAccepted: form.confirmed,
        contactConsentAccepted: form.confirmed
      });
      setSuccess("Your Captain application has been submitted. KariGO will review your details and contact you with the next steps.");
      setForm(initialForm);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = Boolean(form.fullName.trim() && form.phoneNumber.trim() && form.city.trim() && form.state.trim() && form.address.trim() && form.guarantorName.trim() && form.guarantorPhone.trim() && form.confirmed);

  return <Screen title="Apply to become a Captain" subtitle="Submit your Delivery Captain application for Kano or Abuja launch review. Approval is not automatic.">
    <Card tone="soft">
      <Image source={require("../../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" />
      <Text style={ui.sectionTitle}>Captain application</Text>
      <Text style={ui.pageIntro}>This creates a review record only. It does not activate dispatch, payouts, live rides or a Captain login account.</Text>
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Personal details</Text>
      <Field placeholder="Full name" value={form.fullName} onChangeText={(fullName) => setForm({ ...form, fullName })} />
      <Field placeholder="Phone number e.g. 080..." keyboardType="phone-pad" value={form.phoneNumber} onChangeText={(phoneNumber) => setForm({ ...form, phoneNumber })} />
      <Field placeholder="Email optional" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(email) => setForm({ ...form, email })} />
      <Field placeholder="City (Kano or Abuja)" value={form.city} onChangeText={(city) => setForm({ ...form, city })} />
      <Field placeholder="State (Kano or FCT)" value={form.state} onChangeText={(state) => setForm({ ...form, state })} />
      <Field placeholder="Residential address required" multiline value={form.address} onChangeText={(address) => setForm({ ...form, address })} />
      <Field placeholder="Preferred launch zone optional" value={form.preferredZone} onChangeText={(preferredZone) => setForm({ ...form, preferredZone })} />
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Vehicle and documents</Text>
      <Text style={ui.muted}>Vehicle type</Text>
      <View style={styles.chipGrid}>
        {vehicleOptions.map((option) => <Pressable key={option.value} accessibilityRole="button" onPress={() => setForm({ ...form, vehicleType: option.value })} style={[styles.chip, form.vehicleType === option.value && styles.chipActive]}>
          <Text style={[styles.chipText, form.vehicleType === option.value && styles.chipTextActive]}>{option.label}</Text>
        </Pressable>)}
      </View>
      <Field placeholder="Vehicle plate number optional" value={form.vehiclePlateNumber} onChangeText={(vehiclePlateNumber) => setForm({ ...form, vehiclePlateNumber })} />
      <Field placeholder="Driver licence number optional" value={form.licenceNumber} onChangeText={(licenceNumber) => setForm({ ...form, licenceNumber })} />
      <Field placeholder="Delivery experience note optional" multiline value={form.riderExperience} onChangeText={(riderExperience) => setForm({ ...form, riderExperience })} />
      <Field placeholder="Profile photo URL optional" autoCapitalize="none" value={form.profilePhotoUrl} onChangeText={(profilePhotoUrl) => setForm({ ...form, profilePhotoUrl })} />
      {isSecureImageUrl(form.profilePhotoUrl) && form.profilePhotoUrl.trim() ? <Image source={{ uri: form.profilePhotoUrl.trim() }} style={styles.preview} /> : null}
      <Field placeholder="Driver licence image HTTPS link optional" autoCapitalize="none" value={form.licenceImageUrl} onChangeText={(licenceImageUrl) => setForm({ ...form, licenceImageUrl })} />
      <Field placeholder="Vehicle particulars HTTPS link optional" autoCapitalize="none" value={form.vehicleParticularsUrl} onChangeText={(vehicleParticularsUrl) => setForm({ ...form, vehicleParticularsUrl })} />
      <Field placeholder="Insurance document HTTPS link optional" autoCapitalize="none" value={form.insuranceDocumentUrl} onChangeText={(insuranceDocumentUrl) => setForm({ ...form, insuranceDocumentUrl })} />
      <Text style={ui.muted}>KariGO will review document evidence before approving any Captain account. Do not upload passwords, OTPs or payment details.</Text>
      <ToggleRow label="Delivery Captain interest" checked={form.deliveryCaptainInterest} onPress={() => setForm({ ...form, deliveryCaptainInterest: !form.deliveryCaptainInterest })} helper="Delivery assignments are the approved active mode." />
      <ToggleRow label="Ride Captain review interest" checked={form.rideCaptainReviewInterest} onPress={() => setForm({ ...form, rideCaptainReviewInterest: !form.rideCaptainReviewInterest })} helper="KariGO Rides requires separate operations approval before dispatch activation." />
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Guarantor</Text>
      <Field placeholder="Guarantor name" value={form.guarantorName} onChangeText={(guarantorName) => setForm({ ...form, guarantorName })} />
      <Field placeholder="Guarantor phone e.g. 080..." keyboardType="phone-pad" value={form.guarantorPhone} onChangeText={(guarantorPhone) => setForm({ ...form, guarantorPhone })} />
    </Card>

    <Card>
      <ToggleRow
        label="I confirm that the information provided is accurate."
        checked={form.confirmed}
        onPress={() => setForm({ ...form, confirmed: !form.confirmed })}
        helper="KariGO may contact me or my guarantor for application review. Do not share OTPs or payment details."
      />
      <Message>{success}</Message>
      <Message error>{error}</Message>
      <Button title={busy ? "Submitting..." : "Submit Captain application"} disabled={busy || !canSubmit} onPress={submit} />
      <Link href="/auth/login" style={styles.loginLink}>Already approved? Sign in</Link>
    </Card>
  </Screen>;
}

const styles = StyleSheet.create({
  logo: { height: 44, width: 150 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderColor: brand.colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  chipText: { color: brand.colors.muted, fontWeight: "800" },
  chipTextActive: { color: brand.colors.primaryDark },
  preview: { alignSelf: "flex-start", borderRadius: 18, height: 84, width: 84 },
  toggleRow: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  checkbox: { alignItems: "center", borderColor: brand.colors.border, borderRadius: 8, borderWidth: 1, height: 26, justifyContent: "center", marginTop: 1, width: 26 },
  checkboxChecked: { backgroundColor: brand.colors.primary, borderColor: brand.colors.primary },
  checkboxMark: { color: brand.colors.white, fontWeight: "900" },
  toggleText: { flex: 1, gap: 2 },
  toggleLabel: { color: brand.colors.charcoal, fontWeight: "900" },
  loginLink: { color: brand.colors.primary, fontWeight: "900", paddingVertical: 6, textAlign: "center" }
});
