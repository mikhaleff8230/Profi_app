import React, { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "../src/theme";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Показать верхнюю границу (кнопки «Написать клиенту» и т.п.) */
  bordered?: boolean;
};

/** Фиксированная нижняя панель с отступом над gesture bar / home indicator. */
export function BottomActionBar({ children, style, bordered = true }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        bordered && styles.bordered,
        { paddingBottom: Math.max(insets.bottom, spacing.lg) },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    backgroundColor: colors.white,
  },
  bordered: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.neutral100,
  },
});
