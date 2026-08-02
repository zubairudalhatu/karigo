import DateTimePicker from "@react-native-community/datetimepicker";
import { brand } from "@karigo/config";
import {
  CaptainServiceArea,
  VehicleCatalog,
  VehicleCatalogOption,
  VehicleMakeOption
} from "@karigo/shared-types";
import { Link, router, useFocusEffect } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { TaxiVehicleOwnership, TaxiVehicleType } from "@karigo/shared-types";
import {
  applicantOnboardingApi,
  ApplicantOnboardingResult
} from "../../src/api/applicant-onboarding.api";
import { CaptainAccess, captainAccessApi } from "../../src/api/captain-access.api";
import { captainCatalogApi, fallbackServiceAreaCatalog, fallbackVehicleCatalog } from "../../src/api/captain-catalog.api";
import {
  CaptainDocumentType,
  CaptainUploadedDocument,
  captainDocumentsApi
} from "../../src/api/captain-documents.api";
import {
  deliveryCaptainApplicationsApi,
  DeliveryCaptainVehicleType
} from "../../src/api/delivery-captain-applications.api";
import { taxiApi } from "../../src/api/taxi.api";
import { Button, Card, Field, Loading, Message, PasswordField, Screen, ui } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";
import { clearCaptainApplicationIntent, loadCaptainApplicationIntent, saveCaptainApplicationIntent } from "../../src/lib/captain-application-intent";
import { hasAnyCaptainApplication } from "../../src/lib/captain-application-status";
import { friendlyError } from "../../src/lib/errors";
import { normalizeNigerianPhoneNumber } from "../../src/lib/phone";

type AccountStep = "ACCOUNT" | "OTP" | "PASSWORD" | "APPLICATION";
type SelectorKind = "state" | "city" | "primaryArea" | "make" | "model" | "year" | "colour" | null;
type UploadStatus = "empty" | "uploading" | "uploaded" | "failed";

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

const uploadDefinitions: Array<{
  type: CaptainDocumentType;
  title: string;
  helper: string;
  imageOnly: boolean;
  rideRequired?: boolean;
  alwaysRequired?: boolean;
}> = [
  { type: "PROFILE_PHOTO", title: "Profile photo", helper: "Clear recent face photograph. JPG, PNG or WEBP up to 8MB.", imageOnly: true, alwaysRequired: true },
  { type: "DRIVER_LICENCE", title: "Driver licence image", helper: "Readable licence photograph or scan. Required for Ride Captain.", imageOnly: false, rideRequired: true },
  { type: "VEHICLE_EXTERIOR", title: "Vehicle exterior photo", helper: "Show the vehicle body and registration plate where possible.", imageOnly: true, rideRequired: true },
  { type: "VEHICLE_INTERIOR", title: "Vehicle interior photo", helper: "Show the passenger interior clearly.", imageOnly: true, rideRequired: true },
  { type: "VEHICLE_LICENCE", title: "Vehicle licence / particulars", helper: "PDF or clear image of vehicle licence or particulars.", imageOnly: false, rideRequired: true },
  { type: "INSURANCE", title: "Insurance document", helper: "Optional PDF or image.", imageOnly: false },
  { type: "ROADWORTHINESS", title: "Roadworthiness document", helper: "Optional PDF or image.", imageOnly: false },
  { type: "GUARANTOR_ID", title: "Guarantor ID", helper: "Optional PDF or image.", imageOnly: false }
];

const initialForm = {
  fullName: "",
  phoneNumber: "",
  email: "",
  residentialStateCode: "KANO",
  residentialCityCode: "KANO",
  operatingAreaIds: ["kano-kano"],
  primaryOperatingAreaId: "kano-kano",
  address: "",
  preferredZone: "",
  deliveryVehicleType: "MOTORCYCLE" as DeliveryCaptainVehicleType,
  rideVehicleType: "SEDAN" as TaxiVehicleType,
  vehicleOwnership: "OWNER" as TaxiVehicleOwnership,
  vehiclePlateNumber: "",
  licenceNumber: "",
  licenceExpiry: "",
  vehicleMake: "",
  vehicleCustomMake: "",
  vehicleModel: "",
  vehicleCustomModel: "",
  vehicleYear: "",
  vehicleColour: "",
  vehicleCustomColour: "",
  riderExperience: "",
  deliveryCaptainInterest: true,
  rideCaptainReviewInterest: false,
  guarantorName: "",
  guarantorPhone: "",
  confirmed: false
};

type CaptainForm = typeof initialForm;
type UploadMap = Partial<Record<CaptainDocumentType, { status: UploadStatus; document?: CaptainUploadedDocument; localUri?: string; error?: string }>>;

function ToggleRow({ label, checked, onPress, helper }: { label: string; checked: boolean; onPress: () => void; helper?: string }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} style={styles.toggleRow}>
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}><Text style={styles.checkboxMark}>{checked ? "Done" : ""}</Text></View>
    <View style={styles.toggleText}>
      <Text style={styles.toggleLabel}>{label}</Text>
      {helper ? <Text style={ui.muted}>{helper}</Text> : null}
    </View>
  </Pressable>;
}

