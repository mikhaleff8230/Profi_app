import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../src/api";
import { useAuth } from "../src/context/AuthContext";
import { useLang } from "../src/context/LangContext";
import { colors, radii, spacing, typography } from "../src/theme";
import { formatRuNationalDisplay, isValidRuMobileInput, normalizeRuNationalInput, toApiPhoneFromNational10 } from "../src/utils/phone";
import type { AuthStackParamList } from "../src/navigation/types";

type Nav = NativeStackNavigationProp<AuthStackParamList>;

export default function LoginStubScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { t } = useLang();
  const { signIn } = useAuth();
  const [national, setNational] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const display = useMemo(() => formatRuNationalDisplay(national), [national]);
  const phoneValid = isValidRuMobileInput(national);
  const apiPhone = useMemo(() => (phoneValid ? toApiPhoneFromNational10(national) : ""), [national, phoneValid]);
  const canSubmit = phoneValid && password.length >= 4;

  const onSubmit = async () => {
    if (!canSubmit || !apiPhone) return;
    setBusy(true);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone: apiPhone, password }),
        auth: false,
      });
      await signIn(data.token, data.user);
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
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
        <Text style={styles.title}>Вход</Text>
        <Text style={styles.sub}>Введите телефон и пароль, указанные при регистрации.</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.phoneRow}>
          <View style={styles.countryPill}>
            <Text style={styles.flag}>🇷🇺</Text>
            <Text style={styles.prefix}>+7</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            accessibilityLabel="Телефон входа"
            testID="login-phone"
            placeholder="903 000 00 00"
            placeholderTextColor={colors.neutral400}
            keyboardType="phone-pad"
            value={display}
            onChangeText={onChangeNational}
          />
        </View>
        <TextInput
          style={styles.input}
          accessibilityLabel="Пароль входа"
          testID="login-password"
          placeholder={t("auth_password_placeholder")}
          placeholderTextColor={colors.neutral400}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[styles.cta, !canSubmit && styles.ctaDisabled]}
          accessibilityLabel="Войти"
          testID="login-submit"
          onPress={onSubmit}
          disabled={!canSubmit || busy}
          activeOpacity={0.9}
        >
          {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.ctaText}>Войти</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("Welcome")}>
          <Text style={styles.registerLink}>{t("go_to_register")}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  top: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.md },
  backWrap: { width: 40, height: 40, justifyContent: "center", marginBottom: spacing.md },
  title: { ...typography.title, fontSize: 28, lineHeight: 34, color: colors.black },
  sub: { fontSize: 14, color: colors.neutral500, marginTop: 8, lineHeight: 20 },
  body: { flex: 1, paddingHorizontal: spacing.xxl, gap: 12 },
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
  footer: { paddingHorizontal: spacing.xxl, gap: 14 },
  cta: {
    backgroundColor: colors.black,
    borderRadius: radii.full,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: { backgroundColor: colors.neutral300 },
  ctaText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  registerLink: { textAlign: "center", color: colors.neutral600, fontSize: 14, fontWeight: "600" },
});
