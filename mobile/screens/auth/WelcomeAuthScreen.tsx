import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, spacing, typography } from "../../src/theme";
import { PrimaryButton } from "../../components/PrimaryButton";
import { TreaboLogo } from "../../components/TreaboLogo";
import type { AuthStackParamList } from "../../src/navigation/types";

type Nav = NativeStackNavigationProp<AuthStackParamList>;

export default function WelcomeAuthScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) }]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TreaboLogo />
        <Text style={styles.title}>Даем заработать каждому мастеру.</Text>
        <Text style={styles.note}>Treabo Proffi — приложение только для мастеров. Заказы, карта, чат и анкета специалиста в одном месте.</Text>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <PrimaryButton title="Стать мастером" onPress={() => navigation.navigate("PhoneEntry", { role: "specialist" })} />
        <PrimaryButton title="У меня уже есть аккаунт" variant="ghost" onPress={() => navigation.navigate("Login")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, paddingHorizontal: spacing.xxl },
  scroll: { flexGrow: 1, paddingTop: 44, paddingBottom: 16, alignItems: "center", justifyContent: "center" },
  title: {
    ...typography.title,
    fontSize: 28,
    lineHeight: 34,
    color: colors.black,
    marginTop: spacing.xl,
    textAlign: "center",
    alignSelf: "stretch",
  },
  note: {
    fontSize: 14,
    color: colors.neutral500,
    marginTop: spacing.md,
    textAlign: "center",
    alignSelf: "stretch",
    lineHeight: 20,
  },
  footer: { gap: spacing.md },
});