function dateLabel(value: string) {
  if (!value) return "Select expiry date";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "Select expiry date";
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function isoDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (year && month && day) return new Date(year, month - 1, day);
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 2);
  return nextYear;
}

function nextStepFor(result: ApplicantOnboardingResult): AccountStep {
  if (result.nextStep === "OTP_REQUIRED") return "OTP";
  if (result.nextStep === "PASSWORD_REQUIRED") return "PASSWORD";
  if (result.nextStep === "SIGN_IN_REQUIRED") return "ACCOUNT";
  return "APPLICATION";
}

function activeAreas(areas: CaptainServiceArea[]) {
  return areas.filter((area) => area.isActive);
}

function areaLabel(area?: CaptainServiceArea | null) {
  return area ? `${area.cityName}, ${area.stateCode === "FCT" ? "FCT" : area.stateName}` : "";
}

function documentIds(uploads: UploadMap) {
  return Object.values(uploads)
    .map((upload) => upload?.document?.id)
    .filter((id): id is string => Boolean(id));
}

function uploaded(uploads: UploadMap, type: CaptainDocumentType) {
  return uploads[type]?.status === "uploaded" && Boolean(uploads[type]?.document?.id);
}

function ModalSelector({
  title,
  visible,
  options,
  value,
  searchable = true,
  onClose,
  onSelect
}: {
  title: string;
  visible: boolean;
  options: VehicleCatalogOption[];
  value?: string;
  searchable?: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = options.filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(query.trim().toLowerCase()));
  useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);
  return <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>
        <View style={ui.spaceBetween}>
          <Text style={ui.sectionTitle}>{title}</Text>
          <Pressable onPress={onClose}><Text style={styles.modalClose}>Cancel</Text></Pressable>
        </View>
        {searchable ? <TextInput value={query} onChangeText={setQuery} placeholder="Search" placeholderTextColor={brand.colors.muted} style={styles.searchInput} /> : null}
        <ScrollView contentContainerStyle={styles.optionList}>
          {filtered.map((option) => <Pressable key={option.value} onPress={() => { onSelect(option.value); onClose(); }} style={[styles.optionRow, value === option.value && styles.optionRowActive]}>
            <Text style={[styles.optionText, value === option.value && styles.optionTextActive]}>{option.label}</Text>
          </Pressable>)}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

function SelectorField({ label, value, disabled, onPress }: { label: string; value?: string; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[styles.selectorField, disabled && ui.disabled]}>
    <Text style={styles.selectorLabel}>{label}</Text>
    <Text style={styles.selectorValue}>{value || "Select"}</Text>
  </Pressable>;
}

function UploadCard({
  title,
  helper,
  required,
  imageOnly,
  state,
  onGallery,
  onCamera,
  onFile,
  onRemove
}: {
  title: string;
  helper: string;
  required: boolean;
  imageOnly: boolean;
  state?: UploadMap[CaptainDocumentType];
  onGallery: () => void;
  onCamera: () => void;
  onFile: () => void;
  onRemove: () => void;
}) {
  const status = state?.status ?? "empty";
  return <View style={styles.uploadCard}>
    <View style={ui.spaceBetween}>
      <View style={styles.uploadTitleWrap}>
        <Text style={styles.uploadTitle}>{title}</Text>
        <Text style={[ui.pill, required ? styles.requiredPill : styles.optionalPill]}>{required ? "Mandatory" : "Optional"}</Text>
      </View>
      <Text style={styles.uploadStatus}>{status === "uploaded" ? "Uploaded" : status === "uploading" ? "Uploading..." : status === "failed" ? "Retry needed" : "Not selected"}</Text>
    </View>
    <Text style={ui.muted}>{helper}</Text>
    {state?.localUri && imageOnly ? <Image source={{ uri: state.localUri }} style={styles.uploadPreview} /> : null}
    {state?.document ? <Text style={styles.fileName}>{state.document.originalFileName}</Text> : null}
    {state?.error ? <Message error>{state.error}</Message> : null}
    <View style={styles.uploadActions}>
      <Button title="Choose gallery" tone="muted" disabled={status === "uploading"} onPress={onGallery} />
      <Button title="Take photo" tone="muted" disabled={status === "uploading"} onPress={onCamera} />
      {!imageOnly ? <Button title="Choose file" tone="muted" disabled={status === "uploading"} onPress={onFile} /> : null}
      {state?.document ? <Button title="Remove" tone="danger" disabled={status === "uploading"} onPress={onRemove} /> : null}
    </View>
  </View>;
}

