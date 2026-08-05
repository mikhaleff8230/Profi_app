import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { apiFetch, apiUploadFile } from "../src/api";
import { colors } from "../src/theme";
import type { RootStackParamList } from "../src/navigation/types";
import { suggestAddresses, type GeoAddressResult } from "../src/geo";
import {
  answerDraft,
  answerQuestion,
  clearClientDraft,
  createDraft,
  patchDraft,
  publishDraft,
  restoreDraft,
  skipQuestion,
  type DraftResponse,
} from "../src/services/requestAssistant";

type Message = { id: string; role: "assistant" | "user"; text: string };
type Option = { id: string | number; name: string };

function actionMessage(response: DraftResponse): string {
  const action = response?.data?.ui_action;
  if (!action) return "Продолжим";
  if (action.type === "ask_question") return action.question.text;
  return "message" in action ? action.message || "Продолжим" : "Продолжим";
}

export default function AiCreateRequestScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const listRef = useRef<FlatList<Message>>(null);
  const [response, setResponse] = useState<DraftResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<GeoAddressResult | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<GeoAddressResult[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [budget, setBudget] = useState("");
  const [budgetType, setBudgetType] = useState<"negotiable" | "fixed" | "range">("negotiable");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [choices, setChoices] = useState<Option[]>([]);
  const [multiValues, setMultiValues] = useState<unknown[]>([]);

  const draft = response?.data?.draft;
  const action = response?.data?.ui_action;
  const rawProgress = response?.data?.progress?.percent;
  const progress = Number.isFinite(Number(rawProgress))
    ? Math.max(0, Math.min(100, Number(rawProgress)))
    : draft
      ? 100
      : 0;

  useEffect(() => {
    restoreDraft().then((saved) => {
      if (saved) {
        setResponse(saved);
        setMessages([
          { id: "initial", role: "user", text: saved.data.draft.initial_text || "Новая заявка" },
          { id: "restore", role: "assistant", text: actionMessage(saved) },
        ]);
        setCity(saved.data.draft.location?.city || "");
        setAddress(saved.data.draft.location?.address || "");
        if (saved.data.draft.location?.lat && saved.data.draft.location?.lng) {
          setLocation({ city: saved.data.draft.location.city || null, region: null, country: "Россия", address: saved.data.draft.location.address || null, full_address: saved.data.draft.location.address || null, lat: saved.data.draft.location.lat, lng: saved.data.draft.location.lng, source: "manual", needs_confirmation: !saved.data.draft.location.confirmed });
        }
        setBudgetType(saved.data.draft.budget?.type === "fixed" || saved.data.draft.budget?.type === "range" ? saved.data.draft.budget.type : "negotiable");
        setBudget(saved.data.draft.budget?.amount ? String(saved.data.draft.budget.amount) : "");
        setBudgetMin(saved.data.draft.budget?.min ? String(saved.data.draft.budget.min) : "");
        setBudgetMax(saved.data.draft.budget?.max ? String(saved.data.draft.budget.max) : "");
      }
    }).finally(() => setRestoring(false));
  }, []);

  useEffect(() => {
    if (!action || !["choose_category", "choose_service", "manual_fallback", "split_intents"].includes(action.type)) {
      setChoices([]);
      return;
    }
    if (action.type === "split_intents") {
      setChoices(action.intents.filter((item) => item.service_id != null).map((item) => ({ id: item.service_id!, name: item.label })));
      return;
    }
    const path = action.type === "choose_category" || action.type === "manual_fallback"
      ? "/categories"
      : `/works?category_id=${encodeURIComponent(action.type === "choose_service" ? (action.category_id || draft?.category?.id || "") : (draft?.category?.id || ""))}`;
    apiFetch(path, { method: "GET" }).then((items) => {
      setChoices((Array.isArray(items) ? items : []).map((item: any) => ({ id: item.id, name: item.name_ru || item.title })));
    }).catch(() => setChoices([]));
  }, [action?.type, draft?.category?.id]);

  useEffect(() => {
    if (!draft) return;
    setCity((value) => value || draft.location?.city || "");
    setAddress((value) => value || draft.location?.address || "");
  }, [draft?.id]);

  useEffect(() => {
    if (action?.type !== "review" || address.trim().length < 2 || location?.full_address === address) {
      setAddressSuggestions([]);
      setAddressLoading(false);
      setAddressError("");
      return;
    }
    const timer = setTimeout(() => {
      setAddressLoading(true);
      setAddressError("");
      suggestAddresses(address, { count: 8 })
        .then((items) => {
          setAddressSuggestions(items);
          if (!items.length) setAddressError("Адрес не найден. Добавьте город, улицу и номер дома.");
        })
        .catch(() => {
          setAddressSuggestions([]);
          setAddressError("Не удалось загрузить адреса. Проверьте интернет и повторите.");
        })
        .finally(() => setAddressLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [action?.type, address, city, location?.full_address]);

  const addTurn = (userText: string, updated: DraftResponse) => {
    setResponse(updated);
    setMessages((current) => [
      ...current,
      { id: `u-${Date.now()}`, role: "user", text: userText },
      { id: `a-${Date.now()}`, role: "assistant", text: actionMessage(updated) },
    ]);
  };

  const run = async (operation: () => Promise<DraftResponse>, userText: string) => {
    setBusy(true);
    try {
      addTurn(userText, await operation());
      setText("");
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 0);
    } catch (error) {
      Alert.alert("Не удалось продолжить", error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const submitText = () => {
    const value = text.trim();
    if (!value) return;
    if (!draft) void run(() => createDraft(value), value);
    else if (action?.type === "ask_question" && action.question.id != null) {
      void run(() => answerQuestion(draft, action.question.id!, action.question.field_type === "number" ? Number(value) : value), value);
    } else void run(() => answerDraft(draft, { message: value }), value);
  };

  const selectChoice = (choice: Option) => {
    if (!draft || !action) return;
    const path = action.type === "choose_category" || action.type === "manual_fallback" ? "/category/id" : "/work/id";
    void run(() => patchDraft(draft, [{ op: "replace", path, value: choice.id }]), choice.name);
  };

  const reset = () => Alert.alert("Начать заново?", "Текущий черновик и ответы будут очищены.", [
    { text: "Отмена", style: "cancel" },
    { text: "Сбросить", style: "destructive", onPress: async () => {
      await clearClientDraft();
      setResponse(null); setMessages([]); setText(""); setCity(""); setAddress(""); setBudget(""); setBudgetType("negotiable"); setBudgetMin(""); setBudgetMax("");
    } },
  ]);

  const publish = async () => {
    if (!draft || !city.trim() || !location?.lat || !location?.lng) { Alert.alert("Выберите адрес", "Начните вводить город, улицу и дом, затем выберите точный адрес из списка."); return; }
    if (budgetType === "fixed" && (!budget || Number(budget) <= 0)) { Alert.alert("Укажите бюджет"); return; }
    if (budgetType === "range" && (!budgetMin || !budgetMax || Number(budgetMin) > Number(budgetMax))) { Alert.alert("Проверьте диапазон бюджета"); return; }
    setBusy(true);
    try {
      const updated = await patchDraft(draft, [
        { op: "replace", path: "/location/city", value: city.trim() },
        { op: "replace", path: "/location/address", value: address.trim() },
        { op: "replace", path: "/location/lat", value: location.lat },
        { op: "replace", path: "/location/lng", value: location.lng },
        { op: "replace", path: "/location/confirmed", value: true },
        { op: "replace", path: "/budget/type", value: budgetType },
        { op: "replace", path: "/budget/amount", value: budgetType === "fixed" && budget ? Number(budget) : null },
        { op: "replace", path: "/budget/min", value: budgetType === "range" && budgetMin ? Number(budgetMin) : null },
        { op: "replace", path: "/budget/max", value: budgetType === "range" && budgetMax ? Number(budgetMax) : null },
      ]);
      await publishDraft(updated.data.draft);
      await clearClientDraft();
      Alert.alert("Заявка опубликована", "Мастера смогут откликнуться на неё.", [
        { text: "Готово", onPress: () => navigation.navigate("MainTabs") },
      ]);
      setResponse(null);
      setMessages([]);
    } catch (error) {
      Alert.alert("Заявка не опубликована", error instanceof Error ? error.message : String(error));
    } finally { setBusy(false); }
  };

  const addPhoto = async () => {
    if (!draft || action?.type !== "ask_question" || action.question.id == null) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert("Нужен доступ к фотографиям"); return; }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (picked.canceled || !picked.assets[0]?.uri) return;
    const asset = picked.assets[0];
    await run(async () => {
      const uploaded = await apiUploadFile(asset.uri, asset.mimeType || "image/jpeg", "task-photo.jpg");
      return answerQuestion(draft, action.question.id!, uploaded);
    }, "Фотография добавлена");
  };

  const quickOptions = useMemo(() => {
    if (action?.type !== "ask_question") return [];
    if (action.question.options?.length) return action.question.options;
    if (action.question.field_type === "yesno" || action.question.field_type === "boolean") {
      return [{ value: true, label: "Да" }, { value: false, label: "Нет" }];
    }
    return [];
  }, [action]);
  const isMulti = action?.type === "ask_question" && ["multiselect", "multi_select"].includes(action.question.field_type);

  useEffect(() => { setMultiValues([]); }, [action?.type === "ask_question" ? action.question.key : action?.type]);

  if (restoring) return <SafeAreaView style={styles.loading}><ActivityIndicator color={colors.black} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.roundButton} onPress={() => navigation.goBack()}><Ionicons name="close" size={23} color={colors.black} /></TouchableOpacity>
          <View style={styles.headerTitle}><Text style={styles.eyebrow}>ЗАЯВКА С AI</Text><Text style={styles.title}>{draft?.title || "Опишите задачу"}</Text><Text style={styles.stepLabel}>{draft ? `Готово на ${progress}%` : "Шаг 1 · Описание"}</Text></View>
          <TouchableOpacity style={styles.roundButton} onPress={reset}><Ionicons name="refresh" size={20} color={colors.black} /></TouchableOpacity>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progress, { width: `${Math.max(4, progress)}%` }]} /></View>

        {!draft && messages.length === 0 ? (
          <View style={styles.welcome}>
            <View style={styles.spark}><Ionicons name="sparkles" size={30} color={colors.black} /></View>
            <Text style={styles.welcomeTitle}>Что нужно сделать?</Text>
            <Text style={styles.welcomeText}>Опишите задачу своими словами. AI уточнит детали, а адрес вы укажете перед публикацией.</Text>
          </View>
        ) : (
          <FlatList ref={listRef} data={messages} keyExtractor={(item) => item.id} contentContainerStyle={styles.chat} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.assistantBubble]}><Text style={item.role === "user" ? styles.userText : styles.assistantText}>{item.text}</Text></View>
          )} />
        )}

        <View style={styles.composerArea}>
          {choices.length > 0 && <FlatList horizontal data={choices} keyExtractor={(item) => String(item.id)} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} renderItem={({ item }) => <TouchableOpacity style={styles.chip} onPress={() => selectChoice(item)}><Text style={styles.chipText}>{item.name}</Text></TouchableOpacity>} />}
          {quickOptions.length > 0 && <View style={styles.optionGrid}>{quickOptions.map((option) => { const selected = multiValues.some((value) => String(value) === String(option.value)); return <TouchableOpacity key={String(option.value)} style={[styles.option, selected && styles.optionSelected]} onPress={() => { if (!draft || action?.type !== "ask_question" || action.question.id == null) return; if (isMulti) setMultiValues((current) => selected ? current.filter((value) => String(value) !== String(option.value)) : [...current, option.value]); else void run(() => answerQuestion(draft, action.question.id!, option.value), option.label); }}><Text style={styles.optionText}>{selected ? "✓ " : ""}{option.label}</Text></TouchableOpacity>; })}{isMulti && <TouchableOpacity style={[styles.multiConfirm, !multiValues.length && styles.sendDisabled]} disabled={!multiValues.length || busy} onPress={() => draft && action?.type === "ask_question" && action.question.id != null && void run(() => answerQuestion(draft, action.question.id!, multiValues), `Выбрано: ${multiValues.length}`)}><Text style={styles.photoButtonText}>Продолжить</Text></TouchableOpacity>}</View>}
          {action?.type === "ask_question" && action.question.field_type === "photo" ? (
            <View style={styles.optionGrid}>
              <TouchableOpacity style={styles.photoButton} onPress={addPhoto} disabled={busy}><Ionicons name="image-outline" size={20} color={colors.white} /><Text style={styles.photoButtonText}>Добавить фото</Text></TouchableOpacity>
              {!action.question.required && action.question.id != null && <TouchableOpacity style={styles.skipButton} onPress={() => draft && void run(() => skipQuestion(draft, action.question.id!), "Пропустить")}><Text style={styles.skipText}>Пропустить</Text></TouchableOpacity>}
            </View>
          ) : action?.type === "review" ? (
            <View style={styles.review}>
              <Text style={styles.reviewTitle}>Где выполнить работу?</Text>
              <Text style={styles.addressHint}>Введите город, улицу и номер дома</Text>
              <View style={styles.addressField}>
                <TextInput style={styles.reviewInput} value={address} onChangeText={(value) => { setAddress(value); setLocation(null); }} placeholder="Например: Москва, Тверская, 10" autoCorrect={false} autoCapitalize="sentences" />
                {addressLoading && <ActivityIndicator style={styles.addressSpinner} size="small" color={colors.neutral500} />}
                {addressSuggestions.length > 0 && <View style={styles.suggestions}>{addressSuggestions.map((item, index) => { const label = item.full_address || item.address || ""; return <TouchableOpacity key={`${label}-${index}`} style={styles.suggestion} onPress={() => { setAddress(label); setCity(item.city || ""); setLocation(item); setAddressSuggestions([]); setAddressError(""); Keyboard.dismiss(); }}><Ionicons name="location-outline" size={18} color={colors.neutral500} /><Text style={styles.suggestionText}>{label}</Text></TouchableOpacity>; })}</View>}
              </View>
              {!!addressError && !addressLoading && <Text style={styles.addressError}>{addressError}</Text>}
              {location && <Text style={styles.confirmed}>✓ Адрес подтверждён</Text>}
              <View style={styles.budgetTabs}>{([['negotiable', 'Договорной'], ['fixed', 'Точная сумма'], ['range', 'Диапазон']] as const).map(([value, label]) => <TouchableOpacity key={value} style={[styles.budgetTab, budgetType === value && styles.budgetTabActive]} onPress={() => setBudgetType(value)}><Text style={styles.budgetTabText}>{label}</Text></TouchableOpacity>)}</View>
              {budgetType === "fixed" && <TextInput style={styles.reviewInput} value={budget} onChangeText={setBudget} keyboardType="number-pad" placeholder="Сумма, ₽" />}
              {budgetType === "range" && <View style={styles.rangeRow}><TextInput style={[styles.reviewInput, styles.rangeInput]} value={budgetMin} onChangeText={setBudgetMin} keyboardType="number-pad" placeholder="От, ₽" /><TextInput style={[styles.reviewInput, styles.rangeInput]} value={budgetMax} onChangeText={setBudgetMax} keyboardType="number-pad" placeholder="До, ₽" /></View>}
              <TouchableOpacity style={styles.publish} onPress={publish} disabled={busy}><Text style={styles.publishText}>Опубликовать заявку</Text><Ionicons name="arrow-forward" size={20} color={colors.black} /></TouchableOpacity>
            </View>
          ) : choices.length === 0 && quickOptions.length === 0 ? (
            <View><View style={styles.composer}><TextInput style={styles.input} value={text} onChangeText={setText} onFocus={() => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120)} placeholder={draft ? "Ваш ответ" : "Например: нужно собрать шкаф"} placeholderTextColor={colors.neutral400} multiline maxLength={4000} /><TouchableOpacity style={[styles.send, !text.trim() && styles.sendDisabled]} disabled={!text.trim() || busy} onPress={() => { Keyboard.dismiss(); submitText(); }}>{busy ? <ActivityIndicator color={colors.white} /> : <Ionicons name="arrow-up" size={22} color={colors.white} />}</TouchableOpacity></View>{draft && action?.type === "ask_question" && !action.question.required && action.question.id != null && <TouchableOpacity style={styles.skipInline} onPress={() => void run(() => skipQuestion(draft, action.question.id!), "Пропустить")}><Text style={styles.skipText}>Пропустить вопрос</Text></TouchableOpacity>}</View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB" }, loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  roundButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1 }, eyebrow: { fontSize: 10, fontWeight: "900", color: "#7C862F", letterSpacing: 1 }, title: { fontSize: 18, fontWeight: "900", color: colors.black, marginTop: 2 }, stepLabel: { marginTop: 2, fontSize: 11, color: colors.neutral500 },
  progressTrack: { height: 3, backgroundColor: "#E8EBF1" }, progress: { height: 3, backgroundColor: "#C8DF55" },
  welcome: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 }, spark: { width: 64, height: 64, borderRadius: 22, backgroundColor: "#D9F36B", alignItems: "center", justifyContent: "center" },
  welcomeTitle: { fontSize: 30, fontWeight: "900", color: colors.black, marginTop: 20 }, welcomeText: { fontSize: 15, lineHeight: 22, color: colors.neutral500, textAlign: "center", marginTop: 10 },
  chat: { padding: 16, gap: 10, flexGrow: 1, justifyContent: "flex-end" }, bubble: { maxWidth: "86%", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12 }, userBubble: { alignSelf: "flex-end", backgroundColor: "#24262D", borderBottomRightRadius: 6 }, assistantBubble: { alignSelf: "flex-start", backgroundColor: colors.white, borderBottomLeftRadius: 6 },
  userText: { color: colors.white, fontSize: 15, lineHeight: 21 }, assistantText: { color: "#30323A", fontSize: 15, lineHeight: 21 },
  composerArea: { backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 14, gap: 10 }, composer: { flexDirection: "row", alignItems: "flex-end", gap: 10 }, input: { flex: 1, maxHeight: 110, minHeight: 52, borderRadius: 18, backgroundColor: "#F1F3F7", paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: colors.black }, send: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#24262D", alignItems: "center", justifyContent: "center" }, sendDisabled: { opacity: 0.35 },
  chips: { gap: 8, paddingVertical: 2 }, chip: { borderRadius: 18, backgroundColor: "#F1F7D9", paddingHorizontal: 16, paddingVertical: 12 }, chipText: { fontSize: 14, fontWeight: "700", color: "#30323A" },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, option: { minWidth: "47%", flexGrow: 1, borderWidth: 1, borderColor: "#E0E4EC", borderRadius: 16, padding: 14 }, optionText: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  optionSelected: { backgroundColor: "#F1F7D9", borderColor: "#B4CA42" }, multiConfirm: { width: "100%", minHeight: 48, borderRadius: 16, backgroundColor: "#24262D", alignItems: "center", justifyContent: "center" },
  review: { gap: 9 }, reviewTitle: { fontSize: 16, fontWeight: "900", color: colors.black, paddingHorizontal: 2 }, addressHint: { fontSize: 12, color: colors.neutral500, paddingHorizontal: 2 }, addressField: { position: "relative", zIndex: 20 }, addressSpinner: { position: "absolute", right: 15, top: 15 }, addressError: { fontSize: 12, lineHeight: 17, color: "#B45309", paddingHorizontal: 2 }, reviewInput: { minHeight: 50, borderRadius: 15, backgroundColor: "#F1F3F7", paddingHorizontal: 15, paddingRight: 45, fontSize: 15, color: colors.black }, publish: { minHeight: 54, borderRadius: 18, backgroundColor: "#D9F36B", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }, publishText: { fontSize: 16, fontWeight: "900", color: colors.black },
  photoButton: { minHeight: 50, flex: 1, borderRadius: 16, backgroundColor: "#24262D", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  photoButtonText: { color: colors.white, fontSize: 15, fontWeight: "800" }, skipButton: { minHeight: 50, justifyContent: "center", paddingHorizontal: 18 }, skipInline: { alignSelf: "center", padding: 10 }, skipText: { color: colors.neutral500, fontSize: 14, fontWeight: "700" },
  suggestions: { position: "absolute", left: 0, right: 0, bottom: 56, maxHeight: 250, backgroundColor: colors.white, borderWidth: 1, borderColor: "#D7DBE5", borderRadius: 15, overflow: "hidden", zIndex: 30, elevation: 12, shadowColor: "#000", shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }, suggestion: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E0E4EC" }, suggestionText: { flex: 1, fontSize: 13, lineHeight: 17, color: "#30323A" }, confirmed: { color: "#64751F", fontSize: 13, fontWeight: "800" },
  budgetTabs: { flexDirection: "row", gap: 6 }, budgetTab: { flex: 1, minHeight: 42, borderRadius: 13, backgroundColor: "#F1F3F7", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }, budgetTabActive: { backgroundColor: "#F1F7D9", borderWidth: 1, borderColor: "#B4CA42" }, budgetTabText: { fontSize: 11, fontWeight: "800", color: "#30323A", textAlign: "center" }, rangeRow: { flexDirection: "row", gap: 8 }, rangeInput: { flex: 1 },
});
