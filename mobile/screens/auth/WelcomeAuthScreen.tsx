import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLang } from "../../src/context/LangContext";
import { colors, spacing, typography } from "../../src/theme";
import { PrimaryButton } from "../../components/PrimaryButton";

import { OnboardingHeroIllustration } from "../../components/OnboardingHeroIllustration";
import type { AuthStackParamList } from "../../src/navigation/types";

type Nav = NativeStackNavigationProp<AuthStackParamList>;

export default function WelcomeAuthScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { t } = useLang();

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) }]}>
      <StatusBar style="dark" />
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <OnboardingHeroIllustration width={280} height={200} />
        <Text style={styles.title}>{t("onboarding_title")}</Text>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <PrimaryButton title={t("onboarding_specialist_cta")} onPress={() => navigation.navigate("PhoneEntry", { role: "specialist" })} />
        <PrimaryButton
          title={t("onboarding_customer_cta")}
          variant="ghost"
          onPress={() => navigation.navigate("PhoneEntry", { role: "customer" })}
        />
        <PrimaryButton title={t("back_to_login")} variant="ghost" onPress={() => navigation.navigate("Login")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, paddingHorizontal: spacing.xxl },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  scroll: { flexGrow: 1, paddingTop: 8, paddingBottom: 16 },
  title: {
    ...typography.title,
    fontSize: 28,
    lineHeight: 34,
    color: colors.black,
    marginTop: spacing.lg,
    textAlign: "left",
    alignSelf: "stretch",
  },
  footer: { gap: spacing.md },
});
