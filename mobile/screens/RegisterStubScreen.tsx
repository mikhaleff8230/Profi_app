import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLang } from "../src/context/LangContext";
import { colors, spacing, typography } from "../src/theme";
import { ScreenHeader } from "../components/ScreenHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { LangSwitcher } from "../components/LangSwitcher";
import type { AuthStackParamList } from "../src/navigation/types";

type Nav = NativeStackNavigationProp<AuthStackParamList>;

export default function RegisterStubScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useLang();
  return (
    <View style={styles.root}>
      <ScreenHeader title="" onBack={() => navigation.goBack()} right={<LangSwitcher />} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>{t("stub_register_title")}</Text>
        <Text style={styles.p}>{t("stub_register_body")}</Text>
        <PrimaryButton title={t("stub_use_email")} onPress={() => navigation.navigate("AuthMain")} />
        <PrimaryButton title={t("back_to_login")} variant="ghost" onPress={() => navigation.navigate("Login")} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.lavender50 },
  scroll: { padding: spacing.xxl, gap: 16 },
  h1: { ...typography.title, fontSize: 28, marginBottom: 8 },
  p: { fontSize: 16, color: colors.neutral600, lineHeight: 24, marginBottom: 8 },
});
