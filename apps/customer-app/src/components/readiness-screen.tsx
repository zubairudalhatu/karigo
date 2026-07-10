import { Feather } from "@expo/vector-icons";
import { brand } from "@karigo/config";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, Protected, Screen, ui } from "./ui";
import { KariGoAppTopBar } from "./kari-go-app-top-bar";

export function ReadinessScreen({
  title,
  message,
  icon = "clock",
  cta = "Back to home",
  secondaryCta,
  onSecondaryPress
}: {
  title: string;
  message: string;
  icon?: keyof typeof Feather.glyphMap;
  cta?: string;
  secondaryCta?: string;
  onSecondaryPress?: () => void;
}) {
  return (
    <Protected>
      <KariGoAppTopBar />
      <Screen topPadding={false}>
        <Card>
          <View style={styles.iconWrap}>
            <Feather name={icon} size={34} color={brand.colors.primary} />
          </View>
          <Text style={ui.heroTitle}>{title}</Text>
          <Text style={ui.pageIntro}>{message}</Text>
          {secondaryCta ? <Button title={secondaryCta} onPress={onSecondaryPress} /> : null}
          <Button title={cta} onPress={() => router.replace("/tabs/home")} />
        </Card>
      </Screen>
    </Protected>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FEF2F2",
    borderRadius: 22,
    height: 64,
    justifyContent: "center",
    width: 64
  }
});
