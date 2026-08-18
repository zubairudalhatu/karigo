import { brand } from "@karigo/config";
import { nigeriaStateByValue, nigeriaStates } from "@karigo/shared-types";
import { useState } from "react";
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

export function NigeriaStateSelector({ value, onChange }: { value: string; onChange: (stateCode: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = nigeriaStateByValue(value);

  return <>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="State or Territory"
      accessibilityHint="Opens the list of Nigerian States and the Federal Capital Territory"
      onPress={() => setOpen(true)}
      style={styles.field}
    >
      <Text style={styles.label}>State / Territory</Text>
      <Text style={selected ? styles.value : styles.placeholder}>{selected?.name ?? "Select State or Territory"}</Text>
    </Pressable>
    <Modal animationType="slide" onRequestClose={() => setOpen(false)} presentationStyle="pageSheet" visible={open}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.heading}>
          <View style={styles.headingCopy}>
            <Text style={styles.title}>State / Territory</Text>
            <Text style={styles.helper}>Choose from all 36 Nigerian States or the Federal Capital Territory.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close State selector" onPress={() => setOpen(false)} style={styles.close}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          {nigeriaStates.map((state) => <Pressable
            key={state.code}
            accessibilityRole="button"
            accessibilityState={{ selected: state.code === selected?.code }}
            onPress={() => { onChange(state.code); setOpen(false); }}
            style={[styles.option, state.code === selected?.code && styles.optionSelected]}
          >
            <Text style={[styles.optionText, state.code === selected?.code && styles.optionTextSelected]}>{state.name}</Text>
          </Pressable>)}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  field: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 16, borderWidth: 1, gap: 4, minHeight: 58, padding: 12 },
  label: { color: brand.colors.muted, fontSize: 12, fontWeight: "800" },
  value: { color: brand.colors.charcoal, fontSize: 15, fontWeight: "700" },
  placeholder: { color: brand.colors.muted, fontSize: 15 },
  modal: { backgroundColor: brand.colors.background, flex: 1 },
  heading: { alignItems: "flex-start", borderBottomColor: brand.colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 12, justifyContent: "space-between", padding: 20 },
  headingCopy: { flex: 1, gap: 4 },
  title: { color: brand.colors.charcoal, fontSize: 23, fontWeight: "900" },
  helper: { color: brand.colors.muted, lineHeight: 20 },
  close: { padding: 8 },
  closeText: { color: brand.colors.primary, fontWeight: "900" },
  list: { gap: 8, padding: 18, paddingBottom: 36 },
  option: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 14, borderWidth: 1, padding: 15 },
  optionSelected: { backgroundColor: "#FEF2F2", borderColor: brand.colors.primary },
  optionText: { color: brand.colors.charcoal, fontWeight: "700" },
  optionTextSelected: { color: brand.colors.primaryDark, fontWeight: "900" }
});
