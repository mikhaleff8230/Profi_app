import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { TabScreenLayout } from "../components/TabScreenLayout";
import { CardLight } from "../components/CardLight";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors, radii, spacing, typography } from "../src/theme";
import {
  checkPendingBalanceDeposit,
  createBalanceDeposit,
  fetchAccountSummary,
  type AccountSummary,
} from "../src/services/account";

export default function WalletScreen() {
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [checking, setChecking] = useState(false);

  const load = () => {
    setLoading(true);
    fetchAccountSummary()
      .then(setAccount)
      .catch((error) => Alert.alert("Ошибка", error instanceof Error ? error.message : String(error)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

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
        await Linking.openURL(deposit.payment_url);
      } else {
        Alert.alert("Платеж создан", deposit.message || "Откройте страницу оплаты.");
      }
    } catch (error) {
      Alert.alert("Ошибка пополнения", error instanceof Error ? error.message : String(error));
    } finally {
      setPaying(false);
    }
  };

  const checkPending = async () => {
    setChecking(true);
    try {
      const result = await checkPendingBalanceDeposit();
      if (result.processed) {
        Alert.alert("Баланс пополнен", `Зачислено ${Math.round(Number(result.amount || 0))} ₽.`);
        load();
      } else {
        Alert.alert("Статус платежа", result.message || (result.has_pending ? "Платеж еще обрабатывается." : "Активных платежей нет."));
      }
    } catch (error) {
      Alert.alert("Ошибка проверки", error instanceof Error ? error.message : String(error));
    } finally {
      setChecking(false);
    }
  };

  return (
    <TabScreenLayout>
      <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Кошелек</Text>
        {loading ? (
          <ActivityIndicator color={colors.black} />
        ) : (
          <>
            <CardLight style={styles.balanceCard}>
              <Text style={styles.label}>Баланс</Text>
              <Text style={styles.balance}>{Math.round(account?.balance ?? 0).toLocaleString("ru-RU")} ₽</Text>
              <Text style={styles.sub}>
                Бесплатных откликов сегодня: {account?.free_remaining_today ?? 0} из {account?.free_daily_limit ?? 5}
              </Text>
            </CardLight>

            <View style={styles.grid}>
              <Metric label="Потрачено" value={`${Math.round(account?.total_spent ?? 0)} ₽`} />
              <Metric label="Пополнено" value={`${Math.round(account?.total_deposited ?? 0)} ₽`} />
            </View>

            <CardLight style={styles.depositCard}>
              <Text style={styles.cardTitle}>Пополнить баланс</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={(value) => setAmount(value.replace(/\D/g, ""))}
                keyboardType="number-pad"
                placeholder="Сумма от 100 ₽"
                placeholderTextColor={colors.neutral400}
              />
              <PrimaryButton title="Перейти к оплате" onPress={startYookassaDeposit} loading={paying} />
              <PrimaryButton title="Проверить оплату" onPress={checkPending} loading={checking} variant="secondary" style={styles.secondaryAction} />
            </CardLight>

            <PrimaryButton title="Обновить баланс" onPress={load} variant="ghost" />
          </>
        )}
      </ScrollView>
    </TabScreenLayout>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <CardLight style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </CardLight>
  );
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
  depositCard: { marginBottom: 14 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.black },
  input: {
    minHeight: 52,
    marginTop: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.neutral100,
    paddingHorizontal: 16,
    fontSize: 17,
    fontWeight: "700",
    color: colors.black,
    marginBottom: 12,
  },
  secondaryAction: { marginTop: 10 },
});
