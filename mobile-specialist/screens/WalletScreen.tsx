import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, Linking, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { TabScreenLayout } from "../components/TabScreenLayout";
import { CardLight } from "../components/CardLight";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radii, spacing, typography } from "../src/theme";
import { checkPendingBalanceDeposit, createBalanceDeposit } from "../src/services/account";
import { useAccountStore } from "../src/store/accountStore";

const PAYMENT_RETURN_PREFIX = "treabo-specialist://balance/";

export default function WalletScreen() {
  const account = useAccountStore((s) => s.account);
  const loading = useAccountStore((s) => s.loading);
  const refreshAccount = useAccountStore((s) => s.refresh);
  const [amount, setAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const waitingForPayment = useRef(false);
  const polling = useRef(false);
  const handledReturnUrl = useRef<string | null>(null);

  useFocusEffect(useCallback(() => { void refreshAccount(); }, [refreshAccount]));

  const pollPayment = useCallback(async (showResult = true) => {
    if (polling.current) return;
    polling.current = true;
    const oldBalance = account?.balance ?? 0;
    try {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const result = await checkPendingBalanceDeposit();
        if (result.processed) {
          const updated = await refreshAccount();
          waitingForPayment.current = false;
          if (showResult) Alert.alert("Баланс пополнен", `Зачислено ${Math.round(Number(result.amount || 0))} ₽.`);
          return;
        }
        const updated = await refreshAccount();
        if ((updated?.balance ?? 0) > oldBalance) {
          waitingForPayment.current = false;
          if (showResult) Alert.alert("Баланс обновлён", `Доступно ${Math.round(updated?.balance ?? 0).toLocaleString("ru-RU")} ₽.`);
          return;
        }
        if (!result.has_pending) {
          waitingForPayment.current = false;
          if (showResult) Alert.alert("Статус платежа", result.message || "Активных платежей нет.");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      await refreshAccount();
      if (showResult) Alert.alert("Платёж обрабатывается", "Баланс обновится автоматически после подтверждения ЮKassa.");
    } catch (error) {
      if (showResult) Alert.alert("Ошибка проверки", error instanceof Error ? error.message : String(error));
    } finally {
      polling.current = false;
    }
  }, [account?.balance, refreshAccount]);

  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      if (url.startsWith(PAYMENT_RETURN_PREFIX) && handledReturnUrl.current !== url) {
        handledReturnUrl.current = url;
        waitingForPayment.current = true;
        void pollPayment(true);
      }
    };
    const linkSubscription = Linking.addEventListener("url", handleUrl);
    void Linking.getInitialURL().then((url) => { if (url) handleUrl({ url }); });
    const appSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (waitingForPayment.current) void pollPayment(true);
        else void refreshAccount();
      }
    });
    return () => { linkSubscription.remove(); appSubscription.remove(); };
  }, [pollPayment, refreshAccount]);

  const normalizedAmount = Number(String(amount).replace(/\D/g, "")) || 0;

  const startYookassaDeposit = async () => {
    if (normalizedAmount < 100) {
      Alert.alert("Минимальная сумма — 100 ₽", "Введите сумму пополнения не менее 100 ₽.");
      return;
    }
    setPaying(true);
    try {
      const deposit = await createBalanceDeposit(normalizedAmount, "yookassa");
      if (deposit.payment_url) {
        handledReturnUrl.current = null;
        waitingForPayment.current = true;
        await Linking.openURL(deposit.payment_url);
      } else {
        Alert.alert("Платёж создан", deposit.message || "Откройте страницу оплаты.");
      }
    } catch (error) {
      waitingForPayment.current = false;
      Alert.alert("Ошибка пополнения", error instanceof Error ? error.message : String(error));
    } finally {
      setPaying(false);
    }
  };

  return (
    <TabScreenLayout>
      <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Кошелёк</Text>
        {loading && !account ? <ActivityIndicator color={colors.black} /> : <>
          <CardLight style={styles.balanceCard}>
            <Text style={styles.label}>Баланс</Text>
            <Text style={styles.balance}>{Math.round(account?.balance ?? 0).toLocaleString("ru-RU")} ₽</Text>
            <Text style={styles.sub}>Бесплатных откликов сегодня: {account?.free_remaining_today ?? 0} из {account?.free_daily_limit ?? 5}</Text>
          </CardLight>
          <View style={styles.grid}>
            <Metric label="Потрачено" value={`${Math.round(account?.total_spent ?? 0)} ₽`} />
            <Metric label="Пополнено" value={`${Math.round(account?.total_deposited ?? 0)} ₽`} />
          </View>
          <CardLight style={styles.depositCard}>
            <Text style={styles.cardTitle}>Пополнить баланс</Text>
            <TextInput style={styles.input} value={amount} onChangeText={(value) => setAmount(value.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="Сумма от 100 ₽" placeholderTextColor={colors.neutral400} />
            <PrimaryButton title="Перейти к оплате" onPress={startYookassaDeposit} loading={paying} />
          </CardLight>
        </>}
      </ScrollView>
    </TabScreenLayout>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <CardLight style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></CardLight>;
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 40 },
  title: { ...typography.title, fontSize: 26, marginBottom: 18 },
  balanceCard: { backgroundColor: "#D9F36B", borderWidth: 0, marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "700", color: colors.neutral700, marginBottom: 8 },
  balance: { fontSize: 38, fontWeight: "800", color: colors.black, marginBottom: 8 },
  sub: { fontSize: 14, fontWeight: "700", color: colors.neutral700 },
  grid: { flexDirection: "row", gap: 12, marginBottom: 14 },
  metric: { flex: 1, backgroundColor: colors.lavender50, borderWidth: 0 },
  metricValue: { fontSize: 20, fontWeight: "800", color: colors.black },
  metricLabel: { fontSize: 12, color: colors.neutral500, marginTop: 4 },
  depositCard: { marginBottom: 14 }, cardTitle: { fontSize: 18, fontWeight: "800", color: colors.black },
  input: { minHeight: 52, marginTop: 14, borderRadius: radii.lg, backgroundColor: colors.neutral100, paddingHorizontal: 16, fontSize: 17, fontWeight: "700", color: colors.black, marginBottom: 12 },
});
