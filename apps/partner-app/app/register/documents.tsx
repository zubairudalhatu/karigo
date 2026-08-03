import { brand } from "@karigo/config";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { registrationApi } from "../../src/api/registration.api";
import { Card, Hero, MutedText, PrimaryButton, Screen, TextField } from "../../src/components/ui";
import { usePartnerRegistration } from "../../src/contexts/partner-registration-context";

function CheckRow({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: value }} onPress={onPress} style={styles.checkRow}>
      <View style={[styles.checkbox, value ? styles.checkboxActive : null]}>
        <Text style={styles.checkboxText}>{value ? "Y" : ""}</Text>
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

export default function RegisterDocumentsScreen() {
  const router = useRouter();
  const { registration, updateRegistration } = usePartnerRegistration();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueNext() {
    setSaving(true);
    setError(null);
    try {
      await registrationApi.savePartnerDraft({
        onboardingStage: "REVIEW",
        accountType: registration.accountType,
        draftData: registration
      });
      router.push("/register/review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Partner document readiness could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Hero eyebrow="Documents" title="Prepare review evidence" subtitle="Tell KariGO which documents are ready. File uploads happen after approval/login from the mobile Documents screen." />
      <Card>
        <TextField
          label="Business registration number optional"
          value={registration.businessRegistrationNumber}
          onChangeText={(businessRegistrationNumber) => updateRegistration({ businessRegistrationNumber })}
        />
        <CheckRow
          label="Business registration or CAC evidence is ready"
          value={registration.businessRegistrationDocumentReady}
          onPress={() => updateRegistration({ businessRegistrationDocumentReady: !registration.businessRegistrationDocumentReady })}
        />
        <CheckRow
          label="Owner/manager identity document is ready"
          value={registration.identityDocumentReady}
          onPress={() => updateRegistration({ identityDocumentReady: !registration.identityDocumentReady })}
        />
        <CheckRow
          label="Service or product evidence is ready where applicable"
          value={registration.serviceEvidenceReady}
          onPress={() => updateRegistration({ serviceEvidenceReady: !registration.serviceEvidenceReady })}
        />
        <MutedText>Do not upload or share passwords, OTPs, card details or unrelated private records. KariGO will request only necessary onboarding evidence.</MutedText>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={saving ? "Saving..." : "Review application"} onPress={() => void continueNext()} disabled={saving} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: brand.colors.border,
    borderRadius: 8,
    backgroundColor: brand.colors.white
  },
  checkboxActive: {
    borderColor: brand.colors.primary,
    backgroundColor: brand.colors.primary
  },
  checkboxText: {
    color: brand.colors.white,
    fontWeight: "900"
  },
  checkLabel: {
    flex: 1,
    color: brand.colors.charcoal,
    fontSize: 14,
    fontWeight: "800"
  },
  error: {
    color: brand.colors.primary,
    fontWeight: "800"
  }
});
