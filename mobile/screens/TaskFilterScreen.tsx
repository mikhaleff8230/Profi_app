import React, { useState } from "react";
import { StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenLayout } from "../components/ScreenLayout";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors, spacing } from "../src/theme";
import type { RootStackParamList } from "../src/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "TaskFilter">;

export default function TaskFilterScreen() {
  const navigation = useNavigation<Nav>();
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [discount, setDiscount] = useState(false);
  const [sortNew, setSortNew] = useState(true);

  const apply = () => {
    navigation.navigate("TasksList", { budget_min: min || undefined, budget_max: max || undefined });
  };

  return (
    <ScreenLayout>
      <View style={styles.root}>
        <View style={styles.top}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close-outline" size={28} color={colors.black} /></TouchableOpacity>
          <TouchableOpacity onPress={() => { setMin(""); setMax(""); setDiscount(false); setSortNew(true); }}>
            <Text style={styles.reset}>Сбросить</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Фильтр заказов</Text>
        <Text style={styles.label}>Ставка, ₽</Text>
        <View style={styles.priceRow}>
          <TextInput style={styles.priceInput} placeholder="от" keyboardType="number-pad" value={min} onChangeText={(v) => setMin(v.replace(/\D/g, ""))} />
          <View style={styles.divider} />
          <TextInput style={styles.priceInput} placeholder="до" keyboardType="number-pad" value={max} onChangeText={(v) => setMax(v.replace(/\D/g, ""))} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Отклик со скидкой</Text>
          <Switch value={discount} onValueChange={setDiscount} />
        </View>
        <Text style={styles.sectionTitle}>Сортировка заказов</Text>
        <TouchableOpacity style={styles.radioRow} onPress={() => setSortNew(true)}>
          <View><Text style={styles.radioTitle}>Сначала новые</Text><Text style={styles.radioSub}>Заказы, которые вы еще не видели</Text></View>
          <Ionicons name={sortNew ? "radio-button-on" : "radio-button-off"} size={24} color={colors.black} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.radioRow} onPress={() => setSortNew(false)}>
          <View><Text style={styles.radioTitle}>Сначала просмотренные</Text><Text style={styles.radioSub}>Заказы, которые вы открывали</Text></View>
          <Ionicons name={!sortNew ? "radio-button-on" : "radio-button-off"} size={24} color={colors.neutral300} />
        </TouchableOpacity>
        <View style={styles.hint}>
          <Ionicons name="briefcase-outline" size={22} color={colors.black} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hintTitle}>Укажите, куда удобно выезжать, и настройте услуги</Text>
            <Text style={styles.hintText}>Так вы будете видеть более подходящие заказы</Text>
          </View>
        </View>
        <View style={styles.footer}><PrimaryButton title="Показать 52 заказа" onPress={apply} /></View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.lg },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  reset: { color: colors.neutral500, fontSize: 14 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 24 },
  label: { fontSize: 15, marginBottom: 8 },
  priceRow: { height: 56, flexDirection: "row", borderRadius: 12, backgroundColor: colors.lavender50, alignItems: "center", marginBottom: 22 },
  priceInput: { flex: 1, paddingHorizontal: 16, fontSize: 15 },
  divider: { width: 1, height: 32, backgroundColor: colors.neutral100 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 32 },
  switchText: { fontSize: 15 },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  radioRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9 },
  radioTitle: { fontSize: 15, color: colors.black },
  radioSub: { fontSize: 12, color: colors.neutral400, marginTop: 2 },
  hint: { flexDirection: "row", gap: 12, backgroundColor: colors.lavender50, borderRadius: 12, padding: 14, marginTop: 14 },
  hintTitle: { fontSize: 14, fontWeight: "700", lineHeight: 18 },
  hintText: { fontSize: 13, color: colors.neutral500, marginTop: 4 },
  footer: { marginTop: "auto" },
});
