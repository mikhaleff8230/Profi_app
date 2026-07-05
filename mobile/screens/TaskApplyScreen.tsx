import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomActionBar } from "../components/BottomActionBar";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { ScreenLayout } from "../components/ScreenLayout";
import { apiFetch, getToken } from "../src/api";
import type { RootStackParamList } from "../src/navigation/types";
import { useChatStore } from "../src/store/chatStore";
import { colors, radii, spacing, typography } from "../src/theme";
import type { ApplicationPreview, Task } from "../src/types/proffi";
import { formatResponseFeeMdl } from "../src/utils/currency";

type Nav = NativeStackNavigationProp<RootStackParamList, "TaskApply">;
type R = RouteProp<RootStackParamList, "TaskApply">;

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export default function TaskApplyScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { taskId, title } = route.params;
  const [task, setTask] = useState<Task | null>(null);
  const [preview, setPreview] = useState<ApplicationPreview | null>(null);
  const [message, setMessage] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const loadChats = useChatStore((s) => s.loadChats);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [taskData, previewData] = await Promise.all([
        apiFetch(`/tasks/${taskId}`, { method: "GET" }).catch(() => null),
        apiFetch(`/tasks/${taskId}/applications/preview`, { method: "GET" }).catch(() => null),
      ]);
      setTask(taskData as Task | null);
      setPreview(previewData as ApplicationPreview | null);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const previewText = useMemo(() => {
    if (!preview || preview.has_applied) return null;
    if (preview.is_free) {
      return `Бесплатных откликов сегодня: ${preview.free_remaining_before ?? 0}`;
    }
    return `Стоимость отклика: ${formatResponseFeeMdl(preview.response_fee_mdl)}`;
  }, [preview]);

  const submitText = useMemo(() => {
    const parts = [message.trim()];
    if (priceFrom || priceTo) {
      const from = priceFrom ? `от ${Number(priceFrom).toLocaleString("ru-RU")} ₽` : "";
      const to = priceTo ? `до ${Number(priceTo).toLocaleString("ru-RU")} ₽` : "";
      parts.push(`Цена: ${[from, to].filter(Boolean).join(" ")}`);
    }
    return parts.filter(Boolean).join("\n\n");
  }, [message, priceFrom, priceTo]);

  const submit = async () => {
    if (!message.trim()) return;
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Нужно войти", "Для отправки отклика войдите в аккаунт мастера.");
        return;
      }
      const response = await apiFetch(`/tasks/${taskId}/applications`, {
        method: "POST",
        body: JSON.stringify({
          message: submitText,
          price: priceFrom ? parseInt(priceFrom, 10) : priceTo ? parseInt(priceTo, 10) : null,
        }),
      });
      const chatId = response?.chat_id ? String(response.chat_id) : "";
      await loadChats();
      if (chatId) {
        navigation.replace("ChatDetail", { chatId });
        return;
      }
      Alert.alert("Готово", "Отклик отправлен");
      navigation.goBack();
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenLayout bottomInset={false}>
      <ScreenHeader title="Отклик" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView style={styles.scrollFlex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.taskTitle} numberOfLines={2}>
            {title || task?.title || "Задание"}
          </Text>

          {previewText ? <Text style={styles.preview}>{previewText}</Text> : null}

          <View style={styles.field}>
            <Text style={styles.label}>Сообщение клиенту</Text>
            <TextInput
              style={styles.textarea}
              placeholder="Расскажите, чем можете помочь и когда готовы начать"
              placeholderTextColor={colors.neutral400}
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Укажите свою цену</Text>
            <View style={styles.priceRow}>
              <TextInput
                style={styles.priceInput}
                placeholder="От"
                placeholderTextColor={colors.neutral400}
                keyboardType="number-pad"
                value={priceFrom}
                onChangeText={(value) => setPriceFrom(digitsOnly(value))}
              />
              <TextInput
                style={styles.priceInput}
                placeholder="До"
                placeholderTextColor={colors.neutral400}
                keyboardType="number-pad"
                value={priceTo}
                onChangeText={(value) => setPriceTo(digitsOnly(value))}
              />
            </View>
          </View>
        </ScrollView>

        <BottomActionBar>
          <PrimaryButton
            title={busy || loading ? "Отправляем..." : "Отправить отклик"}
            onPress={submit}
            disabled={busy || loading || !message.trim()}
          />
        </BottomActionBar>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollFlex: { flex: 1 },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 120 },
  taskTitle: { ...typography.title, fontSize: 24, lineHeight: 30, marginBottom: 12 },
  preview: {
    alignSelf: "flex-start",
    borderRadius: radii.full,
    backgroundColor: colors.lavender50,
    paddingHorizontal: 14,
    paddingVertical: 9,
    color: colors.neutral600,
    fontSize: 13,
    marginBottom: 20,
  },
  field: { marginBottom: 18 },
  label: { fontSize: 15, fontWeight: "700", color: colors.black, marginBottom: 8 },
  textarea: {
    minHeight: 148,
    borderRadius: 22,
    backgroundColor: colors.lavender50,
    padding: 16,
    fontSize: 16,
    lineHeight: 22,
    color: colors.black,
  },
  priceRow: { flexDirection: "row", gap: 12 },
  priceInput: {
    flex: 1,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: colors.lavender50,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.black,
  },
});
