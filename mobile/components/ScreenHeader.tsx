import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../src/theme";

type Props = {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  /** если onBack не передан — кнопка «назад» скрыта */
  showBack?: boolean;
};

export function ScreenHeader({ title, onBack, right, showBack = true }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 12) }]}>
      {showBack && onBack ? (
        <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.black} />
        </TouchableOpacity>
      ) : (
        <View style={styles.backPlaceholder} />
      )}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral100,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.lavender50,
  },
  backPlaceholder: { width: 40 },
  title: { ...typography.title, fontSize: 17, flex: 1, textAlign: "center", marginHorizontal: 8 },
  right: { minWidth: 40, alignItems: "flex-end" },
});
