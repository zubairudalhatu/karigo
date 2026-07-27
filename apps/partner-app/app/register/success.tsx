import { brand } from "@karigo/config";
import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import { Card, Hero, MutedText, PrimaryButton, Screen } from "../../src/components/ui";
import { usePartnerRegistration } from "../../src/contexts/partner-registration-context";

export default function RegisterSuccessScreen() {
  const router = useRouter();
  const { registration, resetRegistration } = usePartnerRegistration();

  function backToLogin() {
    resetRegistration();
    router.replace("/auth/login");
  }

  return (
    <Screen>
      <View style={styles.logoWrap}>
        <Image source={require("../../assets/karigo-logo.png")} resizeMode="contain" style={styles.logo} />
      </View>
      <Hero eyebrow="Application submitted" title="KariGO has received your application" subtitle="KariGO Operations will review your partner details and contact you with next steps." />
      <Card>
        <Text style={styles.title}>{registration.businessName || "Partner application"}</Text>
        {registration.applicationReference ? <MutedText>Reference: {registration.applicationReference}</MutedText> : null}
        <MutedText>Approval is not automatic. Marketplace visibility, payouts and service dispatch stay disabled until KariGO completes review and activation.</MutedText>
        <PrimaryButton label="Back to sign in" onPress={backToLogin} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoWrap: {
    alignItems: "center",
    paddingTop: 16
  },
  logo: {
    width: 180,
    height: 72
  },
  title: {
    color: brand.colors.charcoal,
    fontSize: 18,
    fontWeight: "900"
  }
});
