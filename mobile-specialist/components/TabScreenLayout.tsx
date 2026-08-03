import React, { type ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../src/theme";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Обёртка для экранов с нижними вкладками: safe area сверху и по бокам; снизу — tab bar. */
export function TabScreenLayout({ children, style }: Props) {
  return (
    <SafeAreaView style={[styles.root, style]} edges={["top", "left", "right"]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
});
