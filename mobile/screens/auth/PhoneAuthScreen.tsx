import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { apiFetch } from "../../src/api";
import { useAuth } from "../../src/context/AuthContext";
import { useLang } from "../../src/context/LangContext";
import { colors, radii, spacing, typography } from "../../src/theme";
import { formatRuNationalDisplay, isValidRuMobileInput, normalizeRuNationalInput, toApiPhoneFromNational10 } from "../../src/utils/phone";
import type { AuthStackParamList } from "../../src/navigation/types";

type Nav = NativeStackNavigationProp<AuthStackParamList>;
type R = RouteProp<AuthStackParamList, "PhoneEntry">;

const SHOW_OAUTH = false;

function isEmailOk(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function displayNameFromEmail(email: string, fallback: string): string {
  const local = email.split("@")[0]?.trim() || "";
  return local ? local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : fallback;
}

function isOtpSent(data: unknown): data is { status: "otp_sent"; otp_id: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { status?: string }).status === "otp_sent" &&
    typeof (data as { otp_id?: string }).otp_id === "string"
  );
}

export default function PhoneAuthScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { t } = useLang();
  const { signIn } = useAuth();
  const role = route.params?.role ?? "specialist";
  const [national, setNational] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpId, setOtpId] = useState<string | null>(null);
  const [otpStep, setOtpStep] = useState(false);
  const [busy, setBusy] = useState(false);

  const display = useMemo(() => formatRuNationalDisplay(national), [national]);
  const phoneValid = isValidRuMobileInput(national);
  const emailValid = isEmailOk(email);
  const passwordValid = password.length >= 4;
  const apiPhone = useMemo(() => (phoneValid ? toApiPhoneFromNational10(national) : ""), [national, phoneValid]);
  const canSubmit = phoneValid && emailValid && passwordValid;
  const canVerify = otpCode.trim().length >= 4;

  const registerFallback = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const data = await apiFetch(`/auth/${role}/register-phone`, {
      method: "POST",
      body: JSON.stringify({
        phone: apiPhone,
        email: cleanEmail,
        password,
        name: displayNameFromEmail(cleanEmail, t("auth_default_master_name")),
        role,
      }),
      auth: false,
    });
    if (isOtpSent(data)) {
      setOtpId(data.otp_id);
      setOtpStep(true);
      Alert.alert(t("otp_sent_title"), t("otp_enter_sms"));
      return;
    }
    await signIn(data.token, data.user);
  };

  const onSubmit = async () => {
    if (!phoneValid || !apiPhone) {
      Alert.alert(t("error_title"), t("auth_invalid_phone"));
      return;
    }
    if (!emailValid) {
      Alert.alert(t("error_title"), t("auth_invalid_email"));
      return;
    }
    if (!passwordValid) {
      Alert.alert(t("error_title"), t("auth_password_short"));
      return;
    }
    setBusy(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const payload = {
        phone: apiPhone,
        purpose: "register" as const,
        password,
        name: displayNameFromEmail(cleanEmail, t("auth_default_master_name")),
        role,
        email: cleanEmail,
      };
      try {
      const data = await apiFetch(`/auth/${role}/phone/send-otp`, {
          method: "POST",
          body: JSON.stringify(payload),
          auth: false,
        });
        if (isOtpSent(data)) {
          setOtpId(data.otp_id);
          setOtpStep(true);
          Alert.alert(t("otp_sent_title"), t("otp_enter_sms"));
          return;
        }
        if (data?.token) {
          await signIn(data.token, data.user);
          return;
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!/404|disabled/i.test(msg)) {
          throw e;
        }
      }
      await registerFallback();
    } catch (e: unknown) {
      Alert.alert(t("error_title"), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onVerifyOtp = async () => {
    if (!otpId || !apiPhone) return;
    if (!canVerify) {
      Alert.alert(t("error_title"), t("otp_enter_sms"));
      return;
    }
    setBusy(true);
    try {
      const data = await apiFetch(`/auth/${role}/phone/verify-otp`, {
        method: "POST",
        body: JSON.stringify({
          phone: apiPhone,
          otp_id: otpId,
          code: otpCode.trim(),
        }),
        auth: false,
      });
      await signIn(data.token, data.user);
    } catch (e: unknown) {
      Alert.alert(t("error_title"), e instanceof Error ? e.message : String(e));
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
        <Text style={styles.title}>{t("auth_master_register_title")}</Text>
        <Text style={styles.sub}>
          {otpStep ? t("auth_master_register_otp_sub") : t("auth_master_register_sub")}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {!otpStep ? (
          <>
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
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.ctaText}>{t("auth_get_code")}</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              accessibilityLabel="Код из SMS"
              placeholder={t("otp_enter_sms")}
              placeholderTextColor={colors.neutral400}
              keyboardType="number-pad"
              value={otpCode}
              onChangeText={setOtpCode}
              maxLength={8}
            />
            <TouchableOpacity
              style={[styles.cta, !canVerify && styles.ctaDisabled]}
              onPress={onVerifyOtp}
              disabled={!canVerify || busy}
              activeOpacity={0.9}
            >
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.ctaText}>{t("auth_verify_code")}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setOtpStep(false)}>
              <Text style={styles.loginLink}>{t("auth_change_data")}</Text>
            </TouchableOpacity>
          </>
        )}

        {SHOW_OAUTH && (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>или</Text>
              <View style={styles.divider} />
            </View>
          </>
        )}

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
  loginLink: { marginTop: 8, textAlign: "center", color: colors.neutral600, fontSize: 14, fontWeight: "600" },
});
