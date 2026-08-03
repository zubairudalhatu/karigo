import { brand } from "@karigo/config";
import type { ServiceProviderType, VendorServiceInput, VendorServiceStatus, VendorServiceSummary } from "@karigo/shared-types";
import { serviceProviderTypes } from "@karigo/shared-types";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatLabel } from "../lib/labels";
import { pickAndUploadImage } from "../lib/upload-pickers";
import { Card, MutedText, PrimaryButton, TextField } from "./ui";

const serviceStatuses: Array<{ value: VendorServiceStatus; label: string }> = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Draft / inactive" }
];

export interface PartnerServiceFormState {
  serviceType: ServiceProviderType;
  name: string;
  description: string;
  basePrice: string;
  priceNote: string;
  durationEstimate: string;
  serviceAreas: string;
  imageUrl: string;
  status: VendorServiceStatus;
  isAvailable: boolean;
  readinessOnly: boolean;
}

const emptyServiceForm: PartnerServiceFormState = {
  serviceType: "PLUMBER",
  name: "",
  description: "",
  basePrice: "",
  priceNote: "",
  durationEstimate: "",
  serviceAreas: "",
  imageUrl: "",
  status: "ACTIVE",
  isAvailable: true,
  readinessOnly: false
};

export function serviceToForm(service?: VendorServiceSummary | null): PartnerServiceFormState {
  if (!service) return emptyServiceForm;
  return {
    serviceType: service.serviceType,
    name: service.name,
    description: service.description,
    basePrice: service.basePrice === null || service.basePrice === undefined ? "" : String(service.basePrice),
    priceNote: service.priceNote ?? "",
    durationEstimate: service.durationEstimate ?? "",
    serviceAreas: service.serviceAreas.join(", "),
    imageUrl: service.imageUrl ?? "",
    status: service.status === "ARCHIVED" ? "INACTIVE" : service.status,
    isAvailable: service.isAvailable,
    readinessOnly: service.readinessOnly
  };
}

function toServiceInput(form: PartnerServiceFormState): VendorServiceInput {
  return {
    serviceType: form.serviceType,
    name: form.name.trim(),
    description: form.description.trim(),
    basePrice: form.basePrice.trim() ? Number(form.basePrice) : null,
    priceNote: form.priceNote.trim() || undefined,
    durationEstimate: form.durationEstimate.trim() || undefined,
    serviceAreas: form.serviceAreas.split(",").map((area) => area.trim()).filter(Boolean),
    imageUrl: form.imageUrl.trim() || undefined,
    status: form.status,
    isAvailable: form.isAvailable,
    readinessOnly: form.serviceType === "HEALTH_PROFESSIONAL" ? true : form.readinessOnly
  };
}

function validate(form: PartnerServiceFormState) {
  if (form.name.trim().length < 2) return "Service name must be at least 2 characters.";
  if (form.description.trim().length < 8) return "Description must be at least 8 characters.";
  if (form.basePrice.trim() && (!Number.isFinite(Number(form.basePrice)) || Number(form.basePrice) < 0)) return "Enter a valid base price.";
  if (form.imageUrl.trim() && !/^https:\/\/\S+$/i.test(form.imageUrl.trim())) return "Service image URL must start with https://.";
  return null;
}

