import React, { type ReactNode, useMemo } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "../src/theme";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * true — SafeAreaView добавляет отступ снизу (экраны только со скроллом).
   * false — нижний отступ задаёт BottomActionBar или поле ввода.
   */
  bottomInset?: boolean;
};

/** Обёртка стека: верх обрабатывает ScreenHeader, низ — опционально safe area. */
export function ScreenLayout({ children, style, bottomInset = true }: Props) {
  const edges = bottomInset ? (["left", "right", "bottom"] as const) : (["left", "right"] as const);
  return (
    <SafeAreaView style={[styles.root, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

/** paddingBottom для ScrollView на экранах без фиксированной нижней панели. */
export function useScrollBottomPadding(extra = spacing.xl) {
  const insets = useSafeAreaInsets();
  return useMemo(
    () => ({ paddingBottom: Math.max(insets.bottom, extra) }),
    [insets.bottom, extra]
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
});
