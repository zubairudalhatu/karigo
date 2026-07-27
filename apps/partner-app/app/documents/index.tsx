import { brand } from "@karigo/config";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { partnerApi, PartnerOnboardingDocument } from "../../src/api/partner.api";
import { AuthGate } from "../../src/components/auth-gate";
import { Badge, Card, EmptyState, Hero, LoadingState, MutedText, PrimaryButton, Screen, TextField } from "../../src/components/ui";
import { formatLabel, statusTone } from "../../src/lib/labels";
import { pickAndUploadDocument } from "../../src/lib/upload-pickers";

const documentTypes = [
  "BUSINESS_REGISTRATION",
  "OWNER_ID",
  "ADDRESS_EVIDENCE",
  "FOOD_HANDLING_EVIDENCE",
  "SERVICE_CERTIFICATION",
  "OTHER"
] as const;

function DocumentsContent() {
  const [documents, setDocuments] = useState<PartnerOnboardingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [documentType, setDocumentType] = useState<string>("BUSINESS_REGISTRATION");
  const [documentName, setDocumentName] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setDocuments(await partnerApi.documents());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Documents could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function chooseDocument() {
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const uploaded = await pickAndUploadDocument();
      if (uploaded) {
        setDocumentUrl(uploaded.url);
        setDocumentName((current) => current || uploaded.originalName);
        setMessage("Document uploaded. Submit it for KariGO review.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Document could not be uploaded.");
    } finally {
      setUploading(false);
    }
  }

  async function submitDocument() {
    if (!documentUrl.trim()) {
      setError("Upload a document or paste an approved secure document URL.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await partnerApi.uploadOnboardingDocument({
        documentType,
        documentName: documentName.trim() || undefined,
        documentUrl: documentUrl.trim()
      });
      setDocumentName("");
      setDocumentUrl("");
      setMessage("Onboarding document submitted for KariGO review.");
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Document could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState label="Loading onboarding documents..." />;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
      <Hero eyebrow="Onboarding" title="Documents" subtitle="Upload onboarding files from your phone and track KariGO review status." />
      {error ? <MutedText>{error}</MutedText> : null}
      {message ? <MutedText>{message}</MutedText> : null}
      <Card>
        <Text style={styles.title}>Submit document</Text>
        <View style={styles.chips}>
          {documentTypes.map((type) => (
            <Text
              key={type}
              onPress={() => setDocumentType(type)}
              style={[styles.chip, documentType === type ? styles.chipActive : null]}
            >
              {formatLabel(type)}
            </Text>
          ))}
        </View>
        <TextField label="Document name optional" placeholder="CAC certificate, Owner ID..." value={documentName} onChangeText={setDocumentName} />
        <PrimaryButton
          label={uploading ? "Uploading document..." : "Choose document"}
          onPress={() => void chooseDocument()}
          disabled={uploading || submitting}
          variant="secondary"
        />
        <TextField
          label="Document URL"
          placeholder="Upload a file or paste approved HTTPS URL"
          value={documentUrl}
          autoCapitalize="none"
          onChangeText={setDocumentUrl}
        />
        <MutedText>Accepted files: PDF, JPG, PNG and WebP. Do not upload passwords, OTPs, card details or unnecessary private information.</MutedText>
        <PrimaryButton
          label={submitting ? "Submitting..." : "Submit for review"}
          onPress={() => void submitDocument()}
          disabled={submitting || uploading}
        />
      </Card>
      {documents.length === 0 ? (
        <EmptyState title="No documents uploaded yet" body="Upload ID, business evidence, service evidence or other requested onboarding files from this screen." />
      ) : (
        documents.map((document) => (
          <Card key={document.id}>
            <View style={styles.row}>
              <Text style={styles.title}>{document.documentName || document.documentType}</Text>
              <Badge label={formatLabel(document.verificationStatus)} tone={statusTone(document.verificationStatus)} />
            </View>
            <MutedText>Uploaded {new Date(document.uploadedAt).toLocaleDateString()}</MutedText>
            {document.adminNote ? <MutedText>Admin note: {document.adminNote}</MutedText> : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

export default function DocumentsScreen() {
  return (
    <AuthGate>
      <DocumentsContent />
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  title: {
    flex: 1,
    color: brand.colors.charcoal,
    fontSize: 16,
    fontWeight: "900"
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: brand.colors.border,
    borderRadius: 999,
    color: brand.colors.muted,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: "800"
  },
  chipActive: {
    borderColor: brand.colors.primary,
    backgroundColor: "#FEF2F2",
    color: brand.colors.primary
  }
});
