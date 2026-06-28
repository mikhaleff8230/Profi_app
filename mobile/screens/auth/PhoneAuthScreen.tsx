import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE, apiFetch } from "../../src/api";
import { useAuth } from "../../src/context/AuthContext";
import { useLang } from "../../src/context/LangContext";
import { colors, radii, spacing, typography } from "../../src/theme";
import { formatRuNationalDisplay, isValidRuMobileInput, normalizeRuNationalInput, toApiPhoneFromNational10 } from "../../src/utils/phone";
import type { AuthStackParamList } from "../../src/navigation/types";

type Nav = NativeStackNavigationProp<AuthStackParamList>;
type R = RouteProp<AuthStackParamList, "PhoneEntry">;

function isEmailOk(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() || "";
  return local ? local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "User";
}

function oauthReturnUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.origin;
  }
  return "proffi://auth";
}

export default function PhoneAuthScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { t } = useLang();
  const { signIn } = useAuth();
  const { role } = route.params;
  const [national, setNational] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const display = useMemo(() => formatRuNationalDisplay(national), [national]);
  const phoneValid = isValidRuMobileInput(national);
  const emailValid = isEmailOk(email);
  const passwordValid = password.length >= 4;
  const apiPhone = useMemo(() => (phoneValid ? toApiPhoneFromNational10(national) : ""), [national, phoneValid]);
  const canSubmit = phoneValid && emailValid && passwordValid;
  const roleTitle = role === "specialist" ? "Регистрация мастера" : "Регистрация заказчика";

  const onSubmit = async () => {
    if (!phoneValid || !apiPhone) {
      Alert.alert("Ошибка", t("auth_invalid_phone"));
      return;
    }
    if (!emailValid) {
      Alert.alert("Ошибка", t("auth_invalid_email"));
      return;
    }
    if (!passwordValid) {
      Alert.alert("Ошибка", t("auth_password_short"));
      return;
    }
    setBusy(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const data = await apiFetch("/auth/register-phone", {
        method: "POST",
        body: JSON.stringify({
          phone: apiPhone,
          email: cleanEmail,
          password,
          name: displayNameFromEmail(cleanEmail),
          role,
        }),
        auth: false,
      });
      await signIn(data.token, data.user);
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onOAuth = async (provider: "yandex" | "google") => {
    const params = new URLSearchParams({
      role,
      return_url: oauthReturnUrl(),
    });
    const url = `${API_BASE}/api/proffi/auth/oauth/${provider}/redirect?${params.toString()}`;
    try {
      await Linking.openURL(url);
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : String(e));
    }
  };

  const onChangeNational = (text: string) => {
    setNational(normalizeRuNationalInput(text));
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="dark" />
      <View style={[styles.top, { paddingTop: Math.max(insets.top, 8) }]}>
        <TouchableOpacity style={styles.backWrap} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>{roleTitle}</Text>
        <Text style={styles.sub}>Телефон не проверяем. Он нужен для связи в заказах.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.phoneRow}>
          <View style={styles.countryPill}>
            <Text style={styles.flag}>🇷🇺</Text>
            <Text style={styles.prefix}>+7</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            accessibilityLabel="Телефон регистрации"
            testID="register-phone"
            placeholder="903 000 00 00"
            placeholderTextColor={colors.neutral400}
            keyboardType="phone-pad"
            value={display}
            onChangeText={onChangeNational}
          />
        </View>

        <TextInput
          style={styles.input}
          accessibilityLabel="Email регистрации"
          testID="register-email"
          placeholder="email@example.com"
          placeholderTextColor={colors.neutral400}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          accessibilityLabel="Пароль регистрации"
          testID="register-password"
          placeholder={t("auth_password_placeholder")}
          placeholderTextColor={colors.neutral400}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.cta, !canSubmit && styles.ctaDisabled]}
          accessibilityLabel="Зарегистрироваться"
          testID="register-submit"
          onPress={onSubmit}
          disabled={!canSubmit || busy}
          activeOpacity={0.9}
        >
          {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.ctaText}>Зарегистрироваться</Text>}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>или</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity style={styles.socialBtn} onPress={() => onOAuth("yandex")}>
          <Text style={styles.socialMark}>Я</Text>
          <Text style={styles.socialText}>Продолжить через Яндекс</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialBtn} onPress={() => onOAuth("google")}>
          <Text style={styles.socialMark}>G</Text>
          <Text style={styles.socialText}>Продолжить через Google</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.loginLink}>{t("back_to_login")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  top: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.md },
  backWrap: { width: 40, height: 40, justifyContent: "center", marginBottom: spacing.md },
  title: { ...typography.title, fontSize: 28, lineHeight: 34, color: colors.black },
  sub: { fontSize: 14, color: colors.neutral500, marginTop: 8, lineHeight: 20 },
  body: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxl, gap: 12 },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neutral100,
    borderRadius: radii.lg,
    paddingLeft: 10,
    paddingRight: 14,
    minHeight: 56,
    gap: 10,
  },
  countryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    minHeight: 36,
  },
  flag: { fontSize: 18, lineHeight: 22 },
  prefix: { fontSize: 17, fontWeight: "700", color: colors.black },
  phoneInput: { flex: 1, fontSize: 17, color: colors.black, paddingVertical: 14 },
  input: {
    backgroundColor: colors.neutral100,
    borderRadius: radii.lg,
    padding: 16,
    fontSize: 16,
    color: colors.black,
    minHeight: 56,
  },
  cta: {
    backgroundColor: colors.black,
    borderRadius: radii.full,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  ctaDisabled: { backgroundColor: colors.neutral300 },
  ctaText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 6 },
  divider: { flex: 1, height: 1, backgroundColor: colors.neutral100 },
  dividerText: { color: colors.neutral500, fontSize: 13 },
  socialBtn: {
    minHeight: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.neutral100,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  socialMark: { width: 24, textAlign: "center", fontSize: 18, fontWeight: "900", color: colors.black },
  socialText: { fontSize: 15, fontWeight: "700", color: colors.black },
  loginLink: { marginTop: 8, textAlign: "center", color: colors.neutral600, fontSize: 14, fontWeight: "600" },
});
