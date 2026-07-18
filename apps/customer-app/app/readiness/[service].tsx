import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ReadinessScreen } from "../../src/components/readiness-screen";

const readinessContent: Record<string, { title: string; message: string; icon: keyof typeof Feather.glyphMap; secondaryCta?: string; onSecondaryPress?: () => void }> = {
  taxi: {
    title: "KariGO Rides is preparing",
    message: "KariGO is accepting Ride interest while verified Ride Captain onboarding, vehicle checks, fare controls, maps, safety reviews and ride operations remain under operations approval.",
    icon: "navigation",
    secondaryCta: "Join Ride Waitlist",
    onSecondaryPress: () => router.push("/taxi/waitlist")
  },
  airtime: {
    title: "Airtime is preparing",
    message: "KariGO is preparing secure provider integrations for airtime, data, electricity and cable TV payments.",
    icon: "phone"
  },
  data: {
    title: "Data is preparing",
    message: "KariGO is preparing secure provider integrations for airtime, data, electricity and cable TV payments.",
    icon: "wifi"
  },
  electricity: {
    title: "Electricity is preparing",
    message: "KariGO is preparing secure provider integrations for airtime, data, electricity and cable TV payments.",
    icon: "zap"
  },
  "cable-tv": {
    title: "Cable TV is preparing",
    message: "KariGO is preparing secure provider integrations for airtime, data, electricity and cable TV payments.",
    icon: "tv"
  },
  pharmacy: {
    title: "Pharmacy is preparing launch",
    message: "KariGO is preparing approved pharmacy vendor onboarding, compliance checks and safe product visibility before pharmacy marketplace launch.",
    icon: "plus-square"
  },
  "sme-services": {
    title: "SME Services review",
    message: "KariGO supports requests for approved service providers. Doctor and health professional categories remain review-only until compliance approval.",
    icon: "briefcase"
  }
};

export default function ServiceReadinessRoute() {
  const { service } = useLocalSearchParams<{ service?: string }>();
  const content = readinessContent[service ?? ""] ?? {
    title: "Service is preparing",
    message: "KariGO is preparing this service carefully before launch.",
    icon: "clock" as keyof typeof Feather.glyphMap
  };

  return <ReadinessScreen {...content} />;
}
