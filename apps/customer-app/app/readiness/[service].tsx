import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ReadinessScreen } from "../../src/components/readiness-screen";

const readinessContent: Record<string, { title: string; message: string; icon: keyof typeof Feather.glyphMap; secondaryCta?: string; onSecondaryPress?: () => void }> = {
  taxi: {
    title: "Taxi is coming soon",
    message: "Taxi is coming soon. KariGO is preparing verified driver onboarding, vehicle checks, fare controls, maps, safety reviews and dispatch operations before launch.",
    icon: "navigation",
    secondaryCta: "Join Taxi Waitlist",
    onSecondaryPress: () => router.push("/taxi/waitlist")
  },
  airtime: {
    title: "Airtime is coming soon",
    message: "Bills & Utilities is coming soon. KariGO is preparing secure provider integrations for airtime, data, electricity and cable TV payments.",
    icon: "phone"
  },
  data: {
    title: "Data is coming soon",
    message: "Bills & Utilities is coming soon. KariGO is preparing secure provider integrations for airtime, data, electricity and cable TV payments.",
    icon: "wifi"
  },
  electricity: {
    title: "Electricity is coming soon",
    message: "Bills & Utilities is coming soon. KariGO is preparing secure provider integrations for airtime, data, electricity and cable TV payments.",
    icon: "zap"
  },
  "cable-tv": {
    title: "Cable TV is coming soon",
    message: "Bills & Utilities is coming soon. KariGO is preparing secure provider integrations for airtime, data, electricity and cable TV payments.",
    icon: "tv"
  },
  pharmacy: {
    title: "Pharmacy is preparing launch",
    message: "KariGO is preparing approved pharmacy vendor onboarding, compliance checks and safe product visibility before pharmacy marketplace launch.",
    icon: "plus-square"
  },
  "sme-errand": {
    title: "SME Errand readiness",
    message: "KariGO is preparing stronger SME errand controls for business tasks. You can continue using the existing parcel and errand request flow where available.",
    icon: "briefcase"
  }
};

export default function ServiceReadinessRoute() {
  const { service } = useLocalSearchParams<{ service?: string }>();
  const content = readinessContent[service ?? ""] ?? {
    title: "Service is coming soon",
    message: "KariGO is preparing this service carefully before launch.",
    icon: "clock" as keyof typeof Feather.glyphMap
  };

  return <ReadinessScreen {...content} />;
}
