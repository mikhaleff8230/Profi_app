import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLang } from "../src/context/LangContext";
import type { Lang } from "../src/i18n";
import { colors, radii } from "../src/theme";

export function LangSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <View style={styles.row}>
      {(["ru", "ro"] as Lang[]).map((l) => (
        <TouchableOpacity
          key={l}
          style={[styles.chip, lang === l && styles.chipOn]}
          onPress={() => setLang(l)}
          activeOpacity={0.8}
        >
          <Text style={[styles.label, lang === l && styles.labelOn]}>{l.toUpperCase()}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.lavender50,
    borderRadius: radii.full,
    padding: 4,
    gap: 4,
  },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.full },
  chipOn: { backgroundColor: colors.black },
  label: { fontSize: 12, fontWeight: "700", color: colors.neutral500 },
  labelOn: { color: colors.white },
});
