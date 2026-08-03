import { brand } from "@karigo/config";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { registrationApi, VendorApplicationInput } from "../../src/api/registration.api";
import { Card, Hero, MutedText, PrimaryButton, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/contexts/auth-context";
import { usePartnerRegistration } from "../../src/contexts/partner-registration-context";
import { formatLabel } from "../../src/lib/labels";

const splitCsv = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const clean = (value: string) => value.trim() || undefined;

function consentText(value: boolean) {
  return value ? "Accepted" : "Required";
}

export default function RegisterReviewScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { registration, updateRegistration } = usePartnerRegistration();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missingRequirements = [
    !registration.businessName.trim() ? "Complete your Business Name before submitting." : "",
    registration.businessDescription.trim().length < 8 ? "Complete your Business Description before submitting." : "",
    !registration.businessAddress.trim() ? "Complete your Business Address before submitting." : "",
    !registration.businessPhoneNumber.trim() ? "Complete your Business Phone before submitting." : "",
    !registration.businessEmail.trim() ? "Complete your Business Email before submitting." : "",
    !registration.contactFullName.trim() ? "Complete your Contact Full Name before submitting." : "",
    !registration.declarationAccepted ? "Accept the business details declaration before submitting." : "",
    !registration.privacyAccepted ? "Accept the KariGO review acknowledgement before submitting." : "",
    !registration.contactConsentAccepted ? "Accept contact consent before submitting." : ""
  ].filter(Boolean);
  const canSubmit = missingRequirements.length === 0;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload: VendorApplicationInput = {
        businessCategory: registration.businessCategory,
        businessName: registration.businessName.trim(),
        tradingName: clean(registration.tradingName),
        businessType: registration.accountType === "BOTH" ? "Product Seller and Service Provider" : formatLabel(registration.accountType),
        businessDescription: registration.businessDescription.trim(),
        businessAddress: registration.businessAddress.trim(),
        state: registration.state,
        city: registration.city,
        area: clean(registration.area),
        serviceAreas: splitCsv(registration.serviceAreas),
        operatingHours: clean(registration.operatingHours),
        businessPhoneNumber: registration.businessPhoneNumber.trim(),
        businessEmail: registration.businessEmail.trim(),
        websiteOrSocialLink: clean(registration.websiteOrSocialLink),
        contactFullName: registration.contactFullName.trim(),
        contactRole: registration.contactRole.trim() || "Owner/Manager",
        contactPhoneNumber: registration.contactPhoneNumber.trim() || registration.businessPhoneNumber.trim(),
        contactEmail: registration.contactEmail.trim() || registration.businessEmail.trim(),
        preferredContactMethod: registration.preferredContactMethod,
        deliveryReadiness: clean(registration.deliveryReadiness),
        deliveryPreference: clean(registration.deliveryPreference),
        averagePreparationTime: clean(registration.averagePreparationTime),
        numberOfStaff: clean(registration.numberOfStaff),
        catalogueCategory: clean(registration.catalogueCategory) ?? registration.businessCategory,
        estimatedCatalogueSize: clean(registration.estimatedCatalogueSize),
        existingDelivery: clean(registration.existingDelivery),
        documentPlaceholders: {
          businessRegistrationNumber: clean(registration.businessRegistrationNumber),
          businessRegistrationDocumentReady: registration.businessRegistrationDocumentReady,
          identityDocumentReady: registration.identityDocumentReady,
          serviceEvidenceReady: registration.serviceEvidenceReady,
          submittedFrom: "partner-mobile-app"
        },
        declarationAccepted: registration.declarationAccepted,
        privacyAccepted: registration.privacyAccepted,
        contactConsentAccepted: registration.contactConsentAccepted
      };
      await registrationApi.savePartnerDraft({
        onboardingStage: "REVIEW",
        accountType: registration.accountType,
        draftData: registration
      }).catch(() => undefined);
      const application = user
        ? await registrationApi.submitCurrentUserVendorApplication(payload)
        : await registrationApi.submitVendorApplication(payload);
      updateRegistration({ applicationReference: application.reference });
      if (user || application.alreadySubmitted) {
        router.replace("/");
      } else {
        router.replace("/register/success");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Partner application could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Hero eyebrow="Review" title="Review and submit" subtitle="Check your details before sending this application to KariGO Operations." />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {missingRequirements.length ? <Card>
        <Text style={styles.title}>Before you submit</Text>
        {missingRequirements.map((requirement) => <MutedText key={requirement}>{requirement}</MutedText>)}
      </Card> : null}
      <Card>
        <Text style={styles.title}>{registration.businessName || "Business name pending"}</Text>
        <MutedText>{formatLabel(registration.businessCategory)} - {registration.city}, {registration.state}</MutedText>
        <MutedText>{registration.businessDescription || "Description pending"}</MutedText>
      </Card>
      <Card>
        <Text style={styles.title}>Contact</Text>
        <MutedText>{registration.contactFullName || registration.fullName}</MutedText>
        <MutedText>{registration.businessPhoneNumber}</MutedText>
        <MutedText>{registration.businessEmail}</MutedText>
      </Card>
      <Card>
        <Text style={styles.title}>Declarations</Text>
        <ConsentRow
          label="I confirm these business details are accurate."
          value={registration.declarationAccepted}
          onPress={() => updateRegistration({ declarationAccepted: !registration.declarationAccepted })}
        />
        <ConsentRow
          label="I understand KariGO must review this application before onboarding."
          value={registration.privacyAccepted}
          onPress={() => updateRegistration({ privacyAccepted: !registration.privacyAccepted })}
        />
        <ConsentRow
          label="KariGO may contact me about this application."
          value={registration.contactConsentAccepted}
          onPress={() => updateRegistration({ contactConsentAccepted: !registration.contactConsentAccepted })}
        />
        <MutedText>
          Declaration: {consentText(registration.declarationAccepted)}. Review: {consentText(registration.privacyAccepted)}. Contact consent: {consentText(registration.contactConsentAccepted)}.
        </MutedText>
      </Card>
      <PrimaryButton label={submitting ? "Submitting..." : "Submit application"} onPress={() => void submit()} disabled={submitting || !canSubmit} />
    </Screen>
  );
}

function ConsentRow({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: value }} onPress={onPress} style={styles.consentRow}>
      <View style={[styles.checkbox, value ? styles.checkboxActive : null]}>
        <Text style={styles.checkboxText}>{value ? "Y" : ""}</Text>
      </View>
      <Text style={styles.consentLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    color: brand.colors.charcoal,
    fontSize: 17,
    fontWeight: "900"
  },
  consentRow: {
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
  consentLabel: {
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