export function PartnerServiceForm({
  initialService,
  onSubmit,
  saving,
  submitLabel
}: {
  initialService?: VendorServiceSummary | null;
  onSubmit: (payload: VendorServiceInput) => Promise<void>;
  saving: boolean;
  submitLabel: string;
}) {
  const initialState = useMemo(() => serviceToForm(initialService), [initialService]);
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  async function submit() {
    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    await onSubmit(toServiceInput(form));
  }

  async function uploadServiceImage() {
    setUploadingImage(true);
    setError(null);
    try {
      const uploaded = await pickAndUploadImage("service-image");
      if (uploaded) setForm((current) => ({ ...current, imageUrl: uploaded.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Service image could not be uploaded.");
    } finally {
      setUploadingImage(false);
    }
  }

  const healthReadiness = form.serviceType === "HEALTH_PROFESSIONAL";

  return (
    <Card>
      <View style={styles.field}>
        <Text style={styles.label}>Service category</Text>
        <View style={styles.choiceRow}>
          {serviceProviderTypes.map((serviceType) => {
            const active = form.serviceType === serviceType;
            return (
              <Pressable
                accessibilityRole="button"
                key={serviceType}
                onPress={() => setForm({ ...form, serviceType, readinessOnly: serviceType === "HEALTH_PROFESSIONAL" ? true : form.readinessOnly })}
                style={[styles.choice, active ? styles.choiceActive : null]}
              >
                <Text style={[styles.choiceText, active ? styles.choiceTextActive : null]}>{formatLabel(serviceType)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <TextField label="Service name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
      <TextField
        label="Description"
        value={form.description}
        multiline
        onChangeText={(description) => setForm({ ...form, description })}
        style={styles.multiline}
      />
      <TextField
        label="Base price"
        keyboardType="numeric"
        placeholder="5000"
        value={form.basePrice}
        onChangeText={(basePrice) => setForm({ ...form, basePrice: basePrice.replace(/[^\d.]/g, "") })}
      />
      <TextField
        label="Pricing note"
        placeholder="Final price after inspection"
        value={form.priceNote}
        onChangeText={(priceNote) => setForm({ ...form, priceNote })}
      />
      <TextField
        label="Duration estimate"
        placeholder="1-2 hours"
        value={form.durationEstimate}
        onChangeText={(durationEstimate) => setForm({ ...form, durationEstimate })}
      />
      <TextField
        label="Service areas"
        placeholder="Tarauni, Wuse, Garki"
        value={form.serviceAreas}
        onChangeText={(serviceAreas) => setForm({ ...form, serviceAreas })}
      />
      <TextField
        label="Service image URL"
        placeholder="https://..."
        value={form.imageUrl}
        autoCapitalize="none"
        onChangeText={(imageUrl) => setForm({ ...form, imageUrl })}
      />
      <PrimaryButton
        label={uploadingImage ? "Uploading image..." : "Upload service image"}
        onPress={() => void uploadServiceImage()}
        disabled={uploadingImage}
        variant="secondary"
      />
      <MutedText>Choose an image from your device or paste an approved HTTPS image URL. Accepted image types are JPG, PNG and WebP.</MutedText>
      <View style={styles.field}>
        <Text style={styles.label}>Service status</Text>
        <View style={styles.choiceRow}>
          {serviceStatuses.map((status) => {
            const active = form.status === status.value;
            return (
              <Pressable
                accessibilityRole="button"
                key={status.value}
                onPress={() => setForm({ ...form, status: status.value })}
                style={[styles.choice, active ? styles.choiceActive : null]}
              >
                <Text style={[styles.choiceText, active ? styles.choiceTextActive : null]}>{status.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.choiceRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setForm({ ...form, isAvailable: !form.isAvailable })}
          style={[styles.choice, form.isAvailable ? styles.choiceActive : null]}
        >
          <Text style={[styles.choiceText, form.isAvailable ? styles.choiceTextActive : null]}>
            {form.isAvailable ? "Available" : "Unavailable"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setForm({ ...form, readinessOnly: healthReadiness ? true : !form.readinessOnly })}
          disabled={healthReadiness}
          style={[styles.choice, form.readinessOnly ? styles.choiceActive : null, healthReadiness ? styles.choiceDisabled : null]}
        >
          <Text style={[styles.choiceText, form.readinessOnly ? styles.choiceTextActive : null]}>
            {form.readinessOnly ? "Readiness only" : "Live service-ready"}
          </Text>
        </Pressable>
      </View>
      {healthReadiness ? <MutedText>Health professional categories remain readiness-only until KariGO separately approves regulated service operations.</MutedText> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton label={saving ? "Saving..." : submitLabel} onPress={() => void submit()} disabled={saving || uploadingImage} />
    </Card>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8
  },
  label: {
    color: brand.colors.charcoal,
    fontSize: 13,
    fontWeight: "800"
  },
  multiline: {
    minHeight: 92,
    textAlignVertical: "top"
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  choice: {
    borderWidth: 1,
    borderColor: brand.colors.border,
    borderRadius: 999,
    backgroundColor: brand.colors.white,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  choiceActive: {
    borderColor: brand.colors.primary,
    backgroundColor: "#FEF2F2"
  },
  choiceDisabled: {
    opacity: 0.7
  },
  choiceText: {
    color: brand.colors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  choiceTextActive: {
    color: brand.colors.primary
  },
  error: {
    color: brand.colors.primary,
    fontSize: 13,
    fontWeight: "800"
  }
});