export default function CaptainApplication() {
  const { user } = useAuth();
  const [form, setForm] = useState<CaptainForm>(initialForm);
  const [captainAccess, setCaptainAccess] = useState<CaptainAccess | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [vehicleCatalog, setVehicleCatalog] = useState<VehicleCatalog>(fallbackVehicleCatalog);
  const [serviceAreas, setServiceAreas] = useState<CaptainServiceArea[]>(fallbackServiceAreaCatalog.areas);
  const [uploads, setUploads] = useState<UploadMap>({});
  const [selector, setSelector] = useState<SelectorKind>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [step, setStep] = useState<AccountStep>("ACCOUNT");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const submittingRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    void Promise.all([captainCatalogApi.vehicleCatalog(), captainCatalogApi.serviceAreas()]).then(([vehicles, areas]) => {
      setVehicleCatalog(vehicles);
      setServiceAreas(areas.areas);
    });
  }, []);

  const resolveApplicationGate = useCallback(async () => {
    if (!user) {
      setCaptainAccess(null);
      return;
    }
    setAccessLoading(true);
    try {
      const access = await captainAccessApi.resolve();
      setCaptainAccess(access);
      if (hasAnyCaptainApplication(access)) {
        router.replace("/application-status");
        return;
      }
      if (access.nextStep === "OPEN_DASHBOARD") {
        router.replace("/tabs/dashboard");
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setAccessLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => {
    void resolveApplicationGate();
  }, [resolveApplicationGate]));

  useEffect(() => {
    if (!user) return;
    void loadCaptainApplicationIntent().then((intent) => {
      setForm((current) => ({
        ...current,
        ...(intent ?? {}),
        fullName: user.fullName || current.fullName || "",
        phoneNumber: user.phoneNumber || current.phoneNumber || "",
        email: user.email || current.email || ""
      }));
    });
    setStep("APPLICATION");
    setSuccess("You are signed in with your KariGO account. Complete your Captain application to start onboarding.");
  }, [user]);

  const activeServiceAreas = useMemo(() => activeAreas(serviceAreas), [serviceAreas]);
  const states = useMemo(() => {
    const seen = new Set<string>();
    return activeServiceAreas.filter((area) => {
      if (seen.has(area.stateCode)) return false;
      seen.add(area.stateCode);
      return true;
    }).map((area) => ({ value: area.stateCode, label: area.stateName }));
  }, [activeServiceAreas]);
  const cities = activeServiceAreas
    .filter((area) => area.stateCode === form.residentialStateCode)
    .map((area) => ({ value: area.cityCode, label: area.cityName }));
  const selectedResidentialArea = activeServiceAreas.find((area) => area.stateCode === form.residentialStateCode && area.cityCode === form.residentialCityCode);
  const selectedOperatingAreas = activeServiceAreas.filter((area) => form.operatingAreaIds.includes(area.id));
  const selectedMake = vehicleCatalog.makes.find((make) => make.value === form.vehicleMake);
  const modelOptions = selectedMake?.models ?? [];
  const yearOptions = vehicleCatalog.years.map((year) => ({ value: `${year}`, label: `${year}` }));

  function updateForm(next: Partial<CaptainForm>) {
    setForm((current) => ({ ...current, ...next }));
  }

  function selectState(stateCode: string) {
    const firstCity = activeServiceAreas.find((area) => area.stateCode === stateCode);
    updateForm({ residentialStateCode: stateCode, residentialCityCode: firstCity?.cityCode ?? "" });
  }

  function toggleOperatingArea(areaId: string) {
    const next = form.operatingAreaIds.includes(areaId)
      ? form.operatingAreaIds.filter((id) => id !== areaId)
      : [...form.operatingAreaIds, areaId];
    updateForm({
      operatingAreaIds: next,
      primaryOperatingAreaId: next.includes(form.primaryOperatingAreaId) ? form.primaryOperatingAreaId : next[0] ?? ""
    });
  }

  function selectMake(make: string) {
    updateForm({ vehicleMake: make, vehicleModel: "", vehicleCustomMake: make === "OTHER" ? form.vehicleCustomMake : "", vehicleCustomModel: "" });
  }

  function selectColour(colour: string) {
    updateForm({ vehicleColour: colour, vehicleCustomColour: colour === "OTHER" ? form.vehicleCustomColour : "" });
  }

  function applyAccountResult(result: ApplicantOnboardingResult) {
    setForm((current) => ({
      ...current,
      fullName: current.fullName || result.account.fullName,
      phoneNumber: result.account.phoneNumber,
      email: result.account.email || current.email
    }));
    const nextStep = nextStepFor(result);
    setStep(nextStep);
    if (result.nextStep === "SIGN_IN_REQUIRED") {
      setSuccess(result.message ?? "This phone number already has a KariGO account. Sign in with your existing KariGO password to continue your Captain application.");
      return;
    }
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
      if (result.nextStep === "SIGN_IN_REQUIRED") {
        await saveCaptainApplicationIntent({
          deliveryCaptainInterest: form.deliveryCaptainInterest,
          rideCaptainReviewInterest: form.rideCaptainReviewInterest,
          city: selectedResidentialArea?.cityName ?? "Kano",
          state: selectedResidentialArea?.stateCode === "FCT" ? "FCT" : "Kano",
          residentialStateCode: form.residentialStateCode,
          residentialCityCode: form.residentialCityCode,
          operatingAreaIds: form.operatingAreaIds,
          primaryOperatingAreaId: form.primaryOperatingAreaId,
          address: form.address,
          preferredZone: form.preferredZone
        });
      }
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

  async function uploadAsset(type: CaptainDocumentType, asset: { uri: string; fileName?: string | null; name?: string | null; mimeType?: string | null }) {
    setUploads((current) => ({ ...current, [type]: { ...current[type], status: "uploading", localUri: asset.uri, error: "" } }));
    try {
      const document = await captainDocumentsApi.upload(type, {
        uri: asset.uri,
        name: asset.fileName || asset.name || `${type.toLowerCase()}`,
        mimeType: asset.mimeType
      });
      setUploads((current) => ({ ...current, [type]: { status: "uploaded", document, localUri: asset.uri } }));
    } catch (err) {
      setUploads((current) => ({ ...current, [type]: { ...current[type], status: "failed", localUri: asset.uri, error: friendlyError(err) } }));
    }
  }

  async function chooseImage(type: CaptainDocumentType, source: "camera" | "gallery") {
    setError("");
    const permission = source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(source === "camera" ? "Camera permission is needed to take this photo." : "Gallery permission is needed to choose this image.");
      return;
    }
    const result = source === "camera"
      ? await ImagePicker.launchCameraAsync({ allowsEditing: type === "PROFILE_PHOTO", quality: 0.82, mediaTypes: ImagePicker.MediaTypeOptions.Images })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: type === "PROFILE_PHOTO", quality: 0.82, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (result.canceled || !result.assets[0]) return;
    await uploadAsset(type, result.assets[0]);
  }

  async function chooseFile(type: CaptainDocumentType) {
    setError("");
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
      copyToCacheDirectory: true,
      multiple: false
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadAsset(type, result.assets[0]);
  }

  async function removeUpload(type: CaptainDocumentType) {
    const documentId = uploads[type]?.document?.id;
    if (!documentId) {
      setUploads((current) => ({ ...current, [type]: { status: "empty" } }));
      return;
    }
    try {
      await captainDocumentsApi.remove(documentId);
      setUploads((current) => ({ ...current, [type]: { status: "empty" } }));
    } catch (err) {
      setUploads((current) => ({ ...current, [type]: { ...current[type], status: "failed", error: friendlyError(err) } }));
    }
  }

  function validateForm() {
    if (step !== "APPLICATION") throw new Error("Verify your phone and create your password before submitting the application.");
    if (!form.confirmed) throw new Error("Please confirm that the information provided is accurate.");
    if (!form.deliveryCaptainInterest && !form.rideCaptainReviewInterest) throw new Error("Select Delivery Captain, Ride Captain, or both.");
    if (!form.residentialStateCode) throw new Error("Select Residential State or Territory.");
    if (!form.residentialCityCode) throw new Error("Select Residential City.");
    if (!form.operatingAreaIds.length) throw new Error("Select at least one preferred operating area.");
    if (!form.primaryOperatingAreaId || !form.operatingAreaIds.includes(form.primaryOperatingAreaId)) throw new Error("Select a valid primary operating area.");
    if (!uploaded(uploads, "PROFILE_PHOTO")) throw new Error("Profile photo is required.");
    if (form.rideCaptainReviewInterest) {
      if (!form.licenceNumber.trim()) throw new Error("Driver licence number is required for Ride Captain review.");
      if (!form.licenceExpiry.trim()) throw new Error("Driver licence expiry date is required.");
      if (!form.vehicleMake.trim()) throw new Error("Vehicle make is required.");
      if (form.vehicleMake === "OTHER" && !form.vehicleCustomMake.trim()) throw new Error("Enter the custom vehicle make.");
      if (!form.vehicleModel.trim()) throw new Error("Vehicle model is required.");
      if (form.vehicleModel === "OTHER" && !form.vehicleCustomModel.trim()) throw new Error("Enter the custom vehicle model.");
      if (!form.vehicleYear.trim()) throw new Error("Vehicle year is required.");
      if (!form.vehicleColour.trim()) throw new Error("Vehicle colour is required.");
      if (form.vehicleColour === "OTHER" && !form.vehicleCustomColour.trim()) throw new Error("Enter the custom vehicle colour.");
      if (!form.vehiclePlateNumber.trim()) throw new Error("Vehicle plate number is required.");
      for (const type of ["DRIVER_LICENCE", "VEHICLE_EXTERIOR", "VEHICLE_INTERIOR", "VEHICLE_LICENCE"] as CaptainDocumentType[]) {
        if (!uploaded(uploads, type)) throw new Error(`${uploadDefinitions.find((item) => item.type === type)?.title} is required.`);
      }
    }
  }

  async function completeSubmission() {
    setBusy(true);
    setSuccess("");
    setError("");
    try {
      validateForm();
      const normalizedPhone = normalizeNigerianPhoneNumber(form.phoneNumber);
      const normalizedGuarantorPhone = normalizeNigerianPhoneNumber(form.guarantorPhone);
      const selectedModes = [
        form.deliveryCaptainInterest ? "Delivery Captain" : "",
        form.rideCaptainReviewInterest ? "Ride Captain" : ""
      ].filter(Boolean).join(" and ");
      const area = selectedResidentialArea ?? activeServiceAreas[0];
      const ids = documentIds(uploads);
      const submissions: Promise<unknown>[] = [];

      if (form.deliveryCaptainInterest) {
        const submitDeliveryApplication = user
          ? deliveryCaptainApplicationsApi.submitForCurrentUser
          : deliveryCaptainApplicationsApi.submit;
        submissions.push(submitDeliveryApplication({
          fullName: form.fullName,
          phoneNumber: normalizedPhone,
          email: form.email || undefined,
          city: area?.cityName ?? "Kano",
          state: area?.stateCode === "FCT" ? "FCT" : "Kano",
          residentialStateCode: form.residentialStateCode,
          residentialCityCode: form.residentialCityCode,
          operatingAreaIds: form.operatingAreaIds,
          primaryOperatingAreaId: form.primaryOperatingAreaId,
          address: form.address.trim(),
          preferredZone: form.preferredZone || undefined,
          vehicleType: form.deliveryVehicleType,
          vehiclePlateNumber: form.vehiclePlateNumber || undefined,
          driverLicenceNumber: form.licenceNumber || undefined,
          riderExperience: form.riderExperience || undefined,
          documentIds: ids,
          guarantorName: form.guarantorName,
          guarantorPhone: normalizedGuarantorPhone,
          notes: `Selected mode: ${selectedModes}`,
          declarationAccepted: form.confirmed,
          privacyAccepted: form.confirmed,
          contactConsentAccepted: form.confirmed
        }));
      }

      if (form.rideCaptainReviewInterest) {
        const submitRideApplication = user
          ? taxiApi.submitDriverApplicationForCurrentUser
          : taxiApi.submitDriverApplication;
        submissions.push(submitRideApplication({
          fullName: form.fullName,
          phoneNumber: normalizedPhone,
          email: form.email || undefined,
          city: area?.cityName ?? "Kano",
          state: area?.stateCode === "FCT" ? "FCT" : "Kano",
          residentialStateCode: form.residentialStateCode,
          residentialCityCode: form.residentialCityCode,
          operatingAreaIds: form.operatingAreaIds,
          primaryOperatingAreaId: form.primaryOperatingAreaId,
          address: form.address,
          driverLicenceNumber: form.licenceNumber,
          driverLicenceExpiry: form.licenceExpiry,
          vehicleMake: form.vehicleMake,
          vehicleCustomMake: form.vehicleCustomMake || undefined,
          vehicleModel: form.vehicleModel,
          vehicleCustomModel: form.vehicleCustomModel || undefined,
          vehicleYear: Number(form.vehicleYear),
          vehicleColour: form.vehicleColour,
          vehicleCustomColour: form.vehicleCustomColour || undefined,
          vehiclePlateNumber: form.vehiclePlateNumber,
          vehicleType: form.rideVehicleType,
          vehicleOwnership: form.vehicleOwnership,
          documentIds: ids,
          notes: form.riderExperience || undefined
        }));
      }

      await Promise.all(submissions);
      await clearCaptainApplicationIntent();
      setUploads({});
      if (user) {
        const access = await captainAccessApi.resolve();
        setCaptainAccess(access);
        if (hasAnyCaptainApplication(access)) {
          router.replace({ pathname: "/application-status", params: { submitted: "1" } });
          return;
        }
      }
      setSuccess(`Your ${selectedModes} application has been submitted. KariGO will review your details and contact you with the next steps.`);
      setForm(user ? { ...initialForm, fullName: user.fullName ?? "", phoneNumber: user.phoneNumber ?? "", email: user.email ?? "" } : initialForm);
      setStep(user ? "APPLICATION" : "ACCOUNT");
    } catch (err) {
      if (user) {
        try {
          const access = await captainAccessApi.resolve();
          setCaptainAccess(access);
          if (hasAnyCaptainApplication(access)) {
            router.replace("/application-status");
            return;
          }
        } catch {
          // Keep the original submission error visible below.
        }
      }
      setError(err instanceof Error ? err.message : friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (submittingRef.current) return submittingRef.current;
    const submission = completeSubmission();
    submittingRef.current = submission;
    try {
      await submission;
    } finally {
      submittingRef.current = null;
    }
  }

  const canStartAccount = Boolean(form.fullName.trim() && form.phoneNumber.trim());
  const rideFieldsReady = !form.rideCaptainReviewInterest || Boolean(
    form.licenceNumber.trim() &&
    form.licenceExpiry.trim() &&
    form.vehicleMake.trim() &&
    (form.vehicleMake !== "OTHER" || form.vehicleCustomMake.trim()) &&
    form.vehicleModel.trim() &&
    (form.vehicleModel !== "OTHER" || form.vehicleCustomModel.trim()) &&
    form.vehicleYear.trim() &&
    form.vehicleColour.trim() &&
    (form.vehicleColour !== "OTHER" || form.vehicleCustomColour.trim()) &&
    form.vehiclePlateNumber.trim() &&
    uploaded(uploads, "DRIVER_LICENCE") &&
    uploaded(uploads, "VEHICLE_EXTERIOR") &&
    uploaded(uploads, "VEHICLE_INTERIOR") &&
    uploaded(uploads, "VEHICLE_LICENCE")
  );
  const canSubmit = Boolean(
    step === "APPLICATION" &&
    form.fullName.trim() &&
    form.phoneNumber.trim() &&
    form.residentialStateCode &&
    form.residentialCityCode &&
    form.operatingAreaIds.length &&
    form.primaryOperatingAreaId &&
    form.address.trim() &&
    form.guarantorName.trim() &&
    form.guarantorPhone.trim() &&
    (form.deliveryCaptainInterest || form.rideCaptainReviewInterest) &&
    uploaded(uploads, "PROFILE_PHOTO") &&
    rideFieldsReady &&
    form.confirmed
  );

  const selectorOptions =
    selector === "state" ? states :
      selector === "city" ? cities :
        selector === "primaryArea" ? selectedOperatingAreas.map((area) => ({ value: area.id, label: areaLabel(area) })) :
          selector === "make" ? vehicleCatalog.makes :
            selector === "model" ? modelOptions :
              selector === "year" ? yearOptions :
                selector === "colour" ? vehicleCatalog.colours :
                  [];
  const selectorValue =
    selector === "state" ? form.residentialStateCode :
      selector === "city" ? form.residentialCityCode :
        selector === "primaryArea" ? form.primaryOperatingAreaId :
          selector === "make" ? form.vehicleMake :
            selector === "model" ? form.vehicleModel :
              selector === "year" ? form.vehicleYear :
                selector === "colour" ? form.vehicleColour :
                  "";

  function onSelectorSelect(value: string) {
    if (selector === "state") selectState(value);
    if (selector === "city") updateForm({ residentialCityCode: value });
    if (selector === "primaryArea") updateForm({ primaryOperatingAreaId: value });
    if (selector === "make") selectMake(value);
    if (selector === "model") updateForm({ vehicleModel: value, vehicleCustomModel: value === "OTHER" ? form.vehicleCustomModel : "" });
    if (selector === "year") updateForm({ vehicleYear: value });
    if (selector === "colour") selectColour(value);
  }

  if (user && !captainAccess) {
    return <Screen>
      <Card>
        <Loading label={accessLoading ? "Checking your Captain application status..." : "Preparing application access..."} />
        <Message error>{error}</Message>
        {error ? <Button title="Try again" tone="muted" onPress={() => void resolveApplicationGate()} /> : null}
      </Card>
    </Screen>;
  }

  return <Screen title="Apply to become a Captain" subtitle="Use your existing KariGO account or create a new Captain applicant account, then submit Delivery Captain or Ride Captain details.">
    <Card tone="soft">
      <Image source={require("../../assets/karigo-logo.png")} style={styles.logo} resizeMode="contain" />
      <Text style={ui.sectionTitle}>Captain application</Text>
      <Text style={ui.pageIntro}>Use one verified KariGO account for Delivery Captain and Ride Captain access. KariGO Operations activates each mode separately after review.</Text>
    </Card>

    <Card>
      <Text style={ui.sectionTitle}>Step 1: Account and OTP</Text>
      {user ? <Message>You are signed in with your KariGO account. Complete your Captain application to start onboarding.</Message> : null}
      <Field placeholder="Full name" editable={!user} value={form.fullName} onChangeText={(fullName) => updateForm({ fullName })} />
      <Field placeholder="Phone number e.g. 080..." editable={!user} keyboardType="phone-pad" value={form.phoneNumber} onChangeText={(phoneNumber) => updateForm({ phoneNumber })} />
      <Field placeholder="Email optional" editable={!user} keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(email) => updateForm({ email })} />
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
        <ToggleRow label="Delivery Captain" checked={form.deliveryCaptainInterest} onPress={() => updateForm({ deliveryCaptainInterest: !form.deliveryCaptainInterest })} helper="Delivery work starts after KariGO Operations activates this mode." />
        <ToggleRow label="Ride Captain" checked={form.rideCaptainReviewInterest} onPress={() => updateForm({ rideCaptainReviewInterest: !form.rideCaptainReviewInterest })} helper="Ride work starts after KariGO Operations activates this mode." />
      </Card>

      <Card>
        <Text style={ui.sectionTitle}>Personal details</Text>
        <Text style={ui.muted}>Residential location</Text>
        <SelectorField label="Residential State/Territory" value={states.find((state) => state.value === form.residentialStateCode)?.label} onPress={() => setSelector("state")} />
        <SelectorField label="Residential City" value={cities.find((city) => city.value === form.residentialCityCode)?.label} disabled={!form.residentialStateCode} onPress={() => setSelector("city")} />
        <Field placeholder="Residential address required" multiline value={form.address} onChangeText={(address) => updateForm({ address })} />
        <Field placeholder="Preferred launch zone optional" value={form.preferredZone} onChangeText={(preferredZone) => updateForm({ preferredZone })} />
        <Text style={ui.sectionTitle}>Preferred operating areas</Text>
        <Text style={ui.muted}>Choose where you are willing to operate. KariGO Operations still controls final activation.</Text>
        {activeServiceAreas.map((area) => <ToggleRow key={area.id} label={areaLabel(area)} checked={form.operatingAreaIds.includes(area.id)} onPress={() => toggleOperatingArea(area.id)} />)}
        <SelectorField label="Primary operating area" value={areaLabel(activeServiceAreas.find((area) => area.id === form.primaryOperatingAreaId))} disabled={!form.operatingAreaIds.length} onPress={() => setSelector("primaryArea")} />
      </Card>

      <Card>
        <Text style={ui.sectionTitle}>Vehicle classification</Text>
        <Text style={ui.muted}>Delivery vehicle type</Text>
        <View style={styles.chipGrid}>
          {deliveryVehicleOptions.map((option) => <Pressable key={option.value} accessibilityRole="button" onPress={() => updateForm({ deliveryVehicleType: option.value })} style={[styles.chip, form.deliveryVehicleType === option.value && styles.chipActive]}>
            <Text style={[styles.chipText, form.deliveryVehicleType === option.value && styles.chipTextActive]}>{option.label}</Text>
          </Pressable>)}
        </View>
        {form.rideCaptainReviewInterest ? <>
          <Text style={ui.muted}>Ride vehicle type</Text>
          <View style={styles.chipGrid}>
            {rideVehicleOptions.map((option) => <Pressable key={option.value} accessibilityRole="button" onPress={() => updateForm({ rideVehicleType: option.value })} style={[styles.chip, form.rideVehicleType === option.value && styles.chipActive]}>
              <Text style={[styles.chipText, form.rideVehicleType === option.value && styles.chipTextActive]}>{option.label}</Text>
            </Pressable>)}
          </View>
          <Text style={ui.muted}>Vehicle ownership</Text>
          <View style={styles.chipGrid}>
            {ownershipOptions.map((option) => <Pressable key={option.value} accessibilityRole="button" onPress={() => updateForm({ vehicleOwnership: option.value })} style={[styles.chip, form.vehicleOwnership === option.value && styles.chipActive]}>
              <Text style={[styles.chipText, form.vehicleOwnership === option.value && styles.chipTextActive]}>{option.label}</Text>
            </Pressable>)}
          </View>
        </> : null}
      </Card>

      {form.rideCaptainReviewInterest ? <Card>
        <Text style={ui.sectionTitle}>Vehicle details</Text>
        <SelectorField label="Vehicle make" value={(vehicleCatalog.makes.find((make) => make.value === form.vehicleMake) as VehicleMakeOption | undefined)?.label} onPress={() => setSelector("make")} />
        {form.vehicleMake === "OTHER" ? <Field placeholder="Enter vehicle make" value={form.vehicleCustomMake} onChangeText={(vehicleCustomMake) => updateForm({ vehicleCustomMake })} /> : null}
        <SelectorField label="Vehicle model" value={modelOptions.find((model) => model.value === form.vehicleModel)?.label} disabled={!form.vehicleMake} onPress={() => setSelector("model")} />
        {form.vehicleModel === "OTHER" ? <Field placeholder="Enter vehicle model" value={form.vehicleCustomModel} onChangeText={(vehicleCustomModel) => updateForm({ vehicleCustomModel })} /> : null}
        <SelectorField label="Vehicle year" value={form.vehicleYear} onPress={() => setSelector("year")} />
        <SelectorField label="Vehicle colour" value={vehicleCatalog.colours.find((colour) => colour.value === form.vehicleColour)?.label} onPress={() => setSelector("colour")} />
        {form.vehicleColour === "OTHER" ? <Field placeholder="Enter vehicle colour" value={form.vehicleCustomColour} onChangeText={(vehicleCustomColour) => updateForm({ vehicleCustomColour })} /> : null}
        <Field placeholder="Vehicle plate number" value={form.vehiclePlateNumber} onChangeText={(vehiclePlateNumber) => updateForm({ vehiclePlateNumber })} />
      </Card> : null}

      <Card>
        <Text style={ui.sectionTitle}>Driver's licence</Text>
        <Field placeholder={form.rideCaptainReviewInterest ? "Driver licence number required" : "Driver licence number optional"} value={form.licenceNumber} onChangeText={(licenceNumber) => updateForm({ licenceNumber })} />
        {form.rideCaptainReviewInterest ? <>
          <SelectorField label="Licence expiry date" value={dateLabel(form.licenceExpiry)} onPress={() => setShowDatePicker(true)} />
          {showDatePicker ? <DateTimePicker
            value={dateFromValue(form.licenceExpiry)}
            mode="date"
            display="default"
            minimumDate={new Date()}
            maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() + 15))}
            onChange={(_, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) updateForm({ licenceExpiry: isoDate(selectedDate) });
            }}
          /> : null}
        </> : null}
        <Field placeholder="Delivery experience note optional" multiline value={form.riderExperience} onChangeText={(riderExperience) => updateForm({ riderExperience })} />
      </Card>

      <Card>
        <Text style={ui.sectionTitle}>Required uploads</Text>
        <Text style={ui.muted}>Upload files from camera, gallery or file picker. Files are stored privately for KariGO review.</Text>
        {uploadDefinitions.filter((item) => item.alwaysRequired || (form.rideCaptainReviewInterest && item.rideRequired)).map((item) => <UploadCard
          key={item.type}
          title={item.title}
          helper={item.helper}
          required
          imageOnly={item.imageOnly}
          state={uploads[item.type]}
          onGallery={() => void chooseImage(item.type, "gallery")}
          onCamera={() => void chooseImage(item.type, "camera")}
          onFile={() => void chooseFile(item.type)}
          onRemove={() => void removeUpload(item.type)}
        />)}
      </Card>

      <Card>
        <Text style={ui.sectionTitle}>Optional uploads</Text>
        {uploadDefinitions.filter((item) => !item.alwaysRequired && !item.rideRequired).map((item) => <UploadCard
          key={item.type}
          title={item.title}
          helper={item.helper}
          required={false}
          imageOnly={item.imageOnly}
          state={uploads[item.type]}
          onGallery={() => void chooseImage(item.type, "gallery")}
          onCamera={() => void chooseImage(item.type, "camera")}
          onFile={() => void chooseFile(item.type)}
          onRemove={() => void removeUpload(item.type)}
        />)}
      </Card>

      <Card>
        <Text style={ui.sectionTitle}>Guarantor information</Text>
        <Field placeholder="Guarantor name" value={form.guarantorName} onChangeText={(guarantorName) => updateForm({ guarantorName })} />
        <Field placeholder="Guarantor phone e.g. 080..." keyboardType="phone-pad" value={form.guarantorPhone} onChangeText={(guarantorPhone) => updateForm({ guarantorPhone })} />
      </Card>

      <Card>
        <Text style={ui.sectionTitle}>Declaration and submission</Text>
        <ToggleRow
          label="I confirm that the information provided is accurate."
          checked={form.confirmed}
          onPress={() => updateForm({ confirmed: !form.confirmed })}
          helper="KariGO may contact me or my guarantor for application review. Do not share OTPs or payment details."
        />
        <Button title={busy ? "Submitting application..." : "Submit Captain application"} disabled={busy || !canSubmit} onPress={submit} />
      </Card>
    </> : null}

    <Card>
      <Message>{success}</Message>
      <Message error>{error}</Message>
      <Link href="/auth/login" style={styles.loginLink}>{success.includes("already has a KariGO account") ? "Sign in to continue" : "Already approved? Sign in"}</Link>
    </Card>

    <ModalSelector
      title={
        selector === "state" ? "Residential State/Territory" :
          selector === "city" ? "Residential City" :
            selector === "primaryArea" ? "Primary operating area" :
              selector === "make" ? "Vehicle make" :
                selector === "model" ? "Vehicle model" :
                  selector === "year" ? "Vehicle year" :
                    selector === "colour" ? "Vehicle colour" :
                      "Select"
      }
      visible={Boolean(selector)}
      options={selectorOptions}
      value={selectorValue}
      searchable={selector !== "year" && selector !== "city" && selector !== "state" && selector !== "primaryArea"}
      onClose={() => setSelector(null)}
      onSelect={onSelectorSelect}
    />
  </Screen>;
}

