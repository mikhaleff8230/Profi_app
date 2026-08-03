import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../src/theme";

type Variant = "default" | "success" | "warning" | "muted";

const variantStyles: Record<Variant, { bg: string; fg: string }> = {
  default: { bg: colors.lavender100, fg: colors.black },
  success: { bg: "#dcfce7", fg: "#166534" },
  warning: { bg: "#fef3c7", fg: "#92400e" },
  muted: { bg: colors.neutral100, fg: colors.neutral600 },
};

export function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: Variant }) {
  const v = variantStyles[variant];
  return (
    <View style={[styles.wrap, { backgroundColor: v.bg }]}>
      <Text style={[styles.text, { color: v.fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  text: { fontSize: 12, fontWeight: "600" },
});
