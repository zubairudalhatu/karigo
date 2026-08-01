import * as DocumentPicker from "expo-document-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { brand } from "@karigo/config";
import { CaptainDocumentType, CaptainUploadedDocument, captainDocumentsApi } from "../src/api/captain-documents.api";
import { DeliveryCaptainApplicationStatus, deliveryCaptainApplicationsApi } from "../src/api/delivery-captain-applications.api";
import { Button, Card, Loading, Message, Protected, Screen, StatusBadge, ui } from "../src/components/ui";
import { friendlyError } from "../src/lib/errors";

const documentLabels: Partial<Record<CaptainDocumentType, string>> = {
  PROFILE_PHOTO: "Profile photo",
  DRIVER_LICENCE: "Driver's licence",
  VEHICLE_EXTERIOR: "Vehicle exterior photo",
  VEHICLE_INTERIOR: "Vehicle interior photo",
  VEHICLE_LICENCE: "Vehicle licence or particulars",
  INSURANCE: "Insurance document",
  ROADWORTHINESS: "Roadworthiness document",
  GUARANTOR_ID: "Guarantor ID"
};

type UploadMap = Partial<Record<CaptainDocumentType, { uploading: boolean; document?: CaptainUploadedDocument; error?: string }>>;

function requestedDocumentTypes(status: DeliveryCaptainApplicationStatus | null): CaptainDocumentType[] {
  const fromStatus = status?.requestedDocumentTypes ?? [];
  const fromReview = [
    ...(status?.documentReview?.missingRequiredDocumentTypes ?? []),
    ...(status?.documentReview?.changesRequestedRequiredDocumentTypes ?? []),
    ...(status?.documentReview?.rejectedRequiredDocumentTypes ?? [])
  ];
  return Array.from(new Set([...fromStatus, ...fromReview]))
    .filter((type): type is CaptainDocumentType => Boolean(documentLabels[type as CaptainDocumentType]));
}

export default function DeliveryApplicationRevision() {
  const [status, setStatus] = useState<DeliveryCaptainApplicationStatus | null>(null);
  const [uploads, setUploads] = useState<UploadMap>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const requestedTypes = useMemo(() => requestedDocumentTypes(status), [status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextStatus = await deliveryCaptainApplicationsApi.statusForCurrentUser();
      setStatus(nextStatus);
      if (!nextStatus.revisionRequired && nextStatus.status !== "CHANGES_REQUESTED") {
        setMessage("No Delivery Captain revision is currently open.");
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function uploadDocument(type: CaptainDocumentType) {
    try {
      setUploads((current) => ({ ...current, [type]: { ...current[type], uploading: true, error: "" } }));
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets?.[0]) {
        setUploads((current) => ({ ...current, [type]: { ...current[type], uploading: false } }));
        return;
      }
      const asset = result.assets[0];
      const document = await captainDocumentsApi.upload(type, {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType
      });
      setUploads((current) => ({ ...current, [type]: { uploading: false, document } }));
      setMessage(`${documentLabels[type] ?? type} uploaded.`);
    } catch (e) {
      setUploads((current) => ({ ...current, [type]: { ...current[type], uploading: false, error: friendlyError(e) } }));
      setError(friendlyError(e));
    }
  }

  async function submitRevision() {
    try {
      const documentIds = requestedTypes.map((type) => uploads[type]?.document?.id).filter((id): id is string => Boolean(id));
      if (documentIds.length !== requestedTypes.length) {
        setError("Upload every requested Delivery Captain document before submitting updates.");
        return;
      }
      setSubmitting(true);
      setError("");
      await deliveryCaptainApplicationsApi.submitRevision(documentIds);
      router.replace("/application-status");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !status) return <Protected><Loading label="Loading Delivery revision..." /></Protected>;

  return <Protected><Screen title="Delivery application revision" subtitle="Upload requested Delivery Captain documents for the same application.">
    <Message>{message}</Message>
    <Message error>{error}</Message>
    {status ? <Card tone="soft">
      <Text style={ui.sectionTitle}>Delivery Captain application</Text>
      <StatusBadge status={status.status} />
      <Text style={ui.muted}>Reference: {status.applicationReference}</Text>
      <Text style={ui.pageIntro}>{status.applicantVisibleRevisionNote || status.applicantVisibleNote || "Upload the requested Delivery Captain documents."}</Text>
    </Card> : null}

    <Card>
      <Text style={ui.sectionTitle}>Requested documents</Text>
      {requestedTypes.length ? requestedTypes.map((type) => {
        const upload = uploads[type];
        return <View key={type} style={{ gap: 8, marginBottom: 12 }}>
          <Text style={styles.documentTitle}>{documentLabels[type] ?? type}</Text>
          <Text style={ui.muted}>{upload?.document ? upload.document.originalFileName : "Not uploaded yet"}</Text>
          {upload?.error ? <Text style={styles.errorText}>{upload.error}</Text> : null}
          <Button title={upload?.uploading ? "Uploading..." : upload?.document ? "Replace document" : "Upload document"} tone="muted" disabled={upload?.uploading || submitting} onPress={() => void uploadDocument(type)} />
        </View>;
      }) : <Text style={ui.muted}>No requested document list was returned. Refresh status or contact KariGO Support.</Text>}
      <Button title={submitting ? "Submitting..." : "Submit updates for review"} disabled={submitting || !requestedTypes.length} onPress={submitRevision} />
      <Button title="View application status" tone="muted" onPress={() => router.replace("/application-status")} />
    </Card>
  </Screen></Protected>;
}

const styles = StyleSheet.create({
  documentTitle: { color: brand.colors.charcoal, fontWeight: "900" },
  errorText: { color: brand.colors.primaryDark, fontWeight: "800" }
});
