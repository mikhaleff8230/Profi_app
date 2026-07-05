import React, { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenLayout } from "../components/ScreenLayout";
import { ScreenHeader } from "../components/ScreenHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { apiFetch } from "../src/api";
import { useAuth } from "../src/context/AuthContext";
import { colors, radii, spacing, typography } from "../src/theme";
import {
  formatRuNationalDisplay,
  isValidRuMobileInput,
  normalizeRuNationalInput,
  toApiPhoneFromNational10,
} from "../src/utils/phone";
import type { RootStackParamList } from "../src/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function PhoneChangeScreen() {
  const navigation = useNavigation<Nav>();
  const { setUser } = useAuth();
  const [national, setNational] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpId, setOtpId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const display = useMemo(() => formatRuNationalDisplay(national), [national]);
  const phoneValid = isValidRuMobileInput(national);
  const apiPhone = phoneValid ? toApiPhoneFromNational10(national) : "";

  const sendOtp = async () => {
    if (!phoneValid || !apiPhone) {
      Alert.alert("Ошибка", "Введите корректный номер");
      return;
    }
    setBusy(true);
    try {
      const data = await apiFetch("/auth/phone/change/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone: apiPhone }),
      });
      if (data?.otp_id) {
        setOtpId(data.otp_id);
        Alert.alert("Код отправлен", "Введите SMS-код для нового номера");
      }
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!otpId || otpCode.trim().length < 4) return;
    setBusy(true);
    try {
      const data = await apiFetch("/auth/phone/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone: apiPhone, otp_id: otpId, code: otpCode.trim() }),
      });
      if (data?.user) setUser(data.user);
      Alert.alert("Готово", "Номер телефона обновлён");
      navigation.goBack();
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenLayout>
      <ScreenHeader title="Сменить телефон" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>Новый номер подтверждается SMS-кодом.</Text>
        <TextInput
          style={styles.input}
          value={display}
          onChangeText={(v) => setNational(normalizeRuNationalInput(v))}
          keyboardType="phone-pad"
          placeholder="+7 (___) ___-__-__"
          placeholderTextColor={colors.neutral400}
        />
        {!otpId ? (
          <PrimaryButton title="Отправить код" onPress={sendOtp} loading={busy} disabled={!phoneValid} />
        ) : (
          <>
            <TextInput
              style={styles.input}
              value={otpCode}
              onChangeText={(v) => setOtpCode(v.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              placeholder="Код из SMS"
              placeholderTextColor={colors.neutral400}
            />
            <PrimaryButton title="Подтвердить" onPress={verify} loading={busy} disabled={otpCode.trim().length < 4} />
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md },
  hint: { ...typography.body, color: colors.neutral500, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.neutral100,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.black,
  },
});
