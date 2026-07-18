import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { TaxiVehicleOwnership, TaxiVehicleType } from "@karigo/shared-types";
import { brand } from "@karigo/config";
import {
  applicantOnboardingApi,
  ApplicantOnboardingResult
} from "../../src/api/applicant-onboarding.api";
import {
  deliveryCaptainApplicationsApi,
  DeliveryCaptainVehicleType
} from "../../src/api/delivery-captain-applications.api";
import { taxiApi } from "../../src/api/taxi.api";
import { Button, Card, Field, Message, PasswordField, Screen, ui } from "../../src/components/ui";
import { friendlyError } from "../../src/lib/errors";
import { normalizeNigerianPhoneNumber } from "../../src/lib/phone";

type AccountStep = "ACCOUNT" | "OTP" | "PASSWORD" | "APPLICATION";

const deliveryVehicleOptions: Array<{ label: string; value: DeliveryCaptainVehicleType }> = [
  { label: "Motorcycle", value: "MOTORCYCLE" },
  { label: "Bicycle", value: "BICYCLE" },
  { label: "Tricycle", value: "TRICYCLE" },
  { label: "Car", value: "CAR" },
  { label: "Van", value: "VAN" },
  { label: "Other", value: "OTHER" }
];

const rideVehicleOptions: Array<{ label: string; value: TaxiVehicleType }> = [
  { label: "Sedan", value: "SEDAN" },
  { label: "SUV", value: "SUV" },
  { label: "Mini bus", value: "MINI_BUS" },
  { label: "Tricycle", value: "TRICYCLE" },
  { label: "Other", value: "OTHER" }
];

