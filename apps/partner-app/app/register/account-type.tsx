import { brand } from "@karigo/config";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PartnerAccountType } from "../../src/contexts/partner-registration-context";
import { Card, Hero, MutedText, PrimaryButton, Screen } from "../../src/components/ui";
import { usePartnerRegistration } from "../../src/contexts/partner-registration-context";
import type { VendorApplicationCategory } from "../../src/api/registration.api";

const accountTypes: Array<{
  value: PartnerAccountType;
  title: string;
  body: string;
  category: VendorApplicationCategory;
  businessType: string;
}> = [
  {
    value: "PRODUCT_SELLER",
    title: "Product Seller",
    body: "Restaurants, grocery stores, market sellers and approved product merchants.",
    category: "RESTAURANT",
    businessType: "Product Seller"
  },
  {
    value: "SERVICE_PROVIDER",
    title: "Service Provider",
    body: "Approved SME service providers such as cleaners, printing providers, technicians or laundry operators.",
    category: "SME_SERVICES",
    businessType: "Service Provider"
  },
  {
    value: "BOTH",
    title: "Both",
    body: "Partners who sell products and also offer approved services.",
    category: "OTHER_MARKETPLACE_VENDOR",
    businessType: "Product Seller and Service Provider"
  }
];

export default function RegisterAccountTypeScreen() {
  const router = useRouter();
  const { registration, updateRegistration } = usePartnerRegistration();

  return (
    <Screen>
      <Hero eyebrow="Partner type" title="Choose your onboarding path" subtitle="KariGO reviews every partner before marketplace activity is approved." />
      {accountTypes.map((type) => {
        const active = registration.accountType === type.value;
        return (
          <Pressable
            accessibilityRole="button"
            key={type.value}
            onPress={() => updateRegistration({
              accountType: type.value,
              businessCategory: type.category,
              catalogueCategory: type.businessType,
              deliveryReadiness: type.businessType
            })}
          >
            <Card>
              <View style={styles.row}>
                <Text style={styles.title}>{type.title}</Text>
                <Text style={[styles.pill, active ? styles.pillActive : null]}>{active ? "Selected" : "Choose"}</Text>
              </View>
              <MutedText>{type.body}</MutedText>
            </Card>
          </Pressable>
        );
      })}
      <PrimaryButton label="Continue" onPress={() => router.push("/register/business")} />
    </Screen>
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
    fontSize: 18,
    fontWeight: "900"
  },
  pill: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: brand.colors.border,
    borderRadius: 999,
    color: brand.colors.muted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "900"
  },
  pillActive: {
    borderColor: brand.colors.primary,
    backgroundColor: "#FEF2F2",
    color: brand.colors.primary
  }
});
