import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../src/theme";

export function EmptyState({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{text}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  text: { fontSize: 16, color: colors.neutral500, textAlign: "center" },
});