const ownershipOptions: Array<{ label: string; value: TaxiVehicleOwnership }> = [
  { label: "Owner", value: "OWNER" },
  { label: "Leased", value: "LEASED" },
  { label: "Company assigned", value: "COMPANY_ASSIGNED" },
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
  deliveryVehicleType: "MOTORCYCLE" as DeliveryCaptainVehicleType,
  rideVehicleType: "SEDAN" as TaxiVehicleType,
  vehicleOwnership: "OWNER" as TaxiVehicleOwnership,
  vehiclePlateNumber: "",
  licenceNumber: "",
  licenceExpiry: "",
  vehicleMake: "",
  vehicleModel: "",
  vehicleYear: "",
  vehicleColour: "",
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

function nextStepFor(result: ApplicantOnboardingResult): AccountStep {
  if (result.nextStep === "OTP_REQUIRED") return "OTP";
  if (result.nextStep === "PASSWORD_REQUIRED") return "PASSWORD";
  return "APPLICATION";
}

export default function CaptainApplication() {
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState<AccountStep>("ACCOUNT");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  function applyAccountResult(result: ApplicantOnboardingResult) {
    setForm((current) => ({
      ...current,
      fullName: current.fullName || result.account.fullName,
      phoneNumber: result.account.phoneNumber,
      email: result.account.email || current.email
    }));
    const nextStep = nextStepFor(result);
    setStep(nextStep);
    setSuccess(nextStep === "OTP"
      ? "OTP sent. Enter the code sent to your phone."
      : nextStep === "PASSWORD"
        ? "Phone verified. Create your password to continue."
        : "Account verified. Continue with your Captain application details.");
  }

  async function startAccount() {
    setBusy(true);
    setSuccess("");
    setError("");
    try {
      const result = await applicantOnboardingApi.createAccount({
        fullName: form.fullName,
        phoneNumber: normalizeNigerianPhoneNumber(form.phoneNumber),
        email: form.email || undefined
      });
      applyAccountResult(result);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setBusy(true);
    setSuccess("");
    setError("");
    try {
      const result = await applicantOnboardingApi.verifyOtp({
        phoneNumber: normalizeNigerianPhoneNumber(form.phoneNumber),
        otp
      });
      applyAccountResult(result);
      setOtp("");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function resendOtp() {
    setBusy(true);
    setSuccess("");
    setError("");
    try {
      await applicantOnboardingApi.resendOtp({ phoneNumber: normalizeNigerianPhoneNumber(form.phoneNumber) });
      setSuccess("If the phone is eligible, a new OTP has been sent.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function createPassword() {
    setBusy(true);
    setSuccess("");
    setError("");
    try {
      if (password !== passwordConfirmation) throw new Error("Passwords do not match.");
      const result = await applicantOnboardingApi.createPassword({
        phoneNumber: normalizeNigerianPhoneNumber(form.phoneNumber),
        password
      });
      applyAccountResult(result);
      setPassword("");
      setPasswordConfirmation("");
    } catch (err) {
      setError(err instanceof Error ? err.message : friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setSuccess("");
    setError("");
    try {
      if (step !== "APPLICATION") throw new Error("Verify your phone and create your password before submitting the application.");
      if (!form.confirmed) throw new Error("Please confirm that the information provided is accurate.");
      if (!form.deliveryCaptainInterest && !form.rideCaptainReviewInterest) throw new Error("Select Delivery Captain, Ride Captain, or both.");
      if (!isSecureImageUrl(form.profilePhotoUrl)) throw new Error("Profile photo must be a secure image URL ending in PNG, JPG, JPEG or WEBP.");
      if (![form.licenceImageUrl, form.vehicleParticularsUrl, form.insuranceDocumentUrl].every(isSecureDocumentUrl)) {
        throw new Error("Document links must be secure HTTPS links.");
      }
      if (form.rideCaptainReviewInterest && (!form.licenceImageUrl.trim() || !form.vehicleParticularsUrl.trim())) {
        throw new Error("Ride Captain review requires licence and vehicle particulars document links.");
      }

      const normalizedPhone = normalizeNigerianPhoneNumber(form.phoneNumber);
      const normalizedGuarantorPhone = normalizeNigerianPhoneNumber(form.guarantorPhone);
      const selectedModes = [
        form.deliveryCaptainInterest ? "Delivery Captain" : "",
        form.rideCaptainReviewInterest ? "Ride Captain" : ""
      ].filter(Boolean).join(" and ");

      if (form.deliveryCaptainInterest) {
        const notes = [
          `Selected mode: ${selectedModes}`,
          form.rideCaptainReviewInterest ? "Ride Captain readiness application also submitted from Captain app." : "",
          !form.address.trim() ? "Address not provided in app application; collect during review." : ""
        ].filter(Boolean).join("\n");

        await deliveryCaptainApplicationsApi.submit({
          fullName: form.fullName,
          phoneNumber: normalizedPhone,
          email: form.email || undefined,
          city: form.city,
          state: form.state,
          address: form.address.trim() || "Not provided in Captain app application; collect during review.",
          preferredZone: form.preferredZone || undefined,
          vehicleType: form.deliveryVehicleType,
          vehiclePlateNumber: form.vehiclePlateNumber || undefined,
          driverLicenceNumber: form.licenceNumber || undefined,
          riderExperience: form.riderExperience || undefined,
          profilePhotoUrl: form.profilePhotoUrl || undefined,
          documents: documentPayload(form),
          guarantorName: form.guarantorName,
          guarantorPhone: normalizedGuarantorPhone,
          notes,
          declarationAccepted: form.confirmed,
          privacyAccepted: form.confirmed,
          contactConsentAccepted: form.confirmed
        });
      }

      if (form.rideCaptainReviewInterest) {
        await taxiApi.submitDriverApplication({
          fullName: form.fullName,
          phoneNumber: normalizedPhone,
          email: form.email || undefined,
          city: form.city,
          state: form.state,
          address: form.address,
          driverLicenceNumber: form.licenceNumber,
          driverLicenceDocumentUrl: form.licenceImageUrl,
          driverLicenceExpiry: form.licenceExpiry,
          vehicleMake: form.vehicleMake,
          vehicleModel: form.vehicleModel,
          vehicleYear: Number(form.vehicleYear),
          vehicleColour: form.vehicleColour,
          vehiclePlateNumber: form.vehiclePlateNumber,
          vehicleType: form.rideVehicleType,
          vehicleOwnership: form.vehicleOwnership,
          vehicleParticularsDocumentUrl: form.vehicleParticularsUrl,
          insuranceDocumentUrl: form.insuranceDocumentUrl || undefined,
          notes: form.riderExperience || undefined
        });
      }

      setSuccess(`Your ${selectedModes} application has been submitted. KariGO will review your details and contact you with the next steps.`);
      setForm(initialForm);
      setStep("ACCOUNT");
    } catch (err) {
      setError(err instanceof Error ? err.message : friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const canStartAccount = Boolean(form.fullName.trim() && form.phoneNumber.trim());
  const rideFieldsReady = !form.rideCaptainReviewInterest || Boolean(
    form.licenceNumber.trim() &&
    form.licenceImageUrl.trim() &&
    form.licenceExpiry.trim() &&
    form.vehicleMake.trim() &&
    form.vehicleModel.trim() &&
    form.vehicleYear.trim() &&
    form.vehicleColour.trim() &&
    form.vehiclePlateNumber.trim() &&
    form.vehicleParticularsUrl.trim()
  );
  const canSubmit = Boolean(
    step === "APPLICATION" &&
    form.fullName.trim() &&
    form.phoneNumber.trim() &&
    form.city.trim() &&
    form.state.trim() &&
    form.address.trim() &&
    form.guarantorName.trim() &&
    form.guarantorPhone.trim() &&
    (form.deliveryCaptainInterest || form.rideCaptainReviewInterest) &&
    rideFieldsReady &&
    form.confirmed
  );

  return <Screen title="Apply to become a Captain" subtitle="Create your account, verify OTP, set a password, then submit Delivery Captain or Ride Captain details.">
    <Card tone="soft">
      <Image source={require("../../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" />
      <Text style={ui.sectionTitle}>Account-first Captain onboarding</Text>
      <Text style={ui.pageIntro}>The same verified account is used after approval. Delivery assignments are the approved active mode; KariGO Rides remains separately controlled.</Text>
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Step 1: Account and OTP</Text>
      <Field placeholder="Full name" value={form.fullName} onChangeText={(fullName) => setForm({ ...form, fullName })} />
      <Field placeholder="Phone number e.g. 080..." keyboardType="phone-pad" value={form.phoneNumber} onChangeText={(phoneNumber) => setForm({ ...form, phoneNumber })} />
      <Field placeholder="Email optional" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(email) => setForm({ ...form, email })} />
      {step === "ACCOUNT" ? <Button title={busy ? "Starting..." : "Create account and send OTP"} disabled={busy || !canStartAccount} onPress={startAccount} /> : null}
      {step === "OTP" ? <>
        <Field placeholder="OTP code" keyboardType="number-pad" value={otp} onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 8))} />
        <Button title={busy ? "Verifying..." : "Verify phone"} disabled={busy || !otp.trim()} onPress={verifyOtp} />
        <Button title="Resend OTP" tone="muted" disabled={busy} onPress={resendOtp} />
      </> : null}
      {step === "PASSWORD" ? <>
        <PasswordField placeholder="Create password" value={password} visible={passwordVisible} onToggleVisible={() => setPasswordVisible(!passwordVisible)} onChangeText={setPassword} />
        <PasswordField placeholder="Confirm password" value={passwordConfirmation} visible={passwordVisible} onToggleVisible={() => setPasswordVisible(!passwordVisible)} onChangeText={setPasswordConfirmation} />
        <Button title={busy ? "Saving..." : "Create password"} disabled={busy || password.length < 8 || passwordConfirmation.length < 8} onPress={createPassword} />
      </> : null}
      {step === "APPLICATION" ? <Message>Account verified. Continue with your application details.</Message> : null}
    </Card>

    {step === "APPLICATION" ? <>
      <Card>
        <Text style={ui.sectionTitle}>Application mode</Text>
        <ToggleRow label="Delivery Captain" checked={form.deliveryCaptainInterest} onPress={() => setForm({ ...form, deliveryCaptainInterest: !form.deliveryCaptainInterest })} helper="Delivery jobs are the active launch workflow after approval." />
        <ToggleRow label="Ride Captain" checked={form.rideCaptainReviewInterest} onPress={() => setForm({ ...form, rideCaptainReviewInterest: !form.rideCaptainReviewInterest })} helper="KariGO Rides stays readiness-only until separately approved." />
      </Card>

      <Card>
        <Text style={ui.sectionTitle}>Personal details</Text>
        <Field placeholder="City (Kano or Abuja)" value={form.city} onChangeText={(city) => setForm({ ...form, city })} />
        <Field placeholder="State (Kano or FCT)" value={form.state} onChangeText={(state) => setForm({ ...form, state })} />
        <Field placeholder="Residential address required" multiline value={form.address} onChangeText={(address) => setForm({ ...form, address })} />
        <Field placeholder="Preferred launch zone optional" value={form.preferredZone} onChangeText={(preferredZone) => setForm({ ...form, preferredZone })} />
      </Card>

      <Card>
        <Text style={ui.sectionTitle}>Vehicle and documents</Text>
        <Text style={ui.muted}>Delivery vehicle type</Text>
        <View style={styles.chipGrid}>
          {deliveryVehicleOptions.map((option) => <Pressable key={option.value} accessibilityRole="button" onPress={() => setForm({ ...form, deliveryVehicleType: option.value })} style={[styles.chip, form.deliveryVehicleType === option.value && styles.chipActive]}>
            <Text style={[styles.chipText, form.deliveryVehicleType === option.value && styles.chipTextActive]}>{option.label}</Text>
          </Pressable>)}
        </View>
        {form.rideCaptainReviewInterest ? <>
          <Text style={ui.muted}>Ride vehicle type</Text>
          <View style={styles.chipGrid}>
            {rideVehicleOptions.map((option) => <Pressable key={option.value} accessibilityRole="button" onPress={() => setForm({ ...form, rideVehicleType: option.value })} style={[styles.chip, form.rideVehicleType === option.value && styles.chipActive]}>
              <Text style={[styles.chipText, form.rideVehicleType === option.value && styles.chipTextActive]}>{option.label}</Text>
            </Pressable>)}
          </View>
          <Text style={ui.muted}>Vehicle ownership</Text>
          <View style={styles.chipGrid}>
            {ownershipOptions.map((option) => <Pressable key={option.value} accessibilityRole="button" onPress={() => setForm({ ...form, vehicleOwnership: option.value })} style={[styles.chip, form.vehicleOwnership === option.value && styles.chipActive]}>
              <Text style={[styles.chipText, form.vehicleOwnership === option.value && styles.chipTextActive]}>{option.label}</Text>
            </Pressable>)}
          </View>
        </> : null}
        <Field placeholder="Vehicle plate number required for Ride review" value={form.vehiclePlateNumber} onChangeText={(vehiclePlateNumber) => setForm({ ...form, vehiclePlateNumber })} />
        <Field placeholder="Driver licence number" value={form.licenceNumber} onChangeText={(licenceNumber) => setForm({ ...form, licenceNumber })} />
        {form.rideCaptainReviewInterest ? <>
          <Field placeholder="Licence expiry date YYYY-MM-DD" value={form.licenceExpiry} onChangeText={(licenceExpiry) => setForm({ ...form, licenceExpiry })} />
          <Field placeholder="Vehicle make" value={form.vehicleMake} onChangeText={(vehicleMake) => setForm({ ...form, vehicleMake })} />
          <Field placeholder="Vehicle model" value={form.vehicleModel} onChangeText={(vehicleModel) => setForm({ ...form, vehicleModel })} />
          <Field placeholder="Vehicle year" keyboardType="number-pad" value={form.vehicleYear} onChangeText={(vehicleYear) => setForm({ ...form, vehicleYear: vehicleYear.replace(/\D/g, "").slice(0, 4) })} />
          <Field placeholder="Vehicle colour" value={form.vehicleColour} onChangeText={(vehicleColour) => setForm({ ...form, vehicleColour })} />
        </> : null}
        <Field placeholder="Delivery experience note optional" multiline value={form.riderExperience} onChangeText={(riderExperience) => setForm({ ...form, riderExperience })} />
        <Field placeholder="Profile photo URL optional" autoCapitalize="none" value={form.profilePhotoUrl} onChangeText={(profilePhotoUrl) => setForm({ ...form, profilePhotoUrl })} />
        {isSecureImageUrl(form.profilePhotoUrl) && form.profilePhotoUrl.trim() ? <Image source={{ uri: form.profilePhotoUrl.trim() }} style={styles.preview} /> : null}
        <Field placeholder={form.rideCaptainReviewInterest ? "Driver licence image HTTPS link required" : "Driver licence image HTTPS link optional"} autoCapitalize="none" value={form.licenceImageUrl} onChangeText={(licenceImageUrl) => setForm({ ...form, licenceImageUrl })} />
        <Field placeholder={form.rideCaptainReviewInterest ? "Vehicle particulars HTTPS link required" : "Vehicle particulars HTTPS link optional"} autoCapitalize="none" value={form.vehicleParticularsUrl} onChangeText={(vehicleParticularsUrl) => setForm({ ...form, vehicleParticularsUrl })} />
        <Field placeholder="Insurance document HTTPS link optional" autoCapitalize="none" value={form.insuranceDocumentUrl} onChangeText={(insuranceDocumentUrl) => setForm({ ...form, insuranceDocumentUrl })} />
        <Text style={ui.muted}>KariGO stores document metadata and secure links for review only. Do not submit passwords, OTPs or payment details.</Text>
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
        <Button title={busy ? "Submitting..." : "Submit Captain application"} disabled={busy || !canSubmit} onPress={submit} />
      </Card>
    </> : null}

    <Card>
      <Message>{success}</Message>
      <Message error>{error}</Message>
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
