import { brand } from "@karigo/config";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { partnerApi, PartnerOnboardingDocument } from "../../src/api/partner.api";
import { AuthGate } from "../../src/components/auth-gate";
import { Badge, Card, EmptyState, Hero, LoadingState, MutedText, Screen } from "../../src/components/ui";
import { formatLabel, statusTone } from "../../src/lib/labels";

function DocumentsContent() {
  const [documents, setDocuments] = useState<PartnerOnboardingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  if (loading) return <LoadingState label="Loading onboarding documents..." />;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
      <Hero eyebrow="Onboarding" title="Documents" subtitle="Track document review status from mobile. Uploads remain controlled through Partner Workspace for this foundation release." />
      {error ? <MutedText>{error}</MutedText> : null}
      {documents.length === 0 ? (
        <EmptyState title="No documents uploaded yet" body="Use Partner Workspace to upload ID, business evidence, service evidence and other requested onboarding files." />
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
  }
});
