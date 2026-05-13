import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { apiFetch } from "../src/api";
import { useAuth, type UserRole } from "../src/context/AuthContext";
import { useLang } from "../src/context/LangContext";
import { colors, radii, spacing, typography } from "../src/theme";
import { PrimaryButton } from "../components/PrimaryButton";
import { LangSwitcher } from "../components/LangSwitcher";
import type { AuthStackParamList } from "../src/navigation/types";

type Step = "onboarding" | "email" | "otp";

export default function AuthScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { t } = useLang();
  const { signIn } = useAuth();
  const [step, setStep] = useState<Step>("onboarding");
  const [role, setRole] = useState<UserRole>("customer");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const goEmail = useCallback((r: UserRole) => {
    setRole(r);
    setStep("email");
  }, []);

  const onRegister = async () => {
    const em = email.trim().toLowerCase();
    if (!em) {
      Alert.alert("Ошибка", "Введите email");
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, string> = { email: em, role };
      const nm = name.trim();
      if (nm) body.name = nm;
      await apiFetch("/auth/register", { method: "POST", body: JSON.stringify(body), auth: false });
      setPendingEmail(em);
      setOtp("");
      setStep("otp");
      Alert.alert(t("otp_sent"), t("otp_check"));
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onLoginEmail = async () => {
    const em = email.trim().toLowerCase();
    if (!em) {
      Alert.alert("Ошибка", "Введите email");
      return;
    }
    setBusy(true);
    try {
      const d = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: em }),
        auth: false,
      });
      if (d.token) {
        await signIn(d.token, d.user);
      } else if (d.status === "otp_sent") {
        setPendingEmail(em);
        setOtp("");
        setStep("otp");
        Alert.alert(t("otp_sent"), "Подтвердите email кодом из письма.");
      } else {
        Alert.alert("Ошибка", "Неожиданный ответ сервера");
      }
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    const code = otp.trim();
    if (code.length < 4) {
      Alert.alert("Ошибка", "Введите код из письма");
      return;
    }
    setBusy(true);
    try {
      const d = await apiFetch("/auth/verify", {
        method: "POST",
        body: JSON.stringify({ email: pendingEmail, otp_code: code }),
        auth: false,
      });
      await signIn(d.token, d.user);
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (step === "onboarding") {
    return (
      <View style={styles.onboardRoot}>
        <StatusBar style="dark" />
        <View style={styles.onboardHeader}>
          <LangSwitcher />
        </View>
        <ScrollView contentContainerStyle={styles.onboardScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.heroIcon}>
            <Ionicons name="telescope-outline" size={120} color={colors.black} />
            <Text style={styles.spark}>✦</Text>
          </View>
          <Text style={styles.onboardTitle}>{t("onboarding_title")}</Text>
          <Text style={styles.onboardSub}>{t("onboarding_subtitle")}</Text>
        </ScrollView>
        <View style={styles.onboardFooter}>
          <PrimaryButton title={t("onboarding_specialist_cta")} onPress={() => goEmail("specialist")} />
          <PrimaryButton
            title={t("onboarding_customer_cta")}
            variant="ghost"
            onPress={() => goEmail("customer")}
          />
          <PrimaryButton title={t("back_to_login")} variant="ghost" onPress={() => navigation.navigate("Login")} />
        </View>
      </View>
    );
  }

  if (step === "otp") {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <StatusBar style="dark" />
          <Text style={styles.title}>Код из письма</Text>
          <Text style={styles.muted}>{pendingEmail}</Text>
          <TextInput
            style={styles.input}
            placeholder="6 цифр"
            placeholderTextColor={colors.neutral400}
            keyboardType="number-pad"
            maxLength={8}
            value={otp}
            onChangeText={setOtp}
          />
          <PrimaryButton title="Подтвердить" onPress={onVerify} loading={busy} />
          <PrimaryButton title="Назад" variant="ghost" onPress={() => setStep("email")} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <StatusBar style="dark" />
        <View style={styles.langRow}>
          <LangSwitcher />
        </View>
        <Text style={styles.brand}>Proffi</Text>
        <Text style={styles.muted}>{t("auth_email_hint")}</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.neutral400}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Имя (необязательно)"
          placeholderTextColor={colors.neutral400}
          value={name}
          onChangeText={setName}
        />
        <Text style={styles.label}>Роль</Text>
        <View style={styles.row}>
          <PrimaryButton
            title="Заказчик"
            fullWidth={false}
            variant={role === "customer" ? "primary" : "secondary"}
            style={styles.chipBtn}
            onPress={() => setRole("customer")}
          />
          <PrimaryButton
            title="Специалист"
            fullWidth={false}
            variant={role === "specialist" ? "primary" : "secondary"}
            style={styles.chipBtn}
            onPress={() => setRole("specialist")}
          />
        </View>
        <PrimaryButton title="Зарегистрироваться" onPress={onRegister} loading={busy} />
        <PrimaryButton title="Войти по email" variant="secondary" onPress={onLoginEmail} loading={busy} />
        <PrimaryButton title={t("go_to_register")} variant="ghost" onPress={() => navigation.navigate("Register")} />
        <PrimaryButton title={t("stub_login_title")} variant="ghost" onPress={() => navigation.navigate("Login")} />
        <PrimaryButton title="← К выбору роли" variant="ghost" onPress={() => setStep("onboarding")} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.shell },
  scroll: { padding: spacing.xxl, paddingTop: 56, paddingBottom: 40 },
  langRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 12 },
  onboardRoot: { flex: 1, backgroundColor: colors.white, paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxl },
  onboardHeader: { paddingTop: spacing.xxl, alignItems: "flex-end" },
  onboardScroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: 32, gap: 16 },
  onboardFooter: { gap: spacing.md },
  heroIcon: { position: "relative", marginBottom: 8 },
  spark: { position: "absolute", right: -16, top: -8, fontSize: 28 },
  onboardTitle: { ...typography.title, fontSize: 28, textAlign: "center", color: colors.black, lineHeight: 34 },
  onboardSub: { fontSize: 16, color: colors.neutral500, textAlign: "center", maxWidth: 280 },
  brand: { ...typography.title, fontSize: 28, marginBottom: 8 },
  title: { ...typography.title, marginBottom: 8 },
  muted: { color: colors.neutral500, marginBottom: 20, fontSize: 15 },
  label: { fontWeight: "600", marginBottom: 8, color: colors.neutral700 },
  input: {
    backgroundColor: colors.lavender50,
    borderRadius: radii.lg,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
    color: colors.black,
    minHeight: 52,
  },
  row: { flexDirection: "row", gap: 10, marginBottom: 16 },
  chipBtn: { flex: 1, minHeight: 48 },
});
