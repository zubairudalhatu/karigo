import { brand } from "@karigo/config";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, Hero, PrimaryButton, Screen, TextField } from "../../src/components/ui";
import { usePartnerRegistration } from "../../src/contexts/partner-registration-context";
import type { VendorApplicationCategory } from "../../src/api/registration.api";

const categoryOptions: Array<{ label: string; value: VendorApplicationCategory }> = [
  { label: "Restaurant", value: "RESTAURANT" },
  { label: "Groceries", value: "GROCERIES" },
  { label: "Market items", value: "MARKET_ITEMS" },
  { label: "Service provider", value: "SME_SERVICES" },
  { label: "Other vendor", value: "OTHER_MARKETPLACE_VENDOR" }
];

function stateForCity(city: "Kano" | "Abuja") {
  return city === "Abuja" ? "FCT" : "Kano";
}

export default function RegisterBusinessScreen() {
  const router = useRouter();
  const { registration, updateRegistration } = usePartnerRegistration();
  const ready = registration.businessName.trim() &&
    registration.businessDescription.trim().length >= 8 &&
    registration.businessAddress.trim() &&
    registration.businessPhoneNumber.trim() &&
    registration.businessEmail.trim() &&
    registration.contactFullName.trim();

  return (
    <Screen>
      <Hero eyebrow="Business details" title="Tell KariGO about your business" subtitle="Applications are currently reviewed for Kano and Abuja launch areas." />
      <Card>
        <TextField label="Business name" value={registration.businessName} onChangeText={(businessName) => updateRegistration({ businessName })} />
        <TextField label="Trading name optional" value={registration.tradingName} onChangeText={(tradingName) => updateRegistration({ tradingName })} />
        <View style={styles.chips}>
          {categoryOptions.map((category) => (
            <Text
              key={category.value}
              onPress={() => updateRegistration({ businessCategory: category.value, catalogueCategory: category.label })}
              style={[styles.chip, registration.businessCategory === category.value ? styles.chipActive : null]}
            >
              {category.label}
            </Text>
          ))}
        </View>
        <TextField
          label="Business description"
          value={registration.businessDescription}
          multiline
          onChangeText={(businessDescription) => updateRegistration({ businessDescription })}
          style={styles.multiline}
        />
        <TextField
          label="Business address"
          value={registration.businessAddress}
          multiline
          onChangeText={(businessAddress) => updateRegistration({ businessAddress })}
          style={styles.multiline}
        />
        <View style={styles.chips}>
          {(["Kano", "Abuja"] as const).map((city) => (
            <Pressable
              accessibilityRole="button"
              key={city}
              onPress={() => updateRegistration({ city, state: stateForCity(city) })}
              style={[styles.cityButton, registration.city === city ? styles.cityButtonActive : null]}
            >
              <Text style={[styles.cityText, registration.city === city ? styles.cityTextActive : null]}>{city}</Text>
            </Pressable>
          ))}
        </View>
        <TextField label="Area optional" placeholder="Tarauni, Wuse..." value={registration.area} onChangeText={(area) => updateRegistration({ area })} />
        <TextField label="Business phone" keyboardType="phone-pad" value={registration.businessPhoneNumber} onChangeText={(businessPhoneNumber) => updateRegistration({ businessPhoneNumber, contactPhoneNumber: businessPhoneNumber })} />
        <TextField label="Business email" autoCapitalize="none" keyboardType="email-address" value={registration.businessEmail} onChangeText={(businessEmail) => updateRegistration({ businessEmail, contactEmail: businessEmail })} />
        <TextField label="Website or social link optional" autoCapitalize="none" value={registration.websiteOrSocialLink} onChangeText={(websiteOrSocialLink) => updateRegistration({ websiteOrSocialLink })} />
        <TextField label="Contact full name" value={registration.contactFullName} onChangeText={(contactFullName) => updateRegistration({ contactFullName })} />
        <TextField label="Contact role" value={registration.contactRole} onChangeText={(contactRole) => updateRegistration({ contactRole })} />
        <PrimaryButton label="Continue" onPress={() => router.push("/register/service-details")} disabled={!ready} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  multiline: {
    minHeight: 92,
    textAlignVertical: "top"
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
  },
  cityButton: {
    borderWidth: 1,
    borderColor: brand.colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  cityButtonActive: {
    borderColor: brand.colors.primary,
    backgroundColor: "#FEF2F2"
  },
  cityText: {
    color: brand.colors.muted,
    fontWeight: "900"
  },
  cityTextActive: {
    color: brand.colors.primary
  }
});