const styles = StyleSheet.create({
  logo: { height: 44, width: 150 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderColor: brand.colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  chipText: { color: brand.colors.muted, fontWeight: "800" },
  chipTextActive: { color: brand.colors.primaryDark },
  toggleRow: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  checkbox: { alignItems: "center", borderColor: brand.colors.border, borderRadius: 8, borderWidth: 1, height: 26, justifyContent: "center", marginTop: 1, width: 26 },
  checkboxChecked: { backgroundColor: brand.colors.primary, borderColor: brand.colors.primary },
  checkboxMark: { color: brand.colors.white, fontSize: 10, fontWeight: "900" },
  toggleText: { flex: 1, gap: 2 },
  toggleLabel: { color: brand.colors.charcoal, fontWeight: "900" },
  selectorField: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 14, borderWidth: 1, gap: 4, minHeight: 56, padding: 13 },
  selectorLabel: { color: brand.colors.muted, fontSize: 12, fontWeight: "800" },
  selectorValue: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "900" },
  modalBackdrop: { backgroundColor: "rgba(0,0,0,0.38)", flex: 1, justifyContent: "flex-end" },
  modalCard: { backgroundColor: brand.colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 12, maxHeight: "78%", padding: 18 },
  modalClose: { color: brand.colors.primary, fontWeight: "900" },
  searchInput: { backgroundColor: "#F9FAFB", borderColor: brand.colors.border, borderRadius: 14, borderWidth: 1, color: brand.colors.charcoal, padding: 12 },
  optionList: { gap: 8 },
  optionRow: { borderColor: brand.colors.border, borderRadius: 14, borderWidth: 1, padding: 13 },
  optionRowActive: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  optionText: { color: brand.colors.charcoal, fontWeight: "800" },
  optionTextActive: { color: brand.colors.primaryDark },
  uploadCard: { borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, gap: 10, padding: 12 },
  uploadTitleWrap: { flex: 1, gap: 6 },
  uploadTitle: { color: brand.colors.charcoal, fontWeight: "900" },
  uploadStatus: { color: brand.colors.muted, fontSize: 12, fontWeight: "800" },
  requiredPill: { backgroundColor: "#FEE2E2", color: "#991B1B" },
  optionalPill: { backgroundColor: "#F3F4F6", color: brand.colors.muted },
  uploadPreview: { borderRadius: 14, height: 86, width: 86 },
  fileName: { color: brand.colors.charcoal, fontSize: 13, fontWeight: "800" },
  uploadActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  loginLink: { color: brand.colors.primary, fontWeight: "900", paddingVertical: 6, textAlign: "center" }
});
