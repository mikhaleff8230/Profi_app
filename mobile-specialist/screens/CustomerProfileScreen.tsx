import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, NativeModules, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch, fileUrl } from "../src/api";
import { useChatStore } from "../src/store/chatStore";
import { colors, spacing } from "../src/theme";
import type { RootStackParamList } from "../src/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "CustomerProfile">;
type R = RouteProp<RootStackParamList, "CustomerProfile">;

export default function CustomerProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const chat = useChatStore((s) => s.chats.find((item) => String(item.id) === String(params.chatId)));
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const avatar = fileUrl(chat?.customer_avatar);
  const name = chat?.customer_name || "Клиент Treabo";

  const revealPhone = async () => {
    setLoading(true);
    try {
      const result = await apiFetch(`/chats/${params.chatId}/customer-contact`, { method: "GET" });
      setPhone(String(result.phone));
    } catch (error) {
      Alert.alert("Телефон недоступен", error instanceof Error ? error.message : String(error));
    } finally { setLoading(false); }
  };

  const call = () => phone && void Linking.openURL(`tel:${phone.replace(/[^+\d]/g, "")}`);
  const copy = () => {
    if (!phone) return;
    const clipboard = (NativeModules as Record<string, any>).Clipboard;
    if (clipboard?.setString) {
      clipboard.setString(phone);
      Alert.alert("Скопировано", "Номер телефона скопирован.");
    } else Alert.alert("Номер телефона", phone);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}><TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={23} color={colors.black} /></TouchableOpacity><Text style={styles.headerTitle}>Клиент</Text><View style={styles.back} /></View>
      <View style={styles.content}>
        {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : <View style={[styles.avatar, styles.fallback]}><Text style={styles.letter}>{name.charAt(0).toUpperCase()}</Text></View>}
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.task} numberOfLines={3}>{chat?.task_title || "Задание Treabo"}</Text>
        <View style={styles.phoneCard}>
          <Text style={styles.phoneLabel}>Телефон клиента</Text>
          <Text style={styles.phone} selectable={Boolean(phone)}>{phone || chat?.customer_phone_masked || "+7••••••••••"}</Text>
          {!phone ? <TouchableOpacity style={styles.reveal} onPress={revealPhone} disabled={loading}>{loading ? <ActivityIndicator color={colors.white} /> : <><Ionicons name="eye-outline" size={19} color={colors.white} /><Text style={styles.revealText}>Показать номер</Text></>}</TouchableOpacity> : <View style={styles.actions}><TouchableOpacity style={styles.call} onPress={call}><Ionicons name="call" size={20} color={colors.black} /><Text style={styles.actionText}>Позвонить</Text></TouchableOpacity><TouchableOpacity style={styles.copy} onPress={copy}><Ionicons name="copy-outline" size={20} color={colors.black} /><Text style={styles.actionText}>Скопировать</Text></TouchableOpacity></View>}
          <Text style={styles.notice}>Номер доступен только мастеру, который откликнулся на это задание. После закрытия экрана он снова будет скрыт.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F7FA" }, header: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, backgroundColor: colors.white }, back: { width: 42, height: 42, alignItems: "center", justifyContent: "center" }, headerTitle: { fontSize: 17, fontWeight: "800", color: colors.black },
  content: { alignItems: "center", padding: spacing.xl }, avatar: { width: 104, height: 104, borderRadius: 52 }, fallback: { backgroundColor: "#D9F36B", alignItems: "center", justifyContent: "center" }, letter: { fontSize: 42, fontWeight: "900", color: colors.black }, name: { marginTop: 16, fontSize: 26, fontWeight: "900", color: colors.black }, task: { marginTop: 7, color: colors.neutral500, fontSize: 14, lineHeight: 20, textAlign: "center" },
  phoneCard: { width: "100%", marginTop: 28, borderRadius: 24, backgroundColor: colors.white, padding: 20 }, phoneLabel: { fontSize: 12, fontWeight: "800", color: colors.neutral500, textTransform: "uppercase", letterSpacing: 0.7 }, phone: { marginTop: 9, fontSize: 25, fontWeight: "900", color: colors.black }, reveal: { minHeight: 52, marginTop: 18, borderRadius: 17, backgroundColor: "#24262D", flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" }, revealText: { color: colors.white, fontSize: 15, fontWeight: "800" }, actions: { flexDirection: "row", gap: 9, marginTop: 18 }, call: { flex: 1, minHeight: 52, borderRadius: 17, backgroundColor: "#D9F36B", flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" }, copy: { flex: 1, minHeight: 52, borderRadius: 17, backgroundColor: "#F0F1F5", flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" }, actionText: { fontSize: 13, fontWeight: "800", color: colors.black }, notice: { marginTop: 15, color: colors.neutral500, fontSize: 12, lineHeight: 17 },
});
